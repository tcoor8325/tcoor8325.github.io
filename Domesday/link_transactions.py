#!/usr/bin/env python3
"""Link exported transaction CSV data into Domesday.csv."""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple


def normalize_label(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.strip().lower())


def parse_date(value: str) -> Optional[str]:
    raw = (value or "").strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%m/%d/%y")
        except ValueError:
            continue
    return None


def parse_decimal(value: str) -> Optional[Decimal]:
    raw = (value or "").strip().replace(",", "")
    if not raw:
        return None
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None


def format_decimal(value: Decimal) -> str:
    as_text = format(value.quantize(Decimal("0.01")), "f")
    as_text = as_text.rstrip("0").rstrip(".")
    return as_text or "0"


def ensure_row_width(rows: List[List[str]], width: int) -> None:
    for row in rows:
        while len(row) < width:
            row.append("")


def build_line_item_row_map(rows: List[List[str]]) -> Dict[str, int]:
    row_map: Dict[str, int] = {}
    for row_idx in range(2, len(rows)):
        row = rows[row_idx]
        if len(row) < 2:
            continue
        line_item = row[1].strip()
        if not line_item or line_item.lower() == "total":
            continue
        row_map[normalize_label(line_item)] = row_idx
    return row_map


def build_date_slot_map(rows: List[List[str]]) -> Dict[str, List[int]]:
    if len(rows) < 2:
        return {}

    date_row = rows[0]
    kind_row = rows[1]
    width = max(len(date_row), len(kind_row))
    ensure_row_width(rows, width)

    slots: Dict[str, List[int]] = defaultdict(list)
    col_idx = 3
    while col_idx + 1 < width:
        date_key = parse_date(date_row[col_idx])
        left_kind = kind_row[col_idx].strip().lower()
        right_kind = kind_row[col_idx + 1].strip().lower()

        if date_key and left_kind == "description" and right_kind == "amount":
            slots[date_key].append(col_idx)
            col_idx += 2
            continue
        col_idx += 1

    return dict(slots)


def insert_date_slot(
    rows: List[List[str]],
    date_key: str,
    col_idx: int,
) -> None:
    ensure_row_width(rows, col_idx)
    for row in rows:
        row[col_idx:col_idx] = ["", ""]

    rows[0][col_idx] = date_key
    rows[0][col_idx + 1] = ""
    rows[1][col_idx] = "Description"
    rows[1][col_idx + 1] = "Amount"


def reserve_slot_for_transaction(
    rows: List[List[str]],
    date_slots: Dict[str, List[int]],
    date_key: str,
    row_idx: int,
) -> Tuple[int, Dict[str, List[int]]]:
    slot_cols = date_slots.get(date_key, [])
    if not slot_cols:
        insert_date_slot(rows, date_key, len(rows[0]))
        date_slots = build_date_slot_map(rows)
        slot_cols = date_slots.get(date_key, [])

    row = rows[row_idx]
    for desc_col in slot_cols:
        ensure_row_width(rows, desc_col + 2)
        if not row[desc_col] and not row[desc_col + 1]:
            return desc_col, date_slots

    insert_at = slot_cols[-1] + 2
    insert_date_slot(rows, date_key, insert_at)
    date_slots = build_date_slot_map(rows)
    return date_slots[date_key][-1], date_slots


def read_rows(path: Path) -> List[List[str]]:
    with path.open("r", newline="", encoding="utf-8") as infile:
        return list(csv.reader(infile))


