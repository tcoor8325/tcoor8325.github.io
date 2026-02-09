## README.md

This project is to create a tree graph linking all human technologies together, starting from agriculture, writing, and fire, and going up to modern inventions like LLMs, CRISPR, and cultured meat.

Technologies are connected if the previous technology is a strong enabling pre-requisite for 
the next. For example, Control of Fire strongly enables the invention of charcoal, 
which in turn led to basic smelting.
Technologies can be built upon multiple previous 
technologies, such as the Ard Plough requiring both domesticated cattle and the Hoe, 
and technologies can lead to multiple other technologies, such as the Crucible leading 
to advanced smelting of multiple metals. (These are rough and flawed historical examples which we will improve upon)

Codex and the User continually refine the tree by deleting nodes, adding nodes, 
changing connections, merging nodes together if they are too similar, or splitting 
nodes into multiple if they are too broad. Codex should not care about breaking the 
tree as it makes edits because the tree can be easily repaired.

## Webapp Functionality

- The Node server (`server.js`) serves the static frontend from `public/` and exposes `GET /api/tree` (reads nodes from `TREE.md`) and `POST /api/connection` (add/remove an edge between two existing nodes; updates both `Built Upon` and `Led To` lines in `TREE.md`).
- The canvas UI renders every node as a draggable card showing its title, type line, and approximate date; positions persist in `localStorage` so layouts survive reloads.
- Drag from a node’s bottom handle to another node to create a downstream connection; drag from a top handle to set an upstream prerequisite; click a connection line to delete it. All edits immediately write back to `TREE.md`.
- Connection lines are only drawn when at least one endpoint node is on screen, reducing clutter while panning; if exactly one endpoint is visible, the line is labeled near the visible node with the off-screen node’s name, oriented to the line and kept upright. Edges attached to selected nodes stay visible even if both endpoints scroll off-screen so selections remain trackable.
- The workspace is scrollable and resizes as you move nodes; use the header reload button to re-read `TREE.md` if it changes on disk. Styling is intentionally minimal for clarity and iteration.

## Supernodes & Layout

- Every `TREE.md` entry carries a `# Supernode:` line; these categories drive the canvas group boxes.
- Supernode names follow the age × domain pattern in `SUPERNODES.md` (ages are listed in `AGES.md`). Use those exact strings when tagging nodes.
- Run `python3 scripts/update_minitree.py` to rebuild `MINITREE.md` from `TREE.md` as a bare list of node names (intended as a small “map” for agents).
- `SUPERNODES.md` is the authoritative catalog for allowed supernodes; update it if the age/domain taxonomy changes.
- Group boxes load from the supernode list; creating or deleting a supernode in the UI updates `TREE.md`, `SUPERNODES.md`, and `groupboxes.json`.

## Agent CLI

- `MINITREE.md` is intended to be small context for agents: a bare list of technology node names in `TREE.md` order.
- Use `python3 scripts/tree_cli.py` to query/modify the tree without loading full files into context:
  - Read: `get-upstream`, `get-downstream`, `get-supernode`, `get-resources`, `get-emergent`
  - Write: `set-upstream`, `set-downstream`, `set-supernode`, `set-resources`, `set-emergent` (requires `--apply`)

## Scope, Regions, and Bias

This tree is:

- **Global in ambition**, but often uses **earliest well-documented examples** as anchor dates.
- Unavoidably biased toward regions and periods with more written records (Mesopotamia, Mediterranean, Europe, East Asia).

Guidelines:

- When multiple cultures independently invent the same thing, use the **earliest widely-dated instance** as the node's approximate date, and mention the others in the qualitative description.
- Only make **separate nodes** for regional variants if they lead to different downstream branches.

Always keep in mind: the tree is a **model**, not a definitive statement about who “did it first.”

## What "Built Upon" Really Means

Edges in this tree are **strong enabling prerequisites**, not strict logical necessities.

Use `Built Upon` when ALL of the following are true:

- The upstream technology makes the downstream **substantially easier, cheaper, or more likely** to emerge.
- In real history, the downstream appears **after** or roughly contemporaneous with the upstream in most cultures.
- You could plausibly explain the downstream as "a refinement/extension of" or "built using the tools and concepts of" the upstream.

Avoid `Built Upon` if:

- The link is purely thematic ("both are about ships").
- The downstream has well-documented **independent origins that do not rely** on the upstream.
- You're only encoding a political opinion (e.g. "Communism requires radio").

When in doubt, prefer **fewer, stronger edges** over many weak ones. We can always add edges later once we’re confident.

The tree will be written into TREE.md without the need for graphical arrow 
connections, and each entry will have the following format:

