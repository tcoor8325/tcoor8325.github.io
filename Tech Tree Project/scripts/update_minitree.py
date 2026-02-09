#!/usr/bin/env python3
"""Rebuild MINITREE.md from TREE.md as a bare list of node names."""

from __future__ import annotations

from pathlib import Path


def parse_node_names(tree_path: Path) -> list[str]:
    lines = tree_path.read_text().splitlines()
    names: list[str] = []
    for idx, line in enumerate(lines):
        if not line.startswith("# "):
            continue
        prev = lines[idx - 1] if idx > 0 else ""
        if prev.strip() or line.strip() == "# TREE.md":
            continue
        names.append(line[2:].strip())
    return names


def render_minitree(names: list[str]) -> str:
    lines: list[str] = ["# MINITREE", ""]
    lines.extend(f"- {name}" for name in names)
    return "\n".join(lines) + "\n"


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    tree_path = repo_root / "TREE.md"
    minitree_path = repo_root / "MINITREE.md"
    names = parse_node_names(tree_path)
    minitree_path.write_text(render_minitree(names))


if __name__ == "__main__":
    main()
