const notionVersion = "2022-06-28";
const defaultCacheSeconds = 60;

export type MeidiCopy = Record<string, {
  text?: string;
  image?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  fontSize?: string;
}>;

export type MeidiService = {
  title: string;
  body: string;
  icon: string;
  image?: string;
  fontSize?: string;
};

export type MeidiCase = {
  title: string;
  body: string;
  category: string;
  image?: string;
  beforeImage?: string;
  afterImage?: string;
  status?: string;
  fontSize?: string;
};

export type MeidiArticle = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: string;
  image?: string;
  date?: string;
  fontSize?: string;
};

type NotionPage = {
  properties?: Record<string, any>;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const pageDatabaseIds = {
  home: "35b89dd14f0a80e4ad6bec0fdf96f4c2",
  about: "35b89dd14f0a80efa50ff86f0a2b6380",
  team: "35b89dd14f0a804a826ce94007fe8f8b",
  services: "35b89dd14f0a80a29d90c2568f55398f",
  portfolio: "35b89dd14f0a80d3baecf469875c99aa",
  booking: "35b89dd14f0a80b6ade1e8b69e56377e"
};

const cache = new Map<string, CacheEntry<NotionPage[]>>();

function warn(error: unknown): void {
  console.warn(error instanceof Error ? error.message : error);
}

function cacheSeconds(): number {
  const parsed = Number(import.meta.env.NOTION_CACHE_SECONDS ?? defaultCacheSeconds);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultCacheSeconds;
}

function text(prop: any): string {
  return prop?.rich_text?.map((item: any) => item.plain_text).join("") ?? "";
}

function title(prop: any): string {
  return prop?.title?.map((item: any) => item.plain_text).join("") ?? "";
}

function select(prop: any): string {
  return prop?.select?.name ?? "";
}

function richOrSelect(prop: any): string {
  return select(prop) || text(prop);
}

function checkbox(prop: any, fallback = true): boolean {
  return typeof prop?.checkbox === "boolean" ? prop.checkbox : fallback;
}

function number(prop: any, fallback = 0): number {
  return typeof prop?.number === "number" ? prop.number : fallback;
}

function date(prop: any): string {
  return prop?.date?.start ?? "";
}

function url(prop: any): string {
  return prop?.url ?? "";
}

function fileUrl(prop: any): string {
  const file = prop?.files?.[0];
  return file?.file?.url ?? file?.external?.url ?? "";
}

function imageValue(props: Record<string, any>, fileKey: string, urlKey: string): string {
  return fileUrl(props[fileKey]) || url(props[urlKey]);
}

async function queryDatabase(databaseId: string): Promise<NotionPage[]> {
  const token = import.meta.env.NOTION_TOKEN;
  if (!token || !databaseId) return [];

  const cached = cache.get(databaseId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pages: NotionPage[] = [];
  let startCursor: string | undefined;

  do {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Notion-Version": notionVersion
      },
      body: JSON.stringify({
        page_size: 100,
        start_cursor: startCursor,
        sorts: [{ property: "排序", direction: "ascending" }]
      })
    });

    if (!response.ok) throw new Error(`Meidi Notion query failed: ${response.status}`);
    const payload = await response.json();
    pages.push(...(payload.results ?? []));
    startCursor = payload.has_more ? payload.next_cursor : undefined;
  } while (startCursor);

  const ttl = cacheSeconds();
  if (ttl > 0) cache.set(databaseId, { expiresAt: Date.now() + ttl * 1000, value: pages });
  return pages;
}

export async function getMeidiCopy(page: keyof typeof pageDatabaseIds): Promise<MeidiCopy> {
  try {
    const envKey = `NOTION_MEIDI_${page.toUpperCase()}_DB_ID`;
    const databaseId = import.meta.env[envKey] || pageDatabaseIds[page];
    const pages = await queryDatabase(databaseId);
    return pages.reduce<MeidiCopy>((copy, page) => {
      const props = page.properties ?? {};
      const key = title(props["名稱"]);
      if (!key || !key.includes(".") || !checkbox(props["啟用"], true)) return copy;
      copy[key] = {
        text: text(props["文字內容"]),
        image: fileUrl(props["圖片"]) || url(props["圖片網址"]),
        buttonLabel: text(props["按鈕文字"]),
        buttonUrl: url(props["按鈕連結"]),
        fontSize: select(props["字體大小"])
      };
      return copy;
    }, {});
  } catch (error) {
    warn(error);
    return {};
  }
}

