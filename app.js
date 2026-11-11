// E-Ink Anywhere — slow, calm data stitching:
// weather (Open-Meteo, no key) + news headlines (RSS via public relay,
// graceful fallback) + a daily poem (local rotation) + month calendar.
//
// Refresh discipline (e-ink pace):
//   clock            every minute, aligned to the minute boundary
//   calendar + poem  once per local day (redrawn when the date changes)
//   weather + news   at most once per 15 minutes (throttled via localStorage,
//                    so page reloads cannot cause extra requests)

"use strict";

const DATA_INTERVAL = 15 * 60 * 1000;
const FETCH_TIMEOUT = 10 * 1000;

// ---------- static tables ----------

// WMO weather codes -> short English labels (Open-Meteo `weather_code`).
const WEATHER_CODES = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Showers", 81: "Showers", 82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail"
};

// Cities selectable with ?city=<key> (or the city name). Default: shanghai.
const DEFAULT_CITY = "shanghai";
const CITIES = {
  shanghai:      { name: "Shanghai", lat: 31.23, lon: 121.47 },
  beijing:       { name: "Beijing", lat: 39.90, lon: 116.41 },
  guangzhou:     { name: "Guangzhou", lat: 23.13, lon: 113.26 },
  shenzhen:      { name: "Shenzhen", lat: 22.54, lon: 114.06 },
  hangzhou:      { name: "Hangzhou", lat: 30.27, lon: 120.16 },
  nanjing:       { name: "Nanjing", lat: 32.06, lon: 118.80 },
  chengdu:       { name: "Chengdu", lat: 30.57, lon: 104.07 },
  chongqing:     { name: "Chongqing", lat: 29.56, lon: 106.55 },
  wuhan:         { name: "Wuhan", lat: 30.59, lon: 114.31 },
  xian:          { name: "Xi'an", lat: 34.34, lon: 108.94 },
  tianjin:       { name: "Tianjin", lat: 39.34, lon: 117.36 },
  hongkong:      { name: "Hong Kong", lat: 22.32, lon: 114.17 },
  taipei:        { name: "Taipei", lat: 25.03, lon: 121.57 },
  tokyo:         { name: "Tokyo", lat: 35.68, lon: 139.69 },
  seoul:         { name: "Seoul", lat: 37.57, lon: 126.98 },
  singapore:     { name: "Singapore", lat: 1.35, lon: 103.82 },
  london:        { name: "London", lat: 51.51, lon: -0.13 },
  newyork:       { name: "New York", lat: 40.71, lon: -74.01 },
  sanfrancisco:  { name: "San Francisco", lat: 37.77, lon: -122.42 }
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

const FALLBACK_NEWS = [
  "News feed is temporarily unreachable. This page retries every 15 minutes.",
  "(Local fallback) E-ink boards are meant to be slow: news need not be live, a glance now and then is enough.",
  "(Local fallback) Put down the phone and look out the window at the weather."
];

const POEMS = [
  { lines: ["I wandered lonely as a cloud", "That floats on high o'er vales and hills."], from: "William Wordsworth, \"I Wandered Lonely as a Cloud\"" },
  { lines: ["Shall I compare thee to a summer's day?", "Thou art more lovely and more temperate."], from: "William Shakespeare, Sonnet 18" },
  { lines: ["Hope is the thing with feathers", "That perches in the soul,", "And sings the tune without the words,", "And never stops at all."], from: "Emily Dickinson, \"Hope\"" },
  { lines: ["Two roads diverged in a wood, and I—", "I took the one less traveled by,", "And that has made all the difference."], from: "Robert Frost, \"The Road Not Taken\"" },
  { lines: ["To see a World in a Grain of Sand", "And a Heaven in a Wild Flower,", "Hold Infinity in the palm of your hand", "And Eternity in an hour."], from: "William Blake, \"Auguries of Innocence\"" },
  { lines: ["Because I could not stop for Death,", "He kindly stopped for me;", "The carriage held but just ourselves", "And Immortality."], from: "Emily Dickinson, \"Because I could not stop for Death\"" },
  { lines: ["Tyger Tyger, burning bright,", "In the forests of the night;", "What immortal hand or eye,", "Could frame thy fearful symmetry?"], from: "William Blake, \"The Tyger\"" },
  { lines: ["Season of mists and mellow fruitfulness,", "Close bosom-friend of the maturing sun."], from: "John Keats, \"To Autumn\"" },
  { lines: ["Do not go gentle into that good night.", "Rage, rage against the dying of the light."], from: "Dylan Thomas, \"Do Not Go Gentle into That Good Night\"" },
  { lines: ["I think that I shall never see", "A poem lovely as a tree."], from: "Joyce Kilmer, \"Trees\"" },
  { lines: ["Water, water, every where,", "And all the boards did shrink;", "Water, water, every where,", "Nor any drop to drink."], from: "Samuel Taylor Coleridge, \"The Rime of the Ancient Mariner\"" },
  { lines: ["Nature's first green is gold,", "Her hardest hue to hold.", "Her early leaf's a flower;", "But only so an hour."], from: "Robert Frost, \"Nothing Gold Can Stay\"" },
  { lines: ["I celebrate myself, and sing myself,", "And what I assume you shall assume,", "For every atom belonging to me as good belongs to you."], from: "Walt Whitman, \"Song of Myself\"" },
  { lines: ["Let us go then, you and I,", "When the evening is spread out against the sky", "Like a patient etherized upon a table."], from: "T. S. Eliot, \"The Love Song of J. Alfred Prufrock\"" },
  { lines: ["Out of the night that covers me,", "Black as the pit from pole to pole,", "I thank whatever gods may be", "For my unconquerable soul."], from: "William Ernest Henley, \"Invictus\"" },
  { lines: ["I must go down to the seas again, to the lonely sea and the sky,", "And all I ask is a tall ship and a star to steer her by."], from: "John Masefield, \"Sea-Fever\"" },
  { lines: ["Look on my Works, ye Mighty, and despair!", "Nothing beside remains."], from: "Percy Bysshe Shelley, \"Ozymandias\"" },
  { lines: ["O Captain! my Captain! our fearful trip is done,", "The ship has weather'd every rack, the prize we sought is won."], from: "Walt Whitman, \"O Captain! My Captain!\"" },
  { lines: ["Earth has not anything to show more fair:", "Dull would he be of soul who could pass by", "A sight so touching in its majesty."], from: "William Wordsworth, \"Composed upon Westminster Bridge\"" },
  { lines: ["Tomorrow, and tomorrow, and tomorrow,", "Creeps in this petty pace from day to day."], from: "William Shakespeare, Macbeth" },
  { lines: ["How do I love thee? Let me count the ways.", "I love thee to the depth and breadth and height", "My soul can reach."], from: "Elizabeth Barrett Browning, Sonnet 43" },
  { lines: ["Come live with me and be my love,", "And we will all the pleasures prove."], from: "Christopher Marlowe, \"The Passionate Shepherd to His Love\"" },
  { lines: ["The woods are lovely, dark and deep,", "But I have promises to keep,", "And miles to go before I sleep."], from: "Robert Frost, \"Stopping by Woods on a Snowy Evening\"" },
  { lines: ["Twinkle, twinkle, little star,", "How I wonder what you are!", "Up above the world so high,", "Like a diamond in the sky."], from: "Jane Taylor, \"The Star\"" },
  { lines: ["Hope springs eternal in the human breast;", "Man never is, but always to be blest."], from: "Alexander Pope, \"An Essay on Man\"" },
  { lines: ["Half a league, half a league,", "Half a league onward,", "All in the valley of Death", "Rode the six hundred."], from: "Alfred, Lord Tennyson, \"The Charge of the Light Brigade\"" },
  { lines: ["I am the master of my fate,", "I am the captain of my soul."], from: "William Ernest Henley, \"Invictus\"" },
  { lines: ["Beauty is truth, truth beauty,—that is all", "Ye know on earth, and all ye need to know."], from: "John Keats, \"Ode on a Grecian Urn\"" },
  { lines: ["There is a pleasure in the pathless woods,", "There is a rapture on the lonely shore."], from: "Lord Byron, \"Childe Harold's Pilgrimage\"" },
  { lines: ["The sea is calm tonight.", "The tide is full, the moon lies fair", "Upon the straits."], from: "Matthew Arnold, \"Dover Beach\"" }
];

// ---------- helpers ----------

function $(id) { return document.getElementById(id); }
function pad(n) { return String(n).padStart(2, "0"); }

// Run a renderer so that a sync throw or async rejection never escapes:
// one broken block must not stop the others.
function safe(fn) {
  try {
    const r = fn();
    if (r && typeof r.catch === "function") r.catch(function () {});
  } catch (e) { /* keep the board alive */ }
}

function setText(id, text) { const el = $(id); if (el) el.textContent = text; }

function resolveCity() {
  let raw = "";
  try { raw = new URLSearchParams(window.location.search).get("city") || ""; } catch (e) {}
  const key = raw.toLowerCase().replace(/[\s_\-]+/g, "");
  if (CITIES[key]) return CITIES[key];
  const t = raw.trim().toLowerCase();
  for (const k in CITIES) if (CITIES[k].name.toLowerCase() === t) return CITIES[k];
  return CITIES[DEFAULT_CITY];
}
const CITY = resolveCity();

async function fetchJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// localStorage may be unavailable (privacy mode); then we simply don't throttle across reloads.
function loadRec(key) {
  try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; }
}
function saveRec(key, rec) {
  try { localStorage.setItem(key, JSON.stringify(rec)); } catch (e) {}
}

