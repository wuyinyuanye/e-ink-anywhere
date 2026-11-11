# E-Ink Anywhere

## What is this?

E-Ink Anywhere is a single-page web dashboard that looks and behaves like a
physical e-paper display. One calm, pure black-on-white page shows today's
date and weekday, a local clock, the weather with a 3-day outlook, news
headlines, a poem of the day and a month calendar. No colour, no animation,
no gradients, no shadows, serif type sized to be read from about a metre
away. It echoes the e-ink desk boards I build as hardware.

## What is stitched together (Frankenstein)

Seemingly incompatible parts, sewn into one quiet page:

| Block | Source |
|---|---|
| Weather + 3-day forecast | [Open-Meteo](https://open-meteo.com/) free API (no key) |
| News (up to 6 headlines) | A Google News RSS feed through the public rss2json relay; a local fallback list is shown if it fails |
| Poem of the day | A local library of 30 English poems (public domain), rotated by local date |
| Calendar, date, clock | Computed locally in the browser |

Live, fast web data meets the deliberately slow, static look of e-ink.

## Choose a city

Weather defaults to Shanghai. Switch with a URL parameter:

```
index.html?city=beijing
```

Supported keys include `shanghai`, `beijing`, `guangzhou`, `shenzhen`,
`hangzhou`, `nanjing`, `chengdu`, `chongqing`, `wuhan`, `xian`, `tianjin`,
`hongkong`, `taipei`, `tokyo`, `seoul`, `singapore`, `london`, `newyork`,
`sanfrancisco`. A missing or
unknown value falls back to Shanghai. Add a city by editing the `CITIES`
table at the top of `app.js`.

## Refresh rhythm

- Clock: every minute, aligned to the minute boundary.
- Weather and news: at most once every 15 minutes. The limit is stored in
  `localStorage`, so reloading the page does not cause extra requests.
- Calendar and poem: once per local day, switching at midnight.
- If weather or news fails, only that block shows a plain fallback line;
  the rest of the page keeps working.

## Run locally

No build step, no dependencies, no API keys.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly in a browser also works.

## Deploy to GitHub Pages

The site is plain static files with relative paths, so it deploys as is.

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick
   `main` and the `/ (root)` folder, then save.
4. After a minute the site is live at
   `https://<your-user>.github.io/<repo-name>/`
   (add `?city=beijing` etc. to pick a city).

## Built for Kiroween 2026

Made for the **Kiroween 2026** hackathon, category **Frankenstein**. The
project is spec-driven in Kiro: steering lives in `.kiro/steering/`, the
requirements, design and task list in `.kiro/specs/e-ink-anywhere/`, and a
hook in `.kiro/hooks/`. The `.kiro` directory is committed on purpose.

## Tech constraints

Plain HTML + CSS + vanilla JavaScript. No frameworks, no server-side code,
no API keys, no tracking.

## License

MIT — see `LICENSE`.

