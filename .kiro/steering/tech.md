# Tech steering — E-Ink Anywhere

- Stack: plain HTML + CSS + vanilla JavaScript. No build step, no framework.
- Hosting: any static host (GitHub Pages is fine).
- Data sources (all keyless):
  - Weather: Open-Meteo forecast API (JSON).
  - News: an RSS feed through a public RSS-to-JSON relay, with a local
    fallback list when the relay or feed is unreachable.
  - Poem: local rotation of public-domain classical poems, chosen by day.
  - Calendar/clock: computed locally.
- Files: `index.html`, `style.css`, `app.js` at repo root.
- The `/.kiro` directory stays committed and must never be added to
  `.gitignore` (hackathon submission requirement).
