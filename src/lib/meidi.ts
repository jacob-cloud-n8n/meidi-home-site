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
  imageSize?: string;
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

export type MeidiCaseSpace = {
  title: string;
  summary: string;
  image?: string;
};

export type MeidiCaseProject = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  status?: string;
  coverImage?: string;
  problemPoints: string[];
  solutionPoints: string[];
  methodImages: {
    title: string;
    image: string;
  }[];
  spaces: MeidiCaseSpace[];
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
const lastFetchedTimes = new Map<string, number>();

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

function listText(value: string): string[] {
  return value
    .split(/\n+|[;；]/)
    .map((item) => item.replace(/^\d+[.、．]\s*/, "").trim())
    .filter(Boolean);
}

function lastPathSegment(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .pop() ?? "";
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
  lastFetchedTimes.set(databaseId, Date.now());
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
          imageSize: select(props["圖片大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index),
          icon: icons[index % icons.length]
        };
      })
      .filter((item) => item.enabled && item.type === "區塊" && item.key.startsWith("service.") && item.title && item.body)
      .sort((a, b) => a.order - b.order);
    return items.length > 0
      ? items.slice(0, 6).map(({ title, body, icon, image, fontSize, imageSize }) => ({ title, body, icon, image, fontSize, imageSize }))
      : fallbackServices;
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
        const category = richOrSelect(props["分類"]);
        const caseTitle = lastPathSegment(location) || category || rowTitle;
        return {
          key: rowTitle,
          type: select(props["類型"]),
          title: caseTitle,
          body: text(props["文字內容"]),
          category: category || caseTitle,
          image: imageValue(props, "圖片", "圖片網址"),
          beforeImage: imageValue(props, "整理前圖片", "整理前圖片網址"),
          afterImage: imageValue(props, "整理後圖片", "整理後圖片網址"),
          status: select(props["授權狀態"]),
          fontSize: select(props["字體大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index)
        };
      })
      .filter((item) => item.enabled && item.status === "可公開" && item.category && (item.type === "案例" || item.key.startsWith("case.")))
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
    return mapped.length > 0 ? mapped : fallbackCases;
  } catch (error) {
    warn(error);
    return fallbackCases;
  }
}

