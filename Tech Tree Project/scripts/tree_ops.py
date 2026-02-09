#!/usr/bin/env python3
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from tree_lib import (
    Edge,
    TreeData,
    ensure_emergent_entry,
    ensure_supernode_in_catalog,
    format_edge_list,
    join_blocks,
    load_emergent,
    load_tree,
    parse_edge_list,
    remove_edge_ref,
    set_emergent_supernode,
    set_line,
    set_supernode,
    set_downstream,
    set_upstream,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def tree_path() -> Path:
    return repo_root() / "TREE.md"


def minitree_path() -> Path:
    return repo_root() / "MINITREE.md"


def supernodes_path() -> Path:
    return repo_root() / "SUPERNODES.md"


def emergent_path() -> Path:
    return repo_root() / "EMERGENT.md"


def resources_path() -> Path:
    return repo_root() / "RESOURCES.md"


def labor_path() -> Path:
    return repo_root() / "LABOR.md"


def _render_minitree_from_tree(tree: TreeData) -> str:
    names: list[str] = []
    for block in tree.blocks:
        if not block:
            continue
        first = block[0].strip()
        if first == "# TREE.md":
            continue
        if first.startswith("# "):
            names.append(first[2:].strip())

    lines: list[str] = ["# MINITREE", ""]
    lines.extend(f"- {name}" for name in names)
    return "\n".join(lines).rstrip() + "\n"


def _parse_edges(raw: list[str] | None) -> list[Edge]:
    if not raw:
        return []
    joined = "; ".join(raw)
    return parse_edge_list(f"# X: {joined}")


def _ensure_supernode_in_catalog_preview(supernode: str) -> str | None:
    trimmed = supernode.strip()
    if not trimmed or " - " not in trimmed:
        return None
    path = supernodes_path()
    if path.exists():
        existing = [ln.strip() for ln in path.read_text().splitlines() if ln.strip()]
    else:
        existing = ["## Supernodes", ""]

    if any(ln.strip().lower() == trimmed.lower() for ln in existing):
        return "\n".join(existing).rstrip() + "\n"

    age_prefix = trimmed.split(" - ", 1)[0].strip()
    insert_at = None
    for idx, ln in enumerate(existing):
        if ln.strip().lower() == age_prefix.lower():
            insert_at = idx + 1
            while insert_at < len(existing):
                cur = existing[insert_at].strip()
                if not cur:
                    break
                if not cur.startswith("##") and " - " not in cur:
                    break
                insert_at += 1
            break

    if insert_at is None:
        if existing and existing[-1].strip():
            existing.append("")
        existing.append(trimmed)
    else:
        existing.insert(insert_at, trimmed)
    return "\n".join(existing).rstrip() + "\n"


def create_node(
    name: str,
    *,
    supernode: str | None = None,
    tech_type_line: str | None = None,
    approximate_date: str | None = None,
    qualitative_effects: str | None = None,
    upstream: list[str] | None = None,
    downstream: list[str] | None = None,
    resources: dict[str, str] | None = None,
    labor_created: list[str] | None = None,
    insert_after: str | None = None,
    apply: bool = True,
) -> dict[Path, str]:
    """
    Create a new technology node in TREE.md and regenerate MINITREE.md.

    - `upstream` / `downstream`: edge strings like `"Tech (Obligate); Other (Influence)"`.
    - `labor_created`: edge strings like `"🧱 Builders / Construction Workers (Influence)"`.
    Returns the would-be written file contents (writes when `apply=True`).
    """
    tree = load_tree(tree_path())
    if name in tree.index:
        raise ValueError(f'Node "{name}" already exists in TREE.md')

    block: list[str] = [f"# {name}"]
    supernodes_next: str | None = None
    if supernode is not None:
        val = supernode.strip()
        if val:
            supernodes_next = _ensure_supernode_in_catalog_preview(val)
            set_supernode(block, val)
        else:
            set_supernode(block, None)
    if tech_type_line is not None and tech_type_line.strip():
        block.append(f"# {tech_type_line.strip()}")
    if approximate_date is not None and approximate_date.strip():
        block.append(f"# Approximate Date: {approximate_date.strip()}")
    if qualitative_effects is not None and qualitative_effects.strip():
        block.append(f"# Qualitative Effects: {qualitative_effects.strip()}")

    if resources:
        for label, value in resources.items():
            set_line(block, label, value)

    if labor_created is not None:
        edges = _parse_edges(labor_created)
        set_line(block, "Labor Type Created", format_edge_list(edges) if edges else None)

    # Insert block.
    insert_at = len(tree.blocks)
    if insert_after is not None:
        key = insert_after.strip()
        if key not in tree.index:
            raise ValueError(f'insert_after "{insert_after}" is not a known TREE.md node')
        insert_at = tree.index[key] + 1
    tree.blocks.insert(insert_at, block)
    tree.index = {k: v + (1 if v >= insert_at else 0) for k, v in tree.index.items()}
    tree.index[name] = insert_at

    # Apply upstream/downstream with reciprocity rules.
    if upstream is not None:
        set_upstream(tree, name, _parse_edges(upstream))
    if downstream is not None:
        set_downstream(tree, name, _parse_edges(downstream))

    next_tree = join_blocks(tree.blocks)
    next_minitree = _render_minitree_from_tree(tree)

    out = {tree_path(): next_tree, minitree_path(): next_minitree}
    if supernodes_next is not None:
        out[supernodes_path()] = supernodes_next
    if apply:
        if supernodes_next is not None:
            ensure_supernode_in_catalog(supernodes_path(), (supernode or "").strip())
        tree_path().write_text(next_tree)
        minitree_path().write_text(next_minitree)
    return out


def remove_node(name: str, *, apply: bool = True) -> dict[Path, str]:
    """Remove a technology node from TREE.md, scrub its edge refs, and regenerate MINITREE.md."""
    tree = load_tree(tree_path())
    if name not in tree.index:
        raise ValueError(f'Unknown node "{name}"')

    # Scrub references across the whole file first.
    for block in tree.blocks:
        remove_edge_ref(block, "Built Upon", name)
        remove_edge_ref(block, "Led To", name)

    # Drop the node block itself.
    idx = tree.index[name]
    tree.blocks.pop(idx)
    tree.index = {k: (v - 1 if v > idx else v) for k, v in tree.index.items() if k != name}

    next_tree = join_blocks(tree.blocks)
    next_minitree = _render_minitree_from_tree(tree)
    out = {tree_path(): next_tree, minitree_path(): next_minitree}
    if apply:
        tree_path().write_text(next_tree)
        minitree_path().write_text(next_minitree)
    return out


ResourceSection = Literal["natural", "processed"]


def _resource_heading_line(resource: str) -> str:
    val = (resource or "").strip()
    if not val:
        raise ValueError("Resource name is empty")
    return f"# {val}"


def create_resource(resource: str, *, section: ResourceSection = "natural", apply: bool = True) -> dict[Path, str]:
    """
    Ensure a `# <resource>` heading exists in RESOURCES.md.

    `resource` should include emoji if you use them elsewhere (e.g. "🪨 Stone").
    """
    path = resources_path()
    text = path.read_text() if path.exists() else "# RESOURCES.md\n\n## Natural Resources\n\n---\n\n## Processed / Manufactured Resources\n"
    lines = text.splitlines()
    target = _resource_heading_line(resource)
    if any(ln.strip() == target for ln in lines):
        return {path: text if text.endswith("\n") else text + "\n"}

    if section == "natural":
        section_start = next((i for i, ln in enumerate(lines) if ln.strip() == "## Natural Resources"), None)
        section_end = next((i for i, ln in enumerate(lines) if ln.strip() == "---"), len(lines))
        insert_at = section_end
        if section_start is not None:
            last_resource = None
            for i in range(section_start + 1, section_end):
                ln = lines[i].strip()
                if ln.startswith("# ") and not ln.startswith("## "):
                    last_resource = i
            insert_at = (last_resource + 1) if last_resource is not None else section_start + 1
    else:
        section_start = next((i for i, ln in enumerate(lines) if ln.strip() == "## Processed / Manufactured Resources"), None)
        insert_at = len(lines)
        if section_start is not None:
            last_resource = None
            for i in range(section_start + 1, len(lines)):
                ln = lines[i].strip()
                if ln.startswith("## "):
                    insert_at = i
                    break
                if ln.startswith("# ") and not ln.startswith("## "):
                    last_resource = i
            if last_resource is not None:
                insert_at = last_resource + 1
            else:
                insert_at = section_start + 1

    snippet: list[str] = []
    if insert_at > 0 and lines[insert_at - 1].strip() != "":
        snippet.append("")
    snippet.append(target)
    snippet.append("")
    lines[insert_at:insert_at] = snippet
    out_text = "\n".join(lines).rstrip() + "\n"
    if apply:
        path.write_text(out_text)
    return {path: out_text}


def remove_resource(resource: str, *, scrub_tree_refs: bool = True, apply: bool = True) -> dict[Path, str]:
    """Remove `# <resource>` from RESOURCES.md and optionally scrub it from TREE.md resource lines."""
    res_path = resources_path()
    res_text = res_path.read_text() if res_path.exists() else ""
    res_lines = res_text.splitlines()
    target = _resource_heading_line(resource)

    next_res_lines: list[str] = []
    i = 0
    while i < len(res_lines):
        if res_lines[i].strip() == target:
            # Drop this heading and collapse adjacent blank lines.
            if next_res_lines and next_res_lines[-1].strip() == "" and i + 1 < len(res_lines) and res_lines[i + 1].strip() == "":
                i += 2
            else:
                i += 1
            continue
        next_res_lines.append(res_lines[i])
        i += 1

    next_res_text = "\n".join(next_res_lines).rstrip() + "\n" if next_res_lines else res_text
    out: dict[Path, str] = {res_path: next_res_text}
    if apply and next_res_text != res_text:
        res_path.write_text(next_res_text)

    if scrub_tree_refs:
        tree = load_tree(tree_path())
        resource_key = resource.strip().lower()
        labels = [
            "Resources Discovered",
            "Resources Created",
            "Resources Used",
            "Resources Improved",
            "Resources Consumed",
        ]
        for block in tree.blocks:
            for label in labels:
                idx = next((j for j, ln in enumerate(block) if ln.lower().startswith(f"# {label}:".lower())), None)
                if idx is None:
                    continue
                line = block[idx]
                _, rest = line.split(":", 1)
                items = [p.strip() for p in rest.split(";") if p.strip()]
                kept = [it for it in items if it.lower() != resource_key]
                set_line(block, label, "; ".join(kept) if kept else None)

        next_tree = join_blocks(tree.blocks)
        out[tree_path()] = next_tree
        out[minitree_path()] = _render_minitree_from_tree(tree)
        if apply:
            tree_path().write_text(next_tree)
            minitree_path().write_text(out[minitree_path()])

    return out


def create_emergent(name: str, *, supernode: str | None = None, apply: bool = True) -> dict[Path, str]:
    """Ensure an EMERGENT.md entry exists (and optionally set its supernode)."""
    tree = load_tree(tree_path())
    if name in tree.index:
        raise ValueError(f'Name "{name}" already exists in TREE.md (technology node)')

    emergent = load_emergent(emergent_path())
    block = ensure_emergent_entry(emergent, name)
    supernodes_next: str | None = None
    if supernode is not None:
        val = supernode.strip()
        set_emergent_supernode(block, val or None)
        if val:
            supernodes_next = _ensure_supernode_in_catalog_preview(val)

    next_text = join_blocks(emergent.blocks)
    out = {emergent_path(): next_text}
    if supernodes_next is not None:
        out[supernodes_path()] = supernodes_next
    if apply:
        if supernodes_next is not None:
            ensure_supernode_in_catalog(supernodes_path(), (supernode or "").strip())
        emergent_path().write_text(next_text)
    return out


def remove_emergent(name: str, *, apply: bool = True) -> dict[Path, str]:
    """Remove an EMERGENT.md entry and scrub all TREE.md references to it."""
    tree = load_tree(tree_path())
    emergent = load_emergent(emergent_path())

    if name in emergent.index:
        idx = emergent.index[name]
        emergent.blocks.pop(idx)
        emergent.index = {k: (v - 1 if v > idx else v) for k, v in emergent.index.items() if k != name}

    for block in tree.blocks:
        remove_edge_ref(block, "Built Upon", name)
        remove_edge_ref(block, "Led To", name)

    next_tree = join_blocks(tree.blocks)
    next_minitree = _render_minitree_from_tree(tree)
    next_emergent = join_blocks(emergent.blocks)

    out = {tree_path(): next_tree, minitree_path(): next_minitree, emergent_path(): next_emergent}
    if apply:
        tree_path().write_text(next_tree)
        minitree_path().write_text(next_minitree)
        emergent_path().write_text(next_emergent)
    return out


@dataclass(frozen=True)
class LaborEntry:
    name: str
    unlocked_by: str
    consumed_by: str
    improved_by: str


def _split_blocks_preserve_simple(text: str) -> list[list[str]]:
    blocks: list[list[str]] = []
    cur: list[str] = []
    for line in text.splitlines():
        if line.strip() == "":
            if cur:
                blocks.append(cur)
                cur = []
            continue
        cur.append(line)
    if cur:
        blocks.append(cur)
    return blocks


def _join_blocks_simple(blocks: list[list[str]]) -> str:
    return "\n\n".join("\n".join(b) for b in blocks).rstrip() + "\n"


def _labor_name_from_block(block: list[str]) -> str | None:
    if not block:
        return None
    first = block[0].strip()
    if not first.startswith("# ") or first.startswith("## "):
        return None
    name = first[2:].strip()
    return None if not name or name == "LABOR.md" else name


def create_labor(
    name: str,
    *,
    unlocked_by: str | None = None,
    consumed_by: str | None = None,
    improved_by: str | None = None,
    apply: bool = True,
) -> dict[Path, str]:
    """Create/update a LABOR.md entry."""
    path = labor_path()
    text = path.read_text() if path.exists() else "# LABOR.md\n"
    blocks = _split_blocks_preserve_simple(text)
    index: dict[str, int] = {}
    for i, b in enumerate(blocks):
        n = _labor_name_from_block(b)
        if n:
            index[n] = i

    if name in index:
        block = blocks[index[name]]
    else:
        block = [f"# {name}", "# Unlocked by: (unknown yet)", "# Consumed by: (none yet)", "# Improved by: (none yet)"]
        blocks.append(block)

    if unlocked_by is not None:
        block[1] = f"# Unlocked by: {unlocked_by.strip() or '(unknown yet)'}"
    if consumed_by is not None:
        block[2] = f"# Consumed by: {consumed_by.strip() or '(none yet)'}"
    if improved_by is not None:
        block[3] = f"# Improved by: {improved_by.strip() or '(none yet)'}"

    out_text = _join_blocks_simple(blocks)
    out = {path: out_text}
    if apply:
        path.write_text(out_text)
    return out


def remove_labor(name: str, *, scrub_tree_refs: bool = True, apply: bool = True) -> dict[Path, str]:
    """Remove a LABOR.md entry and optionally scrub TREE.md labor references."""
    path = labor_path()
    text = path.read_text() if path.exists() else ""
    blocks = _split_blocks_preserve_simple(text)
    kept_blocks: list[list[str]] = []
    removed = False
    for b in blocks:
        if _labor_name_from_block(b) == name:
            removed = True
            continue
        kept_blocks.append(b)
    out_text = _join_blocks_simple(kept_blocks) if removed else (text if text.endswith("\n") else text + "\n")

    out: dict[Path, str] = {path: out_text}
    if apply and removed:
        path.write_text(out_text)

    if scrub_tree_refs:
        tree = load_tree(tree_path())
        target_key = name.strip().lower()
        for block in tree.blocks:
            idx = next((i for i, ln in enumerate(block) if ln.lower().startswith("# labor type created:")), None)
            if idx is None:
                continue
            line = block[idx]
            edges = parse_edge_list(line.replace("# Labor Type Created:", "# X:", 1))
            kept = [e for e in edges if e.name.strip().lower() != target_key]
            set_line(block, "Labor Type Created", format_edge_list(kept) if kept else None)

        next_tree = join_blocks(tree.blocks)
        next_minitree = _render_minitree_from_tree(tree)
        out[tree_path()] = next_tree
        out[minitree_path()] = next_minitree
        if apply:
            tree_path().write_text(next_tree)
            minitree_path().write_text(next_minitree)

    return out
