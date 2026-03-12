#!/usr/bin/env python3
"""Build a Chicago terminal-market origin-by-day matrix from USDA MARS data."""

from __future__ import annotations

import argparse
import csv
import json
import math
import os
import re
import textwrap
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List
from urllib.parse import quote

import requests
from requests.auth import HTTPBasicAuth

MARS_BASE_URL = "https://marsapi.ams.usda.gov/services/v1.2"
REQUEST_TIMEOUT_SECONDS = 35
MAX_REQUEST_ATTEMPTS = 3
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT_CSV = str(SCRIPT_DIR / "food_clock.csv")
DEFAULT_PLOT_IMAGE = str(SCRIPT_DIR / "food_clock_polar.png")
DEFAULT_COMMODITIES = [
    "Corn, Sweet",
    "Onions",
    "Garlic",
    "Bananas",
    "Tomatoes",
    "Lemons",
    "Peppers, Bell Type",
    "Mushrooms",
    "Carrots",
    "Sweet Potatoes",
    "Cabbage",
    "Cauliflower",
    "Cucumbers",
    "Broccoli",
    "Spinach",
    "Eggplant",
    "Lettuce, Iceberg",
    "Pears",
    "Grapefruit",
    "Avocados",
    "Celery",
    "Tomatillos",
    "Kiwifruit",
]
DEFAULT_COMMODITY_ARG = "; ".join(DEFAULT_COMMODITIES)

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

NULL_ORIGINS = {"", "N/A", "NA", "NONE", "NOT LISTED", "UNKNOWN", "UNSPECIFIED", "NULL"}
DATE_KEYS = [
    "report_begin_date",
    "report_end_date",
    "report_date",
    "published_date",
    "date",
]
ORIGIN_KEYS = [
    "origin",
    "origins",
    "commodity_origin",
    "source",
    "shipping_point",
    "shipping_point_city",
    "location",
]
TITLE_KEYS = ["report_name", "report_title", "title", "slug_name", "name"]
SLUG_KEYS = ["slug_id", "report_id", "id"]


@dataclass(frozen=True)
class ReportSpec:
    slug_id: str
    title: str
    city: str
    category: str


class MarsApiError(RuntimeError):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def _normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", str(text)).strip()


def _extract_first_nonempty(row: Dict[str, Any], candidate_keys: List[str]) -> str:
    for key in candidate_keys:
        value = row.get(key)
        if value is None:
            continue
        text = _normalize_spaces(value)
        if text:
            return text
    return ""


