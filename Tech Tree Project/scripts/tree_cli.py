#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys

from tree_lib import (
    Edge,
    ensure_supernode_in_catalog,
    format_edge_list,
    find_built_upon_dependents,
    find_led_to_sources,
    load_emergent,
    get_edges,
    get_resources,
    get_value,
    join_blocks,
    load_tree,
    parse_edge_list,
    remove_edge_ref,
    set_emergent_supernode,
    set_downstream,
    set_line,
    set_supernode,
    set_upstream,
    upsert_edge_ref,
    ensure_emergent_entry,
)
from tree_ops import (
    create_emergent as op_create_emergent,
    create_labor as op_create_labor,
    create_node as op_create_node,
    create_resource as op_create_resource,
    remove_emergent as op_remove_emergent,
    remove_labor as op_remove_labor,
    remove_node as op_remove_node,
    remove_resource as op_remove_resource,
)


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def tree_path() -> Path:
    return repo_root() / "TREE.md"


def supernodes_path() -> Path:
    return repo_root() / "SUPERNODES.md"

def emergent_path() -> Path:
    return repo_root() / "EMERGENT.md"

def minitree_path() -> Path:
    return repo_root() / "MINITREE.md"


def read_minitree_names() -> set[str]:
    if not minitree_path().exists():
        return set()
    names: set[str] = set()
    for line in minitree_path().read_text().splitlines():
        line = (line or "").strip()
        if line.startswith("- "):
            names.add(line[2:].strip())
    return names


def parse_edge_args(raw: list[str]) -> list[Edge]:
    if not raw:
        return []
    joined = "; ".join(raw)
    # Reuse parser by fabricating a label line.
    return parse_edge_list(f"# X: {joined}")


def require_node(tree, name: str) -> list[str]:
    if name not in tree.index:
        raise SystemExit(f'Unknown node: "{name}"')
    return tree.blocks[tree.index[name]]


def cmd_get_upstream(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)
    edges = get_edges(block, "Built Upon")
    if args.plain:
        print("\n".join(edge.name for edge in edges))
    else:
        print(format_edge_list(edges))
    return 0


def cmd_get_downstream(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)
    edges = get_edges(block, "Led To")
    if args.plain:
        print("\n".join(edge.name for edge in edges))
    else:
        print(format_edge_list(edges))
    return 0


def cmd_get_supernode(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)
    val = get_value(block, "Supernode")
    print(val or "")
    return 0


def cmd_get_resources(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)
    res = get_resources(block)
    if args.plain:
        for label in (
            "Resources Discovered",
            "Resources Created",
            "Resources Used",
            "Resources Improved",
            "Resources Consumed",
        ):
            if label in res:
                print(res[label])
        return 0
    for key in sorted(res.keys()):
        print(f"{key}: {res[key]}")
    return 0


def cmd_get_node(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)
    print("\n".join(block))
    return 0


def cmd_set_supernode(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)
    next_supernode = args.supernode.strip() if args.supernode else ""
    if next_supernode:
        if args.apply:
            ensure_supernode_in_catalog(supernodes_path(), next_supernode)
        set_supernode(block, next_supernode)
    else:
        set_supernode(block, None)
    out = join_blocks(tree.blocks)
    if args.apply:
        tree_path().write_text(out)
    else:
        sys.stdout.write(out)
    return 0