export async function getMeidiCaseProjects(): Promise<MeidiCaseProject[]> {
  try {
    const pages = await queryDatabase(import.meta.env.NOTION_MEIDI_PORTFOLIO_DB_ID || pageDatabaseIds.portfolio);
    const rows = pages
      .map((page, index) => {
        const props = page.properties ?? {};
        const rowTitle = title(props["名稱"]);
        const location = text(props["前台位置"]);
        const type = select(props["類型"]);
        const displayTitle = text(props["案例標題"]) || text(props["空間名稱"]) || lastPathSegment(location) || rowTitle;
        const slug = text(props["Slug"]) || text(props["網址代碼"]) || slugify(displayTitle, `case-${index + 1}`);
        return {
          rowTitle,
          type,
          title: displayTitle,
          slug,
          parentSlug: text(props["所屬案例"]) || text(props["案例Slug"]) || text(props["案例代號"]),
          category: richOrSelect(props["分類"]) || "全屋整理",
          summary: text(props["摘要"]) || text(props["文字內容"]),
          status: select(props["授權狀態"]),
          coverImage: imageValue(props, "封面圖", "封面圖網址") || imageValue(props, "圖片", "圖片網址"),
          image: imageValue(props, "案例圖片", "案例圖片網址") || imageValue(props, "圖片", "圖片網址"),
          beforeImage: imageValue(props, "整理前圖片", "整理前圖片網址"),
          afterImage: imageValue(props, "整理後圖片", "整理後圖片網址"),
          problemPoints: listText(text(props["亂源分析"]) || text(props["問題分析"])),
          solutionPoints: listText(text(props["解決方案"]) || text(props["美地做法"])),
          fontSize: select(props["字體大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index)
        };
      })
      .filter((item) => item.enabled && item.status === "可公開")
      .sort((a, b) => a.order - b.order);

    const projectRows = rows.filter((row) => row.type === "案例專案" || row.rowTitle.startsWith("case-project."));
    const spaceRows = rows.filter((row) => row.type === "案例空間" || row.rowTitle.startsWith("case-space."));
    const legacyRows = rows.filter((row) => row.type === "案例" || row.rowTitle.startsWith("case."));

    const projects = projectRows.map<MeidiCaseProject>((project) => {
      const spaces = spaceRows
        .filter((space) => space.parentSlug === project.slug || space.parentSlug === project.rowTitle || space.parentSlug === project.title)
        .map<MeidiCaseSpace>((space) => ({
          title: space.title,
          summary: space.summary || "依照使用者動線重新分類、定位與上架。",
          image: space.image || space.afterImage || space.beforeImage
        }));

      return {
        title: project.title,
        slug: project.slug,
        category: project.category,
        summary: project.summary,
        status: project.status,
        coverImage: project.coverImage || spaces[0]?.image,
        problemPoints: project.problemPoints,
        solutionPoints: project.solutionPoints,
        methodImages: [],
        spaces,
        fontSize: project.fontSize
      };
    });

    if (projects.length === 0 && legacyRows.length > 0) {
      projects.push(
        ...legacyRows.map<MeidiCaseProject>((row, index) => ({
          title: row.title,
          slug: row.slug || slugify(row.title, `legacy-case-${index + 1}`),
          category: row.category,
          summary: row.summary || "案例照片待客戶授權後上傳。",
          status: row.status,
          coverImage: row.afterImage || row.beforeImage || row.coverImage,
          problemPoints: [],
          solutionPoints: [],
          methodImages: [],
          spaces: [
            {
              title: row.category,
              summary: row.summary || "整理前後對照。",
              image: row.afterImage || row.beforeImage || row.coverImage
            }
          ],
          fontSize: row.fontSize
        }))
      );
    }

    return mergeSeedCaseProjects(projects);
  } catch (error) {
    warn(error);
    return seedCaseProjects;
  }
}

export async function getMeidiArticles(): Promise<MeidiArticle[]> {
  try {
    // NOTION_MEIDI_TEAM_DB_ID 為歷史遺留變數名稱，實際對應的是「收納大小事」(Articles) 資料庫。
    // 新增別名 NOTION_MEIDI_ARTICLES_DB_ID 以符合語意。
    const databaseId = 
      import.meta.env.NOTION_MEIDI_ARTICLES_DB_ID || 
      import.meta.env.NOTION_MEIDI_TEAM_DB_ID || 
      pageDatabaseIds.team;
    const pages = await queryDatabase(databaseId);
    const items = pages
      .map((page, index) => {
        const props = page.properties ?? {};
        const rowTitle = title(props["名稱"]);
        const location = text(props["前台位置"]);
        const displayTitle = rowTitle.startsWith("article.") ? lastPathSegment(location) || rowTitle : rowTitle;
        const body = text(props["內容"]) || text(props["文章內容"]) || text(props["文字內容"]);
        const excerpt = text(props["摘要"]) || body.slice(0, 72);
        const category = richOrSelect(props["分類"]) || richOrSelect(props["標籤"]);
        return {
          type: select(props["類型"]),
          key: rowTitle,
          title: displayTitle,
          slug: text(props["Slug"]) || text(props["網址代碼"]) || slugify(displayTitle, `article-${index + 1}`),
          category: category || "收納大小事",
          excerpt,
          body,
          image: imageValue(props, "圖片", "圖片網址"),
          date: date(props["日期"]) || text(props["日期"]),
          fontSize: select(props["字體大小"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index)
        };
      })
      .filter((item) => item.enabled && item.title && item.excerpt && (item.type === "文章" || item.key.startsWith("article.") || item.category !== "收納大小事"))
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

export function paragraphs(copy: MeidiCopy, key: string, fallback: string): string[] {
  return c(copy, key, fallback)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
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

export function imageSizeClass(size: string | undefined, prefix = "image-size"): string {
  const classes: Record<string, string> = {
    "小": `${prefix}-small`,
    "標準": `${prefix}-normal`,
    "大": `${prefix}-large`,
    "特大": `${prefix}-xlarge`
  };
  return size ? classes[size] || `${prefix}-large` : `${prefix}-large`;
}

export const lineUrl = "https://line.me/R/ti/p/@135hliju";
export const facebookUrl = "https://www.facebook.com/profile.php?id=61587447119551";
export const lineQrUrl = "https://qr-official.line.me/gs/M_135hliju_GW.png?oat_content=qr";

export const fallbackServices: MeidiService[] = [
  { title: "居家收納", body: "依家庭動線與物品數量，重新規劃好拿、好收、不復亂的生活系統。", icon: "home_spark", imageSize: "大" },
  { title: "收納講座", body: "為親子家庭、社群或企業安排整理觀念分享，建立可落地的收納方法。", icon: "school", imageSize: "大" },
  { title: "收納品代買", body: "依空間尺寸與使用習慣，協助挑選合適收納用品，避免買錯與重複採購。", icon: "shopping_bag", imageSize: "大" },
  { title: "搬家打包", body: "搬遷前分類打包，新家上架定位，讓搬家後更快回到生活秩序。", icon: "move_location", imageSize: "大" },
  { title: "空間診斷", body: "到府盤點物量、動線與收納容量，找出復亂來源並提供整理方案。", icon: "analytics", imageSize: "大" },
  { title: "全屋整理", body: "跨空間深度整理與生活系統重建，適合年度整理或長期混亂家庭。", icon: "inventory_2", imageSize: "大" }
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

const liuCaseAssetBase = "/assets/cases/liu-home-storage";
const michelCaseAssetBase = "/assets/cases/michel-closet-storage";
const louiCaseAssetBase = "/assets/cases/loui-closet-storage";

export const seedCaseProjects: MeidiCaseProject[] = [
  {
    title: "全屋收納案例",
    slug: "liu-home-storage",
    category: "全屋整理",
    summary: "以客廳、玄關、衣帽間與儲藏區為核心，先釐清亂源，再依使用習慣重建分類、分區與維護方式。",
    status: "案例預覽",
    coverImage: `${liuCaseAssetBase}/cover.webp`,
    problemPoints: ["不善長整理", "衣物過多，堆成山，不易查找", "雜物多、亂、雜", "空間規劃不合理"],
    solutionPoints: ["建立維護方案", "增加衣帽掛桿", "斷捨離、分類、分區管理", "按照使用者習慣調整動線與空間規劃"],
    methodImages: [
      { title: "亂源分析", image: `${liuCaseAssetBase}/problem-analysis.webp` },
      { title: "解決方案", image: `${liuCaseAssetBase}/solution-plan.webp` },
      { title: "物品地圖 A", image: `${liuCaseAssetBase}/item-map-a.webp` },
      { title: "物品地圖 B", image: `${liuCaseAssetBase}/item-map-b.webp` }
    ],
    spaces: [
      { title: "衣帽間 A 區", summary: "依衣物類型與拿取頻率分區，讓日常穿搭更容易查找。", image: `${liuCaseAssetBase}/closet-a.webp` },
      { title: "衣帽間 B 區", summary: "調整收納容量與掛放配置，降低衣物堆疊造成的復亂。", image: `${liuCaseAssetBase}/closet-b.webp` },
      { title: "房間", summary: "整理床鋪與周邊物品，讓休息區回到清爽、好維持的日常狀態。", image: `${liuCaseAssetBase}/bedroom.webp` },
      { title: "工作室", summary: "重新歸位工作物品與零散雜物，保留清楚的操作檯面。", image: `${liuCaseAssetBase}/studio.webp` },
      { title: "廚房", summary: "以料理動線與品項分類為基準，提升備餐與收拾效率。", image: `${liuCaseAssetBase}/kitchen.webp` },
      { title: "客廳 A 視角", summary: "降低公共區域的視覺雜亂，保留生活用品的固定位置。", image: `${liuCaseAssetBase}/living-a.webp` },
      { title: "客廳 B 視角", summary: "整合客廳收納與使用動線，讓整理後的空間更容易維持。", image: `${liuCaseAssetBase}/living-b.webp` },
      { title: "儲藏櫃 A", summary: "依物品用途與使用頻率分層，讓庫存與工具一眼可見。", image: `${liuCaseAssetBase}/storage-a.webp` },
      { title: "儲藏櫃 B", summary: "減少重複採買與翻找時間，建立可延續的收納位置。", image: `${liuCaseAssetBase}/storage-b.webp` },
      { title: "鞋櫃", summary: "玄關鞋櫃依家庭成員與外出頻率分類，提升進出門效率。", image: `${liuCaseAssetBase}/entry-shoe-cabinet.webp` }
    ]
  },
  {
    title: "Michel 衣帽間收納案例",
    slug: "michel-closet-storage",
    category: "更衣間",
    summary: "以衣帽間與多個生活收納區為核心，從前期溝通、動線調整到物品分類，重建清爽且易維持的居家收納系統。",
    status: "案例預覽",
    coverImage: `${michelCaseAssetBase}/cover.webp`,
    problemPoints: ["空間使用不合理", "物品數量多且分類不清", "日常動線與維護方式需要重整"],
    solutionPoints: ["建立具體收納定位系統", "依物品用途與使用頻率分類分區", "把整理後的收納邏輯轉成可持續維護的生活規則"],
    methodImages: [
      { title: "前期溝通", image: `${michelCaseAssetBase}/problem-analysis.webp` },
      { title: "解決方案", image: `${michelCaseAssetBase}/solution-plan.webp` },
      { title: "物品地圖", image: `${michelCaseAssetBase}/item-map.webp` },
      { title: "預約與聯絡資訊", image: `${michelCaseAssetBase}/contact.webp` }
    ],
    spaces: [
      { title: "動線調整 1", summary: "先梳理高頻動線，讓需要每天使用的物品回到順手位置。", image: `${michelCaseAssetBase}/movement-1.webp` },
      { title: "動線調整 2", summary: "依照實際生活節奏調整收納區，降低翻找與堆疊。", image: `${michelCaseAssetBase}/movement-2.webp` },
      { title: "動線調整 3", summary: "讓空間分工更清楚，減少物品跨區造成的混亂。", image: `${michelCaseAssetBase}/movement-3.webp` },
      { title: "餐邊櫃", summary: "餐具與餐桌周邊用品重新分類定位，讓日常取用更直覺。", image: `${michelCaseAssetBase}/dining-cabinet.webp` },
      { title: "會客室", summary: "公共空間保留視覺清爽，也讓臨時物品有固定收納位置。", image: `${michelCaseAssetBase}/guest-room.webp` },
      { title: "書房", summary: "文件、書籍與辦公用品依使用情境分類，提升工作區效率。", image: `${michelCaseAssetBase}/study.webp` },
      { title: "備用收納空間", summary: "把備品與低頻用品集中管理，避免分散在各角落。", image: `${michelCaseAssetBase}/spare-storage.webp` },
      { title: "書桌", summary: "清出桌面操作區，讓工作與暫放物品分開。", image: `${michelCaseAssetBase}/desk.webp` },
      { title: "衣櫃 1", summary: "依衣物種類建立分區，讓每天穿搭更快找到目標。", image: `${michelCaseAssetBase}/wardrobe-1.webp` },
      { title: "衣櫃 2", summary: "調整掛放與摺放比例，降低衣物堆疊後復亂。", image: `${michelCaseAssetBase}/wardrobe-2.webp` },
      { title: "衣櫃 3", summary: "延續分類邏輯到不同櫃位，讓維持方式一致。", image: `${michelCaseAssetBase}/wardrobe-3.webp` },
      { title: "餐具抽屜", summary: "餐具依類型分格收納，提升拿取與歸位速度。", image: `${michelCaseAssetBase}/dining-drawer-1.webp` },
      { title: "廚房抽屜 2", summary: "依料理流程重排抽屜內容，減少備餐時來回翻找。", image: `${michelCaseAssetBase}/kitchen-drawer-2.webp` },
      { title: "廚房抽屜 3", summary: "把同類物品集中，讓庫存與缺漏一眼可見。", image: `${michelCaseAssetBase}/kitchen-drawer-3.webp` },
      { title: "廚房抽屜 5", summary: "低頻與備用物品移到合適層位，保留高頻區的順手度。", image: `${michelCaseAssetBase}/kitchen-drawer-5.webp` },
      { title: "廚房抽屜 4", summary: "建立固定分類邊界，降低使用後混放的機率。", image: `${michelCaseAssetBase}/kitchen-drawer-4.webp` },
      { title: "廚房抽屜 1", summary: "把常用工具集中到近手位置，讓料理收拾更順。", image: `${michelCaseAssetBase}/kitchen-drawer-1.webp` },
      { title: "鞋櫃", summary: "鞋類依成員與使用頻率分類，讓出門與回家動線更清楚。", image: `${michelCaseAssetBase}/shoe-cabinet.webp` }
    ]
  },
  {
    title: "Loui 衣帽間收納案例",
    slug: "loui-closet-storage",
    category: "更衣間",
    summary: "以衣帽間為核心，整理衣物分類、收納定位與動線配置，讓衣物拿取與日常維持更清楚。",
    status: "案例預覽",
    coverImage: `${louiCaseAssetBase}/cover.webp`,
    problemPoints: ["空間使用不合理", "衣物與雜物混放", "拿取與歸位動線不夠清楚"],
    solutionPoints: ["建立衣物分類與定位", "重新分配掛放、摺放與收納區", "用可維持的方式整理衣帽間動線"],
    methodImages: [
      { title: "前期溝通", image: `${louiCaseAssetBase}/problem-analysis.webp` },
      { title: "解決方案", image: `${louiCaseAssetBase}/solution-plan.webp` },
      { title: "預約與聯絡資訊", image: `${louiCaseAssetBase}/contact.webp` }
    ],
    spaces: [
      { title: "衣帽間 1", summary: "先從整體櫃位重新分區，讓衣物收納有清楚邊界。", image: `${louiCaseAssetBase}/closet-1.webp` },
      { title: "衣帽間 2", summary: "依拿取頻率配置高低層，提升日常使用效率。", image: `${louiCaseAssetBase}/closet-2.webp` },
      { title: "衣帽間 3", summary: "調整衣物分類方式，減少重複翻找與堆放。", image: `${louiCaseAssetBase}/closet-3.webp` },
      { title: "衣帽間 4", summary: "建立固定歸位方式，讓整理後狀態更容易延續。", image: `${louiCaseAssetBase}/closet-4.webp` },
      { title: "衣帽間 5", summary: "完成衣帽間視覺與使用動線整理，回到清楚好維持的狀態。", image: `${louiCaseAssetBase}/closet-5.webp` }
    ]
  }
];

function mergeSeedCaseProjects(projects: MeidiCaseProject[]): MeidiCaseProject[] {
  const projectSlugs = new Set(projects.map((project) => project.slug));
  return [...seedCaseProjects.filter((project) => !projectSlugs.has(project.slug)), ...projects];
}

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

export function clearMeidiCache(): void {
  cache.clear();
  lastFetchedTimes.clear();
}

export async function getNotionStatus(): Promise<Record<string, { fetched: number; filtered: number; reasons: string[]; lastFetchedAt: string }>> {
  const status: Record<string, { fetched: number; filtered: number; reasons: string[]; lastFetchedAt: string }> = {};

  const dbs = [
    { key: "home", id: import.meta.env.NOTION_MEIDI_HOME_DB_ID || pageDatabaseIds.home, type: "copy" },
    { key: "about", id: import.meta.env.NOTION_MEIDI_ABOUT_DB_ID || pageDatabaseIds.about, type: "copy" },
    { key: "booking", id: import.meta.env.NOTION_MEIDI_BOOKING_DB_ID || pageDatabaseIds.booking, type: "copy" },
    { key: "services", id: import.meta.env.NOTION_MEIDI_SERVICES_DB_ID || pageDatabaseIds.services, type: "services" },
    { key: "portfolio", id: import.meta.env.NOTION_MEIDI_PORTFOLIO_DB_ID || pageDatabaseIds.portfolio, type: "portfolio" },
    { key: "team", id: import.meta.env.NOTION_MEIDI_ARTICLES_DB_ID || import.meta.env.NOTION_MEIDI_TEAM_DB_ID || pageDatabaseIds.team, type: "team" },
    { key: "inquiry", id: import.meta.env.NOTION_MEIDI_INQUIRY_DB_ID || "ae9b716c250c46e49ffbeeb1e0e8a32a", type: "inquiry" }
  ];

  for (const db of dbs) {
    if (db.type === "inquiry") {
      status[db.key] = { fetched: 0, filtered: 0, reasons: [], lastFetchedAt: "" };
      continue;
    }

    try {
      const pages = await queryDatabase(db.id);
      const lastFetched = lastFetchedTimes.get(db.id);
      const lastFetchedAt = lastFetched ? new Date(lastFetched).toISOString() : "";

      let filtered = 0;
      const reasonsSet = new Set<string>();

      if (db.type === "copy") {
        pages.forEach((page) => {
          const props = page.properties ?? {};
          const key = title(props["名稱"]);
          let isFiltered = false;
          
          if (!checkbox(props["啟用"], true)) {
            reasonsSet.add("未啟用");
            isFiltered = true;
          }
          if (!key || !key.includes(".")) {
            reasonsSet.add("key 無點");
            isFiltered = true;
          }
          
          if (isFiltered) {
            filtered++;
          }
        });
      } else if (db.type === "services") {
        pages.forEach((page, index) => {
          const props = page.properties ?? {};
          const rowTitle = title(props["名稱"]);
          const location = text(props["前台位置"]);
          const cardTitle = location.split("/").pop()?.trim() || rowTitle;
          const serviceType = select(props["類型"]);
          const body = text(props["文字內容"]);
          
          let isFiltered = false;
          if (!checkbox(props["啟用"], true)) {
            reasonsSet.add("未啟用");
            isFiltered = true;
          }
          if (serviceType !== "區塊") {
            reasonsSet.add("類型不符");
            isFiltered = true;
          }
          if (!rowTitle.startsWith("service.")) {
            reasonsSet.add("key 無點");
            isFiltered = true;
          }
          if (!cardTitle || !body) {
            reasonsSet.add("類型不符");
            isFiltered = true;
          }

          if (isFiltered) {
            filtered++;
          }
        });
      } else if (db.type === "portfolio") {
        pages.forEach((page) => {
          const props = page.properties ?? {};
          const rowTitle = title(props["名稱"]);
          const type = select(props["類型"]);
          const status = select(props["授權狀態"]);
          
          let isFiltered = false;
          if (!checkbox(props["啟用"], true)) {
            reasonsSet.add("未啟用");
            isFiltered = true;
          }
          if (status !== "可公開") {
            reasonsSet.add("授權未過");
            isFiltered = true;
          }
          if (type !== "案例" && type !== "案例專案" && type !== "案例空間" && !rowTitle.startsWith("case.") && !rowTitle.startsWith("case-project.") && !rowTitle.startsWith("case-space.")) {
            reasonsSet.add("類型不符");
            isFiltered = true;
          }

          if (isFiltered) {
            filtered++;
          }
        });
      } else if (db.type === "team") {
        pages.forEach((page) => {
          const props = page.properties ?? {};
          const rowTitle = title(props["名稱"]);
          const type = select(props["類型"]);
          const category = richOrSelect(props["分類"]) || richOrSelect(props["標籤"]);
          
          let isFiltered = false;
          if (!checkbox(props["啟用"], true)) {
            reasonsSet.add("未啟用");
            isFiltered = true;
          }
          if (type !== "文章" && !rowTitle.startsWith("article.") && category === "收納大小事") {
            reasonsSet.add("類型不符");
            isFiltered = true;
          }

          if (isFiltered) {
            filtered++;
          }
        });
      }

      status[db.key] = {
        fetched: pages.length,
        filtered,
        reasons: Array.from(reasonsSet),
        lastFetchedAt
      };
    } catch (error) {
      status[db.key] = {
        fetched: 0,
        filtered: 0,
        reasons: ["查詢失敗"],
        lastFetchedAt: ""
      };
    }
  }

  return status;
}
