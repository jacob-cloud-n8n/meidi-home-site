import type { APIRoute } from "astro";
import { lineUrl } from "@lib/meidi";

const notionVersion = "2022-06-28";
const notionUploadVersion = "2026-03-11";
const defaultInquiryDatabaseId = "ae9b716c250c46e49ffbeeb1e0e8a32a";
const maxPhotoCount = 5;
const maxPhotoSize = 20 * 1024 * 1024;

type UploadPhoto = {
  name: string;
  type: string;
  blob: Blob;
};

type NotionUploadedPhoto = {
  id: string;
  name: string;
  type: string;
};

type Inquiry = {
  name: string;
  phone: string;
  lineId: string;
  serviceArea: string;
  spaceType: string;
  problem: string;
  photoUrl: string;
  photoFiles: UploadPhoto[];
  privacyConsent: boolean;
  submittedAt: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function validPhone(value: string): boolean {
  return /^[0-9+\-\s()]{8,20}$/.test(value);
}

function fallbackUrl(inquiry: Inquiry): string {
  const message = [
    "美地居家收納預約諮詢",
    `姓名：${inquiry.name}`,
    `電話：${inquiry.phone}`,
    inquiry.lineId ? `LINE ID：${inquiry.lineId}` : "",
    `服務區域：${inquiry.serviceArea}`,
    `空間類型：${inquiry.spaceType}`,
    inquiry.problem ? `困擾描述：${inquiry.problem}` : "",
    inquiry.photoUrl ? `照片連結：${inquiry.photoUrl}` : "",
    inquiry.photoFiles.length ? `上傳照片：${inquiry.photoFiles.map((file) => file.name).join("、")}` : ""
  ].filter(Boolean).join("\n");

  return `${lineUrl}?text=${encodeURIComponent(message)}`;
}

async function uploadPhoto(token: string, file: UploadPhoto): Promise<NotionUploadedPhoto> {
  const createResponse = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionUploadVersion
    },
    body: JSON.stringify({})
  });

  if (!createResponse.ok) throw new Error(`Notion file upload create failed: ${createResponse.status}`);
  const upload = await createResponse.json();
  const uploadId = upload.id;
  const uploadUrl = upload.upload_url || `https://api.notion.com/v1/file_uploads/${uploadId}/send`;
  if (!uploadId) throw new Error("Notion file upload id missing");

  const formData = new FormData();
  formData.append("file", file.blob, file.name);
  const sendResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionUploadVersion
    },
    body: formData
  });

  if (!sendResponse.ok) throw new Error(`Notion file upload send failed: ${sendResponse.status}`);

  return { id: uploadId, name: file.name, type: file.type };
}

async function appendPhotoBlocks(token: string, pageId: string, uploads: NotionUploadedPhoto[]): Promise<void> {
  const children = uploads.map((file) => {
    const blockType = file.type.startsWith("image/") ? "image" : "file";
    return {
      object: "block",
      type: blockType,
      [blockType]: {
        type: "file_upload",
        file_upload: { id: file.id }
      }
    };
  });

  const response = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionUploadVersion
    },
    body: JSON.stringify({ children })
  });

  if (!response.ok) throw new Error(`Notion append uploaded file failed: ${response.status}`);
}

async function ensurePhotoProperty(token: string, databaseId: string): Promise<boolean> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionVersion
    },
    body: JSON.stringify({
      properties: {
        "現況照片": { files: {} }
      }
    })
  });

  return response.ok;
}

async function attachPhotosToProperty(token: string, pageId: string, uploads: NotionUploadedPhoto[]): Promise<boolean> {
  const files = uploads.map((file) => ({
    name: file.name,
    type: "file_upload",
    file_upload: { id: file.id }
  }));

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionUploadVersion
    },
    body: JSON.stringify({
      properties: {
        "現況照片": {
          type: "files",
          files
        }
      }
    })
  });

  return response.ok;
}