def cmd_set_upstream(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    edges = parse_edge_args(args.upstream)
    set_upstream(tree, args.node, edges)
    out = join_blocks(tree.blocks)
    if args.apply:
        tree_path().write_text(out)
    else:
        sys.stdout.write(out)
    return 0


def cmd_set_downstream(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    edges = parse_edge_args(args.downstream)
    set_downstream(tree, args.node, edges)
    out = join_blocks(tree.blocks)
    if args.apply:
        tree_path().write_text(out)
    else:
        sys.stdout.write(out)
    return 0


def cmd_set_resources(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    block = require_node(tree, args.node)

    touched = False
    if args.discovered is not None:
        set_line(block, "Resources Discovered", args.discovered)
        touched = True
    if args.created is not None:
        set_line(block, "Resources Created", args.created)
        touched = True
    if args.used is not None:
        set_line(block, "Resources Used", args.used)
        touched = True
    if args.improved is not None:
        set_line(block, "Resources Improved", args.improved)
        touched = True
    if args.consumed is not None:
        set_line(block, "Resources Consumed", args.consumed)
        touched = True

    if not touched:
        raise SystemExit("No resource fields provided (use --discovered/--created/--used/--improved/--consumed).")

    out = join_blocks(tree.blocks)
    if args.apply:
        tree_path().write_text(out)
    else:
        sys.stdout.write(out)
    return 0


def cmd_get_emergent(args: argparse.Namespace) -> int:
    tree = load_tree(tree_path())
    emergent = load_emergent(emergent_path())
    block = emergent.blocks[emergent.index[args.name]] if args.name in emergent.index else None
    supernode = get_value(block, "Supernode") if block else None

    influenced_by = find_led_to_sources(tree, args.name)
    influencing = find_built_upon_dependents(tree, args.name)

    print(f"# {args.name}")
    if supernode:
        print(f"# Supernode: {supernode}")
    print(f"# Influenced by: {format_edge_list(influenced_by) if influenced_by else '(none yet)'}")
    print(f"# Influencing: {format_edge_list(influencing) if influencing else '(none yet)'}")
    return 0


def cmd_set_emergent(args: argparse.Namespace) -> int:
    if not args.apply:
        raise SystemExit("set-emergent touches multiple files; rerun with --apply.")

    tree = load_tree(tree_path())
    if args.name in tree.index:
        raise SystemExit(f'Name "{args.name}" already exists in TREE.md (technology node).')
    if args.name in read_minitree_names():
        raise SystemExit(f'Name "{args.name}" appears in MINITREE.md; emergents must not be listed there.')

    emergent = load_emergent(emergent_path())
    block = ensure_emergent_entry(emergent, args.name)

    if args.supernode is not None:
        val = (args.supernode or "").strip()
        set_emergent_supernode(block, val or None)
        if val:
            ensure_supernode_in_catalog(supernodes_path(), val)

    if args.influenced_by is not None:
        # Clear all incoming tech->emergent refs first.
        for b in tree.blocks:
            name = b[0][2:].strip() if b and b[0].startswith("# ") else None
            if not name or name == "TREE.md":
                continue
            remove_edge_ref(b, "Led To", args.name)
        for edge in parse_edge_args(args.influenced_by):
            if edge.name not in tree.index:
                raise SystemExit(f'Unknown technology node in --influenced-by: "{edge.name}"')
            src_block = tree.blocks[tree.index[edge.name]]
            upsert_edge_ref(src_block, "Led To", args.name, edge.type)

    if args.influencing is not None:
        # Clear all emergent->tech refs first.
        for b in tree.blocks:
            name = b[0][2:].strip() if b and b[0].startswith("# ") else None
            if not name or name == "TREE.md":
                continue
            remove_edge_ref(b, "Built Upon", args.name)
        for edge in parse_edge_args(args.influencing):
            if edge.name not in tree.index:
                raise SystemExit(f'Unknown technology node in --influencing: "{edge.name}"')
            dst_block = tree.blocks[tree.index[edge.name]]
            upsert_edge_ref(dst_block, "Built Upon", args.name, edge.type)

    tree_path().write_text(join_blocks(tree.blocks))
    emergent_path().write_text(join_blocks(emergent.blocks))
    return 0


def cmd_create_node(args: argparse.Namespace) -> int:
    if not args.apply:
        raise SystemExit("create-node touches multiple files; rerun with --apply.")
    op_create_node(
        args.name,
        supernode=args.supernode,
        tech_type_line=args.type_line,
        approximate_date=args.date,
        qualitative_effects=args.effects,
        upstream=args.upstream,
        downstream=args.downstream,
        insert_after=args.insert_after,
        apply=True,
    )
    return 0


def cmd_remove_node(args: argparse.Namespace) -> int:
    if not args.apply:
        raise SystemExit("remove-node touches multiple files; rerun with --apply.")
    op_remove_node(args.name, apply=True)
    return 0


def cmd_create_resource(args: argparse.Namespace) -> int:
    out = op_create_resource(args.resource, section=args.section, apply=args.apply)
    if not args.apply:
        sys.stdout.write(out[repo_root() / "RESOURCES.md"])
    return 0


def cmd_remove_resource(args: argparse.Namespace) -> int:
    if args.scrub_tree_refs and not args.apply:
        raise SystemExit("remove-resource with --scrub-tree-refs touches multiple files; rerun with --apply.")
    out = op_remove_resource(args.resource, scrub_tree_refs=args.scrub_tree_refs, apply=args.apply)
    if not args.apply:
        sys.stdout.write(out[repo_root() / "RESOURCES.md"])
    return 0


def cmd_create_emergent(args: argparse.Namespace) -> int:
    if not args.apply:
        raise SystemExit("create-emergent may update multiple files; rerun with --apply.")
    op_create_emergent(args.name, supernode=args.supernode, apply=True)
    return 0


def cmd_remove_emergent(args: argparse.Namespace) -> int:
    if not args.apply:
        raise SystemExit("remove-emergent touches multiple files; rerun with --apply.")
    op_remove_emergent(args.name, apply=True)
    return 0


def cmd_create_labor(args: argparse.Namespace) -> int:
    out = op_create_labor(
        args.name,
        unlocked_by=args.unlocked_by,
        consumed_by=args.consumed_by,
        improved_by=args.improved_by,
        apply=args.apply,
    )
    if not args.apply:
        sys.stdout.write(out[repo_root() / "LABOR.md"])
    return 0


def cmd_remove_labor(args: argparse.Namespace) -> int:
    if args.scrub_tree_refs and not args.apply:
        raise SystemExit("remove-labor with --scrub-tree-refs touches multiple files; rerun with --apply.")
    out = op_remove_labor(args.name, scrub_tree_refs=args.scrub_tree_refs, apply=args.apply)
    if not args.apply:
        sys.stdout.write(out[repo_root() / "LABOR.md"])
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Query/edit TREE.md.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("get-node", help="Print the full TREE.md block for a node.")
    p.add_argument("node")
    p.set_defaults(func=cmd_get_node)

    p = sub.add_parser("get-upstream", help="Print Built Upon list for a node.")
    p.add_argument("node")
    p.add_argument("--plain", action="store_true", help="Print only names, one per line.")
    p.set_defaults(func=cmd_get_upstream)

    p = sub.add_parser("get-downstream", help="Print Led To list for a node.")
    p.add_argument("node")
    p.add_argument("--plain", action="store_true", help="Print only names, one per line.")
    p.set_defaults(func=cmd_get_downstream)

    p = sub.add_parser("get-supernode", help="Print Supernode for a node.")
    p.add_argument("node")
    p.set_defaults(func=cmd_get_supernode)

    p = sub.add_parser("get-resources", help="Print resource lines for a node.")
    p.add_argument("node")
    p.add_argument("--plain", action="store_true", help="Print only values, one per line.")
    p.set_defaults(func=cmd_get_resources)

    p = sub.add_parser("set-supernode", help="Set the Supernode line for a node (updates SUPERNODES.md when needed).")
    p.add_argument("node")
    p.add_argument("supernode", nargs="?", default="")
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md (default prints updated file).")
    p.set_defaults(func=cmd_set_supernode)

    p = sub.add_parser("set-upstream", help='Set "Built Upon" for a node and mirror into upstream "Led To".')
    p.add_argument("node")
    p.add_argument("upstream", nargs="*", help='Edges like: "Tech (Obligate); Other (Influence)"')
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md (default prints updated file).")
    p.set_defaults(func=cmd_set_upstream)

    p = sub.add_parser("set-downstream", help='Set "Led To" for a node and mirror into downstream "Built Upon".')
    p.add_argument("node")
    p.add_argument("downstream", nargs="*", help='Edges like: "Tech (Obligate); Other (Influence)"')
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md (default prints updated file).")
    p.set_defaults(func=cmd_set_downstream)

    p = sub.add_parser("set-resources", help="Set resource lines for a node.")
    p.add_argument("node")
    p.add_argument("--discovered", default=None)
    p.add_argument("--created", default=None)
    p.add_argument("--used", default=None)
    p.add_argument("--improved", default=None)
    p.add_argument("--consumed", default=None)
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md (default prints updated file).")
    p.set_defaults(func=cmd_set_resources)

    p = sub.add_parser("get-emergent", help="Print computed emergent connections (from TREE.md) plus metadata (from EMERGENT.md).")
    p.add_argument("name")
    p.set_defaults(func=cmd_get_emergent)

    p = sub.add_parser("set-emergent", help="Create/update an emergent entry (EMERGENT.md) and wire connections via TREE.md references.")
    p.add_argument("name")
    p.add_argument("--supernode", default=None, help="Set/clear EMERGENT supernode (empty clears).")
    p.add_argument(
        "--influenced-by",
        dest="influenced_by",
        nargs="*",
        default=None,
        help='Replace tech->emergent edges (updates tech "Led To"). Example: "Modern Smartphones (Influence)".',
    )
    p.add_argument(
        "--influencing",
        nargs="*",
        default=None,
        help='Replace emergent->tech edges (updates tech "Built Upon"). Example: "Data Centers & Cloud Computing (Influence)".',
    )
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md and EMERGENT.md.")
    p.set_defaults(func=cmd_set_emergent)

    p = sub.add_parser("create-node", help="Create a new technology node (updates TREE.md + MINITREE.md).")
    p.add_argument("name")
    p.add_argument("--supernode", default=None, help="Set Supernode (empty clears).")
    p.add_argument("--type-line", dest="type_line", default=None, help='Set the unlabeled type line, e.g. "Process Invention, Social Practices & Protocols".')
    p.add_argument("--date", default=None, help='Set "Approximate Date" value (without the label).')
    p.add_argument("--effects", default=None, help='Set "Qualitative Effects" value (without the label).')
    p.add_argument("--insert-after", default=None, help="Insert immediately after an existing node name (default: append).")
    p.add_argument("--upstream", nargs="*", default=None, help='Optional Built Upon edges like: "Tech (Obligate); Other (Influence)"')
    p.add_argument("--downstream", nargs="*", default=None, help='Optional Led To edges like: "Tech (Obligate); Other (Influence)"')
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md and MINITREE.md.")
    p.set_defaults(func=cmd_create_node)

    p = sub.add_parser("remove-node", help="Remove a technology node (scrubs edge refs, updates TREE.md + MINITREE.md).")
    p.add_argument("name")
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md and MINITREE.md.")
    p.set_defaults(func=cmd_remove_node)

    p = sub.add_parser("create-resource", help="Ensure a resource exists in RESOURCES.md.")
    p.add_argument("resource")
    p.add_argument("--section", choices=["natural", "processed"], default="natural")
    p.add_argument("--apply", action="store_true", help="Write changes to RESOURCES.md (default prints updated file).")
    p.set_defaults(func=cmd_create_resource)

    p = sub.add_parser("remove-resource", help="Remove a resource from RESOURCES.md.")
    p.add_argument("resource")
    p.add_argument("--scrub-tree-refs", action="store_true", help="Also scrub this resource from TREE.md and update MINITREE.md.")
    p.add_argument("--apply", action="store_true", help="Write changes (default prints updated RESOURCES.md when safe).")
    p.set_defaults(func=cmd_remove_resource)

    p = sub.add_parser("create-emergent", help="Create/update an emergent entry (may update SUPERNODES.md).")
    p.add_argument("name")
    p.add_argument("--supernode", default=None, help="Set/clear EMERGENT supernode (empty clears).")
    p.add_argument("--apply", action="store_true", help="Write changes to EMERGENT.md (and SUPERNODES.md when needed).")
    p.set_defaults(func=cmd_create_emergent)

    p = sub.add_parser("remove-emergent", help="Remove an emergent entry and scrub TREE.md references.")
    p.add_argument("name")
    p.add_argument("--apply", action="store_true", help="Write changes to TREE.md, MINITREE.md, and EMERGENT.md.")
    p.set_defaults(func=cmd_remove_emergent)

    p = sub.add_parser("create-labor", help="Create/update a LABOR.md entry.")
    p.add_argument("name")
    p.add_argument("--unlocked-by", dest="unlocked_by", default=None)
    p.add_argument("--consumed-by", dest="consumed_by", default=None)
    p.add_argument("--improved-by", dest="improved_by", default=None)
    p.add_argument("--apply", action="store_true", help="Write changes to LABOR.md (default prints updated file).")
    p.set_defaults(func=cmd_create_labor)

    p = sub.add_parser("remove-labor", help="Remove a LABOR.md entry.")
    p.add_argument("name")
    p.add_argument("--scrub-tree-refs", action="store_true", help="Also scrub this labor from TREE.md and update MINITREE.md.")
    p.add_argument("--apply", action="store_true", help="Write changes (default prints updated LABOR.md when safe).")
    p.set_defaults(func=cmd_remove_labor)

    return parser


def main(argv: list[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args) or 0)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