def _extract_api_error_message(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        payload = None
    if isinstance(payload, dict):
        for key in ("error", "message", "detail", "statusMessage"):
            value = payload.get(key)
            if value:
                return _normalize_spaces(value)
    text = _normalize_spaces(response.text)
    if text:
        return text[:300]
    return f"HTTP {response.status_code}"


def _mars_request(api_key: str, path: str, params: Dict[str, str] | None = None) -> Dict[str, Any]:
    url = f"{MARS_BASE_URL}{path}"
    last_error: Exception | None = None

    for attempt in range(1, MAX_REQUEST_ATTEMPTS + 1):
        try:
            response = requests.get(
                url,
                params=params or {},
                timeout=REQUEST_TIMEOUT_SECONDS,
                auth=HTTPBasicAuth(api_key, ""),
                headers={"Accept": "application/json"},
            )
            if response.status_code >= 400:
                raise MarsApiError(response.status_code, _extract_api_error_message(response))
            return response.json()
        except MarsApiError as exc:
            last_error = exc
            if exc.status_code == 429 or exc.status_code >= 500:
                if attempt >= MAX_REQUEST_ATTEMPTS:
                    raise
                time.sleep(1.2 * attempt)
                continue
            raise
        except requests.RequestException as exc:
            last_error = exc
            if attempt >= MAX_REQUEST_ATTEMPTS:
                raise
            time.sleep(1.2 * attempt)

    if last_error is not None:
        raise last_error
    raise RuntimeError("Unexpected request state")


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
    candidates = _find_dict_lists(payload)
    if not candidates:
        return []
    return max(candidates, key=len)



def _parse_terminal_title(title: str) -> tuple[str, str] | None:
    normalized = _normalize_spaces(title)
    match = re.search(
        r"^\s*(?P<city>.+?)\s+Terminal Market\s+(?P<category>.+?)\s+Prices\b",
        normalized,
        flags=re.IGNORECASE,
    )
    if not match:
        city_match = re.search(r"^\s*(?P<city>.+?)\s+Terminal Market\b", normalized, flags=re.IGNORECASE)
        if not city_match:
            return None
        return _normalize_spaces(city_match.group("city")), "Unknown"
    return _normalize_spaces(match.group("city")), _normalize_spaces(match.group("category"))


def _get_api_key() -> str:
    for name in ("MARS_API_KEY", "TERMINAL_MARKETS_MARS_API_KEY"):
        value = os.getenv(name, "").strip()
        if value:
            return value
    loaded = _load_api_key_from_env_files()
    if loaded:
        return loaded
    raise SystemExit("Missing API key. Set MARS_API_KEY or TERMINAL_MARKETS_MARS_API_KEY.")


def _load_api_key_from_env_files() -> str:
    script_path = Path(__file__).resolve()
    repo_root = script_path.parent.parent
    env_files = [
        Path.home() / ".config" / "terminal-markets.env",
        repo_root / ".env.local",
        repo_root / "Terminal Markets" / ".env.local",
    ]

    loaded: Dict[str, str] = {}
    for env_file in env_files:
        if not env_file.is_file():
            continue
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export ") :].strip()
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                value = value[1:-1]
            loaded[key] = value

    return (loaded.get("MARS_API_KEY") or loaded.get("TERMINAL_MARKETS_MARS_API_KEY") or "").strip()


def _load_terminal_reports_for_city(api_key: str, city: str) -> List[ReportSpec]:
    payload = _mars_request(api_key, "/reports")
    rows = _extract_record_rows(payload)
    target = city.casefold()
    reports: List[ReportSpec] = []
    seen = set()

    for row in rows:
        title = _extract_first_nonempty(row, TITLE_KEYS)
        slug_id = _extract_first_nonempty(row, SLUG_KEYS)
        if not title or not slug_id:
            continue
        if "terminal market" not in title.casefold():
            continue
        parsed = _parse_terminal_title(title)
        if parsed is None:
            continue
        parsed_city, parsed_category = parsed
        if parsed_city.casefold() != target:
            continue
        key = f"{slug_id}|{parsed_city}|{parsed_category}"
        if key in seen:
            continue
        seen.add(key)
        reports.append(ReportSpec(slug_id=slug_id, title=title, city=parsed_city, category=parsed_category))

    reports.sort(key=lambda report: report.title)
    return reports


def _row_key(row: Dict[str, Any]) -> str:
    return json.dumps(row, sort_keys=True, ensure_ascii=True)


def _load_report_dates(api_key: str, slug_id: str) -> List[date]:
    payload = _mars_request(api_key, f"/reports/{slug_id}")
    rows = _extract_record_rows(payload)
    found: List[date] = []
    seen = set()
    for row in rows:
        row_date = _extract_row_date(row)
        if row_date is None or row_date in seen:
            continue
        seen.add(row_date)
        found.append(row_date)
    found.sort()
    return found


def _load_report_detail_rows_for_day(api_key: str, slug_id: str, query_day: date) -> List[Dict[str, Any]]:
    q = f"report_date={query_day.strftime('%m/%d/%Y')}"
    payload = _mars_request(api_key, f"/reports/{slug_id}/{quote('Report Details', safe='')}", params={"q": q})
    return _extract_record_rows(payload)


def _row_text(row: Dict[str, Any]) -> str:
    parts = []
    for value in row.values():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            parts.append(json.dumps(value, ensure_ascii=True))
        else:
            parts.append(str(value))
    return _normalize_spaces(" ".join(parts))


def _normalize_commodity_name(text: str) -> str:
    return _normalize_spaces(text).casefold()


def _parse_commodity_list(raw: str) -> List[str]:
    out: List[str] = []
    seen = set()
    pieces = re.split(r"[;\n]+", raw) if (";" in raw or "\n" in raw) else re.split(r"[,]+", raw)
    for piece in pieces:
        commodity = _normalize_spaces(piece)
        if not commodity:
            continue
        key = commodity.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(commodity)
    return out


def _row_has_commodity(row: Dict[str, Any], commodity_name: str) -> bool:
    target = _normalize_commodity_name(commodity_name)
    if not target:
        return False
    row_commodity = _normalize_commodity_name(str(row.get("commodity", "")))
    return row_commodity == target


def _parse_date_value(value: Any) -> date | None:
    text = _normalize_spaces(value)
    if not text:
        return None
    text = text[:10]
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d", "%m-%d-%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def _extract_row_date(row: Dict[str, Any]) -> date | None:
    for key in DATE_KEYS:
        parsed = _parse_date_value(row.get(key))
        if parsed is not None:
            return parsed
    return None


def _split_origin_tokens(raw: str) -> List[str]:
    tokens = re.split(r"[,;/|]|(?:\s+\band\b\s+)|(?:\s+&\s+)", raw, flags=re.IGNORECASE)
    out: List[str] = []
    seen = set()
    for token in tokens:
        normalized = _normalize_spaces(token)
        if not normalized:
            continue
        upper = normalized.upper()
        if upper in NULL_ORIGINS:
            continue
        if upper in US_STATE_CODES:
            clean = upper
        else:
            clean = normalized.title()
        if clean in seen:
            continue
        seen.add(clean)
        out.append(clean)
    return out


def _extract_origins_from_text(text: str) -> List[str]:
    upper = text.upper()
    found: List[str] = []
    seen = set()

    for country in sorted(COUNTRY_TOKENS, key=len, reverse=True):
        if country in upper:
            name = country.title()
            if name not in seen:
                seen.add(name)
                found.append(name)

    for token in re.findall(r"\b[A-Z]{2}\b", upper):
        if token in US_STATE_CODES and token not in seen:
            seen.add(token)
            found.append(token)
    return found


def _extract_row_origins(row: Dict[str, Any]) -> List[str]:
    for key in ORIGIN_KEYS:
        value = row.get(key)
        if value is None:
            continue
        origins = _split_origin_tokens(str(value))
        if origins:
            return origins
    return _extract_origins_from_text(_row_text(row))


def _parse_food_separator_row(label: str) -> str | None:
    match = re.match(r"^#+\s*food\s*:\s*(.+?)\s*#*$", _normalize_spaces(label), flags=re.IGNORECASE)
    if not match:
        return None
    food = _normalize_spaces(match.group(1))
    return food or None


def _slugify_filename_token(text: str) -> str:
    token = re.sub(r"[^a-z0-9]+", "_", text.casefold()).strip("_")
    return token or "food"


def _write_food_clock_csv(
    output_csv: str,
    max_days_ago: int,
    available_day_offsets: set[int],
    commodity_order: List[str],
    origins_by_commodity: Dict[str, Dict[str, set[int]]],
) -> None:
    available_sorted = sorted(day for day in available_day_offsets if 0 <= day <= max_days_ago)
    available_set = set(available_sorted)

    def _imputed_series(present_days: set[int]) -> List[float]:
        present = {day for day in present_days if 0 <= day <= max_days_ago}
        series: List[float] = []
        for day in range(max_days_ago + 1):
            if day in available_set:
                series.append(1.0 if day in present else 0.0)
                continue
            last_available_days = [candidate for candidate in available_sorted if candidate > day][:3]
            if not last_available_days:
                series.append(0.0)
                continue
            avg = sum(1.0 if candidate in present else 0.0 for candidate in last_available_days) / len(
                last_available_days
            )
            series.append(avg)
        return series

    def _format_signal(value: float) -> str:
        if abs(value - round(value)) < 1e-10:
            return str(int(round(value)))
        return f"{value:.4f}".rstrip("0").rstrip(".")

    header = ["origin"] + [str(day) for day in range(max_days_ago + 1)]
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        for index, commodity in enumerate(commodity_order):
            writer.writerow([f"### FOOD: {commodity} ###"] + [""] * (max_days_ago + 1))
            commodity_origins = origins_by_commodity.get(commodity, {})
            for origin in sorted(commodity_origins):
                days = commodity_origins[origin]
                series = _imputed_series(days)
                row = [origin] + [_format_signal(value) for value in series]
                writer.writerow(row)
            if index < len(commodity_order) - 1:
                writer.writerow([""] * (max_days_ago + 2))
        f.flush()


def _is_leap_year(year: int) -> bool:
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def _day_of_year_365(value: date) -> int:
    day = value.timetuple().tm_yday
    # Collapse leap years onto a 365-day ring so Jan 1 always maps to 0 degrees.
    if _is_leap_year(value.year) and day > 59:
        day -= 1
    return day - 1


def _circular_low_pass(signal: List[float], window_days: int, passes: int) -> List[float]:
    if not signal:
        return []
    window = max(1, int(window_days))
    passes = max(1, int(passes))
    if window == 1:
        return [float(v) for v in signal]

    radius = window // 2
    out = [float(v) for v in signal]
    count = len(out)

    for _ in range(passes):
        next_out = [0.0] * count
        for idx in range(count):
            acc = 0.0
            samples = 0
            for step in range(-radius, radius + 1):
                acc += out[(idx + step) % count]
                samples += 1
            next_out[idx] = acc / max(1, samples)
        out = next_out

    return out


def _grow_figure_to_fit_artists(fig: Any, artists: List[Any], padding_inches: float = 0.25) -> None:
    fig.canvas.draw()
    renderer = fig.canvas.get_renderer()
    width, height = fig.get_size_inches()

    add_right = 0.0
    add_top = 0.0

    for artist in artists:
        if artist is None:
            continue
        try:
            bbox = artist.get_window_extent(renderer=renderer).transformed(fig.dpi_scale_trans.inverted())
        except Exception:
            continue

        if bbox.x1 > width:
            add_right = max(add_right, (bbox.x1 - width) + padding_inches)
        if bbox.y1 > height:
            add_top = max(add_top, (bbox.y1 - height) + padding_inches)

    if add_right > 0.0 or add_top > 0.0:
        fig.set_size_inches(width + add_right, height + add_top, forward=True)
        fig.canvas.draw()


def plot_food_clock_polar(
    csv_path: str,
    commodity: str,
    city: str,
    output_image: str,
    smooth_window_days: int,
    smooth_passes: int,
    show_plot: bool,
) -> None:
    if show_plot:
        import matplotlib.pyplot as plt
    else:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

    csv_file = Path(csv_path)
    if not csv_file.is_file():
        raise SystemExit(f"CSV not found: {csv_path}")

    with open(csv_file, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise SystemExit(f"CSV has no header: {csv_path}")
        day_columns = sorted([int(col) for col in reader.fieldnames if col != "origin"])
        if not day_columns:
            raise SystemExit(f"CSV has no day columns: {csv_path}")
        raw_rows = list(reader)

    today = date.today()
    day_offsets = day_columns
    day_to_ring = [_day_of_year_365(today - timedelta(days=offset)) for offset in day_offsets]

    commodity_list = _parse_commodity_list(commodity)
    fallback_food = commodity_list[0] if commodity_list else "Commodity"

    series_by_food: Dict[str, Dict[str, List[float]]] = {}
    current_food = ""
    for row in raw_rows:
        origin_cell = _normalize_spaces(row.get("origin", ""))
        if not origin_cell:
            continue
        parsed_food = _parse_food_separator_row(origin_cell)
        if parsed_food is not None:
            current_food = parsed_food
            continue
        ring_values = [0.0] * 365
        ring_counts = [0] * 365
        has_any = False
        for col_index, day_offset in enumerate(day_offsets):
            value = _normalize_spaces(row.get(str(day_offset), ""))
            try:
                numeric = float(value) if value else 0.0
            except ValueError:
                numeric = 0.0
            numeric = min(1.0, max(0.0, numeric))
            ring_index = day_to_ring[col_index]
            ring_values[ring_index] += numeric
            ring_counts[ring_index] += 1
            if numeric > 0.0:
                has_any = True
        if not has_any:
            continue
        base_signal = [
            (ring_values[idx] / ring_counts[idx]) if ring_counts[idx] > 0 else 0.0
            for idx in range(365)
        ]
        smoothed = _circular_low_pass(base_signal, window_days=smooth_window_days, passes=smooth_passes)
        food_name = current_food or fallback_food
        series_by_food.setdefault(food_name, {})[origin_cell] = smoothed

    if not series_by_food:
        raise SystemExit("No origins with non-zero data found in CSV to plot.")

    theta = [2.0 * math.pi * day / 365.0 for day in range(365)]
    theta_closed = theta + [theta[0]]
    today_ring_index = _day_of_year_365(today)
    today_theta = theta[today_ring_index]
    today_label_date = today.strftime("%Y-%m-%d")
    out_base = Path(output_image)
    out_suffix = out_base.suffix or ".png"
    food_items = list(series_by_food.items())

    for food_name, food_series in food_items:
        if len(food_items) == 1:
            current_output = out_base
        else:
            current_output = out_base.with_name(f"{out_base.stem}_{_slugify_filename_token(food_name)}{out_suffix}")

        fig = plt.figure(figsize=(11, 11))
        fig.patch.set_facecolor("#000000")
        ax = fig.add_subplot(111, projection="polar")
        ax.set_facecolor("#000000")
        ax.spines["polar"].set_color("#FFFFFF")

        curve_palette = [
            "#00E5FF",  # cyan
            "#FF6D00",  # orange
            "#76FF03",  # lime
            "#FF4081",  # pink
            "#FFD600",  # yellow
            "#7C4DFF",  # violet
            "#18FFFF",  # aqua
            "#FF3D00",  # deep orange
            "#64FFDA",  # mint
            "#F50057",  # magenta
            "#C6FF00",  # chartreuse
            "#40C4FF",  # sky blue
            "#FFEA00",  # bright yellow
            "#B388FF",  # lavender
            "#69F0AE",  # green
            "#FF9100",  # amber
        ]

        for index, origin in enumerate(food_series):
            data = food_series[origin]
            radial = data + [data[0]]
            curve_color = curve_palette[index % len(curve_palette)]
            ax.plot(theta_closed, radial, label=origin, color=curve_color, linewidth=1.8, alpha=0.95)

        ax.plot(
            [today_theta, today_theta],
            [0.0, 1.25],
            color="#FFFFFF",
            linestyle="-",
            linewidth=3.2,
            alpha=0.95,
            zorder=6,
        )

        origins_above_today = []
        for origin, data in food_series.items():
            if data[today_ring_index] > 0.25:
                origins_above_today.append((origin, data[today_ring_index]))
        origins_above_today.sort(key=lambda item: (-item[1], item[0].casefold()))
        origin_names = [name for name, _ in origins_above_today]
        bullet_lines: List[str] = []
        if origin_names:
            for name in origin_names:
                bullet_lines.append(textwrap.fill(name, width=30, initial_indent="- ", subsequent_indent="  "))
        else:
            bullet_lines.append("- None")
        today_annotation = f"Today: {today_label_date}\n" + "\n".join(bullet_lines)
        today_text = None

        month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        month_starts = [
            date(2025, 1, 1),
            date(2025, 2, 1),
            date(2025, 3, 1),
            date(2025, 4, 1),
            date(2025, 5, 1),
            date(2025, 6, 1),
            date(2025, 7, 1),
            date(2025, 8, 1),
            date(2025, 9, 1),
            date(2025, 10, 1),
            date(2025, 11, 1),
            date(2025, 12, 1),
        ]
        month_angles = [2.0 * math.pi * _day_of_year_365(month_start) / 365.0 for month_start in month_starts]
        ax.set_xticks(month_angles)
        ax.set_xticklabels(month_labels, color="#FFFFFF")

        ax.set_theta_zero_location("N")
        ax.set_theta_direction(-1)
        ax.set_ylim(0.0, 1.25)
        ax.set_yticks([0.25, 0.5, 0.75, 1.0, 1.25])
        ax.set_yticklabels(["0.25", "0.50", "0.75", "1.00", "1.25"], color="#FFFFFF")
        ax.tick_params(colors="#FFFFFF")
        ax.grid(True, color="#FFFFFF", alpha=0.25)
        commodity_title = food_name if food_name.strip().casefold().endswith("s") else f"{food_name}s"
        top_title = f"{commodity_title} in {city}"
        subtitle_text = (
            "Smoothed Daily Availability | "
            f"0° = Jan 1 | Low-pass window={max(1, smooth_window_days)} days, passes={max(1, smooth_passes)}"
        )
        suptitle_artist = fig.suptitle(top_title, y=0.985, fontsize=20, color="#FFFFFF")
        subtitle_artist = fig.text(0.5, 0.955, subtitle_text, ha="center", va="top", fontsize=10, color="#FFFFFF")
        fig.subplots_adjust(left=0.05, right=0.95, top=0.92, bottom=0.05)
        # Keep the figure full size, but render the polar axes at 70% scale.
        axes_scale = 0.70
        base_pos = ax.get_position()
        scaled_width = base_pos.width * axes_scale
        scaled_height = base_pos.height * axes_scale
        scaled_x = base_pos.x0 + (base_pos.width - scaled_width) * 0.5
        centered_y = base_pos.y0 + (base_pos.height - scaled_height) * 0.5
        ax.set_position([scaled_x, centered_y, scaled_width, scaled_height])
        tip_px = ax.transData.transform((today_theta, 1.25))
        inner_px = ax.transData.transform((today_theta, 1.0))
        vec_x = float(tip_px[0] - inner_px[0])
        vec_y = float(tip_px[1] - inner_px[1])
        vec_len = math.hypot(vec_x, vec_y)
        if vec_len <= 1e-9:
            offset_dx = 0.0
            offset_dy = -50.0
        else:
            offset_dx = 50.0 * (vec_x / vec_len)
            offset_dy = 50.0 * (vec_y / vec_len)
        today_text = ax.annotate(
            today_annotation,
            xy=(today_theta, 1.25),
            xycoords="data",
            xytext=(offset_dx, offset_dy),
            textcoords="offset pixels",
            fontsize=9.0,
            color="#FFFFFF",
            ha=("left" if offset_dx >= 0.0 else "right"),
            va=("bottom" if offset_dy >= 0.0 else "top"),
            bbox={"boxstyle": "square,pad=0.28", "facecolor": "#000000", "edgecolor": "#FFFFFF", "alpha": 0.92},
            annotation_clip=False,
            zorder=7,
        )
        fig_px_height = max(1.0, fig.get_size_inches()[1] * fig.dpi)
        up_shift_frac = 100.0 / fig_px_height
        ax.set_position([scaled_x, centered_y + up_shift_frac, scaled_width, scaled_height])
        final_pos = ax.get_position()
        legend_entries = len(food_series)
        legend_columns = ((legend_entries + 4) // 5) if legend_entries > 5 else 1
        legend = ax.legend(
            loc="upper center",
            bbox_to_anchor=(final_pos.x0 + final_pos.width * 0.5, final_pos.y0 - 0.025),
            bbox_transform=fig.transFigure,
            frameon=False,
            fontsize=11.4075,
            ncol=legend_columns,
        )
        for text in legend.get_texts():
            text.set_color("#FFFFFF")
        _grow_figure_to_fit_artists(fig, [legend, suptitle_artist, subtitle_artist, today_text], padding_inches=0.28)

        fig.savefig(current_output, dpi=180, bbox_inches="tight", facecolor=fig.get_facecolor())
        print(f"Wrote plot {current_output}")
        if show_plot:
            plt.show()
        plt.close(fig)


def build_food_clock(
    city: str,
    commodity: str,
    output_csv: str,
    report_category: str,
    days_back: int,
) -> None:
    commodities = _parse_commodity_list(commodity)
    if not commodities:
        raise SystemExit("No commodities provided. Use --commodity with one or more comma-separated names.")

    api_key = _get_api_key()
    reports = _load_terminal_reports_for_city(api_key, city)
    if report_category.strip():
        reports = [report for report in reports if report_category.casefold() in report.category.casefold()]
    if not reports:
        raise SystemExit(
            f"No terminal market reports found for city '{city}' in category '{report_category}'."
        )

    commodity_targets = {name: _normalize_commodity_name(name) for name in commodities}
    today = date.today()
    origins_by_commodity: Dict[str, Dict[str, set[int]]] = {name: {} for name in commodities}
    available_day_offsets: set[int] = set()
    max_days_ago = max(0, days_back - 1)
    _write_food_clock_csv(
        output_csv=output_csv,
        max_days_ago=max_days_ago,
        available_day_offsets=available_day_offsets,
        commodity_order=commodities,
        origins_by_commodity=origins_by_commodity,
    )
    print(f"Initialized {output_csv}")

    scanned_rows = 0
    matched_rows = 0
    reports_with_hits = 0
    queried_days = 0
    matched_rows_by_commodity = {name: 0 for name in commodities}
    for report in reports:
        print(f"Scanning report {report.slug_id}: {report.title}")
        try:
            report_dates = _load_report_dates(api_key, report.slug_id)
            if not report_dates:
                print(f"Skipping report {report.slug_id}: no dated rows")
                continue

            eligible_dates = [
                report_date
                for report_date in report_dates
                if 0 <= (today - report_date).days <= max_days_ago
            ]
            for report_date in eligible_dates:
                available_day_offsets.add((today - report_date).days)
            if not eligible_dates:
                print(f"Skipping report {report.slug_id}: no rows in the last {days_back} days")
                continue

            report_hit_count = 0
            for query_day in sorted(set(eligible_dates), reverse=True):
                print(f"  Querying {query_day.isoformat()}")
                queried_days += 1
                if queried_days > 1:
                    time.sleep(0.25)
                rows = _load_report_detail_rows_for_day(api_key=api_key, slug_id=report.slug_id, query_day=query_day)
                seen_rows_for_day = set()
                wrote_day_data = False
                for row in rows:
                    row_key = _row_key(row)
                    if row_key in seen_rows_for_day:
                        continue
                    seen_rows_for_day.add(row_key)
                    scanned_rows += 1

                    matched_commodities = [
                        name
                        for name, target in commodity_targets.items()
                        if _row_has_commodity(row, target)
                    ]
                    if not matched_commodities:
                        continue

                    row_date = _extract_row_date(row) or query_day
                    days_ago = (today - row_date).days
                    if not (0 <= days_ago <= max_days_ago):
                        continue
                    origins = _extract_row_origins(row)
                    if not origins:
                        continue

                    for commodity_name in matched_commodities:
                        matched_rows += 1
                        matched_rows_by_commodity[commodity_name] += 1
                        report_hit_count += 1
                        wrote_day_data = True
                        commodity_origins = origins_by_commodity.setdefault(commodity_name, {})
                        for origin in origins:
                            commodity_origins.setdefault(origin, set()).add(days_ago)
                if wrote_day_data:
                    _write_food_clock_csv(
                        output_csv=output_csv,
                        max_days_ago=max_days_ago,
                        available_day_offsets=available_day_offsets,
                        commodity_order=commodities,
                        origins_by_commodity=origins_by_commodity,
                    )
            if report_hit_count == 0:
                print(f"Skipping report {report.slug_id}: no matching rows for requested commodities")
                continue
            reports_with_hits += 1
        except MarsApiError as exc:
            if exc.status_code in (401, 429):
                raise SystemExit(f"API error {exc.status_code}: {exc.message}")
            print(f"Skipping report {report.slug_id} due to API error {exc.status_code}: {exc.message}")
            continue
        except requests.RequestException as exc:
            print(f"Skipping report {report.slug_id} due to network error: {exc}")
            continue

    total_origin_rows = sum(len(origins_by_commodity.get(name, {})) for name in commodities)
    if total_origin_rows == 0:
        raise SystemExit(
            f"No origin rows found for '{city}' in requested commodities: {', '.join(commodities)}. "
            "Try broader commodity spelling or inspect rows directly."
        )

    _write_food_clock_csv(
        output_csv=output_csv,
        max_days_ago=max_days_ago,
        available_day_offsets=available_day_offsets,
        commodity_order=commodities,
        origins_by_commodity=origins_by_commodity,
    )
    print(f"Wrote {output_csv}")
    print(f"Reports scanned: {len(reports)}")
    print(f"Reports with matches: {reports_with_hits}")
    print(f"Days queried: {queried_days}")
    print(f"Rows scanned: {scanned_rows}")
    print(f"Rows matched: {matched_rows}")
    for commodity_name in commodities:
        print(
            f"{commodity_name}: matched rows={matched_rows_by_commodity[commodity_name]}, "
            f"distinct origins={len(origins_by_commodity.get(commodity_name, {}))}"
        )
    print(f"Earliest day offset: {max_days_ago}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate a food-clock CSV where columns are days since today and rows are origin locations."
        )
    )
    parser.add_argument("--city", default="Chicago", help="Terminal market city (default: Chicago)")
    parser.add_argument(
        "--commodity",
        default=DEFAULT_COMMODITY_ARG,
        help=(
            "Commodity name(s), comma-separated (or semicolon-separated to keep commas in names). "
            f"Default: {DEFAULT_COMMODITY_ARG}"
        ),
    )
    parser.add_argument(
        "--report-category",
        default="Vegetables",
        help="Terminal report category filter (default: Vegetables)",
    )
    parser.add_argument(
        "--days-back",
        type=int,
        default=365,
        help="How many days back from today to query (default: 365)",
    )
    parser.add_argument("--output", default=DEFAULT_OUTPUT_CSV, help="Output CSV path")
    parser.add_argument(
        "--plot-only",
        action="store_true",
        help="Skip API queries and plot from an existing CSV.",
    )
    parser.add_argument(
        "--no-plot",
        action="store_true",
        help="Do not render a polar plot after CSV generation.",
    )
    parser.add_argument(
        "--plot-output",
        default=DEFAULT_PLOT_IMAGE,
        help="Output image path for the polar plot.",
    )
    parser.add_argument(
        "--smooth-window-days",
        type=int,
        default=15,
        help="Low-pass smoothing window size in days (default: 15).",
    )
    parser.add_argument(
        "--smooth-passes",
        type=int,
        default=2,
        help="How many low-pass passes to apply (default: 2).",
    )
    parser.add_argument(
        "--no-show",
        action="store_true",
        help="Save the plot but do not open an interactive window.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    should_plot = not args.no_plot
    if args.plot_only:
        should_show = not args.no_show
        plot_food_clock_polar(
            csv_path=args.output,
            commodity=args.commodity,
            city=args.city,
            output_image=args.plot_output,
            smooth_window_days=max(1, args.smooth_window_days),
            smooth_passes=max(1, args.smooth_passes),
            show_plot=should_show,
        )
        return

    build_food_clock(
        city=args.city,
        commodity=args.commodity,
        output_csv=args.output,
        report_category=args.report_category,
        days_back=max(1, args.days_back),
    )

    if should_plot:
        should_show = not args.no_show
        plot_food_clock_polar(
            csv_path=args.output,
            commodity=args.commodity,
            city=args.city,
            output_image=args.plot_output,
            smooth_window_days=max(1, args.smooth_window_days),
            smooth_passes=max(1, args.smooth_passes),
            show_plot=should_show,
        )


if __name__ == "__main__":
    main()
