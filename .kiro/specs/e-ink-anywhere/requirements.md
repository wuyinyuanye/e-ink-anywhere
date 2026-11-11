# Requirements — E-Ink Anywhere

1. The board shows, on one page: current date and weekday, local time,
   current weather plus a 3-day outlook, up to 6 news headlines, one poem
   that changes daily, and a full month calendar with today highlighted.
2. The page is monochrome (black on white) with no animation, in a serif
   typeface, legible at desk distance.
3. Weather and news refresh at most every 15 minutes; the clock every
   minute; the calendar and poem once per day.
4. If weather or news cannot be fetched, the board still renders fully,
   with a plain fallback message in that block.
5. The site is fully static: opening `index.html` from any static host
   works, with no server-side code and no API keys.
6. The page must remain readable at 800px width and on narrow phone
   screens.
