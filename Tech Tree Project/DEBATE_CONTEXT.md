# DEBATE_CONTEXT.md

How to edit: keep the exact heading structure so the parser can find each question. Each question must be a `## Qn: Title` heading with `### Prompt` and `### Context` subsections beneath it. You can rewrite the content freely, but avoid removing the headings. If a question is missing, the runner will fall back to its built-in defaults.

## Q1: Scope and Structural Fit

### Prompt
Consider the history of [Node] and its current existence in the tech tree. Given the context of the tech tree project, decide whether to keep the node, split it into multiple, or merge it into another. Please defend your answer with both a logical statement and a piece of historical evidence. If you are given another person's answer to this question, respond with critiques to their answer instead of answering this prompt for yourself. Do not discuss changes to connections in this debate. If the other person tries to, remind them it is out of scope of the question.

### Context
A Technology node should be part of the tech tree if:

- The technology unlocks at least 1 downstream node.
- The technology introduces a qualitatively new **capability class** for humans (e.g. powered flight, long-distance radio, antibiotics).
- The technology represents a clearly dated inflection and is adopted by multiple cultures.

Do NOT add technologies that are only:

- Minor parameter tweaks (shorter spear, slightly hotter kiln) **without** new downstream effects.
- Purely branding, naming, or political re-labelling of an existing technology.
- Entirely speculative or hypothetical with no real-world implementation.


## Q2: Upstream Edges Only

### Prompt
Carefully consider the history of [Node] and the technologies, inventions, discoveries, techniques, ideas, emergent properties, and influences that lead to its development. Consider the connections it currently has to other nodes in the tech tree. For each connection, explain why you believe it should remain or be removed. Consider other technology nodes not currently connected that you believe should be connected, along with the appropriate connection type. For each explanation, write both a logical and factual explanation for keeping, removing, or adding the connection. Importantly, list upstream (earlier in time) connections only. If the other person suggests a downstream node, reject it powerfully. Prefer fewer, stronger connections over many weak links. Emergent property connections should be very rare. If you are given another person's answer to this question, respond with critiques to their answer instead of answering this prompt for yourself. Do not discuss changes to resources in this debate. If the other person tries to, remind them it is out of scope of the question.

### Context
EMERGENT.md captures non-technology emergent properties (social, economic, behavioral) influenced by technologies and influencing others. Emergent edges should be mirrored in TREE.md with consistent obligate/influence labels.

There are two possible kinds of links between technology nodes in the tech tree:
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

## Q3: Classification & Metadata

### Prompt
Carefully consider the history of [Node] and the current parameters of the node in the tech tree. For each of the following: Date/Date Range, Supernode, Technology Type and Subtype, Resources created/consumed/improved, labor created/consumed, justify either keeping or changing the current entries with both a logical argument and a factual argument. If you are given another person's answer to this question, respond with critiques to their answer instead of answering this prompt for yourself. Do not discus changes to connections in this debate. If the other person tries to, remind them it is out of scope of the question.

### Context
LABOR.md tracks labor categories spawned or improved by technologies. Add labor only when a distinct role is created or meaningfully upgraded. 
    Examples:
        Miners
        Herders
        Machinists
        Soldiers
        Slaves
        Bureaucrats

The possible Technology types and subtypes of the tech tree:
1) Discovery: noticing/understanding something already true.
   - Resource Discovery
   - Mathematical / Scientific Discovery
2) Tangible Invention
   - Engineering Artifacts & Machines
   - Infrastructure & Built Systems
   - Information & Communication Systems
3) Process Invention
   - Engineering & Production Processes
   - Scientific & Analytical Methods
   - Organizational / Operational Processes
   - Social Practices & Protocols
4) Institutions & Legal Structures
   - Political Institutions
   - Economic Institutions & Instruments
   - Legal Codes & Regulatory Regimes
5) Philosophies & Ideologies
   - Political Philosophies
   - Social Philosophies
   - Economic Philosophies
   - Religious / Cosmological Worldviews

