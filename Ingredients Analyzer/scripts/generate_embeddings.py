#!/usr/bin/env python3
"""Generate embeddings from FOODS.md and save to embeddings.json."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


MODEL = "text-embedding-3-small"
DEFAULT_BATCH_SIZE = 50
API_BASE = os.environ.get("OPENAI_API_BASE", "https://api.openai.com")


def clean_description(text: str) -> str:
    cleaned = text.strip()
    if cleaned.lower().startswith("description"):
        cleaned = cleaned[len("description") :].lstrip()
        if cleaned.startswith(":"):
            cleaned = cleaned[1:].lstrip()
    return cleaned


def extract_markdown_block(text: str) -> str:
    match = re.search(r"```(?:markdown)?\n(.*?)\n```", text, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1)
    return text


def parse_foods(path: Path) -> list[dict]:
    entries: list[dict] = []
    current: dict | None = None
    section = ""

    def push_current() -> None:
        nonlocal current
        if not current:
            return
        if not current.get("tags") and section.lower() == "cooking methods":
            current["tags"] = ["Heat (Cooking Method)"]
        parts = []
        if current.get("description"):
            parts.append(current["description"])
        if current.get("often_with"):
            parts.append(current["often_with"])
        if current.get("often_in"):
            parts.append(current["often_in"])
        description = " ".join(part.strip() for part in parts if part and part.strip()).strip()
        if not description:
            description = current["name"]
        current["description"] = description
        entries.append(current)
        current = None

    source = extract_markdown_block(path.read_text(encoding="utf-8"))

    for raw_line in source.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()

        if stripped.startswith("## "):
            push_current()
            section = stripped[3:].strip()
            continue

        match = re.match(r"^- \*\*(.+?)\*\*:\s*(.*)$", stripped)
        if match:
            push_current()
            name = match.group(1).strip()
            inline_desc = match.group(2).strip()
            current = {"name": name}
            if inline_desc:
                current["description"] = clean_description(inline_desc)
            continue

        if not current:
            continue

        tag_match = re.match(r"^- Tags:\s*(.+)$", stripped, flags=re.IGNORECASE)
        if tag_match:
            tags_raw = tag_match.group(1).strip()
            current["tags"] = [tag.strip() for tag in tags_raw.split(",") if tag.strip()]
            continue

        desc_match = re.match(r"^- Description:\s*(.+)$", stripped, flags=re.IGNORECASE)
        if desc_match:
            current["description"] = clean_description(desc_match.group(1))
            continue

        often_with_match = re.match(r"^- Often with:\s*(.+)$", stripped, flags=re.IGNORECASE)
        if often_with_match:
            current["often_with"] = often_with_match.group(1).strip()
            continue

        often_in_match = re.match(r"^- Often in:\s*(.+)$", stripped, flags=re.IGNORECASE)
        if often_in_match:
            current["often_in"] = often_in_match.group(1).strip()
            continue

    push_current()
    return entries


def build_input(entry: dict) -> str:
    description = entry.get("description", "")
    description = re.sub(r"\bOften\s+with:\s*", "", description, flags=re.IGNORECASE)
    description = re.sub(r"\bOften\s+in:\s*", "", description, flags=re.IGNORECASE)
    description = re.sub(r"\s+", " ", description).strip()
    if not description:
        return entry["name"]
    return f"{entry['name']}: {description}"


def call_embeddings(api_key: str, inputs: list[str]) -> list[list[float]]:
    payload = {
        "model": MODEL,
        "input": inputs,
        "encoding_format": "float",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/v1/embeddings",
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"API error {exc.code}: {error_body}") from exc

    parsed = json.loads(body)
    data_items = parsed.get("data", [])
    if not data_items:
        raise RuntimeError("Empty embeddings response.")

    data_items.sort(key=lambda item: item.get("index", 0))
    embeddings = [item["embedding"] for item in data_items]
    return embeddings


def main() -> int:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY is not set. Export it before running this script.")
        return 1

    base_dir = Path(__file__).resolve().parents[1]
    foods_path = base_dir / "FOODS.md"
    if not foods_path.exists():
        print(f"Missing FOODS.md at {foods_path}")
        return 1

    entries = parse_foods(foods_path)
    if not entries:
        print("No entries with descriptions found in FOODS.md")
        return 1

    inputs = [build_input(entry) for entry in entries]
    batch_size = int(os.environ.get("EMBED_BATCH_SIZE", DEFAULT_BATCH_SIZE))

    all_embeddings: list[list[float]] = []
    for start in range(0, len(inputs), batch_size):
        batch = inputs[start : start + batch_size]
        embeddings = call_embeddings(api_key, batch)
        if len(embeddings) != len(batch):
            raise RuntimeError("Embedding count mismatch for batch.")
        all_embeddings.extend(embeddings)
        time.sleep(0.2)

    if len(all_embeddings) != len(entries):
        raise RuntimeError("Embedding count mismatch for total entries.")

    output = {
        "model": MODEL,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "items": [],
    }

    for entry, vector in zip(entries, all_embeddings):
        output["items"].append(
            {
                "name": entry["name"],
                "tags": entry.get("tags", []),
                "description": entry.get("description", ""),
                "embedding": vector,
            }
        )

    output_path = base_dir / "embeddings.json"
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} embeddings to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
