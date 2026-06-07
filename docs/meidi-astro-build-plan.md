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
- Zeabur 已移除臨時驗證網域 `meidi-home-independent-20260509.zeabur.app`；目前正式服務只保留 `https://meidi-home-untitled-20260509.zeabur.app/`。
- 手機版導覽改為可展開的頁面選單，並調整手機閱讀時的 hero、卡片、表單與浮動聯繫按鈕間距。
- 已依客戶標註補強 Notion 維護：首頁/服務項目的空間分類卡片可用 Notion 圖片替換 icon；關於美地與收納團隊固定照片改為 Notion 圖片 key；精選案例支援 `分類` 篩選，案例卡可由 Notion 設定圖片。
- `astro-notion-zeabur-site` skill 已補上統一原則：新網站設計時，前台可見圖文、圖片、CTA、服務卡與案例卡都應預設做成 Notion 可維護槽位，除非客戶明確指定固定。

### 2026-05-12

- 關於美地資料庫新增 `字體大小` select 欄位，支援 `小`、`標準`、`大`、`特大`。
- 關於美地頁的 hero、method、mentor 主要標題與段落已支援從 Notion 控制字體大小；`about.hero.title` 已先設為 `小`，修正主標過大的問題。
- 首頁、收納團隊、服務項目、精選案例、預約聯繫資料庫同步新增 `字體大小` 欄位。
- 六個正式頁面的主要標題、段落、服務卡與案例卡已支援從 Notion 控制字體大小，後續客戶可直接在各頁維護資料庫調整。
- `astro-notion-zeabur-site` skill 已補上長期規則：新網站與 Notion 串接需預設支援 `字體大小`，案例頁需支援整理前/整理後雙圖。
- 精選案例頁改為 Before / After 雙圖卡片，並保留七個案例分類佔位，篩選選單會依分類切換可見案例。

### 2026-05-14

- 新增 `/privacy/` 隱私權政策頁，說明預約資料、居家現況照片、案例授權、Notion/LINE/Facebook/Zeabur 等第三方工具的使用範圍。
- 預約表單的個資同意文字已連到 `/privacy/`，頁尾同步加入隱私權政策入口。
- 正式法務版文案若由客戶後續提供，可直接替換目前版本。
- 主選單「收納團隊」改為「收納大小事」；`/team/` 改成作品集/部落格式文章列表，文章可進入獨立詳情頁。
- `收納大小事` 文章資料可由 Notion `收納團隊` 資料庫新增 `類型=文章` 的列維護標題、分類、摘要、內文、圖片、排序與字體大小。
- 首頁已同步顯示「收納大小事」文章卡片，放在「精準對接客戶痛點」空間分類區塊上方，原服務分類區塊往下移動。
- 文章卡片字級已改用專屬 CSS，Notion `字體大小` 的 `小`、`標準`、`大`、`特大` 會實際套用到卡片標題與摘要。

### 2026-05-15

- 精選案例 fallback 分類改為 10 項：工作室、公司、玄關、更衣間、房間、客廳、書房、遊戲房、搬家-新家還原、搬家-舊家打包、廚房、餐廳。
- `/portfolio/` 分類選單仍由 `getMeidiCases()` 回傳資料自動產生；Notion 案例列只要填入新的 `分類` 值，就會自動顯示並可篩選。
- 服務項目前台改為最多六張卡片；Notion 服務資料庫新增 `圖片大小` 欄位，前台預設 `大`，`特大` 會接近卡片寬度的 8 成。
- 服務項目目前啟用六張：居家收納、收納講座、收納品代買、搬家打包、空間診斷、全屋整理；多餘舊服務列已在 Notion 關閉。
- 收納大小事資料庫已改名完成並補齊文章維護欄位：`分類`、`摘要`、`內容`、`文章內容`、`Slug`、`日期`。已新增 `team.stories.*` 頁首維護列與 4 篇文章範例列；文章列設定 `類型=文章` 後會同時產生 `/team/` 列表卡片與 `/team/[slug]/` 文章子頁。
- 預約聯繫頁移除下半部官方 LINE/Facebook 聯繫卡與三個 Step 報價/流程卡片，保留上方預約說明、流程摘要、表單與 LINE CTA。
- 客戶已進入審稿階段；案例照片已補上並確認授權。已新增客戶維護 SOP：`docs/meidi-client-maintenance-sop.md`，涵蓋 Notion 圖文、服務、案例、文章、表單與上線前檢查。

### 2026-05-17

- 首頁「收納大小事」區塊移除標題下方說明段落，避免桌機版文字在手機寬度下擠壓造成閱讀問題。
- 此次只調整前台渲染，Notion 原資料列保留，後續若需恢復或改文案仍可維護。
- 已建置、提交並推送，正式站首頁已確認不再顯示該段說明文字。

### 2026-05-20

- 關於美地頁支援 Notion 文字換行分段，長篇介紹可依 Notion 內容中的換行顯示為多個段落。
- 關於美地頁的主理人與師承研究室照片下方說明文字已改為 Notion 可維護欄位。
- n8n `line官方助理-美地居家` 已改由 `美地諮詢表單` Notion trigger 觸發，整理表單內容後呼叫 `子流程- discord通知中心`，並以 `source=meidi` 路由到美地 Discord 通知。
- 預約表單仍由網站寫入 Notion；通知流程由 n8n 端輪詢 Notion 新資料，不需修改前台表單程式。

### 2026-05-21

