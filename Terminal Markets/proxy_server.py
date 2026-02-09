#!/usr/bin/env python3
"""Local proxy for authenticated USDA MARS terminal market queries."""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List
from urllib.parse import parse_qs, quote, urlparse

import requests
from requests.auth import HTTPBasicAuth

MARS_BASE_URL = "https://marsapi.ams.usda.gov/services/v1.2"
REQUEST_TIMEOUT_SECONDS = 22
REPORT_CACHE_TTL_SECONDS = 10 * 60
MAX_RESULTS_PER_QUERY = 8
MAX_REPORTS_SCANNED = 20
MAX_CLOSEST_DATE_DAYS = int(os.getenv("TERMINAL_MARKETS_MAX_CLOSEST_DATE_DAYS", "45"))
PORT = int(os.getenv("TERMINAL_MARKETS_PORT", "8070"))

FOOD_CATEGORY_MAP: Dict[str, str] = {
    "apples": "Fruit",
    "bananas": "Fruit",
    "oranges": "Fruit",
    "tomatoes": "Vegetables",
    "lettuce": "Vegetables",
    "onions": "Onions and Potatoes",
    "potatoes": "Onions and Potatoes",
    "almonds": "Nuts",
}

FOOD_TERMS: Dict[str, List[str]] = {
    "apples": ["apple", "apples"],
    "bananas": ["banana", "bananas"],
    "oranges": ["orange", "oranges"],
    "tomatoes": ["tomato", "tomatoes"],
    "lettuce": ["lettuce", "lettuces"],
    "onions": ["onion", "onions"],
    "potatoes": ["potato", "potatoes"],
    "almonds": ["almond", "almonds"],
}

PRICE_RE = re.compile(r"\b\d{1,3}\.\d{2}(?:-\d{1,3}\.\d{2})?\b")
ITEM_SIZE_RE = re.compile(r"\b\d{1,3}s\b", re.IGNORECASE)
PACKAGE_RE = re.compile(
    r"\b(?:\d+(?:/\d+)?\s*[-/]?\s*(?:lb|lbs|kg|ct|count)\s+)?"
    r"(?:bushel\s+cartons?|cartons?(?:\s+tray\s+pack)?|bags?|sacks?|bins?|crates?|flats?)\b",
    re.IGNORECASE,
)
OFFERINGS_RE = re.compile(
    r"\bOFFERINGS\s+((?:VERY\s+)?(?:LIGHT|LIMITED|MODERATE|HEAVY|ACTIVE|GOOD|FAIR|STEADY))\b",
    re.IGNORECASE,
)
QUALITY_RE = re.compile(
    r"\b(fineappear|quality|condition|appearance|U\.?S\.?\s*ExFcy|ExFcy|Fcy|Extra Fancy)\b",
    re.IGNORECASE,
)
DATE_INPUT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

US_STATE_CODES = {
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
}

COUNTRY_TOKENS = {
    "MEXICO",
    "CANADA",
    "CHILE",
    "PERU",
    "GUATEMALA",
    "HONDURAS",
    "COLOMBIA",
    "ECUADOR",
    "BRAZIL",
    "ARGENTINA",
    "SPAIN",
    "ITALY",
    "FRANCE",
    "SOUTH AFRICA",
    "DOMINICAN REPUBLIC",
    "COSTA RICA",
}

_report_cache: Dict[str, Any] = {"expires": 0.0, "reports": []}


@dataclass(frozen=True)
class ReportSpec:
    slug_id: str
    title: str
    city: str
    category: str


