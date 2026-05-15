# 美地居家收納 Notion 串接規劃

## Notion 入口

- 客戶已建立入口頁：`https://www.notion.so/2aa89dd14f0a80649344fd1c4a39017d?source=copy_link`
- Notion 頁面標題：`收納天地`
- 頁面內已建立 `美地官網維護區`，並有美地專用資料庫，不沿用小牧人既有資料庫。

## 已建立資料庫

目前六個頁面資料庫都已建立，並已補齊網站維護需要的共用欄位。

| 頁面 | Database ID | Data Source ID |
| --- | --- | --- |
| 首頁 | `35b89dd14f0a80e4ad6bec0fdf96f4c2` | `35b89dd1-4f0a-80c8-af93-000b3184b45f` |
| 關於美地 | `35b89dd14f0a80efa50ff86f0a2b6380` | `35b89dd1-4f0a-80e7-9ecb-000b743ee2af` |
| 收納團隊 | `35b89dd14f0a804a826ce94007fe8f8b` | `35b89dd1-4f0a-8071-bbba-000b161f24a6` |
| 服務項目 | `35b89dd14f0a80a29d90c2568f55398f` | `35b89dd1-4f0a-8011-9938-000b6bcb507e` |
| 精選案例 | `35b89dd14f0a80d3baecf469875c99aa` | `35b89dd1-4f0a-80aa-ae26-000ba80f023c` |
| 預約聯繫 | `35b89dd14f0a80b6ade1e8b69e56377e` | `35b89dd1-4f0a-8015-b37b-000bf39e8254` |
| 美地諮詢表單 | `ae9b716c250c46e49ffbeeb1e0e8a32a` | `7429c837-d6ad-47db-81ec-2aa7586af874` |

## 建議資料庫

目前前台會讀取以下共用欄位：

- `名稱`：前台 key 或資料名稱。
- `前台位置`：給客戶看的維護位置說明。
- `類型`：建議選項包含 `文字`、`圖片`、`區塊`、`案例`、`按鈕`。
- `文字內容`：替換文字。
- `圖片`：Notion 上傳圖片。
- `圖片網址`：外部圖片 URL。
- `字體大小`：文字大小選項，目前支援 `小`、`標準`、`大`、`特大`。
- `排序`：列表排序。
- `啟用`：是否顯示。

### Meidi Page Copy

若六頁資料庫要維持分開，以下欄位需在每個頁面資料庫中建立；若後續改成單一資料庫，則以 `Page` 欄位區分頁面。

- `Page`：首頁 / 關於美地 / 收納大小事 / 服務項目 / 精選案例 / 預約聯繫
- `Section`：hero、value、method、pricing、privacy 等區塊名稱
- `Key`：前台讀取用 key
- `Title`：標題
- `Body`：內文
- `Image`：圖片
- `CTA Label`：按鈕文字
- `CTA URL`：按鈕連結
- `Sort`：排序
- `Active`：是否顯示

### 目前圖片維護 key

以下 key 的 `圖片` 或 `圖片網址` 可直接替換網站圖片：

| 頁面 | Key | 前台位置 |
| --- | --- | --- |
| 首頁 | `home.hero.image` | 首頁 / Hero / 主視覺 |
| 首頁、服務項目 | `service.1` 至 `service.7` | 空間分類卡片；每列可用 `圖片` 覆蓋 icon |
| 關於美地 | `about.hero.image` | 關於美地 / Hero / 華琍老師形象照 |
| 關於美地 | `about.method.image` | 關於美地 / 方法論 / 主理人照片 |
| 關於美地 | `about.mentor.image` | 關於美地 / 師承研究室 / 培訓照片 |
| 收納大小事 | `team.stories.hero.image` | 收納大小事 / Hero 主視覺 |
| 精選案例 | 案例列 | 精選案例 / 每張案例卡可設定 `整理前圖片` 與 `整理後圖片` |

### 字體大小維護

六個頁面資料庫皆已加入 `字體大小` select 欄位，前台會依各列設定調整對應文字大小。

目前支援範圍：

- 首頁：Hero 標題/說明、三個價值卡、空間分類區塊標題/說明、服務卡片標題/說明。
- 關於美地：Hero、方法論、納爺體系區塊的標題、段落與引用文字。
- 收納大小事：Hero、頁面標題、文章列表、文章分類、文章圖片與詳情內文。
- 服務項目：Hero 標題/說明、服務卡片標題/說明。
- 精選案例：Hero 標題/說明、案例卡片標題/說明。
- 預約聯繫：Hero、三步驟流程、LINE 聯繫區、報價步驟卡片。

使用方式：

- `小`：適合長標題或手機容易換行的文字。
- `標準`：使用網站預設大小。
- `大`：需要加強視覺層級時使用。
- `特大`：只建議短標題使用。

服務卡與案例卡為重複資料列，直接在該筆 `service.*` 或案例列上設定 `字體大小` 即可同步影響卡片標題與說明。

### Meidi Services

維護服務分類與服務卡片。

- `名稱`：使用 `service.1`、`service.2` 這類穩定 key。
- `前台位置`：例如 `首頁與服務項目 / 空間分類 / 衣櫥收納`，前台會取最後一段作為卡片標題。
- `類型`：填 `區塊`。
- `文字內容`：卡片描述。
- `圖片` 或 `圖片網址`：卡片圖示；未填時使用內建 Material icon。
- `排序`
- `啟用`

