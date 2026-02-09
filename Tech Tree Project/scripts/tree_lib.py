from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re


@dataclass(frozen=True)
class Edge:
    name: str
    type: str  # "Obligate" | "Influence"


@dataclass
class TreeData:
    blocks: list[list[str]]
    index: dict[str, int]

@dataclass
class EmergentData:
    blocks: list[list[str]]
    index: dict[str, int]


EDGE_TYPE_RE = re.compile(r"\((obligate|influence)\)\s*$", re.IGNORECASE)


def split_blocks(text: str) -> list[list[str]]:
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in text.splitlines():
        if line.strip() == "":
            if current:
                blocks.append(current)
                current = []
            continue
        current.append(line)
    if current:
        blocks.append(current)
    return blocks


def join_blocks(blocks: list[list[str]]) -> str:
    return "\n\n".join("\n".join(block) for block in blocks).rstrip() + "\n"


def is_tree_header(block: list[str]) -> bool:
    return len(block) == 1 and block[0].strip() == "# TREE.md"


def node_name_from_block(block: list[str]) -> str | None:
    if not block:
        return None
    first = block[0].strip()
    if not first.startswith("# "):
        return None
    name = first[2:].strip()
    if not name or name == "TREE.md":
        return None
    return name


def load_tree(tree_path: Path) -> TreeData:
    text = tree_path.read_text()
    blocks = split_blocks(text)
    index: dict[str, int] = {}
    for idx, block in enumerate(blocks):
        if is_tree_header(block):
            continue
        name = node_name_from_block(block)
        if not name:
            continue
        index[name] = idx
    return TreeData(blocks=blocks, index=index)


def is_emergent_header(block: list[str]) -> bool:
    return len(block) == 1 and block[0].strip() == "# EMERGENT.md"


def load_emergent(emergent_path: Path) -> EmergentData:
    text = emergent_path.read_text() if emergent_path.exists() else "# EMERGENT.md\n"
    blocks = split_blocks(text)
    if not blocks:
        blocks = [["# EMERGENT.md"]]
    if not is_emergent_header(blocks[0]):
        blocks.insert(0, ["# EMERGENT.md"])
    index: dict[str, int] = {}
    for idx, block in enumerate(blocks):
        if is_emergent_header(block):
            continue
        name = node_name_from_block(block)
        if not name:
            continue
        index[name] = idx
    return EmergentData(blocks=blocks, index=index)


def ensure_emergent_entry(data: EmergentData, name: str) -> list[str]:
    if name in data.index:
        return data.blocks[data.index[name]]
    block = [f"# {name}"]
    insert_at = 1 if data.blocks and is_emergent_header(data.blocks[0]) else 0
    data.blocks.insert(insert_at, block)
    # rebuild index
    data.index = {k: v + (1 if v >= insert_at else 0) for k, v in data.index.items()}
    data.index[name] = insert_at
    return block


def set_emergent_supernode(block: list[str], supernode: str | None) -> None:
    set_line(block, "Supernode", supernode)


def find_led_to_sources(tree: TreeData, target: str) -> list[Edge]:
    target_key = target.strip().lower()
    out: list[Edge] = []
    for block in tree.blocks:
        name = node_name_from_block(block)
        if not name or name == "TREE.md":
            continue
        for edge in get_edges(block, "Led To"):
            if edge.name.strip().lower() == target_key:
                out.append(Edge(name=name, type=edge.type))
    return out


def find_built_upon_dependents(tree: TreeData, target: str) -> list[Edge]:
    target_key = target.strip().lower()
    out: list[Edge] = []
    for block in tree.blocks:
        name = node_name_from_block(block)
        if not name or name == "TREE.md":
            continue
        for edge in get_edges(block, "Built Upon"):
            if edge.name.strip().lower() == target_key:
                out.append(Edge(name=name, type=edge.type))
    return out


def upsert_edge_ref(block: list[str], label: str, target: str, edge_type: str) -> None:
    edges = get_edges(block, label)
    next_edges: list[Edge] = []
    found = False
    for edge in edges:
        if edge.name.strip().lower() == target.strip().lower():
            next_edges.append(Edge(name=target, type=edge_type))
            found = True
        else:
            next_edges.append(edge)
    if not found:
        next_edges.append(Edge(name=target, type=edge_type))
    set_line(block, label, format_edge_list(next_edges))


def remove_edge_ref(block: list[str], label: str, target: str) -> None:
    target_key = target.strip().lower()
    edges = [e for e in get_edges(block, label) if e.name.strip().lower() != target_key]
    set_line(block, label, format_edge_list(edges) if edges else None)


def find_line_idx(block: list[str], label: str) -> int | None:
    target = f"# {label}:".lower()
    for idx, line in enumerate(block):
        if line.lower().startswith(target):
            return idx
    return None


def parse_edge_list(line: str) -> list[Edge]:
    if ":" not in line:
        return []
    _, rest = line.split(":", 1)
    parts = [p.strip() for p in re.split(r"[,;]+", rest) if p.strip()]
    edges: list[Edge] = []
    for part in parts:
        match = EDGE_TYPE_RE.search(part)
        edge_type = "Obligate"
        name = part
        if match:
            edge_type = "Influence" if match.group(1).lower() == "influence" else "Obligate"
            name = part[: match.start()].strip()
        if name:
            edges.append(Edge(name=name, type=edge_type))
    return edges