# Technology Name 
# [Technology Type], [Technology Subtype]
# TAG
# Approximate Date
# Qualitative Effects
# Built Upon: Technology Name (Obligate/Influence)
# Led To: Technology Name (Obligate/Influence)
# Resources Discovered/Created: [Emoji]
# Resources Improved: [Emoji]
# Resources Consumed: [Emoji]

All technologies referenced in 'Built Upon' and 'Led To' must either current exist in the tree or intend to be added.

## Edge Types

There are two kinds of links between technology nodes:
    A. Obligates:
        Technology A is an essential prerequisite for Technology B if, in any plausible human trajectory, B is impossible without A or something functionally equivalent to A. Remove A, and B cannot exist in practice.

        Heuristics / questions:

            If you erase A from human history, could humans still physically build or do B with the rest of what they know?

            If no, it’s Essential.

            Is A a mechanical, material, or notational requirement for B (e.g., you literally can’t reach the temperature, precision, stability, etc. without A)?

            Does B secretly contain A inside it (e.g., B is just a more elaborate version of A)?

        Examples:
            Control of Fire → Charcoal Production (you can’t do charcoal without sustained fire).

            Charcoal Production → Bloomery Iron Metallurgy (you need a high-temperature, reducing fuel).

            Numerical Notation → Double-Entry Bookkeeping (you must have a way to write numbers).

            Semiconductor Transistor → Personal Computer (no viable modern PC without some form of transistor tech).

    B. Enabling Influence Links (Influences)        
            Technology A is an enabling influence for Technology B if A significantly accelerates, guides, or shapes the development of B, but B is still in principle possible without A. Remove A, and B might arrive later, differently, or with more difficulty—but it is not ruled out.

        Heuristics / questions:

            If you erase A from history, is B still conceptually and physically possible with the remaining toolkit?

            If yes, but B would be much slower or weirder to develop, it’s Enabling.

            Does A mostly provide data, inspiration, infrastructure, or motivation rather than hard physical capability?

            Does A help optimize or scale B rather than make B possible at all?

        Examples:
            Dugout Canoe → Oceanic Sailing Ships
                Canoes are historically important, but in principle you could imagine going straight from “logs float” + “sails on rafts” to blue-water ships.
            Photography → Modern Medical Imaging
                Image capture ideas help, but X-rays and MRIs could still be developed from physics alone.
            Telegraph Infrastructure → Radio Communication
                Telegraph networks and signaling conventions help, but in principle you could leap to radio from Maxwell + basic electronics.
            Bureaucratic Record Keeping → Taxation & Central Banking
                They scale and shape them, but basic taxation is possible without a full bureaucratic system.

# Significance Metric

Add a technology if it satisfies 1 or more of:

- The technology unlocks at least 1 downstream node.
- The technology introduces a qualitatively new **capability class** for humans (e.g. powered flight, long-distance radio, antibiotics).
- The technology represents a clearly dated inflection and is adopted by multiple cultures.

Do NOT add technologies that are only:

- Minor parameter tweaks (shorter spear, slightly hotter kiln) **without** new downstream effects.
- Purely branding, naming, or political re-labelling of an existing technology.
- Entirely speculative or hypothetical with no real-world implementation.

## CITATIONS.md

- Purpose: holds justification blurbs and sources for each edge. It replaces the old READING.md.
- Format: one section per node with `### Upstream Connections` and `### Downstream Connections`. Each bullet: `- Tech [Obligate/Influence] — Justification: <1–2 sentence causal rationale>; Sources: <short source list>`.
- Coverage: every edge in `TREE.md` should have a matching entry. Keep obligate vs influence consistent with `TREE.md`.
- Brevity: keep justifications concise and evidence-oriented; avoid long essays.

## EMERGENT.md

- Purpose: captures non-technology emergent properties (social, economic, behavioral) that are influenced by technologies and in turn influence others. Originally added because AI agents kept suggesting technology nodes that were definitely moreso emergent properties.
- Format: each entry uses `# Emergent Name` and optional `# Supernode`.
- Connections: emergent “Influenced by / Influencing” relationships are derived from `TREE.md` via technologies that list emergent names in `# Built Upon:` / `# Led To:` lines; EMERGENT.md does not store edge lists.
- Scope: only add emergents that have clear, defensible causal ties to technologies; avoid vague cultural descriptors without strong links.

## LABOR.md

- Purpose: tracks labor categories spawned or improved by technologies.
- Format per entry:
  ```
  # Emoji Labor Name
  # Unlocked by: Technology
  # Consumed by: Technology list or (none yet)
  # Improved by: Technology list or (none yet)
  ```
- Scope: add when a technology creates a distinct labor role or meaningfully upgrades an existing one (not just generic “workers”).
- Consistency: keep emoji labeling aligned with other entries; mirror links in TREE.md when labor creation is a qualitative effect.