Resources: RESOURCES.md catalogs all raw materials and refined goods mentioned in TREE (emoji/name only; no per-resource tech association lists). Use resource lines in TREE.md as follows:
- Resources Discovered: first tech that makes a resource visible and meaningful.
- Resources Created: first tech that manufactures a processed resource.
- Resources Used: any tech that consumes or relies on the resource.
- Resources Improved: tech that increases quality, efficiency, or scale.
Every resource emoji used in TREE.md must appear in RESOURCES.md.
Examples:
    Stone, Cotton, Cattle, Lead, Bricks, Glass

Approximate dates:
- Use "c. 2000 BCE" for approximate, "1234 CE" for specific, or ranges like "c. 800-600 BCE".
- Use the earliest widely-accepted date for widespread use, not a one-off prototype, unless the prototype has major downstream impact.
- For multi-origin inventions, note the first known occurrence and mention reinventions in the qualitative description.

Emergents: EMERGENT.md is a metadata list (name + optional supernode). Emergent connections are represented in TREE.md by including emergent names in technology `Built Upon` / `Led To` lines.

## Supernodes
These are the broader categories the tree is divided into. A technology node must be part of exactly one of these supernodes. There are 50 supernode categories that are repeated across 9 historical ages. 

The supernode historical age categories are as follows: 
- **Early Foraging Age** (c. 3,300,000-200,000 BCE)
- **Late Foraging Age** (c. 200,000-10,000 BCE)
- **Early Farming Age** (c. 10,000-4000 BCE)
- **Urban Agrarian Age** (c. 4000-1000 BCE)
- **Imperial Agrarian Age** (c. 1000 BCE-500 CE)
- **Connected Agrarian Age** (c. 500-1500 CE)
- **Mechanized Production Age** (c. 1500-1800 CE)
- **Fossil-Industrial Age** (c. 1800-1970 CE)
- **Information Age** (c. 1970 CE-present)

And the supernode technology categories are as follows:
    Cognition, Learning & Symbolic Thought
    Beliefs, Ritual & Religion
    Law, Justice & Contract
    Governance, Administration & Institutions
    Trade, Markets & Finance
    Science, Education & Inquiry
    Mathematics & Quantification
    Timekeeping, Weights & Measures
    Cartography & Geographic Knowledge
    Writing & Notation Systems
    Texts, Print & Archives
    Communication & Telecommunications
    Algorithms, Data & AI
    Music, Rhythm & Dance
    Visual Art & Iconography
    Cosmetics, Dress & Body Adornment
    Foraging, Gathering & Wild Resource Use
    Agriculture & Field Systems
    Plant Domestication & Crop Diversity
    Pastoralism, Herding & Draft Animals
    Irrigation & Water Management
    Landscape & Environmental Engineering
    Crop Improvement, Soils & Fertility
    Food Processing, Preservation & Bioprocessing
    Lithics & Early Tool Materials
    Wood, Bone & Organic Craft
    Textiles & Clothing
    Ceramics, Pottery & Kilns
    Bricks, Masonry & Mortars
    Glass & Optics
    Mining & Ore Processing
    Metallurgy: Copper, Bronze & Nonferrous
    Metallurgy: Iron & Steel
    Polymers, Rubber, Plastics & Composites
    Precision Manufacturing & Machine Tools
    Simple Machines, Mechanisms & Mechanical Transmission
    Fire, Combustion & Heat Management
    Fuels & Energy Sources
    Prime Movers: Muscle, Water & Wind
    Engines, Turbines & Industrial Power
    Electricity & Magnetism
    Power Transmission, Grids & Storage
    Shelter, Housing & Domestic Architecture
    Urban Infrastructure & Public Works
    Water Supply, Sanitation & Waste Systems
    Climate Control, Heating & Ventilation
    Transport & Vehicles (Land, Sea & Air)
    Navigation, Orientation & Exploration
    Warfare, Weapons & Fortification
    Health, Medicine & Public Health
    Uncategorized / Cross-cutting Systems

So to make a supernode name, you combine an Age category with a Technology category like so:
    Information Age - Fuels & Energy Sources
    Fossil-Industrial Age - Law, Justice & Contract
    Imperial Agrarian Age - Texts, Print & Archives
