# Design — E-Ink Anywhere

## Layout
- Header: big date (with weekday) on the left, big clock on the right,
  thick rule below.
- Body, two columns at 800px (single column below 720px):
  - Left: weather panel (current condition in large type, 3-day outlook
    as three rows), then news panel (numbered list, dotted separators).
  - Right: poem panel (centred verses with attribution), then calendar
    panel (7-column grid, today inverted white-on-black).
- Footer: product name and the time weather/news were last fetched.
- The 800px layout fits roughly 700px of height, i.e. one screen. No
  `@media` breakpoint relies on colour; there is never horizontal scroll
  (checked at 320/375/414/800px).
- Type sizes are tuned for ~1 m viewing: headings/forecast/news/calendar
  20px, poem 24px, clock 64px, footer 16px.
- Adjacent-month calendar filler is pure black, smaller, with a dotted
  frame (no grey, no opacity).

## Data flow
- `app.js` runs five independent renderers: clock/date, calendar, poem,
  weather, news. Each is wrapped by `safe()` and owns one DOM block, so
  one dead source or thrown error never blanks the board.
- City selection: `?city=` is matched (case-insensitive, pinyin key or
  Chinese name) against the `CITIES` table (19 entries with lat/lon);
  missing or unknown falls back to Shanghai. Open-Meteo is called with
  `timezone=auto`. The weather heading shows the city name.
- Weather codes (full WMO set) are mapped to short Chinese labels.
- News titles are inserted with `textContent` (never HTML); the feed
  result is validated, trimmed, and capped at 6. On relay error, timeout
  or empty result a plain local fallback list is shown.
- Every `fetch` has a 10 s timeout (AbortController) and checks `res.ok`.

## Refresh schedule
- Clock: `setTimeout` re-armed to the next minute boundary.
- Calendar and poem: redrawn only when the local date key changes
  (checked on the minute tick and on tab visibility change). The poem
  index uses the local calendar day number, so it flips at local
  midnight; the library holds 31 public-domain poems.
- Weather and news: `throttledLoad` stores the last attempt time (also
  failed attempts) in `localStorage`; a request is made only if at least
  15 minutes (minus 5 s timer tolerance) have passed. Reloading the page
  inside the window re-renders from cache instead of fetching. If
  storage is unavailable it degrades to per-session timing only.
  A 15-minute `setInterval` plus a visibility-change catch-up drive it.
- Footer shows when weather/news were actually fetched, not the clock.

## Why these choices
- Frankenstein category: the "incompatible" parts are live, fast web data
  and the deliberately slow, static e-ink presentation. The stitching is
  the point of the piece.
- Vanilla stack keeps the repo reviewable and the demo reproducible
  anywhere, including on an e-ink browser.
- Throttling lives in the client because the site is static; there is no
  server to cache for us.