# Technology Types and Subtypes:
1. Discovery: Noticing or understanding something that already exists in nature or in logic
    a. Resource Discovery: Discovering a naturally occurring material or energy source
    b. Methematical / Scientific Discovery: Realizing a general pattern, law, or abstract tool

2. Tangible Invention
    a. Engineering Artifacts & Machines: Concrete devices/machines you can point at.
    b. Infrastructure & Built Systems: Large, spatial systems made of many artifacts and civil works.
    c. Information & Communication Systems: Physical/technical systems for storing/transmitting information.

3. Process Invention
    a. Engineering & Production Processes: Ways of transforming materials or building things.
    b. Scientific & Analytical Methods: Systematic ways of generating knowledge or data.
    c. Organizational / Operational Processes: Repeatable ways of organizing labor or workflows.
    d. Social Practices & Protocols: Repeated social “scripts” that aren’t just ideas, but also not concrete machines.    

4. Institutions & Legal Structures: These are not just “ideas” (philosophies) but concrete, enduring structures.
    a. Political Institutions: Formal structures of governance.
    b. Economic Institutions & Instruments: Concrete financial structures and tools.
    c. Legal Codes & Regulatory Regimes: Codified rules, standards, and enforcement structures.

5. Philosophies & Ideologies
    a. Political Philosophies: Normative ideas about how power should be organized.
    b. Social Philosophies: Normative ideas about social relations/rights.
    c. Economic Philosophies: Normative theories of how economies should work.
    d. Religious / Cosmological Worldviews :Structured world explanations / normative cosmologies.

To summarize:
- **Discovery**: You learn something that was already true.
- **Tangible Invention**: You build a new thing or system.
- **Process Invention**: You invent a new way of doing something.
- **Institution**: You create a durable social structure with rules and roles.
- **Philosophy**: You formulate a normative or explanatory framework.

# Resources
A file called `RESOURCES.md` exists that catalogs all raw materials and refined goods mentioned in TREE.

Entries should have the following format:
`# [Emoji] Resource Name`

`RESOURCES.md` intentionally does not track which tech nodes create/use/improve a resource; those relationships live in `TREE.md`.

## Resource Semantics

There are two broad kinds of resources:

1. **Natural Resources** (iron ore, clay, silica sand, wind, sunlight, etc.)
   - These are introduced in `TREE.md` via `# Resources Discovered:` when a technology makes them **usable or recognized**.
   - They are still considered **Discoveries** (conceptually).

2. **Processed / Manufactured Resources** (steel, paper, gunpowder, plastic, vaccines, integrated circuits, etc.)
   - These are introduced in `TREE.md` via `# Resources Created:` for the manufacturing technology.
   - They may later be improved via `# Resources Improved:` when technologies increase quality or output.

Use the resource lines in TREE.md as follows:

- `Resources Discovered:` – first tech that makes this resource visible and meaningful.
- `Resources Created:` – first tech that **manufactures** a processed resource from inputs.
- `Resources Used:` – any tech that consumes or relies on this resource.
- `Resources Improved:` – any tech that increases the *quality, efficiency, or scale* of resource production.

Every resource emoji used in TREE.md must have a corresponding entry in `RESOURCES.md`.

## REJECTED.md

- Purpose: tracks proposed nodes, supernodes, resources, or labor entries that were rejected so they are not reintroduced.
- Format: sectioned by type with simple bullet lists.

## Approximate Dates

Use dates as:

- `c. 2000 BCE` for approximate,
- `1234 CE` for more specific events,
- or ranges like `c. 800–600 BCE` if needed.

Interpretation rules:

- Use the **earliest widely-accepted date** for widespread use, not the very first possible experimental prototype—unless the prototype itself has huge downstream impact.
- For multi-origin inventions, note the **first known occurrence** but mention major independent reinventions in the Qualitative Effects/description.

## Editing Philosophy for Codex

Codex should:

- Be **willing to aggressively refactor**: delete nodes, merge similar ones, split over-broad monsters.
- Prefer **fewer, stronger edges** over speculative spiderwebs of weak ones.
- When making big changes, leave a short comment (in AGENTS/SUMMARY OF CHANGES) explaining:
  - Why certain nodes were removed/merged/split.
  - Which historical or conceptual issues were fixed (e.g. "Removed anachronistic coal usage from Bronze Age").

Codex does **not** need to preserve backwards compatibility with old tags or edges; the truth and clarity of the graph is more important than stability.

## Non-Goals

This project is **not** trying to:

- Represent every minor regional variant of a technology.
- Encode every single ideological interpretation of history.
- Provide a flawless, citation-level historical account.

It is trying to:

- Capture the **main structural dependencies** in how human capabilities accumulate.
- Be internally coherent and corrigible as we learn and refine.
