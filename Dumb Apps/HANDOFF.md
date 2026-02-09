# HANDOFF

Date: February 8, 2026

## Current State
- Two apps live:
  - `apps/startup-generator/` — generates random "It's like X, but for Y!" pitches.
  - `apps/tone-generator/` — plays a selectable waveform (sine/square/saw/triangle) at slider-set frequency.
- Two shared data files at the repo root: `startups.md` (78 startup names) and `users.md` (144 user types across professions, demographics, religions, disabilities, and more).
- `app.js` fetches those .md files at runtime and falls back to hardcoded arrays if the fetch fails.
- Section headers in `users.md` (e.g. "Professions", "Demographics") are filtered out by a `sectionHeaders` set in `app.js` — if you add a new section to `users.md`, add its header to that set too.
- Root `index.html` is now a plain white launcher page with simple links to each app.

## Decisions Made
- No frameworks — plain HTML/CSS/JS only.
- Each app is self-contained under `apps/<slug>/`.
- Data lives in root .md files so it's easy to edit without touching code.
- Pitch displays on a single line (`white-space: nowrap`), no wrapping.

## Next Steps
1. Add the next app under `apps/<slug>/` and link it from root `index.html`.
2. Keep `startups.md` and `users.md` updated as needed — the generator picks from them automatically.
3. If adding new sections to `users.md`, update the `sectionHeaders` set in `apps/startup-generator/app.js`.

## Open Questions
- Shared CSS/theme across apps, or each app owns its own style?
- Global gallery page once there are 3+ apps?
