# Thomas' Songbook

The portfolio's Music page embeds [Thomas' Songbook](thomas-songbook.pdf). The **Open PDF** and **Download PDF** links work independently of the browser's embedded PDF viewer. GitHub Pages serves the compiled file directly.

The 44-page PDF includes all 83 songs listed in [AGENTS_Music.md](AGENTS_Music.md). It groups them under Love, Heartbreak, Adventure, Sea, Fun, Inspiration, War, Freedom, and Ecology.

## Formatting analysis

I measured the [America chapter opening](RiseUpSingingPg1_4x.png) and [Funny Songs / Golden Oldies transition](RiseUpSingingPg2_4x.png) at 2016 × 2880 pixels. At the 7 × 10-inch trim, four pixels correspond to one PostScript point (bp, or 1/72 inch). The scans match the aspect ratio of the standard edition described by [Rise Up & Sing](https://www.riseupsinging.org/productdisplay/rise-singing). Baseline intervals and offsets below come from comparing the ink bands of adjacent lines. Font sizes and original font identities are visual estimates because the references are raster images.

| Element | What the scans show | LaTeX setting |
| --- | --- | --- |
| Page and columns | Left edges around 43–48 bp and 258–265 bp, depending on the page. About 198–200 bp of usable width per column and 16–18 bp between columns. The footer switches sides across the two examples. | 7 × 10 in, 45 bp side margins, 198.5 bp columns, 17 bp gutter. The folio sits left on odd pages and right on even pages, near the 697 bp baseline. |
| Book name | The second scan uses an uppercase, hand-drawn masthead spanning the left column near the top. The first scan gives the chapter title the masthead space. | 10/11 bp TeX Gyre Heros uppercase, 8% letter spacing, centered between thin rules across the left column. |
| Category | The running “Funny Songs” label is flush right and uses hand-drawn display capitals at an estimated 16–18 bp. New-chapter banners span both columns and use substantially taller lettering, with ink heights around 40–47 bp. | Uncial Antiqua uppercase at 17/19 bp for the upper-right heading. |
| Song title | A heavy, sloped calligraphic face, visually similar to Zapf Chancery. Title ink is roughly 10–14 bp tall, with about 3–5 bp of clear space before the first lyric, depending on descenders. | Z003 at 14.5/15 bp with a small stroke-weight increase. The title shares the verse's left edge and adds 2 bp below. |
| Verse lyrics | Compact, Times-like serif on repeated 9–9.25 bp baseline intervals. Lyrics are flush left, with wrapped lines inset roughly 9 bp and a few extra points between unaccompanied stanzas. | TeX Gyre Termes at 9/9.15 bp, ragged right, with a 9 bp hanging indent and 4 bp after stanzas. |
| Chorus and refrain | Bold serif at the same size and left edge as the verse. Examples in both scans show a separate chord row beneath a chorus. | TeX Gyre Termes Bold at the lyric settings. |
| Chord progression | Slightly larger hand-lettered characters, estimated 10–11 bp, below the lyrics they accompany. Slashes and dashes separate groups and carry chord holds. | Chilanka at 10/11 bp for standalone progressions and 9/10 bp for chord groups keyed to lyric lines. Both are flush left, with 2 bp above and 4 bp below. |
| Composer, performer, or source | Bold compact sans after the final stanza, generally introduced by an em dash and inset about 9 bp. | TeX Gyre Heros Bold at 7/8 bp, inset 9 bp with an em dash. |
| Finer source detail | Dense, often slanted sans on the next line, back at the column edge. Several multi-line notes are spaced about 6–7 bp apart. | TeX Gyre Heros Italic at 6.5/7 bp, with 1 bp above. Source notes may link to a recording or archive. |

The PDF uses black type, white paper, and simple rules around the masthead. The editors describe placing chords below their corresponding stanza and using bold for sung refrains. [Rise Up & Sing's song layout guide](https://www.riseupsinging.org/songbooks/rise-up-singing/content/song-layout)

## Rebuild

Use LuaLaTeX with TeX Gyre Termes, TeX Gyre Heros, URW Z003, and Chilanka installed. [Uncial Antiqua](https://fonts.google.com/specimen/Uncial+Antiqua) is bundled with its [SIL Open Font License](fonts/OFL-Uncial-Antiqua.txt). From the portfolio root, run:

```sh
songbook_build=$(mktemp -d) &&
TEXMFCACHE="$songbook_build" lualatex -halt-on-error -output-directory="$songbook_build" music/thomas-songbook.tex &&
cp "$songbook_build/thomas-songbook.pdf" music/thomas-songbook.pdf
```

## Edit and check the songbook

In [the LaTeX source](thomas-songbook.tex), start each song with `\songtitle` and put `\lyric` or `\refrain` lines in `stanza` blocks. Use `\chords` beneath the corresponding stanza or for standalone instrumental progressions. End the entry with `\songcredit` and add `\sourcedetail` when a recording, arranger, or other source detail is available.

Use `\linechords` for transcriptions with chords above individual lyric lines. Each slash-separated group corresponds to one lyric line in order. Use `songtab` for fixed-width guitar tablature and `\playnote` for playing cues. Where a longer song crosses columns, put the break between stanzas and label the continuation.

After rebuilding, check the affected pages for column breaks and clipped notation. Preview locally by running `python3 -m http.server 8000` from the portfolio root and opening `http://localhost:8000/music/`.