async function createInquiry(inquiry: Inquiry): Promise<{ ok: boolean; uploadedCount: number; uploadFailed: boolean }> {
  const token = import.meta.env.NOTION_TOKEN;
  const databaseId = import.meta.env.NOTION_MEIDI_INQUIRY_DB_ID || defaultInquiryDatabaseId;
  if (!token || !databaseId) return { ok: false, uploadedCount: 0, uploadFailed: false };

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionVersion
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        "姓名": { title: [{ text: { content: inquiry.name } }] },
        "電話": { phone_number: inquiry.phone },
        "LINE ID": { rich_text: inquiry.lineId ? [{ text: { content: inquiry.lineId } }] : [] },
        "服務區域": { rich_text: [{ text: { content: inquiry.serviceArea } }] },
        "空間類型": { multi_select: inquiry.spaceType ? [{ name: inquiry.spaceType }] : [] },
        "困擾描述": { rich_text: inquiry.problem ? [{ text: { content: inquiry.problem } }] : [] },
        "照片連結": inquiry.photoUrl ? { url: inquiry.photoUrl } : { url: null },
        "來源": { select: { name: "官網表單" } },
        "狀態": { status: { name: "未開始" } },
        "隱私同意": { checkbox: inquiry.privacyConsent },
        "送出時間": { date: { start: inquiry.submittedAt } }
      }
    })
  });

  if (!response.ok) throw new Error(`Meidi inquiry create failed: ${response.status}`);
  const page = await response.json();
  const pageId = page.id;
  let uploadedCount = 0;
  let uploadFailed = false;

  if (pageId && inquiry.photoFiles.length > 0) {
    const uploads: NotionUploadedPhoto[] = [];
    for (const file of inquiry.photoFiles) {
      try {
        uploads.push(await uploadPhoto(token, file));
      } catch (error) {
        uploadFailed = true;
        console.error(error);
      }
    }

    if (uploads.length > 0) {
      let attached = await attachPhotosToProperty(token, pageId, uploads);
      if (!attached && await ensurePhotoProperty(token, databaseId)) {
        attached = await attachPhotosToProperty(token, pageId, uploads);
      }

      if (!attached) {
        try {
          await appendPhotoBlocks(token, pageId, uploads);
          attached = true;
        } catch (error) {
          console.error(error);
        }
      }

      uploadedCount = attached ? uploads.length : 0;
      uploadFailed = uploadFailed || !attached;
    }
  }

  return { ok: true, uploadedCount, uploadFailed };
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function dataUrlToUploadPhoto(input: unknown): UploadPhoto | null {
  if (!input || typeof input !== "object") return null;
  const photo = input as { name?: unknown; type?: unknown; data?: unknown };
  const name = clean(photo.name) || "meidi-photo.jpg";
  const type = clean(photo.type) || "image/jpeg";
  const data = clean(photo.data);
  const match = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  if (bytes.byteLength > maxPhotoSize) return null;
  return {
    name,
    type: match[1] || type,
    blob: new Blob([bytes], { type: match[1] || type })
  };
}

async function parseInquiryRequest(request: Request): Promise<Inquiry> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const data = await request.formData();
    const photoFiles = data
      .getAll("photos")
      .filter(isUploadFile)
      .filter((file) => file.size <= maxPhotoSize)
      .slice(0, maxPhotoCount)
      .map((file) => ({
        name: file.name,
        type: file.type || "application/octet-stream",
        blob: file
      }));

    return {
      name: clean(data.get("name")),
      phone: clean(data.get("phone")),
      lineId: clean(data.get("lineId")),
      serviceArea: clean(data.get("serviceArea")),
      spaceType: clean(data.get("spaceType")),
      problem: clean(data.get("problem")),
      photoUrl: clean(data.get("photoUrl")),
      photoFiles,
      privacyConsent: data.get("privacyConsent") === "on" || data.get("privacyConsent") === "true",
      submittedAt: new Date().toISOString()
    };
  }

  const body = await request.json();
  const photoFiles = Array.isArray(body.photos)
    ? body.photos.map(dataUrlToUploadPhoto).filter((photo): photo is UploadPhoto => Boolean(photo)).slice(0, maxPhotoCount)
    : [];

  return {
    name: clean(body.name),
    phone: clean(body.phone),
    lineId: clean(body.lineId),
    serviceArea: clean(body.serviceArea),
    spaceType: clean(body.spaceType),
    problem: clean(body.problem),
    photoUrl: clean(body.photoUrl),
    photoFiles,
    privacyConsent: body.privacyConsent === "on" || body.privacyConsent === true,
    submittedAt: new Date().toISOString()
  };
}

export const POST: APIRoute = async ({ request }) => {
  let inquiry: Inquiry | null = null;
  try {
    inquiry = await parseInquiryRequest(request);

    if (!inquiry.name || !inquiry.phone || !inquiry.serviceArea) {
      return new Response(JSON.stringify({ ok: false, message: "請填寫姓名、電話與服務行政區。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!validPhone(inquiry.phone)) {
      return new Response(JSON.stringify({ ok: false, message: "請確認電話格式。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!inquiry.privacyConsent) {
      return new Response(JSON.stringify({ ok: false, message: "請勾選個資使用同意。" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const result = await createInquiry(inquiry);
    if (result.ok) {
      const message = result.uploadFailed
        ? "表單已收到！我們會盡快與您聯繫。部分照片未能上傳，請確認格式為 JPG、PNG、WebP 或 HEIC，單張建議 10MB 以內；也可後續用 LINE 補傳。"
        : "表單已收到！我們會盡快與您聯繫。";
      return new Response(JSON.stringify({ ok: true, mode: "notion", uploadedCount: result.uploadedCount, message }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, mode: "line-fallback", lineUrl: fallbackUrl(inquiry), message: "表單已收到！我們會盡快與您聯繫。" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    if (inquiry) {
      return new Response(JSON.stringify({ ok: true, mode: "line-fallback", lineUrl: fallbackUrl(inquiry), message: "表單已收到！我們會盡快與您聯繫。" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: false, message: "預約資料送出失敗，請改用官方 LINE 聯繫。" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