export async function getMeidiServices(): Promise<MeidiService[]> {
  const icons = ["checkroom", "skillet", "toys", "inventory_2", "desk", "move_location", "home_spark", "add_home", "add_circle"];
  try {
    const pages = await queryDatabase(import.meta.env.NOTION_MEIDI_SERVICES_DB_ID || pageDatabaseIds.services);
    const items = pages
      .map((page, index) => {
        const props = page.properties ?? {};
        const location = text(props["前台位置"]);
        const rowTitle = title(props["名稱"]);
        const cardTitle = location.split("/").pop()?.trim() || rowTitle;
        return {
          key: rowTitle,
          type: select(props["類型"]),
          title: cardTitle,
          body: text(props["文字內容"]),
          image: fileUrl(props["圖片"]) || url(props["圖片網址"]),
          fontSize: select(props["字體大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index),
          icon: icons[index % icons.length]
        };
      })
      .filter((item) => item.enabled && item.type === "區塊" && item.key.startsWith("service.") && item.title && item.body)
      .sort((a, b) => a.order - b.order);
    return items.length > 0 ? items.map(({ title, body, icon, image, fontSize }) => ({ title, body, icon, image, fontSize })) : fallbackServices;
  } catch (error) {
    warn(error);
    return fallbackServices;
  }
}

export async function getMeidiCases(): Promise<MeidiCase[]> {
  try {
    const pages = await queryDatabase(import.meta.env.NOTION_MEIDI_PORTFOLIO_DB_ID || pageDatabaseIds.portfolio);
    const items = pages
      .map((page, index) => {
        const props = page.properties ?? {};
        const location = text(props["前台位置"]);
        const rowTitle = title(props["名稱"]);
        const caseTitle = location.split("/").pop()?.trim() || rowTitle;
        return {
          key: rowTitle,
          type: select(props["類型"]),
          title: caseTitle,
          body: text(props["文字內容"]),
          category: richOrSelect(props["分類"]) || caseTitle,
          image: imageValue(props, "圖片", "圖片網址"),
          beforeImage: imageValue(props, "整理前圖片", "整理前圖片網址") || imageValue(props, "Before 圖片", "Before 圖片網址"),
          afterImage: imageValue(props, "整理後圖片", "整理後圖片網址") || imageValue(props, "After 圖片", "After 圖片網址"),
          status: select(props["授權狀態"]),
          fontSize: select(props["字體大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index)
        };
      })
      .filter((item) => item.enabled && item.type === "案例")
      .sort((a, b) => a.order - b.order);
    const mapped = items.map(({ title, body, category, image, beforeImage, afterImage, status, fontSize }) => ({
      title,
      body,
      category,
      image,
      beforeImage: beforeImage || image,
      afterImage,
      status,
      fontSize
    }));
    return ensureCaseCategories(mapped.length > 0 ? mapped : fallbackCases);
  } catch (error) {
    warn(error);
    return ensureCaseCategories(fallbackCases);
  }
}

export async function getMeidiArticles(): Promise<MeidiArticle[]> {
  try {
    const pages = await queryDatabase(import.meta.env.NOTION_MEIDI_TEAM_DB_ID || pageDatabaseIds.team);
    const items = pages
      .map((page, index) => {
        const props = page.properties ?? {};
        const rowTitle = title(props["名稱"]);
        const body = text(props["內容"]) || text(props["文章內容"]) || text(props["文字內容"]);
        const excerpt = text(props["摘要"]) || body.slice(0, 72);
        return {
          type: select(props["類型"]),
          title: rowTitle,
          slug: text(props["Slug"]) || text(props["網址代碼"]) || slugify(rowTitle, `article-${index + 1}`),
          category: richOrSelect(props["分類"]) || richOrSelect(props["標籤"]) || "收納大小事",
          excerpt,
          body,
          image: imageValue(props, "圖片", "圖片網址"),
          date: date(props["日期"]) || text(props["日期"]),
          fontSize: select(props["字體大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index)
        };
      })
      .filter((item) => item.enabled && item.type === "文章" && item.title && item.excerpt)
      .sort((a, b) => a.order - b.order);

    return items.length > 0
      ? items.map(({ title, slug, category, excerpt, body, image, date, fontSize }) => ({ title, slug, category, excerpt, body, image, date, fontSize }))
      : fallbackArticles;
  } catch (error) {
    warn(error);
    return fallbackArticles;
  }
}

function slugify(input: string, fallback: string): string {
  const slug = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || fallback;
}

function ensureCaseCategories(items: MeidiCase[]): MeidiCase[] {
  const existing = new Set(items.map((item) => item.category));
  const placeholders = caseCategories
    .filter((category) => !existing.has(category))
    .map((category) => ({
      title: category,
      category,
      body: "案例照片待客戶授權後上傳。",
      status: "待授權"
    }));
  return [...items, ...placeholders].sort((a, b) => {
    const aIndex = caseCategories.indexOf(a.category);
    const bIndex = caseCategories.indexOf(b.category);
    const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return normalizedA - normalizedB || a.title.localeCompare(b.title, "zh-Hant");
  });
}

export function c(copy: MeidiCopy, key: string, fallback: string): string {
  return copy[key]?.text || copy[key]?.buttonLabel || fallback;
}

export function href(copy: MeidiCopy, key: string, fallback: string): string {
  return copy[key]?.buttonUrl || fallback;
}

export function image(copy: MeidiCopy, key: string, fallback: string): string {
  return copy[key]?.image || fallback;
}

export function fontSizeClass(copy: MeidiCopy, key: string, prefix = "font-size"): string {
  return valueFontSizeClass(copy[key]?.fontSize, prefix);
}

export function valueFontSizeClass(size: string | undefined, prefix = "font-size"): string {
  const classes: Record<string, string> = {
    "小": `${prefix}-small`,
    "標準": `${prefix}-normal`,
    "大": `${prefix}-large`,
    "特大": `${prefix}-xlarge`
  };
  return size ? classes[size] || "" : "";
}

export const lineUrl = "https://line.me/R/ti/p/@135hliju";
export const facebookUrl = "https://www.facebook.com/profile.php?id=61587447119551";
export const lineQrUrl = "https://qr-official.line.me/gs/M_135hliju_GW.png?oat_content=qr";

export const fallbackServices: MeidiService[] = [
  { title: "衣櫥收納", body: "衣物分類、直立式摺衣技巧、換季規劃。", icon: "checkroom" },
  { title: "廚房餐廳", body: "調味料、乾貨、鍋碗瓢盆的系統化陳列。", icon: "skillet" },
  { title: "兒童房 / 遊戲區", body: "玩具分類與孩子自主收納動線設計。", icon: "toys" },
  { title: "儲藏室", body: "坪效最大化的重型架規劃與大型物品收納。", icon: "inventory_2" },
  { title: "書房 / 辦公", body: "文件數位化分類與桌面清爽化。", icon: "desk" },
  { title: "搬家打包", body: "搬遷前打包分類、新居上架與定位規劃。", icon: "move_location" },
  { title: "全屋整理", body: "年度深度整理與跨空間生活系統重建。", icon: "home_spark" }
];

export const caseCategories = [
  "工作室、公司",
  "玄關",
  "更衣間",
  "房間",
  "客廳",
  "書房、遊戲房",
  "搬家-新家還原",
  "搬家-舊家打包",
  "廚房",
  "餐廳"
];

export const fallbackCases: MeidiCase[] = [
  { title: "工作室、公司", category: "工作室、公司", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "玄關", category: "玄關", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "更衣間", category: "更衣間", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "房間", category: "房間", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "客廳", category: "客廳", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "書房、遊戲房", category: "書房、遊戲房", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "搬家-新家還原", category: "搬家-新家還原", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "搬家-舊家打包", category: "搬家-舊家打包", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "廚房", category: "廚房", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "餐廳", category: "餐廳", body: "案例照片待客戶授權後上傳。", status: "待授權" }
];

export const fallbackArticles: MeidiArticle[] = [
  {
    title: "想都不用想！整理師：這 5 大類都可以馬上斷捨離",
    slug: "declutter-five-types",
    category: "作品集，整理心法",
    excerpt: "從每天看得到卻一直沒處理的物品開始，替居家空間清出第一口呼吸感。",
    body: "整理不是一口氣把家翻完，而是先找出那些已經不再服務生活的物品。\n\n過期的耗材、重複的收納盒、不合身的衣物、壞掉卻捨不得丟的小家電，以及一直以為會用到的贈品，常常是家中混亂感的來源。\n\n美地會陪客戶把物品重新分類，讓每一個留下來的東西都有位置，也讓家人知道該怎麼拿、怎麼收。",
    image: "/assets/process-pricing.jpg"
  },
  {
    title: "沒時間整理嗎？每天、每週、每月 3 階段整理計畫",
    slug: "three-stage-routine",
    category: "整理心法",
    excerpt: "把整理拆成短時間可以完成的日常節奏，比一次大掃除更容易長期維持。",
    body: "很多家庭不是不想整理，而是時間被工作、孩子與家務切得太碎。\n\n美地建議先建立三種節奏：每天 10 分鐘歸位、每週 30 分鐘檢查高頻區、每月一次調整換季或囤貨區。\n\n當整理變成固定節奏，家就不需要靠媽媽一直提醒，也能慢慢回到穩定狀態。",
    image: "/assets/huali-portrait.jpg"
  },
  {
    title: "沒預算請整理師！1 小時線上諮詢讓你問好問滿",
    slug: "online-consultation",
    category: "RELIFE 服務",
    excerpt: "先用線上諮詢釐清問題，再決定是否需要到府服務，降低嘗試整理的門檻。",
    body: "不是每一個家庭一開始都需要完整到府整理。\n\n如果你正在猶豫預算、服務範圍，或只是想知道目前的空間卡在哪裡，可以先從線上諮詢開始。\n\n美地會根據照片與生活情境，協助你判斷優先處理的區域、適合的收納方式，以及下一步是否需要現場診斷。",
    image: "/assets/naye-training.jpg"
  },
  {
    title: "衣服永遠少 1 件？打造專屬夢想風格衣櫥",
    slug: "wardrobe-style-plan",
    category: "RELIFE 服務",
    excerpt: "從衣物健康檢查、色彩診斷到衣櫥配置，讓每天穿搭不再被混亂拖住。",
    body: "衣櫥混亂，常常不是衣服太多，而是分類方式不符合現在的生活。\n\n美地會從季節、穿著頻率、工作情境與家中動線重新規劃衣物位置，讓好穿的衣服被看見，不適合的物品也能被溫柔地篩選出去。\n\n理想的衣櫥不是空無一物，而是每一次打開都知道自己有哪些選擇。",
    image: "/assets/organizing-grid.png"
  }
];
