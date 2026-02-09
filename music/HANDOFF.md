# Handoff — Music Songbook

## What this folder is
A static "Folk Songbook" webpage styled to match the Rise Up Singing songbook aesthetic. Plain HTML/CSS/JS with no build step.

## Quick start
- From the portfolio root: `python -m http.server 8000`
- Open: `http://localhost:8000/music/`

## Key files
- `README.md`: High-level overview + how to add a song.
- `index.html`: Sidebar song buttons + `<article class="song-entry">` panels (copy `#song-template`).
- `app.js`: Click handler that toggles the `.is-active` class to show/hide the selected song.
- `styles.css`: Layout and styling (Rise Up Singing–style: cream background, tight spacing, two-column layout).
- `AGENTS_Music.md`: Instructions file for automated song additions and formatting tasks.

## Current song list
1. Song Template (template for new songs)
2. Fair and Tender Ladies
3. Farewell Transmission (default active)
4. The Lone Prarie
5. My Rifle, My Pony, and Me
6. Chasing Paper
7. Tramps and Hawkers
8. So Good To Me

## Recent changes (Feb 2026)

### Major formatting overhaul to match Rise Up Singing songbook
Transformed the entire layout to authentically recreate the dense, printed songbook aesthetic:

**Visual Design:**
- Background: Changed from white to warm cream (#f8f6f0)
- Ink: Softened black (#1a1a1a) to simulate print dot gain
- Typography: Dramatically reduced all font sizes (11-14px range from 14-36px)
- Layout: Implemented CSS two-column layout for song entries (column-count: 2, 16px gap)

**Spacing & Typography:**
- Line-height: Tightened from 1.6 to 1.18-1.2 throughout
- Margins/padding: Reduced by 30-40% across all elements
- Song titles: Now 14px italic Times New Roman (was 30px Zapf Chancery)
- Body text: 11px (was 14px) with tight 1.2 line-height
- Chord notation: 12px Tekton with increased letter-spacing (0.06em)
- Artist credits: 11px, left-aligned
- Writeups: 9px italic (was 14px)

**Font Stack (unchanged):**
- Song titles: Times New Roman italic (adapted for readability at small size)
- Chords/artist: Tekton Pro, Tekton, Graphite, Flux Architect
- Body text: Times New Roman, Plantin, Century Schoolbook

**Layout Changes:**
- Header: More compact with horizontal title scaling (scaleX: 1.1)
- Sidebar: Reduced font sizes to 9-11px range
- Content area: Two-column flow for dense songbook appearance
- Responsive: Single column on mobile (< 600px)

### New songs added
- **Tramps and Hawkers**: Scottish traditional folk song arranged by Sam Shackleton
- **So Good To Me**: The Brudi Brothers song with food/romance metaphors

## Adding a song (checklist)
1. Copy the `#song-template` `<article>` in `index.html`.
2. Give the new article a unique `id` (recommend: `song-<kebab-case-title>`).
3. Add a matching sidebar button with `data-song="<that id>"`.
4. Put chords/lyrics in the `<pre class="song-verse">` block.
5. Wrap any chord or tab lines in `<span class="song-notation">...</span>` for hand-lettered font.
6. Add an artist line in `<div class="song-artist">` and a short note in `.song-writeup`.
7. If you want it selected by default, add `.is-active` to *both* the button and the article (and remove it from the previous default).

**Alternative:** Add song details to `AGENTS_Music.md` following the format shown there, and an AI agent can add it automatically.

## Conventions / gotchas
- The JS logic relies on exact matches between `button[data-song]` and `article#id`.
- Only one song button and one song entry should have `.is-active`.
- Keep formatting consistent with the existing HTML style in `index.html` (including the inline `<!-- ... -->` comments).
- The two-column layout is achieved via CSS `column-count: 2`, which flows content naturally but may split verses across columns. For very long songs, this is intentional and matches printed songbooks.

## Design reference
The layout is based on the Rise Up Singing songbook. Reference images are included:
- `RiseUpSingingPg1_2x.png` / `RiseUpSingingPg1_4x.png`
- `RiseUpSingingPg2_2x.png` / `RiseUpSingingPg2_4x.png`

See `AGENTS_Music.md` for detailed formatting analysis and implementation report.

## Current notes / TODOs
- None noted.
- All formatting matched to Rise Up Singing reference as of Feb 2026.