def write_rows(path: Path, rows: Iterable[List[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as outfile:
        writer = csv.writer(outfile, lineterminator="\n")
        writer.writerows(rows)


def link_transactions(
    transactions_csv: Path,
    domesday_csv: Path,
    output_csv: Optional[Path] = None,
    mode: str = "add",
) -> Dict[str, object]:
    if mode not in {"add", "set"}:
        raise ValueError("mode must be 'add' or 'set'")

    domesday_rows = read_rows(domesday_csv)
    if len(domesday_rows) < 2:
        raise ValueError("Domesday.csv is missing expected headers.")

    ensure_row_width(domesday_rows, max(len(domesday_rows[0]), len(domesday_rows[1]), 3))
    date_slots = build_date_slot_map(domesday_rows)
    line_item_rows = build_line_item_row_map(domesday_rows)

    unmatched_categories: Dict[str, int] = defaultdict(int)
    unmatched_dates: Dict[str, int] = defaultdict(int)

    stats = {
        "rows_read": 0,
        "rows_linked": 0,
        "rows_skipped_missing_category": 0,
        "rows_skipped_missing_amount": 0,
        "rows_skipped_unparseable_date": 0,
    }

    prepared_transactions: List[Tuple[int, str, str, Decimal]] = []

    with transactions_csv.open("r", newline="", encoding="utf-8") as infile:
        reader = csv.DictReader(infile)
        for tx in reader:
            stats["rows_read"] += 1

            category = (tx.get("Category") or "").strip()
            if not category:
                stats["rows_skipped_missing_category"] += 1
                continue

            row_idx = line_item_rows.get(normalize_label(category))
            if row_idx is None:
                unmatched_categories[category] += 1
                continue

            tx_date = parse_date((tx.get("Transaction Date") or "").strip())
            if not tx_date:
                tx_date = parse_date((tx.get("Posted Date") or "").strip())
            if not tx_date:
                stats["rows_skipped_unparseable_date"] += 1
                continue

            amount = parse_decimal(tx.get("Debit", ""))
            if amount is None:
                amount = parse_decimal(tx.get("Credit", ""))
            if amount is None:
                stats["rows_skipped_missing_amount"] += 1
                continue

            description = (tx.get("Description") or "").strip()
            prepared_transactions.append((row_idx, tx_date, description, amount))
            stats["rows_linked"] += 1

    if mode == "set":
        touched_by_row: Dict[int, set[str]] = defaultdict(set)
        for row_idx, tx_date, _, _ in prepared_transactions:
            touched_by_row[row_idx].add(tx_date)

        for row_idx, touched_dates in touched_by_row.items():
            for tx_date in touched_dates:
                for desc_col in date_slots.get(tx_date, []):
                    ensure_row_width(domesday_rows, desc_col + 2)
                    domesday_rows[row_idx][desc_col] = ""
                    domesday_rows[row_idx][desc_col + 1] = ""

    updated_cells = 0
    for row_idx, tx_date, description, amount in prepared_transactions:
        if tx_date not in date_slots:
            unmatched_dates[tx_date] += 1

        desc_col, date_slots = reserve_slot_for_transaction(
            domesday_rows,
            date_slots,
            tx_date,
            row_idx,
        )
        ensure_row_width(domesday_rows, desc_col + 2)
        domesday_rows[row_idx][desc_col] = description
        domesday_rows[row_idx][desc_col + 1] = format_decimal(amount)
        updated_cells += 1

    destination = output_csv or domesday_csv
    write_rows(destination, domesday_rows)

    return {
        "ok": True,
        "mode": mode,
        "transactions_csv": str(transactions_csv),
        "domesday_csv": str(domesday_csv),
        "output_csv": str(destination),
        "updated_cells": updated_cells,
        "stats": stats,
        "unmatched_categories": dict(sorted(unmatched_categories.items())),
        "unmatched_dates": dict(sorted(unmatched_dates.items())),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Link exported transactions into Domesday.csv."
    )
    parser.add_argument(
        "--transactions",
        default="Jan-Feb_Transactions.csv",
        help="Path to exported transactions CSV.",
    )
    parser.add_argument(
        "--domesday",
        default="Domesday.csv",
        help="Path to Domesday CSV file.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Optional output path. Defaults to in-place update of --domesday.",
    )
    parser.add_argument(
        "--mode",
        choices=("add", "set"),
        default="add",
        help="Use 'add' to add to existing values, or 'set' to overwrite touched cells.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = link_transactions(
        transactions_csv=Path(args.transactions),
        domesday_csv=Path(args.domesday),
        output_csv=Path(args.output) if args.output else None,
        mode=args.mode,
    )
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
