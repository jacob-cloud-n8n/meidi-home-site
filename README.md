# 美地居家收納官網

美地居家收納的獨立 Astro 官網。Cloudflare Pages 版本採「Astro 靜態頁面 + 單一 Pages Function」：網站內容在建置時從 Notion 讀取，只有預約諮詢 `POST /api/meidi-inquiry` 在執行期寫入 Notion。舊 Zeabur SSR 與 Node adapter 暫時保留作切換期回退。

## 本機指令

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run start
pnpm run build:cloudflare
pnpm run preview:cloudflare
```

`build:cloudflare` 固定使用既有的 `ASTRO_OUTPUT=static` 路徑。`preview:cloudflare` 會以 Wrangler 同時提供 `dist` 靜態檔與 `functions/`。

## Routes

- `/` 首頁
- `/about/` 關於美地
- `/team/` 收納大小事
- `/services/` 服務項目
- `/portfolio/` 精選案例
- `/booking/` 預約聯繫
- `/privacy/` 隱私權政策
- `/diagnosis/` 親子居家空間健康診斷表
- `/review.html` 審稿註記板
- `POST /api/meidi-inquiry` 預約諮詢 Pages Function

Cloudflare 靜態版不提供舊的 `POST /api/revalidate`。`/admin/status` 沒有 repo 內呼叫者，且公開健康端點會增加 Notion 執行期存取與營運資訊暴露，所以 Cloudflare 版不保留。

## 環境變數

請參考 `.env.example`，不要提交 `.env`、token、Deploy Hook URL 或其他密鑰。

- 建置時 Notion：`NOTION_TOKEN`、`NOTION_CACHE_SECONDS`、`NOTION_MEIDI_HOME_DB_ID`、`NOTION_MEIDI_ABOUT_DB_ID`、`NOTION_MEIDI_TEAM_DB_ID`、`NOTION_MEIDI_ARTICLES_DB_ID`、`NOTION_MEIDI_SERVICES_DB_ID`、`NOTION_MEIDI_PORTFOLIO_DB_ID`、`NOTION_MEIDI_BOOKING_DB_ID`
- 詢問表單 Function：`NOTION_TOKEN`、`NOTION_MEIDI_INQUIRY_DB_ID`、`PUBLIC_LINE_URL`
- 網站網址：`PUBLIC_SITE_URL`
- 舊環境相容：`SITE_URL`（若與 `PUBLIC_SITE_URL` 同時存在，以 `PUBLIC_SITE_URL` 為準）
- 建置工具：`NODE_VERSION`、`PNPM_VERSION`；可另設 `ASTRO_TELEMETRY_DISABLED=1`

未設定 `NOTION_TOKEN` 時，內容頁使用 repo 的 fallback 資料；詢問表單維持舊版行為，回傳 `ok: true`、`mode: "line-fallback"` 與 `lineUrl`，不會寫入 Notion。

## 部署到 Cloudflare Pages

本分支只準備可部署版本，不代表已建立 Pages 專案、部署或切換 DNS。完成 Claude 驗收並合併後，Cloudflare Pages 後台使用：

| 設定 | 值 |
| --- | --- |
| Production branch | `main` |
| Build command | `pnpm run build:cloudflare` |
| Build output directory | `dist` |
| Root directory | 留空（repo 根目錄） |
| Node.js | `22.16.0`，設定 `NODE_VERSION=22.16.0` |
| pnpm | `10.33.2`，設定 `PNPM_VERSION=10.33.2` |

`public/_routes.json` 只讓 `/api/meidi-inquiry` 進入 Pages Functions；其他請求直接使用靜態資產。`postbuild:cloudflare` 會依實際產生的 `/team/<slug>/` 與 `/portfolio/<slug>/` 頁面生成 `dist/_redirects`：已建置的內容以 `200` rewrite 讀取靜態檔，找不到的單層 slug 維持舊版 `302` 回列表頁。這樣不會用 wildcard 誤攔新加入的 Notion 內容。

### Notion 改完如何更新網站

Cloudflare Pages 版在建置時抓取 Notion，完成建置後不會像舊 SSR 站一樣依快取時間自動更新。可在 Pages 的 Deployments 頁面手動重新建置；日後也可在 Pages 專案的 Settings → Builds 建立綁定 `main` 的 Deploy Hook，再由 n8n 在內容發布後對該 URL 發送 `POST`。

Deploy Hook URL 等同部署密鑰，必須保存在 n8n credential／secret，不可寫入 repo。本分支沒有建立或呼叫 Deploy Hook。

## 自訂網域切換

目前程式、正式 sitemap 與營運文件涉及的網域如下：

| 網域 | 目前角色 |
| --- | --- |
| `meidi.little-shepherd.com` | 現行正式 sitemap 的 canonical host；Cloudflare 切換後仍應作為 `PUBLIC_SITE_URL` |
| `meidi.zeabur.app` | 本次驗收指定的 Zeabur 來源站 |
| `meidi-home-untitled-20260509.zeabur.app` | 舊 Astro fallback 與歷史營運文件中的 Zeabur 網域 |

切換步驟：

1. 在 Cloudflare Pages Production 環境設定 `PUBLIC_SITE_URL=https://meidi.little-shepherd.com`。
2. 建置後檢查 canonical、`robots.txt`、`llms.txt` 與 `sitemap.xml` 都使用該自訂網域。
3. 另案取得 Jacob 授權後，才在 Pages 新增自訂網域並調整 DNS。
4. 完成首頁、內容頁、表單與自訂網域驗收且回退期結束後，再另案停用舊 Zeabur 網域。

本分支不修改 DNS、Cloudflare、Zeabur 或 n8n 設定。

## Zeabur 回退路徑

`zeabur.json`、`@astrojs/node`、`pnpm run start` 與 `ASTRO_OUTPUT` 的 server 分支目前都保留。Zeabur 使用：

- Build: `pnpm run build`
- Start: `node ./dist/server/entry.mjs`
- Node: `24`

## Maintenance Docs

- `docs/meidi-notion-schema.md`：Notion 資料庫與欄位規劃
- `docs/meidi-case-pdf-skill-plan.md`：案例 PDF 匯入與未來 Skill 流程規劃
- `docs/meidi-astro-build-plan.md`：建置、驗證與部署紀錄
