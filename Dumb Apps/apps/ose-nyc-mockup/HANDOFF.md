# HANDOFF

Date: March 25, 2026

## Current State
- This folder is still the active no-build app for the OSE NYC mock-up.
- The app now exposes two project pages only:
  - `induction-stove`
  - `water-boiler`
- `air-conditioner`, `blender`, `dishwasher`, and `microwave` are no longer in `data.js`, so they do not appear on the landing page.
- The mock-up is still cosmetic only. Auth remains local-only, and project-page state now persists per project in `localStorage`.

## App Structure
- Landing page: `index.html`
- Landing-page script: `app.js`
- Shared project-page template: `project.html`
- Shared project-page behavior: `project.js`
- Shared project content: `data.js`
- Shared styles: `style.css`
- Local media and icons: `assets/` and `images/`

## Project Inventory
- `Induction Stove` and `Water Boiler` now use the sketch images in `images/` as their primary project artwork.
- `Induction Stove` and `Water Boiler` use structured `taskPanel` data instead of the older flat `tasks` array.
- Each remaining project has:
  - 1 seeded `Software` task
  - 1 seeded `Mechanical` task
  - 1 seeded `Electrical` task
  - 4 older tasks preserved under a `General` section
- The `General` tasks on both remaining projects have generic body text instead of title-only entries.

## Shared Auth
- Mock auth still uses `localStorage` key `ose-mock-user`.
- The available mock users are:
  - `User1` using `images/Pikachu.png`
  - `User2` using `images/HeMan.png`
  - `User3` using `images/Lemongrab.png`
  - `User4` using `images/Sonic.png`
  - `Admin` using `images/Snufkin.png`
- Auth UI is shown on the landing page and on all current project pages.

## Shared Project Rendering
- All project pages still render from the same `project.html` + `project.js` pair.
- The overlapping landing-page-style project layout still applies through the shared `project-air-layout` class.
- Link rows, task content, timeline content, brief content, and Build Journal entries are still normalized from `data.js`.
- Invalid `project.html?project=<slug>` URLs still redirect back to `index.html`.
- The Air Conditioner-specific fallback branch was removed from `project.js`; the remaining projects now use the shared generic fallback brief only.

## Layout And Interactions
- Both current project pages use the shared three-zone desktop layout:
  - left `Tasks` drawer
  - center `Project Goals`, `Build Journal`, and `Progress Timeline`
  - right `Collaborate` drawer
- `Tasks`, `Collaborate`, and `Progress Timeline` still start collapsed on load.
- On mobile, the layout still falls back to the simpler stacked version.

## Tasks
- The task drawer still renders grouped disclosures for `Open Tasks`, `Closed Tasks`, and subsections such as `Software`, `Mechanical`, `Electrical`, and `General`.
- Each task card can still reveal body copy and task controls.
- Open tasks on all current projects support the lightweight volunteer flow.
- User-created task entries can still be added through the section `+` buttons.
- Task creation, assignment, and completion behavior now persist per project page in `localStorage`.

## Project Goals
- `Induction Stove` and `Water Boiler` currently rely on fallback brief generation in `project.js`.
- The displayed drawer label is still `Project Goals` when the source title is `Project Goals + Features`.
- Goal completion now persists per project page in `localStorage`.

## Timeline
- `Induction Stove` and `Water Boiler` still use the older normalized `timeline` object shape.
- The Progress Timeline is still rendered as separate software, mechanical, and electrical lanes.
- Each lane still ends with a square `Project Start` marker based on the earliest seeded timeline date.
- User-added timeline entries and approvals now persist per project page in `localStorage`.
- Seeded timeline nodes now show deterministic contributor assignments drawn from the mock user list.

## Build Journal
- `Induction Stove` now uses structured `updatesPanel` journal data with the `Journal_[x]` image set.
- `Water Boiler` still uses the older normalized `updates` array shape.
- Journal entries still render as vertically snapped slides with image media, date metadata, title text, and body copy.
- Water Boiler journal slides still fall back to the project image because that project does not yet have entry-specific media.

## Data Model
- `data.js` still supports both older normalized content and newer structured panel content.
- Structured fields currently in use:
  - `taskPanel` on both current projects
  - `updatesPanel` on `Induction Stove`
- Older normalized fields still in use:
  - `timeline` on both current projects
  - `updates` on `Water Boiler`
- Current project slugs in `data.js` are:
  - `induction-stove`
  - `water-boiler`

## Verification
- `node --check app.js` passed on March 25, 2026.
- `node --check project.js` passed on March 25, 2026.
- `node --check data.js` passed on March 25, 2026.

## Known Issues
- Collaboration URLs are still mostly placeholders.
- `Induction Stove` and `Water Boiler` still rely on fallback `Project Goals` content in `project.js`.
- `Induction Stove` and `Water Boiler` still mix newer structured task data with older normalized timeline and journal data.

## Notes
- `AGENTS.md` is still the live instruction file. Re-read it before making more UI changes.

## Next Likely Edits
- Decide whether `Water Boiler` should also be migrated to structured `updatesPanel` journal data.
- Decide whether `Induction Stove` and `Water Boiler` should also be migrated to structured `timelinePanel` and `storyPanel` data for consistency.
- Replace placeholder collaboration URLs with real Discord, Drive, GitHub, and Onshape links.
