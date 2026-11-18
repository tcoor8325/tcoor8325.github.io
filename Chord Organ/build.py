"""Render Blog.md to a static page. Requires Python-Markdown (pip install Markdown)."""

from html import escape
from pathlib import Path
import xml.etree.ElementTree as ET

import markdown
from markdown.treeprocessors import Treeprocessor
from markdown.extensions import Extension


class Figures(Treeprocessor):
    def run(self, root):
        for paragraph in root.iter("p"):
            if (len(paragraph) != 1 or paragraph[0].tag != "img"
                    or (paragraph.text or "").strip()
                    or (paragraph[0].tail or "").strip()):
                continue
            paragraph.tag = "figure"
            image = paragraph[0]
            caption = image.attrib.pop("title", "")
            image.set("loading", "lazy")
            image.set("decoding", "async")
            if caption:
                ET.SubElement(paragraph, "figcaption").text = caption


class Journal(Extension):
    def extendMarkdown(self, md):
        md.treeprocessors.register(Figures(md), "journal_figures", 15)


def build():
    folder = Path(__file__).resolve().parent
    content = markdown.markdown(
        (folder / "Blog.md").read_text(encoding="utf-8"), extensions=[Journal()]
    )
    title = escape("Chord Organ")
    page = f'''<!DOCTYPE html>
<!-- Generated from Blog.md by build.py. Edit Blog.md, then rebuild. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="A photo journal documenting the design and construction of a chord organ.">
  <title>{title} | Project Journal</title>
  <link rel="stylesheet" href="styles.css">
  <script src="journal.js" defer></script>
</head>
<body>
  <main>
    <header>
      <h1>{title}</h1>
      <a href="../index.html">Back to Main Menu</a>
      <button class="jump-oldest" type="button">Jump to Oldest</button>
    </header>
    <article id="journal" aria-label="Chord Organ journal">
{content}
    </article>
  </main>
</body>
</html>
'''
    (folder / "index.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build()
