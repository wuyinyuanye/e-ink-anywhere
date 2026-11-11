# E-Ink Anywhere

[English](#english) · [中文](#中文)

---

## English

### What is this?

E-Ink Anywhere is a single-page web dashboard that looks and behaves like a
physical e-paper display. One calm, pure black-on-white page shows today's
date and weekday, a local clock, the weather with a 3-day outlook, news
headlines, a poem of the day and a month calendar. No colour, no animation,
no gradients, no shadows, serif type sized to be read from about a metre
away. It echoes the e-ink desk boards I build as hardware.

### What is stitched together (Frankenstein)

Seemingly incompatible parts, sewn into one quiet page:

| Block | Source |
|---|---|
| Weather + 3-day forecast | [Open-Meteo](https://open-meteo.com/) free API (no key) |
| News (up to 6 headlines) | A Google News RSS feed through the public rss2json relay; a local fallback list is shown if it fails |
| Poem of the day | A local library of 31 public-domain classical Chinese poems, rotated by local date |
| Calendar, date, clock | Computed locally in the browser |

Live, fast web data meets the deliberately slow, static look of e-ink.

### Choose a city

Weather defaults to Shanghai. Switch with a URL parameter:

```
index.html?city=beijing
```

Supported keys include `shanghai`, `beijing`, `guangzhou`, `shenzhen`,
`hangzhou`, `nanjing`, `chengdu`, `chongqing`, `wuhan`, `xian`, `tianjin`,
`hongkong`, `taipei`, `tokyo`, `seoul`, `singapore`, `london`, `newyork`,
`sanfrancisco` (Chinese names such as `?city=北京` also work). A missing or
unknown value falls back to Shanghai. Add a city by editing the `CITIES`
table at the top of `app.js`.

### Refresh rhythm

- Clock: every minute, aligned to the minute boundary.
- Weather and news: at most once every 15 minutes. The limit is stored in
  `localStorage`, so reloading the page does not cause extra requests.
- Calendar and poem: once per local day, switching at midnight.
- If weather or news fails, only that block shows a plain fallback line;
  the rest of the page keeps working.

### Run locally

No build step, no dependencies, no API keys.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly in a browser also works.

### Deploy to GitHub Pages

The site is plain static files with relative paths, so it deploys as is.

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick
   `main` and the `/ (root)` folder, then save.
4. After a minute the site is live at
   `https://<your-user>.github.io/<repo-name>/`
   (add `?city=beijing` etc. to pick a city).

### Built for Kiroween 2026

Made for the **Kiroween 2026** hackathon, category **Frankenstein**. The
project is spec-driven in Kiro: steering lives in `.kiro/steering/`, the
requirements, design and task list in `.kiro/specs/e-ink-anywhere/`, and a
hook in `.kiro/hooks/`. The `.kiro` directory is committed on purpose.

### Tech constraints

Plain HTML + CSS + vanilla JavaScript. No frameworks, no server-side code,
no API keys, no tracking.

### License

MIT — see `LICENSE`.

---

## 中文

### 这是什么

E-Ink Anywhere 是一个模仿实体墨水屏的网页看板。一页纯黑白、安静的界面里，同时呈现：
日期与星期、本地时钟、天气与未来 3 天预报、新闻标题、每日一诗和整月日历。
没有颜色、动画、渐变和阴影，衬线字体，字号按约 1 米的桌面距离设计，
呼应我自己制作的实体墨水屏桌面设备。

### 缝合了哪些数据源

| 区块 | 来源 |
|---|---|
| 天气 + 3 天预报 | [Open-Meteo](https://open-meteo.com/) 免费接口（无需 key） |
| 新闻（最多 6 条） | Google News RSS，经公共 rss2json 中转；取不到时用本地兜底列表 |
| 每日一诗 | 本地 31 首公有领域古诗，按本地日期轮换，零点切换 |
| 日历、日期、时钟 | 浏览器本地计算 |

### 切换城市

天气默认上海，可用 URL 参数切换，例如 `index.html?city=beijing`。
支持 `shanghai`、`beijing`、`guangzhou`、`shenzhen`、`hangzhou`、`nanjing`、
`chengdu`、`chongqing`、`wuhan`、`xian`、`tianjin`、`hongkong`、`taipei`、
`tokyo`、`seoul`、`singapore`、`london`、`newyork`、`sanfrancisco`，也可直接写中文名（如 `?city=北京`）。
参数缺失或不认识时使用上海。要增加城市，编辑 `app.js` 顶部的 `CITIES` 表即可。

### 刷新节奏

- 时钟：每分钟更新，对齐整分钟。
- 天气和新闻：最多每 15 分钟一次；上限记录在 `localStorage`，刷新页面也不会多发请求。
- 日历和诗词：每天一次，零点切换。
- 天气或新闻任一失败，只有该区块显示一句朴素兜底文案，其余区块照常显示。

### 本地运行

无需构建、无依赖、无 API key：

```bash
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

直接用浏览器打开 `index.html` 也可以。

### 部署到 GitHub Pages

纯静态文件、全部相对路径，可直接部署：

1. 把仓库推送到 GitHub。
2. 打开 **Settings → Pages**。
3. 在 **Build and deployment** 选择 **Deploy from a branch**，分支选 `main`、目录选 `/ (root)`，保存。
4. 约一分钟后访问 `https://<你的用户名>.github.io/<仓库名>/`。

### 为 Kiroween 2026 而作

参加 **Kiroween 2026** 黑客松，类别 **Frankenstein（缝合类）**。项目在 Kiro 中以规范驱动方式开发：
`.kiro/steering/` 放产品与技术约定，`.kiro/specs/e-ink-anywhere/` 放需求、设计和任务清单，
`.kiro/hooks/` 放 hook。`.kiro` 目录是有意提交的。

### 许可

MIT，见 `LICENSE`。