- 首頁 hero 改為圖文並列版型，避免文字覆蓋在 banner 圖片上。
- 收納大小事列表與文章內頁圖片改用完整顯示，避免證書或長圖上下被裁切。
- 精選案例圖片加上 lazy loading 與點擊放大檢視，降低首屏一次載入壓力並保留細節檢視。
- 預約聯繫表單新增現況照片多檔上傳，送出後會以 Notion File Upload 附加到諮詢頁面；送出成功提示字級加大。
- 預約照片上傳改為前端先壓縮並以 JSON 送出，避開正式站 multipart 表單來源檢查；前台支援照片預覽、移除、更換與最多 5 張限制。
- 預約照片改為優先寫入 Notion `美地諮詢表單` 的 `現況照片` files 欄位；若欄位不存在，後端會嘗試自動新增後再寫入。

### 2026-05-22

- 預約表單照片上傳修正為以實際 Blob 檔案送往 Notion File Upload，避免只建立表單資料但照片未進入 Notion。
- 預約表單前台已標示照片限制：支援 JPG、PNG、WebP、HEIC 等常見格式，送出時會自動壓縮，最多 5 張，單張建議 10MB 以內。
- Notion `美地諮詢表單` 已新增 `現況照片` files 欄位，並新增 `含現況照片` 檢視，後續表單照片會優先顯示於該欄位。
- 已建置、提交並推送 `545dfd4 write booking photos to notion field`，Zeabur 由 GitHub 推送自動部署。

### 2026-06-07

- 依客戶提供的 `客廳、玄關、更衣.pdf` 建立案例式作品集呈現流程；原始 PDF 不進公開目錄，只保留壓縮後 WebP 圖片。
- 已將案例圖片加上「美地居家收納｜案例預覽」浮水印，素材位於 `public/assets/cases/liu-home-storage/`。
- `/portfolio/` 已調整為純案例列表；點擊案例後進入 `/portfolio/liu-home-storage/` 才顯示亂源分析、解決方案、物品地圖與各空間成果。
- 補充 `docs/meidi-case-pdf-skill-plan.md`，作為未來建立「PDF 匯入案例 Skill」的流程草稿。
- 已更新 Notion schema 與客戶維護 SOP，規劃後台以 `案例專案` / `案例空間` 兩層式管理；目前尚未實際修改 Notion，待客戶確認版型後再處理。
- 已驗證 server build 與 static build，並推送 `7df0013 Add Meidi case study portfolio format`、`08e0225 Separate portfolio case detail pages`。

## 建置邊界

- 根目錄 `/` 即為美地首頁，不使用 `PUBLIC_SITE_VARIANT`。
- 小牧人 repo 不保留美地 routes、API、public assets 或 Notion env vars。
- 文案、圖片、服務分類與表單都由美地專用 Notion 資料庫維護，並保留 local fallback。

## 已有頁面

- `/`：首頁、品牌主張、空間分類、心動馬上行動。
- `/about/`：關於美地、空間規劃邏輯、納爺體系。
- `/team/`：收納大小事，整理心法、服務消息與作品集文章列表。
- `/services/`：服務項目，最多六張服務卡，由 Notion 維護文案、圖片與圖片大小。
- `/portfolio/`：精選案例列表；單一案例內容使用 `/portfolio/[slug]/`。
- `/booking/`：流程、報價、預約聯繫。
- `/privacy/`：隱私權政策與個資使用說明。
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
- 隱私頁：`/privacy/` 已建立，表單資料僅作預約聯繫與服務評估使用。

## 待補資料

- Notion 每個資料庫的正式欄位 schema 已先補齊；後續仍需依客戶實際維護習慣微調欄位說明與範例列。
- IG、Threads 正式連結。
- 正式自訂網域。
- 客戶或法務提供的正式隱私權政策文案。
- Zeabur 空間與方案容量確認；若容量不足，需先請客戶增開或升級。

## Notion 串接建議步驟

1. 建立 local fallback content，先讓網站不靠 Notion 也能完整建置。
2. 規劃 Notion 資料庫：
   - 頁面文案與圖片：首頁、關於美地、收納團隊、服務項目、案例、預約聯繫。
   - 服務項目：分類名稱、描述、icon、排序、啟用狀態。
   - 案例資料：案例專案、案例空間、壓縮浮水印圖片、摘要、授權狀態、是否公開。
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
- 收納大小事：Hero 主視覺、頁面標題、文章卡片、文章詳情、圖片與分類。
- 服務項目：服務分類、說明、icon、排序、是否啟用。
- 精選案例：案例列表、單一案例詳情、分類、案例圖片、摘要、授權與隱私狀態。
- 預約聯繫：流程、報價、LINE QR、FB 連結、表單欄位、隱私文字。
- 隱私權政策：目前為固定頁面；若客戶要自行維護，後續可接入預約聯繫資料庫或獨立隱私頁資料庫。
- 審稿註記板：僅供內部審稿，不建議進正式網站主選單。

實際 database ID 與建議欄位記錄在 `docs/meidi-notion-schema.md`。

## 驗證清單

- 靜態預覽建置：`ASTRO_OUTPUT=static pnpm run build`
- 確認 `/`、`/booking/`、`/privacy/` 與 `/review.html` 可正常開啟。
- 搜尋不得殘留舊版 `/meidi-home/` 或 `/meidi-home-stitch/` 對外導流。
- 發布 GitHub Pages 前確認沒有新增秘密、私人聯絡資料或未授權案例照片。
