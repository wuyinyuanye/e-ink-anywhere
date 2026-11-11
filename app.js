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

// WMO weather codes -> short Chinese labels (Open-Meteo `weather_code`).
const WEATHER_CODES = {
  0: "晴", 1: "晴间多云", 2: "多云", 3: "阴",
  45: "雾", 48: "雾凇",
  51: "小毛毛雨", 53: "毛毛雨", 55: "大毛毛雨", 56: "冻毛毛雨", 57: "冻毛毛雨",
  61: "小雨", 63: "中雨", 65: "大雨", 66: "冻雨", 67: "冻雨",
  71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒",
  80: "阵雨", 81: "阵雨", 82: "暴雨", 85: "阵雪", 86: "大阵雪",
  95: "雷阵雨", 96: "雷阵雨伴冰雹", 99: "强雷阵雨伴冰雹"
};

// Cities selectable with ?city=<key> (or the Chinese name). Default: shanghai.
const DEFAULT_CITY = "shanghai";
const CITIES = {
  shanghai:      { name: "上海", lat: 31.23, lon: 121.47 },
  beijing:       { name: "北京", lat: 39.90, lon: 116.41 },
  guangzhou:     { name: "广州", lat: 23.13, lon: 113.26 },
  shenzhen:      { name: "深圳", lat: 22.54, lon: 114.06 },
  hangzhou:      { name: "杭州", lat: 30.27, lon: 120.16 },
  nanjing:       { name: "南京", lat: 32.06, lon: 118.80 },
  chengdu:       { name: "成都", lat: 30.57, lon: 104.07 },
  chongqing:     { name: "重庆", lat: 29.56, lon: 106.55 },
  wuhan:         { name: "武汉", lat: 30.59, lon: 114.31 },
  xian:          { name: "西安", lat: 34.34, lon: 108.94 },
  tianjin:       { name: "天津", lat: 39.34, lon: 117.36 },
  hongkong:      { name: "香港", lat: 22.32, lon: 114.17 },
  taipei:        { name: "台北", lat: 25.03, lon: 121.57 },
  tokyo:         { name: "东京", lat: 35.68, lon: 139.69 },
  seoul:         { name: "首尔", lat: 37.57, lon: 126.98 },
  singapore:     { name: "新加坡", lat: 1.35, lon: 103.82 },
  london:        { name: "伦敦", lat: 51.51, lon: -0.13 },
  newyork:       { name: "纽约", lat: 40.71, lon: -74.01 },
  sanfrancisco:  { name: "旧金山", lat: 37.77, lon: -122.42 }
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

const FALLBACK_NEWS = [
  "新闻源暂时连不上，本页每 15 分钟会自动重试。",
  "（本地备用）墨水屏看板讲究慢：新闻不必实时，隔一阵看一眼就够。",
  "（本地备用）放下手机，抬头看看窗外的天气。"
];

const POEMS = [
  { lines: ["床前明月光，疑是地上霜。", "举头望明月，低头思故乡。"], from: "李白《静夜思》" },
  { lines: ["春眠不觉晓，处处闻啼鸟。", "夜来风雨声，花落知多少。"], from: "孟浩然《春晓》" },
  { lines: ["空山不见人，但闻人语响。", "返景入深林，复照青苔上。"], from: "王维《鹿柴》" },
  { lines: ["白日依山尽，黄河入海流。", "欲穷千里目，更上一层楼。"], from: "王之涣《登鹳雀楼》" },
  { lines: ["离离原上草，一岁一枯荣。", "野火烧不尽，春风吹又生。"], from: "白居易《赋得古原草送别》" },
  { lines: ["千山鸟飞绝，万径人踪灭。", "孤舟蓑笠翁，独钓寒江雪。"], from: "柳宗元《江雪》" },
  { lines: ["葡萄美酒夜光杯，欲饮琵琶马上催。", "醉卧沙场君莫笑，古来征战几人回。"], from: "王翰《凉州词》" },
  { lines: ["红豆生南国，春来发几枝。", "愿君多采撷，此物最相思。"], from: "王维《相思》" },
  { lines: ["鹅，鹅，鹅，曲项向天歌。", "白毛浮绿水，红掌拨清波。"], from: "骆宾王《咏鹅》" },
  { lines: ["锄禾日当午，汗滴禾下土。", "谁知盘中餐，粒粒皆辛苦。"], from: "李绅《悯农》" },
  { lines: ["慈母手中线，游子身上衣。", "临行密密缝，意恐迟迟归。", "谁言寸草心，报得三春晖。"], from: "孟郊《游子吟》" },
  { lines: ["草长莺飞二月天，拂堤杨柳醉春烟。", "儿童散学归来早，忙趁东风放纸鸢。"], from: "高鼎《村居》" },
  { lines: ["两个黄鹂鸣翠柳，一行白鹭上青天。", "窗含西岭千秋雪，门泊东吴万里船。"], from: "杜甫《绝句》" },
  { lines: ["日照香炉生紫烟，遥看瀑布挂前川。", "飞流直下三千尺，疑是银河落九天。"], from: "李白《望庐山瀑布》" },
  { lines: ["朝辞白帝彩云间，千里江陵一日还。", "两岸猿声啼不住，轻舟已过万重山。"], from: "李白《早发白帝城》" },
  { lines: ["故人西辞黄鹤楼，烟花三月下扬州。", "孤帆远影碧空尽，唯见长江天际流。"], from: "李白《黄鹤楼送孟浩然之广陵》" },
  { lines: ["月落乌啼霜满天，江枫渔火对愁眠。", "姑苏城外寒山寺，夜半钟声到客船。"], from: "张继《枫桥夜泊》" },
  { lines: ["清明时节雨纷纷，路上行人欲断魂。", "借问酒家何处有，牧童遥指杏花村。"], from: "杜牧《清明》" },
  { lines: ["远上寒山石径斜，白云生处有人家。", "停车坐爱枫林晚，霜叶红于二月花。"], from: "杜牧《山行》" },
  { lines: ["君问归期未有期，巴山夜雨涨秋池。", "何当共剪西窗烛，却话巴山夜雨时。"], from: "李商隐《夜雨寄北》" },
  { lines: ["向晚意不适，驱车登古原。", "夕阳无限好，只是近黄昏。"], from: "李商隐《登乐游原》" },
  { lines: ["少小离家老大回，乡音无改鬓毛衰。", "儿童相见不相识，笑问客从何处来。"], from: "贺知章《回乡偶书》" },
  { lines: ["碧玉妆成一树高，万条垂下绿丝绦。", "不知细叶谁裁出，二月春风似剪刀。"], from: "贺知章《咏柳》" },
  { lines: ["独怜幽草涧边生，上有黄鹂深树鸣。", "春潮带雨晚来急，野渡无人舟自横。"], from: "韦应物《滁州西涧》" },
  { lines: ["自古逢秋悲寂寥，我言秋日胜春朝。", "晴空一鹤排云上，便引诗情到碧霄。"], from: "刘禹锡《秋词》" },
  { lines: ["杨柳青青江水平，闻郎江上唱歌声。", "东边日出西边雨，道是无晴却有晴。"], from: "刘禹锡《竹枝词》" },
  { lines: ["横看成岭侧成峰，远近高低各不同。", "不识庐山真面目，只缘身在此山中。"], from: "苏轼《题西林壁》" },
  { lines: ["水光潋滟晴方好，山色空蒙雨亦奇。", "欲把西湖比西子，淡妆浓抹总相宜。"], from: "苏轼《饮湖上初晴后雨》" },
  { lines: ["空山新雨后，天气晚来秋。", "明月松间照，清泉石上流。"], from: "王维《山居秋暝》" },
  { lines: ["千里莺啼绿映红，水村山郭酒旗风。", "南朝四百八十寺，多少楼台烟雨中。"], from: "杜牧《江南春》" },
  { lines: ["朱雀桥边野草花，乌衣巷口夕阳斜。", "旧时王谢堂前燕，飞入寻常百姓家。"], from: "刘禹锡《乌衣巷》" }
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
  for (const k in CITIES) if (CITIES[k].name === raw.trim()) return CITIES[k];
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
  setText("date-main", `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`);
  setText("date-sub", `星期${WEEKDAYS[now.getDay()]}`);
  setText("clock", `${pad(now.getHours())}:${pad(now.getMinutes())}`);
}

// ---------- calendar + poem (once per local day) ----------

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  setText("calendar-title", `日历 · ${year}年${month + 1}月`);
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
  by.textContent = "—— " + poem.from;
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
  setText("weather-now", `现在 ${Math.round(cur.temperature_2m)}°C · ${WEATHER_CODES[cur.weather_code] || "—"}`);
  const box = $("weather-days");
  box.textContent = "";
  for (let i = 1; i <= 3; i++) {
    const p = d.time[i].split("-");
    const dt = new Date(+p[0], +p[1] - 1, +p[2]);
    const row = document.createElement("div");
    row.textContent = `${dt.getMonth() + 1}/${dt.getDate()} 周${WEEKDAYS[dt.getDay()]} ` +
      `${WEATHER_CODES[d.weather_code[i]] || "—"} ` +
      `${Math.round(d.temperature_2m_min[i])}~${Math.round(d.temperature_2m_max[i])}°C`;
    box.appendChild(row);
  }
  stamp("weather", fetchedAt);
}

function showWeatherFail() {
  setText("weather-now", "天气暂时取不到，稍后自动重试。");
  $("weather-days").textContent = "";
}

function renderWeather() {
  setText("weather-title", `天气 · ${CITY.name}`);
  return throttledLoad("einkanywhere:weather:" + CITY.name, fetchWeather, showWeather, showWeatherFail);
}

// ---------- news (RSS via public relay, <= 1 request / 15 min) ----------

function fetchNews() {
  // Public RSS-to-JSON relay; swap the feed URL for any RSS source.
  const feed = encodeURIComponent("https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans");
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
  if (stamps.weather) parts.push(`天气 ${fmt(stamps.weather)}`);
  if (stamps.news) parts.push(`新闻 ${fmt(stamps.news)}`);
  setText("updated-at", parts.length ? "数据更新 " + parts.join(" · ") : "");
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
