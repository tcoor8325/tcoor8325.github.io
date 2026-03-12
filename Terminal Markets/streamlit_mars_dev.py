#!/usr/bin/env python3
"""Streamlit development client for USDA MARS terminal market queries."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Dict, List
from urllib.parse import quote

import requests
import streamlit as st
from requests.auth import HTTPBasicAuth

MARS_BASE_URL = "https://marsapi.ams.usda.gov/services/v1.2"
REQUEST_TIMEOUT_SECONDS = 22
MAX_RESULTS_PER_QUERY = 8

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
_commodity_filter_unsupported_slugs: set[str] = set()


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


def _build_food_regex(food: str) -> re.Pattern[str]:
    terms = FOOD_TERMS.get(food, [food])
    token_pattern = "|".join(re.escape(term.lower()) for term in terms if term.strip())
    if not token_pattern:
        token_pattern = re.escape(food.lower())
    return re.compile(rf"\b(?:{token_pattern})\b", re.IGNORECASE)


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


def _extract_first_nonempty(row: Dict[str, Any], candidate_keys: List[str]) -> str:
    for key in candidate_keys:
        if key in row and row[key] not in (None, ""):
            return _normalize_spaces(str(row[key]))
    return ""


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

    return {
        "market": report.city,
        "reportTitle": report.title,
        "publishedDateIso": date_used.isoformat(),
        "origins": origins,
        "package": package,
        "itemSize": item_size,
        "marketPrices": market_prices,
        "offerings": offerings,
        "quality": quality,
        "sourceSnippet": row_text[:420],
        "rawRow": row,
    }


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


@st.cache_data(ttl=600, show_spinner=False)
def _load_terminal_reports(api_key: str) -> List[ReportSpec]:
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
    return reports


@st.cache_data(ttl=300, show_spinner=False)
def _load_report_rows_for_date(
    api_key: str,
    slug_id: str,
    requested_date_mmddyyyy: str,
    commodity_filters: List[str],
) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    seen_rows = set()
    commodity_values = [value for value in commodity_filters if value.strip()]
    commodity_csv = ",".join(commodity_values)
    use_commodity_filter = bool(commodity_csv) and slug_id not in _commodity_filter_unsupported_slugs

    def _add_rows(candidate_rows: List[Dict[str, Any]]) -> None:
        for row in candidate_rows:
            row_key = json.dumps(row, sort_keys=True, ensure_ascii=True)
            if row_key in seen_rows:
                continue
            seen_rows.add(row_key)
            rows.append(row)

    def _fetch_with_optional_commodity(path: str, base_query: str) -> Dict[str, Any]:
        nonlocal use_commodity_filter
        query = f"{base_query};commodity={commodity_csv}" if use_commodity_filter else base_query
        try:
            return _mars_request(api_key, path, params={"q": query})
        except MarsApiError as exc:
            if use_commodity_filter and exc.status_code == 400:
                use_commodity_filter = False
                _commodity_filter_unsupported_slugs.add(slug_id)
                return _mars_request(api_key, path, params={"q": base_query})
            raise

    for base_query in (
        f"report_begin_date={requested_date_mmddyyyy}",
        f"report_end_date={requested_date_mmddyyyy}",
        f"report_date={requested_date_mmddyyyy}",
    ):
        report_payload = _fetch_with_optional_commodity(f"/reports/{slug_id}", base_query)

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
                payload = _fetch_with_optional_commodity(f"/reports/{slug_id}/{section_path}", base_query)
            except MarsApiError as exc:
                if exc.status_code in (401, 429):
                    raise
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

    for offset in range(0, max_offset_days + 1):
        candidate_dates = [selected_date] if offset == 0 else [selected_date - timedelta(days=offset), selected_date + timedelta(days=offset)]
        for candidate_date in candidate_dates:
            iso = candidate_date.isoformat()
            if iso in attempted_dates:
                continue
            attempted_dates.append(iso)

            matched: List[Dict[str, Any]] = []
            mars_date = candidate_date.strftime("%m/%d/%Y")

            for report in reports:
                scanned_reports += 1
                try:
                    rows = _load_report_rows_for_date(api_key, report.slug_id, mars_date, commodity_filters)
                except MarsApiError as exc:
                    if exc.status_code in (401, 429):
                        raise
                    continue
                except requests.RequestException:
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


def main() -> None:
    st.set_page_config(page_title="Terminal Markets Dev (MARS Key Auth)", layout="wide")
    st.title("Terminal Markets Dev - MARS Key Auth")
    st.caption("Development query tool that uses MARS authenticated API calls and nearest-date fallback search.")

    with st.sidebar:
        st.subheader("MARS Access")
        api_key = st.text_input(
            "MARS API Key",
            value=st.secrets.get("MARS_API_KEY", os.getenv("MARS_API_KEY", "")),
            type="password",
            help="Provide your MARS API key. You can also set it in Streamlit secrets as MARS_API_KEY.",
        ).strip()
        max_offset_days = st.slider("Max closest-date search window (days)", min_value=0, max_value=180, value=45, step=1)

    if not api_key:
        st.warning("Enter a MARS API key in the sidebar to query reports.")
        st.stop()

    try:
        with st.spinner("Loading terminal market report catalog from MARS..."):
            report_catalog = _load_terminal_reports(api_key)
    except MarsApiError as exc:
        if exc.status_code == 401:
            st.error("MARS authentication failed (401). Check your API key.")
        elif exc.status_code == 429:
            st.error("MARS rate limit reached (429). Please wait and retry.")
        else:
            st.error(f"MARS request failed ({exc.status_code}): {exc.message}")
        st.stop()
    except requests.RequestException as exc:
        st.error(f"Network error contacting MARS: {exc}")
        st.stop()

    if not report_catalog:
        st.error("No terminal market reports were returned from the authenticated MARS /reports catalog.")
        st.stop()

    food = st.selectbox("Food", options=sorted(FOOD_TERMS.keys()), index=0)
    category = FOOD_CATEGORY_MAP.get(food, "")
    cities = sorted({report.city for report in report_catalog})
    selected_city = st.selectbox("City", options=cities, index=0)
    selected_date = st.date_input("Date", value=date.today())

    filtered_reports = [report for report in report_catalog if report.city == selected_city]
    if category:
        filtered_reports = [report for report in filtered_reports if category.lower() in report.category.lower()]
    if not filtered_reports:
        st.warning(f"No MARS report definitions found for city '{selected_city}' and category '{category}'.")
        st.stop()

    if st.button("Query MARS", type="primary"):
        try:
            with st.spinner("Searching nearest available report date and matching rows..."):
                result = _find_closest_matches(api_key, filtered_reports, food, selected_date, max_offset_days)
        except MarsApiError as exc:
            if exc.status_code == 401:
                st.error("MARS authentication failed during query (401). Check your API key.")
            elif exc.status_code == 429:
                st.error("MARS rate limit reached during query (429). Please wait and retry.")
            else:
                st.error(f"MARS query failed ({exc.status_code}): {exc.message}")
            st.stop()
        except requests.RequestException as exc:
            st.error(f"Network error contacting MARS: {exc}")
            st.stop()

        st.write(
            f"Scanned `{result['reportsScanned']}` report calls in category `{category or 'All'}` for `{selected_city}`."
        )
        st.write(f"Requested date: `{selected_date.isoformat()}`")

        if result["matches"]:
            if result["dateFallbackUsed"]:
                st.info(f"No exact date match. Showing closest available data for `{result['effectiveDateIso']}`.")
            else:
                st.success(f"Exact date match found for `{result['effectiveDateIso']}`.")

            for match in result["matches"][:4]:
                with st.container(border=True):
                    st.markdown(f"**{match['market']} | {match['publishedDateIso']}**")
                    st.write(f"Origins: {match['origins']}")
                    st.write(f"Package: {match['package']}")
                    st.write(f"Item size: {match['itemSize']}")
                    st.write(f"Market prices: {match['marketPrices']}")
                    st.write(f"Offerings: {match['offerings']}")
                    st.write(f"Quality: {match['quality']}")
                    st.caption(match["sourceSnippet"])
                    with st.expander("Raw row"):
                        st.json(match["rawRow"])
        else:
            st.warning("No matching data found in the searched date window.")

        with st.expander("Attempted Dates"):
            st.write(", ".join(result["attemptedDates"]) if result["attemptedDates"] else "None")


if __name__ == "__main__":
    main()
