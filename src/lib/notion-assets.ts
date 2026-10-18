import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const notionAssetDirectory = "_notion";
const imageExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp"
]);

const contentTypeExtensions: Record<string, string> = {
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/tiff": ".tiff",
  "image/vnd.microsoft.icon": ".ico",
  "image/webp": ".webp",
  "image/x-icon": ".ico"
};

const localizedAssets = new Map<string, Promise<string>>();

export class NotionAssetDownloadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotionAssetDownloadError";
  }
}

export function isStaticNotionAssetBuild(): boolean {
  return process.env.ASTRO_OUTPUT === "static";
}

export function rethrowNotionAssetDownload(error: unknown): void {
  if (error instanceof NotionAssetDownloadError) throw error;
}

function unsignedUrl(source: string): string {
  try {
    const parsed = new URL(source);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return source.split(/[?#]/, 1)[0];
  }
}

function extensionFor(source: URL, contentType: string): string | undefined {
  const normalizedContentType = contentType.split(";", 1)[0].trim().toLowerCase();
  const fromContentType = contentTypeExtensions[normalizedContentType];
  if (fromContentType) return fromContentType;

  const fromPath = path.extname(source.pathname).toLowerCase();
  return imageExtensions.has(fromPath) ? fromPath : undefined;
}

function failure(context: string, source: string, detail: string, cause?: unknown): NotionAssetDownloadError {
  return new NotionAssetDownloadError(
    `[notion-assets] ${detail}; ${context}; url=${unsignedUrl(source)}`,
    cause === undefined ? undefined : { cause }
  );
}

async function downloadNotionAsset(source: string, context: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch (error) {
    throw failure(context, source, "invalid Notion file URL", error);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw failure(context, source, `unsupported Notion file URL protocol ${parsed.protocol}`);
  }

  let response: Response;
  try {
    response = await fetch(parsed);
  } catch (error) {
    throw failure(context, source, "download failed", error);
  }

  if (!response.ok) {
    throw failure(context, source, `download failed with HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw failure(context, source, "download returned an empty file");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const extension = extensionFor(parsed, contentType);
  if (!extension) {
    throw failure(context, source, `download did not identify an image (content-type=${contentType || "missing"})`);
  }

  const digest = createHash("sha256").update(bytes).digest("hex");
  const fileName = `${digest}${extension}`;
  const outputDirectory = path.resolve(process.env.NOTION_ASSET_OUTPUT_DIR || "dist", notionAssetDirectory);
  const outputPath = path.join(outputDirectory, fileName);

  await mkdir(outputDirectory, { recursive: true });
  try {
    await writeFile(outputPath, bytes, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw failure(context, source, `could not write ${outputPath}`, error);
    }
  }

  return `/${notionAssetDirectory}/${fileName}`;
}

function localizeNotionAsset(source: string, context: string): Promise<string> {
  const key = unsignedUrl(source);
  const existing = localizedAssets.get(key);
  if (existing) return existing;

  const pending = downloadNotionAsset(source, context);
  localizedAssets.set(key, pending);
  return pending;
}

async function walkNotionValue(value: unknown, context: string, fieldPath: string): Promise<void> {
  if (Array.isArray(value)) {
    await Promise.all(value.map((item, index) => walkNotionValue(item, context, `${fieldPath}[${index}]`)));
    return;
  }

  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const notionFile = record.file;

  if (notionFile && typeof notionFile === "object") {
    const fileRecord = notionFile as Record<string, unknown>;
    if (typeof fileRecord.url === "string" && fileRecord.url) {
      fileRecord.url = await localizeNotionAsset(fileRecord.url, `${context}; field=${fieldPath}.file.url`);
    }
  }

  await Promise.all(
    Object.entries(record).map(([key, child]) => walkNotionValue(child, context, fieldPath ? `${fieldPath}.${key}` : key))
  );
}

export async function localizeNotionFileUrls(pages: unknown[], databaseId: string): Promise<void> {
  if (!isStaticNotionAssetBuild()) return;

  await Promise.all(
    pages.map(async (page, index) => {
      const pageId =
        page && typeof page === "object" && typeof (page as Record<string, unknown>).id === "string"
          ? String((page as Record<string, unknown>).id)
          : `result[${index}]`;
      await walkNotionValue(page, `database=${databaseId}; page=${pageId}`, "");
    })
  );
}