### Meidi Cases

維護精選案例與 Before / After。

- `名稱`：案例 key 或案例名稱。
- `前台位置`：例如 `精選案例 / 玄關 / 入口鞋櫃整理`，前台會取最後一段作為案例標題。
- `類型`：填 `案例`。
- `分類`：建議 select 或文字；篩選選單會依此欄位自動產生。
- `文字內容`：案例摘要。
- `整理前圖片` 或 `整理前圖片網址`：整理前照片；正式案例需授權與去識別化。
- `整理後圖片` 或 `整理後圖片網址`：整理後照片；正式案例需授權與去識別化。
- `圖片` 或 `圖片網址`：舊欄位相容；若只填此欄位，前台會先當作整理前照片。
- `授權狀態`：例如 `待授權`、`已授權`。
- `字體大小`：控制案例卡標題與說明文字。
- `排序`
- `啟用`

目前前台至少保留十個案例分類，篩選選單會依案例列自動產生。Notion `分類` 欄位可保留舊選項供既有案例過渡使用，並新增以下建議選項：

- 工作室、公司
- 玄關
- 更衣間
- 房間
- 客廳
- 書房、遊戲房
- 搬家-新家還原
- 搬家-舊家打包
- 廚房
- 餐廳

### Meidi Team / 收納大小事

維護收納大小事頁面的頁面文案與文章列表。頁面文案仍使用 `名稱` key，例如 `team.stories.title`、`team.stories.lede`、`team.stories.hero.image`。文章列請設定 `類型=文章`，前台會顯示為卡片，點選後進入獨立文章頁，並同步顯示到首頁「精準對接客戶痛點」上方。

- `名稱`：文章標題，或頁面文案 key
- `類型`：頁面文案 / 圖片 / 文章
- `分類`：作品集、整理心法、RELIFE 服務等
- `摘要`：文章卡片摘要
- `文字內容`：短文案或文章摘要
- `內容` / `文章內容`：文章詳情頁內文
- `圖片` / `圖片網址`：Hero 或文章圖片
- `Slug` / `網址代碼`：文章網址代碼
- `字體大小`：小 / 標準 / 大 / 特大
- `排序`
- `啟用`

`字體大小` 會套用於文章卡片標題與摘要，以及文章詳情頁標題與內文。若未設定，前台使用較保守的標準字級。

### Meidi Inquiries

建議另外新增一個諮詢表單資料庫，避免把表單填寫資料混進 `預約聯繫` 頁面文案資料庫。表單送出資料寫入此資料庫，後續可接 n8n 或 LINE 通知。

- `Name`
- `Phone`
- `Line ID`
- `Service Area`
- `Space Type`
- `Problem`
- `Photos`
- `Source`
- `Status`
- `Created At`
- `Privacy Consent`

## 建議環境變數

- `NOTION_MEIDI_HOME_DB_ID`
- `NOTION_MEIDI_ABOUT_DB_ID`
- `NOTION_MEIDI_TEAM_DB_ID`
- `NOTION_MEIDI_SERVICES_DB_ID`
- `NOTION_MEIDI_PORTFOLIO_DB_ID`
- `NOTION_MEIDI_BOOKING_DB_ID`
- `NOTION_MEIDI_INQUIRY_DB_ID`
- `PUBLIC_MEIDI_LINE_URL`
- `PUBLIC_MEIDI_FACEBOOK_URL`
- `N8N_MEIDI_NOTIFY_WEBHOOK`

若沿用目前已建立的六頁資料庫，可先設定：

- `NOTION_MEIDI_HOME_DB_ID=35b89dd14f0a80e4ad6bec0fdf96f4c2`
- `NOTION_MEIDI_ABOUT_DB_ID=35b89dd14f0a80efa50ff86f0a2b6380`
- `NOTION_MEIDI_TEAM_DB_ID=35b89dd14f0a804a826ce94007fe8f8b`
- `NOTION_MEIDI_SERVICES_DB_ID=35b89dd14f0a80a29d90c2568f55398f`
- `NOTION_MEIDI_PORTFOLIO_DB_ID=35b89dd14f0a80d3baecf469875c99aa`
- `NOTION_MEIDI_BOOKING_DB_ID=35b89dd14f0a80b6ade1e8b69e56377e`
- `NOTION_MEIDI_INQUIRY_DB_ID=ae9b716c250c46e49ffbeeb1e0e8a32a`

## 已確認外部連結

- LINE QR：`https://qr-official.line.me/gs/M_135hliju_GW.png?oat_content=qr`
- LINE 加好友：`https://line.me/R/ti/p/@135hliju`
- Facebook：`https://www.facebook.com/profile.php?id=61587447119551`
- IG / Threads：先留空，待客戶提供。

## 注意事項

- 美地正式站需要獨立 Zeabur service，不得使用小牧人正式服務覆蓋部署。
- 若 Zeabur 空間或服務額度不足，部署前需先回報並等待新增空間。
- 表單資料只作預約聯繫與服務評估使用；正式站已建立 `/privacy/` 隱私權政策頁，表單同意文字需保留連結。