// Fetch at most once per DATA_INTERVAL (counting failed attempts too), also across reloads.
async function throttledLoad(key, fetcher, onData, onFail) {
  const now = Date.now();
  const rec = loadRec(key);
  const due = !rec || typeof rec.attempt !== "number" ||
    now - rec.attempt >= DATA_INTERVAL - 5000 || rec.attempt > now;
  if (!due) {
    if (rec.data) onData(rec.data, rec.fetchedAt); else onFail();
    return;
  }
  saveRec(key, { attempt: now, data: null, fetchedAt: null });
  try {
    const data = await fetcher();
    saveRec(key, { attempt: now, data: data, fetchedAt: now });
    onData(data, now);
  } catch (e) {
    onFail();
  }
}

// ---------- clock + date (every minute) ----------

function renderClockAndDate() {
  const now = new Date();
  setText("date-main", `${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
  setText("date-sub", WEEKDAYS_LONG[now.getDay()]);
  setText("clock", `${pad(now.getHours())}:${pad(now.getMinutes())}`);
}

// ---------- calendar + poem (once per local day) ----------

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  setText("calendar-title", `Calendar · ${MONTHS[month]} ${year}`);
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  let html = WEEKDAYS.map(d => `<div class="dow">${d}</div>`).join("");
  for (let i = 0; i < firstDow; i++) {
    html += `<div class="day dim">${daysInPrev - firstDow + 1 + i}</div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    html += `<div class="day${d === today ? " today" : ""}">${d}</div>`;
  }
  const tail = (7 - ((firstDow + daysInMonth) % 7)) % 7;
  for (let d = 1; d <= tail; d++) html += `<div class="day dim">${d}</div>`;
  $("calendar").innerHTML = html;
}

