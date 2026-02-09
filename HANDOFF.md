# ABOUT page handoff

## Purpose
Minimal About page with a portrait on the left, blurb + contact info on the right, and a resume download link. No footer text.

## Key files
- index.html: page content and structure.
- styles.css: layout, typography, and portrait sizing.
- assets/pictures/ThomasDodec.png: current portrait image.
- assets/documents/Thomas Coor Resume Fall 2025.pdf: resume PDF.

## Current layout
- Top of page shows only "Thomas Coor" plus a "Return to Homepage" button.
- Two-column layout: portrait (left) and text stack (right).
- Contact info sits under the blurb.
- Resume is a single link (no inline PDF embed).
- Page background is fully white.

## Cache busting
- styles.css, portrait image, and resume link use query strings in index.html to force updates.
  If you edit assets and want a fresh load, increment the version string (e.g., ?v=20260202b).

## Common edits
- Blurb: update the <p class="lede"> in index.html.
- Contact info: update the <ul class="contact-list"> in index.html.
- Portrait size: adjust .photo max-width and .about-content grid columns in styles.css.
- Swap portrait: change the img src in index.html.

