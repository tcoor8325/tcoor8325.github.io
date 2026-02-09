# Music Songbook

This folder contains a simple, static “Folk Songbook” page for the portfolio.

## What it does

- Shows a list of songs in the left sidebar.
- Clicking a song button swaps the visible song panel on the right.
- Each song entry includes chords/lyrics in a `<pre>` block plus a short writeup.

## How it works

- `music/index.html` contains:
  - The song list buttons (`.song-link` with `data-song="..."`).
  - The song content panels (`.song-entry` with matching `id="..."`).
  - A `song-template` article you can copy to add new songs.
- `music/app.js` toggles the `.is-active` class so only the selected song is shown.
- `music/styles.css` provides the page styling and layout.

## Adding a new song

1. Copy the `song-template` `<article>` in `music/index.html`.
2. Give the new article a unique `id` (example: `song-fair-tender`).
3. Add a matching button in the sidebar with `data-song="song-fair-tender"`.
4. Fill in the title, chords/lyrics, artist line, and writeup.

## Running locally

From the portfolio root, run:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/music/`

