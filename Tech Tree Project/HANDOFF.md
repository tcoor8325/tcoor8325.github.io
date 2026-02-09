# HANDOFF.md

## Current State
- Frontend: time-scale slider stretches Y-axis grid, resizes supernodes to age ranges, and resnaps node Y positions to Approximate Dates; “Snap to Timeline” forces node + supernode resnaps. “Snap to Supernode” centers node X within its supernode and skips nodes already inside; off-screen connection labels fade (~1.05s) and stay at 240px along-line offset with a 12px nudge.
- Data model:
  - `TREE.md` is the source of truth for technology nodes and all edges (including edges to emergent properties by name reference).
  - `MINITREE.md` is a bare, `TREE.md`-order list of technology node names (agent “map”).
  - `EMERGENT.md` is metadata-only (name + optional supernode); it does not store edge lists.
  - `RESOURCES.md` is emoji/name catalog only; resource↔tech relationships live in `TREE.md`.
- Data/API:
  - positions persist via `positions.json`; supernode boxes via `/api/supernodes/box`.
  - supernode catalog/order for the UI is `SUPERNODES.md` (not `MINITREE.md`).
  - `/api/citations` expects `CITATIONS.md` to be present (exists, may be stale).
- Agent tooling:
  - `python3 scripts/update_minitree.py` regenerates `MINITREE.md` from `TREE.md`.
  - `python3 scripts/tree_cli.py` supports `get-upstream/get-downstream/get-supernode/get-resources/get-emergent` plus setters (some require `--apply`).
- Agent loop: two debaters (Historian/Engineer) + Moderator in `debate_runner.py`. Round prompts require explicit agree/disagree; `call_delay_seconds` throttling via `--call-delay` flags in `debate_loop.py` and `control_multi_agents.py`.
- Recent node additions: Oral Contraceptives, Oral Rehydration Therapy, Fiber Optics, Zone Refining, Sword, Investment Banks, Insurance, de Laval Nozzle, Turbosupercharger, Turbojet, Turbofan, Ramjet, Pulsejet.

## Gaps / Risks
- `MINITREE.md` can get stale after node rename/add/remove; regenerate after edits to `TREE.md`.
- `CITATIONS.md` likely missing entries for new/modified edges; `/api/citations` will return incomplete data.
- Snap-to-Supernode centers nodes on X only; dense columns may overlap without a spread/packing pass.
- Date parsing still averages ranges; odd formats/missing dates leave nodes at prior Y.
- `DEBATE_CONTEXT.md` parsing is strict about headings; missing `## Qn` / `### Prompt` / `### Context` sections will cause fallback prompts.

## Near-Term TODO
- Run `python3 scripts/update_minitree.py` after edits to `TREE.md`.
- Update `CITATIONS.md` for new/modified edges (including tech↔emergent edges expressed in `TREE.md`).
- If agents will rely heavily on `scripts/tree_cli.py`, consider adding a `--json` mode for stable parsing.
- Consider adding downstream nodes for the jet engine chain (Jet Aircraft/Airliner) and industrial turbine chain (Steam Turbine).
