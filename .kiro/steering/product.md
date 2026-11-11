# Product steering — E-Ink Anywhere

## What this is
A browser-based information board that imitates a physical e-paper display:
weather, news headlines, a month calendar and a daily poem stitched onto one
calm page. Built for the Kiroween 2026 hackathon, category **Frankenstein**
(stitching together seemingly incompatible things: live web APIs + the
slow, monochrome world of e-ink).

## Design rules
- Pure black on white. No colour, no gradients, no shadows.
- No animation or transitions — e-ink cannot do them, and the web version
  keeps the same discipline.
- Serif type, generous sizes: readable from across a desk.
- Slow refresh: clock per minute, data every 15 minutes.
- Every data block must degrade gracefully: if a source fails, show a
  plain fallback line instead of breaking the page.
- No API keys, no accounts, no tracking. Static files only.

## Non-goals
- Not a general news reader; headlines only, no article pages.
- No user settings UI in v1; defaults are Shanghai weather and a
  Chinese-language news feed.
