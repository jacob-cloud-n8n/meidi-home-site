# 美地居家收納 Notion 串接規劃

## Notion 入口

- 客戶已建立入口頁：`https://www.notion.so/2aa89dd14f0a80649344fd1c4a39017d?source=copy_link`
- Notion 頁面標題：`收納天地`
- 頁面內已建立 `美地官網維護區`，並有美地專用資料庫，不沿用小牧人既有資料庫。

## 已建立資料庫

目前六個資料庫都已建立，但 schema 暫時只有 `名稱` title 欄位；正式串接前仍需補欄位。

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

### Meidi Page Copy

若六頁資料庫要維持分開，以下欄位需在每個頁面資料庫中建立；若後續改成單一資料庫，則以 `Page` 欄位區分頁面。

- `Page`：首頁 / 關於美地 / 收納團隊 / 服務項目 / 精選案例 / 預約聯繫
- `Section`：hero、value、method、pricing、privacy 等區塊名稱
- `Key`：前台讀取用 key
- `Title`：標題
- `Body`：內文
- `Image`：圖片
- `CTA Label`：按鈕文字
- `CTA URL`：按鈕連結
- `Sort`：排序
- `Active`：是否顯示

### Meidi Services

維護服務分類與服務卡片。

- `Name`
- `Slug`
- `Description`
- `Icon`
- `Category`
- `Sort`
- `Active`

### Meidi Cases

維護精選案例與 Before / After。

- `Title`
- `Category`
- `Summary`
- `Before Image`
- `After Image`
- `Privacy Status`
- `Permission Status`
- `Active`

### Meidi Team

維護收納團隊、資歷與社群。

- `Name`
- `Role`
- `Bio`
- `Photo`
- `Certificate Image`
- `Facebook URL`
- `Instagram URL`
- `Threads URL`
- `Sort`
- `Active`

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
- 表單資料只作預約聯繫與服務評估使用，正式版需放置隱私權與個資同意文字。
