const notionVersion = "2022-06-28";
const defaultCacheSeconds = 60;

export type MeidiCopy = Record<string, {
  text?: string;
  image?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}>;

export type MeidiService = {
  title: string;
  body: string;
  icon: string;
};

export type MeidiCase = {
  title: string;
  body: string;
  image?: string;
  status?: string;
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

function checkbox(prop: any, fallback = true): boolean {
  return typeof prop?.checkbox === "boolean" ? prop.checkbox : fallback;
}

function number(prop: any, fallback = 0): number {
  return typeof prop?.number === "number" ? prop.number : fallback;
}

function url(prop: any): string {
  return prop?.url ?? "";
}

function fileUrl(prop: any): string {
  const file = prop?.files?.[0];
  return file?.file?.url ?? file?.external?.url ?? "";
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
        buttonUrl: url(props["按鈕連結"])
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
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index),
          icon: icons[index % icons.length]
        };
      })
      .filter((item) => item.enabled && item.type === "區塊" && item.key.startsWith("service.") && item.title && item.body)
      .sort((a, b) => a.order - b.order);
    return items.length > 0 ? items.map(({ title, body, icon }) => ({ title, body, icon })) : fallbackServices;
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
          image: fileUrl(props["圖片"]) || url(props["圖片網址"]),
          status: select(props["授權狀態"]),
          enabled: checkbox(props["啟用"], true),
          order: number(props["排序"], index)
        };
      })
      .filter((item) => item.enabled && item.type === "案例")
      .sort((a, b) => a.order - b.order);
    return items.length > 0 ? items.map(({ title, body, image, status }) => ({ title, body, image, status })) : fallbackCases;
  } catch (error) {
    warn(error);
    return fallbackCases;
  }
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

export const fallbackCases: MeidiCase[] = [
  { title: "衣櫥收納", body: "案例照片待客戶授權後上傳。", status: "待授權" },
  { title: "廚房餐廳", body: "案例照片待客戶授權後上傳。", status: "待授權" }
];
