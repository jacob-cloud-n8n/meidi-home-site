# 美地居家收納 Astro 建置準備

## 目前方向

- 客戶已確認 Stitch 版本作為正式設計方向。
- 美地已拆成獨立 Astro repo：`jacob-cloud-n8n/meidi-home-site`。
- Zeabur 使用獨立服務 `meidi-home-site-v2`，不再與小牧人 repo 或服務共用部署流程。
- 正式網址：`https://meidi-home-untitled-20260509.zeabur.app/`。

## 維護紀錄

### 2026-05-10

- 已對舊 Zeabur 美地服務 `meidi-home-site` 執行刪除；Zeabur API 回報 deletion already scheduled，該服務目前無 domain、deployments 皆為 `REMOVED`，正式流量只由新服務 `meidi-home-site-v2` 承接。
- `astro-notion-zeabur-site` skill 已補上最新 SOP：正式站預設一個 Astro repo 對一個 Zeabur 服務；遇到同 repo 多網站時需先提醒維護風險並優先建議拆 repo。
- 美地正式網址 `https://meidi-home-untitled-20260509.zeabur.app/` 已確認指向新服務，首頁與 `/booking/` 回應 `200`。
- 預約表單已確認回傳 `mode: "notion"`；盤點測試資料已從 Notion 諮詢資料庫封存。
- Notion token 暫不輪替；仍需避免再次貼到文件、Git 或前端輸出。

## 建置邊界

- 根目錄 `/` 即為美地首頁，不使用 `PUBLIC_SITE_VARIANT`。
- 小牧人 repo 不保留美地 routes、API、public assets 或 Notion env vars。
- 文案、圖片、服務分類與表單都由美地專用 Notion 資料庫維護，並保留 local fallback。

## 已有頁面

- `/`：首頁、品牌主張、空間分類、心動馬上行動。
- `/about/`：關於美地、空間規劃邏輯、納爺體系。
- `/team/`：收納團隊、華琍老師背書、社群與培訓資訊。
- `/services/`：服務項目、搬家打包、全屋整理與擴充服務佔位。
- `/portfolio/`：精選案例與 Before / After 分類佔位。
- `/booking/`：流程、報價、預約聯繫。
- `/review.html`：審稿註記板，不掛主選單。

## 已確認資料

- Notion 入口頁：`https://www.notion.so/2aa89dd14f0a80649344fd1c4a39017d?source=copy_link`
- Notion 頁面標題：`收納天地`，已包含 `美地官網維護區` 與六個頁面資料庫。
- 官方 LINE QR：`https://qr-official.line.me/gs/M_135hliju_GW.png?oat_content=qr`
- 官方 LINE 加好友連結：`https://line.me/R/ti/p/@135hliju`
- Facebook：`https://www.facebook.com/profile.php?id=61587447119551`
- IG、Threads：先保留欄位，待客戶補正式連結。
- 服務區域與車馬費：另行報價。
- 可公開的證書圖片：`public/assets/naye-certificate.jpg`
- 表單：已寫入 Notion 諮詢資料庫，作為後續通知與追蹤來源。
- 隱私提醒：表單資料僅作預約聯繫與服務評估使用。

## 待補資料

- 已授權且去識別化的 Before / After 案例照片。
- Notion 每個資料庫的正式欄位 schema；目前六個頁面資料庫已建立，但只含 `名稱` title 欄位。
- IG、Threads 正式連結。
- 正式自訂網域。
- 正式隱私權政策頁文案與表單同意文字。
- Zeabur 空間與方案容量確認；若容量不足，需先請客戶增開或升級。

## Notion 串接建議步驟

1. 建立 local fallback content，先讓網站不靠 Notion 也能完整建置。
2. 規劃 Notion 資料庫：
   - 頁面文案與圖片：首頁、關於美地、收納團隊、服務項目、案例、預約聯繫。
   - 服務項目：分類名稱、描述、icon、排序、啟用狀態。
   - 案例資料：分類、Before/After 圖、摘要、授權狀態、是否公開。
   - 團隊/資歷：照片、證書、社群連結、排序。
   - 諮詢表單：姓名、電話、LINE ID、服務區域、空間類型、困擾描述、狀態。
3. 接 Notion adapter：讀 env var、短快取、欄位別名、失敗時 fallback。
4. 表單流程：先寫 Notion，再由 n8n/LINE 通知；失敗時保留 LINE/Facebook fallback。
5. 補 `.env.example`、README 與 Zeabur env var 文件。
6. 驗證 server build 與 static preview build，確認沒有 secret 或未授權照片進 Git。

## Notion 頁面對應

正式 Astro 版需讓每個頁面都可由 Notion 維護文案與圖片：

- 首頁：hero、品牌主張、三個價值卡、服務分類摘要、CTA。
- 關於美地：品牌方法論、華琍老師介紹、納爺體系說明、圖片。
- 收納團隊：形象照、證書、社群連結、資歷卡、動態牆設定。
- 服務項目：服務分類、說明、icon、排序、是否啟用。
- 精選案例：分類、Before/After 圖片、摘要、授權與隱私狀態。
- 預約聯繫：流程、報價、LINE QR、FB 連結、表單欄位、隱私文字。
- 審稿註記板：僅供內部審稿，不建議進正式網站主選單。

實際 database ID 與建議欄位記錄在 `docs/meidi-notion-schema.md`。

## 驗證清單

- 靜態預覽建置：`ASTRO_OUTPUT=static pnpm run build`
- 確認 `/`、`/booking/` 與 `/review.html` 可正常開啟。
- 搜尋不得殘留舊版 `/meidi-home/` 或 `/meidi-home-stitch/` 對外導流。
- 發布 GitHub Pages 前確認沒有新增秘密、私人聯絡資料或未授權案例照片。