class MarsApiError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _dedupe_keep_order(values: List[str]) -> List[str]:
    seen = set()
    output: List[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        output.append(value)
    return output


def _parse_requested_date(date_raw: str) -> str:
    normalized = date_raw.strip()
    if not normalized:
        return ""
    if DATE_INPUT_RE.fullmatch(normalized) is None:
        raise ValueError("Invalid date format. Expected YYYY-MM-DD.")
    datetime.strptime(normalized, "%Y-%m-%d")
    return normalized


def _parse_iso_date(value: str) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _build_food_regex(food: str) -> re.Pattern[str]:
    terms = FOOD_TERMS.get(food, [food])
    token_pattern = "|".join(re.escape(term.lower()) for term in terms if term.strip())
    if not token_pattern:
        token_pattern = re.escape(food.lower())
    return re.compile(rf"\b(?:{token_pattern})\b", re.IGNORECASE)


def _extract_api_error_message(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = None
    if isinstance(payload, dict):
        for key in ("error", "message", "detail", "statusMessage"):
            value = payload.get(key)
            if value:
                return _normalize_spaces(str(value))
    text = response.text.strip()
    if text:
        return _normalize_spaces(text[:260])
    return f"HTTP {response.status_code}"


def _mars_request(api_key: str, path: str, params: Dict[str, str] | None = None) -> Dict[str, Any]:
    response = requests.get(
        f"{MARS_BASE_URL}{path}",
        params=params or {},
        timeout=REQUEST_TIMEOUT_SECONDS,
        auth=HTTPBasicAuth(api_key, ""),
        headers={"Accept": "application/json"},
    )
    if response.status_code >= 400:
        raise MarsApiError(response.status_code, _extract_api_error_message(response))
    return response.json()


def _find_dict_lists(value: Any) -> List[List[Dict[str, Any]]]:
    matches: List[List[Dict[str, Any]]] = []
    if isinstance(value, list):
        if value and all(isinstance(item, dict) for item in value):
            matches.append(value)
        for item in value:
            matches.extend(_find_dict_lists(item))
    elif isinstance(value, dict):
        for nested in value.values():
            matches.extend(_find_dict_lists(nested))
    return matches


def _extract_record_rows(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    list_candidates = _find_dict_lists(payload)
    if not list_candidates:
        return []
    return max(list_candidates, key=len)


def _extract_section_names(payload: Dict[str, Any]) -> List[str]:
    raw = payload.get("reportSections")
    if not isinstance(raw, list):
        return []
    sections = [_normalize_spaces(str(item)) for item in raw if str(item).strip()]
    return _dedupe_keep_order(sections)


def _parse_terminal_title(title: str) -> tuple[str, str] | None:
    normalized = _normalize_spaces(title)
    match = re.search(
        r"^\s*(?P<city>.+?)\s+Terminal Market\s+(?P<category>.+?)\s+Prices\b",
        normalized,
        flags=re.IGNORECASE,
    )
    if match:
        return _normalize_spaces(match.group("city")), _normalize_spaces(match.group("category"))

    city_match = re.search(r"^\s*(?P<city>.+?)\s+Terminal Market\b", normalized, flags=re.IGNORECASE)
    if city_match:
        return _normalize_spaces(city_match.group("city")), "Unknown"
    return None


def _extract_first_nonempty(row: Dict[str, Any], candidate_keys: List[str]) -> str:
    for key in candidate_keys:
        if key in row and row[key] not in (None, ""):
            return _normalize_spaces(str(row[key]))
    return ""


def _row_text(row: Dict[str, Any]) -> str:
    parts: List[str] = []
    for value in row.values():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            parts.append(json.dumps(value, ensure_ascii=True))
        else:
            parts.append(str(value))
    return _normalize_spaces(" ".join(parts))


def _extract_origins(text: str) -> str:
    upper = text.upper()
    tokens: List[str] = []

    for country in sorted(COUNTRY_TOKENS, key=len, reverse=True):
        if country in upper:
            tokens.append(country.title())

    for token in re.findall(r"\b[A-Z]{2}\b", upper):
        if token in US_STATE_CODES:
            tokens.append(token)

    unique_tokens = _dedupe_keep_order(tokens)
    if not unique_tokens:
        return "Not listed"
    return ", ".join(unique_tokens[:10])


def _extract_package(text: str) -> str:
    matches = [m.group(0) for m in PACKAGE_RE.finditer(text)]
    unique = _dedupe_keep_order([_normalize_spaces(match.lower()) for match in matches])
    if not unique:
        return "Not listed"
    return ", ".join(unique[:6])


def _extract_item_sizes(text: str) -> str:
    tokens = [m.group(0).lower() for m in ITEM_SIZE_RE.finditer(text)]
    words = re.findall(r"\b(?:x-large|extra large|jumbo|large|medium|small)\b", text, flags=re.IGNORECASE)
    combined = _dedupe_keep_order(tokens + [word.lower() for word in words])
    if not combined:
        return "Not listed"
    return ", ".join(combined[:12])


def _extract_market_prices(text: str) -> str:
    prices = _dedupe_keep_order([m.group(0) for m in PRICE_RE.finditer(text)])
    if not prices:
        return "Not listed"
    return ", ".join(prices[:16])


def _extract_offerings(text: str) -> str:
    if re.search(r"\bno offerings\b", text, flags=re.IGNORECASE):
        return "No offerings"
    match = OFFERINGS_RE.search(text)
    if match:
        return f"Offerings {_normalize_spaces(match.group(1))}"
    return "Not listed"


def _extract_quality(text: str) -> str:
    found = _dedupe_keep_order([m.group(1) for m in QUALITY_RE.finditer(text)])
    if not found:
        return "Not listed"
    normalized = []
    for token in found:
        if token.lower() == "fineappear":
            normalized.append("fine appearance")
        else:
            normalized.append(_normalize_spaces(token))
    return ", ".join(normalized[:8])


def _build_match(report: ReportSpec, row: Dict[str, Any], date_used: date) -> Dict[str, Any]:
    row_text = _row_text(row)
    origins = _extract_first_nonempty(row, ["origin", "origins", "commodity_origin"]) or _extract_origins(row_text)
    package = _extract_first_nonempty(row, ["package", "packages", "pkg", "container"]) or _extract_package(row_text)
    item_size = _extract_first_nonempty(row, ["item_size", "size", "sizes", "count"]) or _extract_item_sizes(row_text)
    market_prices = _extract_first_nonempty(
        row,
        ["market_price", "market_prices", "price", "prices", "low_price", "high_price", "mostly_low", "mostly_high"],
    ) or _extract_market_prices(row_text)
    offerings = _extract_first_nonempty(row, ["offerings", "supply", "movement"]) or _extract_offerings(row_text)
    quality = _extract_first_nonempty(row, ["quality", "condition", "appearance", "grade"]) or _extract_quality(row_text)
    report_url = _extract_first_nonempty(row, ["report_url", "reportUrl", "url", "source_url", "sourceUrl"])
    if not report_url.lower().startswith("http"):
        report_url = ""

    return {
        "market": report.city,
        "reportTitle": report.title,
        "publishedDate": date_used.isoformat(),
        "publishedDateIso": date_used.isoformat(),
        "reportUrl": report_url,
        "origins": origins,
        "package": package,
        "itemSize": item_size,
        "marketPrices": market_prices,
        "offerings": offerings,
        "quality": quality,
        "sourceSnippet": row_text[:420],
    }


def _load_terminal_reports(api_key: str) -> List[ReportSpec]:
    now = time.time()
    if _report_cache["expires"] > now:
        return _report_cache["reports"]

    payload = _mars_request(api_key, "/reports")
    rows = _extract_record_rows(payload)

    reports: List[ReportSpec] = []
    seen = set()
    for row in rows:
        title = _extract_first_nonempty(row, ["report_name", "report_title", "title", "slug_name", "name"])
        slug_id = _extract_first_nonempty(row, ["slug_id", "report_id", "id"])
        if not title or not slug_id:
            continue
        if "Terminal Market" not in title:
            continue

        parsed = _parse_terminal_title(title)
        if parsed is None:
            continue
        city, category = parsed
        cache_key = f"{slug_id}|{city}|{category}"
        if cache_key in seen:
            continue
        seen.add(cache_key)
        reports.append(ReportSpec(slug_id=str(slug_id), title=title, city=city, category=category))

    reports.sort(key=lambda report: (report.city, report.category, report.title))
    _report_cache["reports"] = reports
    _report_cache["expires"] = now + REPORT_CACHE_TTL_SECONDS
    return reports


def _load_report_rows_for_date(
    api_key: str,
    slug_id: str,
    requested_date_mmddyyyy: str,
    commodity_filters: List[str],
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    seen_rows = set()
    commodity_values = [value for value in commodity_filters if value.strip()]
    commodity_clause = f";commodity={','.join(commodity_values)}" if commodity_values else ""

    def _add_rows(candidate_rows: List[Dict[str, Any]]) -> None:
        for row in candidate_rows:
            row_key = json.dumps(row, sort_keys=True, ensure_ascii=True)
            if row_key in seen_rows:
                continue
            seen_rows.add(row_key)
            rows.append(row)

    for query in (
        f"report_begin_date={requested_date_mmddyyyy}{commodity_clause}",
        f"report_end_date={requested_date_mmddyyyy}{commodity_clause}",
        f"report_date={requested_date_mmddyyyy}{commodity_clause}",
    ):
        report_payload = _mars_request(api_key, f"/reports/{slug_id}", params={"q": query})

        # Extract rows directly from the report response first.
        _add_rows(_extract_record_rows(report_payload))

        # If the response also advertises named sections, fetch those too.
        section_names = _extract_section_names(report_payload)
        detail_sections = [section for section in section_names if "detail" in section.lower()]
        if not detail_sections and section_names:
            detail_sections = [section_names[0]]

        for section in detail_sections:
            section_path = quote(section, safe="")
            try:
                payload = _mars_request(api_key, f"/reports/{slug_id}/{section_path}", params={"q": query})
            except MarsApiError as exc:
                if exc.status_code in (401, 429):
                    raise
                print(f"  [proxy] Section fetch failed ({exc.status_code}): /reports/{slug_id}/{section_path}")
                continue
            _add_rows(_extract_record_rows(payload))
    return rows


def _find_closest_matches(
    api_key: str,
    reports: List[ReportSpec],
    food: str,
    selected_date: date,
    max_offset_days: int,
) -> Dict[str, Any]:
    food_regex = _build_food_regex(food)
    commodity_filters = _dedupe_keep_order(
        [_normalize_spaces(term.title()) for term in FOOD_TERMS.get(food, [food]) if term.strip()]
    )
    scanned_reports = 0
    attempted_dates: List[str] = []

    capped_reports = reports[:MAX_REPORTS_SCANNED]

    for offset in range(0, max_offset_days + 1):
        candidate_dates = [selected_date] if offset == 0 else [selected_date - timedelta(days=offset), selected_date + timedelta(days=offset)]
        for candidate_date in candidate_dates:
            iso = candidate_date.isoformat()
            if iso in attempted_dates:
                continue
            attempted_dates.append(iso)

            matched: List[Dict[str, Any]] = []
            mars_date = candidate_date.strftime("%m/%d/%Y")

            for report in capped_reports:
                scanned_reports += 1
                try:
                    rows = _load_report_rows_for_date(api_key, report.slug_id, mars_date, commodity_filters)
                except MarsApiError as exc:
                    if exc.status_code in (401, 429):
                        raise
                    print(f"[proxy] Report {report.slug_id} date {mars_date}: MARS error {exc.status_code}: {exc.message}")
                    continue
                except requests.RequestException as exc:
                    print(f"[proxy] Report {report.slug_id} date {mars_date}: network error: {exc}")
                    continue

                for row in rows:
                    row_text = _row_text(row)
                    if food_regex.search(row_text) is None:
                        continue
                    matched.append(_build_match(report, row, candidate_date))
                    if len(matched) >= MAX_RESULTS_PER_QUERY:
                        break

                if len(matched) >= MAX_RESULTS_PER_QUERY:
                    break

            if matched:
                return {
                    "matches": matched,
                    "effectiveDateIso": iso,
                    "dateFallbackUsed": iso != selected_date.isoformat(),
                    "reportsScanned": scanned_reports,
                    "attemptedDates": attempted_dates,
                }

    return {
        "matches": [],
        "effectiveDateIso": "",
        "dateFallbackUsed": False,
        "reportsScanned": scanned_reports,
        "attemptedDates": attempted_dates,
    }


def _get_api_key() -> str:
    for key_name in ("MARS_API_KEY", "TERMINAL_MARKETS_MARS_API_KEY"):
        value = os.getenv(key_name, "").strip()
        if value:
            return value
    return ""


def _query_food(food: str, city: str, date_iso: str) -> Dict[str, Any]:
    api_key = _get_api_key()
    if not api_key:
        raise MarsApiError(
            503,
            "Missing API key. Set MARS_API_KEY (or TERMINAL_MARKETS_MARS_API_KEY) before starting the proxy.",
        )

    normalized_food = food.strip().lower()
    category = FOOD_CATEGORY_MAP.get(normalized_food)
    normalized_city = _normalize_spaces(city)

    requested_date_iso = _parse_requested_date(date_iso)
    selected_date = _parse_iso_date(requested_date_iso) if requested_date_iso else date.today()
    if selected_date is None:
        raise ValueError("Invalid date format. Expected YYYY-MM-DD.")

    report_catalog = _load_terminal_reports(api_key)
    available_cities = sorted({report.city for report in report_catalog})

    city_found = True
    filtered_reports = report_catalog
    if normalized_city:
        filtered_reports = [report for report in filtered_reports if report.city.casefold() == normalized_city.casefold()]
        city_found = bool(filtered_reports)

    if category:
        filtered_reports = [report for report in filtered_reports if category.lower() in report.category.lower()]

    if not filtered_reports:
        return {
            "food": normalized_food,
            "city": normalized_city or "All Cities",
            "cityFound": city_found,
            "availableCities": available_cities,
            "category": category or "All Terminal Market Reports",
            "reportsScanned": 0,
            "matches": [],
            "requestedDateIso": selected_date.isoformat(),
            "dateFallbackUsed": False,
            "effectiveDateIso": "",
            "attemptedDates": [],
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }

    result = _find_closest_matches(
        api_key=api_key,
        reports=filtered_reports,
        food=normalized_food,
        selected_date=selected_date,
        max_offset_days=max(0, MAX_CLOSEST_DATE_DAYS),
    )

    return {
        "food": normalized_food,
        "city": normalized_city or "All Cities",
        "cityFound": city_found,
        "availableCities": available_cities,
        "category": category or "All Terminal Market Reports",
        "reportsScanned": result["reportsScanned"],
        "matches": result["matches"],
        "requestedDateIso": selected_date.isoformat(),
        "dateFallbackUsed": result["dateFallbackUsed"],
        "effectiveDateIso": result["effectiveDateIso"],
        "attemptedDates": result["attemptedDates"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


class TerminalMarketsHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status: int = 200, content_type: str = "application/json") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _write_json(self, status: int, payload: Dict[str, Any]) -> None:
        self._set_headers(status=status, content_type="application/json")
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._set_headers(status=204)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)

        if parsed.path == "/api/terminal-markets/health":
            self._write_json(
                200,
                {
                    "ok": True,
                    "service": "terminal-markets-proxy",
                    "authConfigured": bool(_get_api_key()),
                    "time": datetime.now(timezone.utc).isoformat(),
                },
            )
            return

        if parsed.path != "/api/terminal-markets":
            self._write_json(404, {"error": "Not found"})
            return

        query = parse_qs(parsed.query)
        food = query.get("food", [""])[0].strip()
        city = query.get("city", [""])[0].strip()
        date_iso = query.get("date", [""])[0].strip()
        if not food:
            self._write_json(
                400,
                {
                    "error": "Missing required query parameter: food",
                    "supportedFoods": sorted(FOOD_CATEGORY_MAP.keys()),
                },
            )
            return

        try:
            payload = _query_food(food, city, date_iso)
        except ValueError as exc:
            self._write_json(400, {"error": str(exc)})
            return
        except MarsApiError as exc:
            status = exc.status_code if exc.status_code in (400, 401, 404, 429, 500, 503) else 502
            self._write_json(status, {"error": f"MARS API error ({exc.status_code}): {exc.message}"})
            return
        except requests.RequestException as exc:
            self._write_json(502, {"error": f"MARS network error: {exc}"})
            return
        except Exception as exc:
            self._write_json(502, {"error": f"USDA request failed: {exc}"})
            return

        self._write_json(200, payload)

    def log_message(self, _format: str, *args: Any) -> None:
        print(f"[proxy] {args[0] if args else _format}")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), TerminalMarketsHandler)
    print(f"Terminal Markets proxy listening on http://127.0.0.1:{PORT}")
    print("Using authenticated MARS endpoint: https://marsapi.ams.usda.gov/services/v1.2")
    server.serve_forever()


if __name__ == "__main__":
    main()