function renderPoem() {
  const now = new Date();
  // Local calendar day number (not UTC), so the poem flips at local midnight.
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const poem = POEMS[dayNumber % POEMS.length];
  const box = $("poem");
  box.textContent = "";
  poem.lines.forEach(function (l) {
    const div = document.createElement("div");
    div.textContent = l;
    box.appendChild(div);
  });
  const by = document.createElement("div");
  by.className = "poem-author";
  by.textContent = "— " + poem.from;
  box.appendChild(by);
}

let renderedDay = "";
function renderDailyIfNewDay() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  if (key === renderedDay) return;
  renderedDay = key;
  safe(renderCalendar);
  safe(renderPoem);
}

// ---------- weather (Open-Meteo, keyless, <= 1 request / 15 min) ----------

function fetchWeather() {
  const url = "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${CITY.lat}&longitude=${CITY.lon}` +
    "&current=temperature_2m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&timezone=auto&forecast_days=4";
  return fetchJSON(url).then(function (data) {
    if (!data || !data.current || !data.daily || !Array.isArray(data.daily.time) || data.daily.time.length < 4) {
      throw new Error("bad weather payload");
    }
    return data;
  });
}

function showWeather(data, fetchedAt) {
  const cur = data.current, d = data.daily;
  setText("weather-now", `Now ${Math.round(cur.temperature_2m)}°C · ${WEATHER_CODES[cur.weather_code] || "—"}`);
  const box = $("weather-days");
  box.textContent = "";
  for (let i = 1; i <= 3; i++) {
    const p = d.time[i].split("-");
    const dt = new Date(+p[0], +p[1] - 1, +p[2]);
    const row = document.createElement("div");
    row.textContent = `${dt.getMonth() + 1}/${dt.getDate()} ${WEEKDAYS[dt.getDay()]} ` +
      `${WEATHER_CODES[d.weather_code[i]] || "—"} ` +
      `${Math.round(d.temperature_2m_min[i])}~${Math.round(d.temperature_2m_max[i])}°C`;
    box.appendChild(row);
  }
  stamp("weather", fetchedAt);
}