def format_edge_list(edges: list[Edge]) -> str:
    return "; ".join(f"{edge.name} ({edge.type})" for edge in edges)


def get_edges(block: list[str], label: str) -> list[Edge]:
    idx = find_line_idx(block, label)
    if idx is None:
        return []
    return parse_edge_list(block[idx])


def set_line(block: list[str], label: str, value: str | None) -> None:
    idx = find_line_idx(block, label)
    if value is None or not value.strip():
        if idx is not None:
            block.pop(idx)
        return
    line = f"# {label}: {value.strip()}"
    if idx is None:
        block.append(line)
    else:
        block[idx] = line


def get_value(block: list[str], label: str) -> str | None:
    idx = find_line_idx(block, label)
    if idx is None:
        return None
    if ":" not in block[idx]:
        return None
    _, rest = block[idx].split(":", 1)
    return rest.strip() or None


def set_supernode(block: list[str], supernode: str | None) -> None:
    set_line(block, "Supernode", supernode)


RESOURCE_LABELS = [
    "Resources Discovered",
    "Resources Created",
    "Resources Used",
    "Resources Improved",
    "Resources Consumed",
]


def get_resources(block: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for label in RESOURCE_LABELS:
        val = get_value(block, label)
        if val:
            out[label] = val
    return out


def ensure_supernode_in_catalog(supernodes_path: Path, supernode: str) -> None:
    trimmed = supernode.strip()
    if not trimmed or " - " not in trimmed:
        return
    if supernodes_path.exists():
        existing = [ln.strip() for ln in supernodes_path.read_text().splitlines() if ln.strip()]
    else:
        existing = ["## Supernodes", ""]
    if any(ln.strip().lower() == trimmed.lower() for ln in existing):
        return

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
    supernodes_path.write_text("\n".join(existing).rstrip() + "\n")


def set_upstream(tree: TreeData, node: str, upstream: list[Edge]) -> None:
    if node not in tree.index:
        raise KeyError(f'Unknown node "{node}"')
    block = tree.blocks[tree.index[node]]
    before = get_edges(block, "Built Upon")
    set_line(block, "Built Upon", format_edge_list(upstream) if upstream else None)

    before_map = {e.name: e for e in before}
    after_map = {e.name: e for e in upstream}

    removed = [e for name, e in before_map.items() if name not in after_map]
    added = [e for name, e in after_map.items() if name not in before_map]
    kept = [e for name, e in after_map.items() if name in before_map]

    # Remove this node from old upstream led-to lists.
    for edge in removed:
        if edge.name not in tree.index:
            continue
        up_block = tree.blocks[tree.index[edge.name]]
        leads = get_edges(up_block, "Led To")
        leads = [e for e in leads if e.name != node]
        set_line(up_block, "Led To", format_edge_list(leads) if leads else None)

    # Ensure this node appears in current upstream led-to lists with matching types.
    for edge in [*added, *kept]:
        if edge.name not in tree.index:
            raise KeyError(f'Upstream node "{edge.name}" does not exist')
        up_block = tree.blocks[tree.index[edge.name]]
        leads = get_edges(up_block, "Led To")
        found = False
        next_leads: list[Edge] = []
        for entry in leads:
            if entry.name == node:
                next_leads.append(Edge(name=node, type=edge.type))
                found = True
            else:
                next_leads.append(entry)
        if not found:
            next_leads.append(Edge(name=node, type=edge.type))
        set_line(up_block, "Led To", format_edge_list(next_leads) if next_leads else None)


def set_downstream(tree: TreeData, node: str, downstream: list[Edge]) -> None:
    if node not in tree.index:
        raise KeyError(f'Unknown node "{node}"')
    block = tree.blocks[tree.index[node]]
    before = get_edges(block, "Led To")
    set_line(block, "Led To", format_edge_list(downstream) if downstream else None)

    before_map = {e.name: e for e in before}
    after_map = {e.name: e for e in downstream}

    removed = [e for name, e in before_map.items() if name not in after_map]
    added = [e for name, e in after_map.items() if name not in before_map]
    kept = [e for name, e in after_map.items() if name in before_map]

    for edge in removed:
        if edge.name not in tree.index:
            continue
        down_block = tree.blocks[tree.index[edge.name]]
        built = get_edges(down_block, "Built Upon")
        built = [e for e in built if e.name != node]
        set_line(down_block, "Built Upon", format_edge_list(built) if built else None)

    for edge in [*added, *kept]:
        if edge.name not in tree.index:
            raise KeyError(f'Downstream node "{edge.name}" does not exist')
        down_block = tree.blocks[tree.index[edge.name]]
        built = get_edges(down_block, "Built Upon")
        found = False
        next_built: list[Edge] = []
        for entry in built:
            if entry.name == node:
                next_built.append(Edge(name=node, type=edge.type))
                found = True
            else:
                next_built.append(entry)
        if not found:
            next_built.append(Edge(name=node, type=edge.type))
        set_line(down_block, "Built Upon", format_edge_list(next_built) if next_built else None)
