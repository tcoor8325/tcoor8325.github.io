# Music page handoff

The current [songbook PDF](thomas-songbook.pdf) contains all 83 songs in [AGENTS_Music.md](AGENTS_Music.md), through “The Only Cowboy Bar in Portland.” The final build is 44 pages at 7 × 10 inches. The full title list was reconciled against the PDF, and the final nine songs’ lyrics and chords were checked against the transcription.

- [AGENTS_Music.md](AGENTS_Music.md) is the source list and transcription reference.
- [thomas-songbook.tex](thomas-songbook.tex) holds the typeset songs and their category and column layout.
- [index.html](index.html) embeds the compiled PDF and points both **Open PDF** and **Download PDF** to the same file.

For future edits, update the LaTeX source, rebuild the PDF alongside it, and inspect the pages affected by the change. The [README](README.md) has the build command, font dependencies, notation conventions, and reference measurements.