function showWeatherFail() {
  setText("weather-now", "Weather is unavailable right now. Retrying automatically.");
  $("weather-days").textContent = "";
}

function renderWeather() {
  setText("weather-title", `Weather · ${CITY.name}`);
  return throttledLoad("einkanywhere:weather:" + CITY.name, fetchWeather, showWeather, showWeatherFail);
}

// ---------- news (RSS via public relay, <= 1 request / 15 min) ----------

function fetchNews() {
  // Public RSS-to-JSON relay; swap the feed URL for any RSS source.
  const feed = encodeURIComponent("https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en");
  return fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${feed}`).then(function (data) {
    const titles = ((data && data.items) || [])
      .map(function (it) { return it && typeof it.title === "string" ? it.title.trim() : ""; })
      .filter(Boolean)
      .slice(0, 6);
    if (!titles.length) throw new Error("empty feed");
    return titles;
  });
}

function fillNews(titles) {
  const list = $("news-list");
  list.textContent = "";
  titles.slice(0, 6).forEach(function (t) {
    const li = document.createElement("li");
    li.textContent = t; // text only: never interpret feed content as HTML
    list.appendChild(li);
  });
}

function showNews(titles, fetchedAt) { fillNews(titles); stamp("news", fetchedAt); }
function showNewsFail() { fillNews(FALLBACK_NEWS); }

function renderNews() {
  return throttledLoad("einkanywhere:news", fetchNews, showNews, showNewsFail);
}

// ---------- footer: when the data was actually fetched ----------

const stamps = {};
function stamp(name, t) {
  if (t) stamps[name] = t;
  const fmt = function (ms) { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const parts = [];
  if (stamps.weather) parts.push(`Weather ${fmt(stamps.weather)}`);
  if (stamps.news) parts.push(`News ${fmt(stamps.news)}`);
  setText("updated-at", parts.length ? "Updated " + parts.join(" · ") : "");
}

// ---------- scheduling ----------

function minuteTick() {
  safe(renderClockAndDate);
  renderDailyIfNewDay();
  // Re-arm on the next minute boundary so the clock never lags by up to 59 s.
  setTimeout(minuteTick, 60000 - (Date.now() % 60000) + 20);
}

function dataTick() {
  safe(renderWeather);
  safe(renderNews);
}

minuteTick();
dataTick();
setInterval(dataTick, DATA_INTERVAL); // throttledLoad guarantees the 15-minute floor

// After sleep / tab restore, timers may have been paused: catch up (data is still throttled).
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    safe(renderClockAndDate);
    renderDailyIfNewDay();
    dataTick();
  }
});
