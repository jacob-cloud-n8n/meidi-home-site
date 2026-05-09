# 美地居家收納官網

美地居家收納的獨立 Astro 官網。正式環境使用 Zeabur SSR，網站內容由 Notion 維護，預約諮詢表單寫入 Notion「美地諮詢表單」資料庫。

## Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run start
```

靜態預覽建置：

```bash
ASTRO_OUTPUT=static pnpm run build
```

## Routes

- `/` 首頁
- `/about/` 關於美地
- `/team/` 收納團隊
- `/services/` 服務項目
- `/portfolio/` 精選案例
- `/booking/` 預約聯繫
- `/review.html` 審稿註記板

## Environment

請參考 `.env.example`。正式部署時至少需設定：

- `NOTION_TOKEN`
- `NOTION_CACHE_SECONDS`
- `PUBLIC_SITE_URL`
- `NOTION_MEIDI_HOME_DB_ID`
- `NOTION_MEIDI_ABOUT_DB_ID`
- `NOTION_MEIDI_TEAM_DB_ID`
- `NOTION_MEIDI_SERVICES_DB_ID`
- `NOTION_MEIDI_PORTFOLIO_DB_ID`
- `NOTION_MEIDI_BOOKING_DB_ID`
- `NOTION_MEIDI_INQUIRY_DB_ID`

不要提交 `.env` 或任何真實 token。

## Zeabur

Zeabur 使用 `zeabur.json`：

- Build: `pnpm run build`
- Start: `node ./dist/server/entry.mjs`
- Node: `24`

此 repo 是美地獨立網站，不需要 `PUBLIC_SITE_VARIANT`，根目錄就是美地首頁。

## Maintenance Docs

- `docs/meidi-notion-schema.md`：Notion 資料庫與欄位規劃
- `docs/meidi-astro-build-plan.md`：建置、驗證與部署紀錄
