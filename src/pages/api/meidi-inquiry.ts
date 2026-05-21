import type { APIRoute } from "astro";
import { lineUrl } from "@lib/meidi";

const notionVersion = "2022-06-28";
const notionUploadVersion = "2026-03-11";
const defaultInquiryDatabaseId = "ae9b716c250c46e49ffbeeb1e0e8a32a";
const maxPhotoCount = 6;
const maxPhotoSize = 20 * 1024 * 1024;

type Inquiry = {
  name: string;
  phone: string;
  lineId: string;
  serviceArea: string;
  spaceType: string;
  problem: string;
  photoUrl: string;
  photoFiles: File[];
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

async function uploadPhoto(token: string, pageId: string, file: File): Promise<void> {
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
  formData.append("file", file, file.name);
  const sendResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionUploadVersion
    },
    body: formData
  });

  if (!sendResponse.ok) throw new Error(`Notion file upload send failed: ${sendResponse.status}`);

  const blockType = file.type.startsWith("image/") ? "image" : "file";
  const block = {
    object: "block",
    type: blockType,
    [blockType]: {
      type: "file_upload",
      file_upload: { id: uploadId }
    }
  };

  const appendResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Notion-Version": notionUploadVersion
    },
    body: JSON.stringify({ children: [block] })
  });

  if (!appendResponse.ok) throw new Error(`Notion append uploaded file failed: ${appendResponse.status}`);
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
    for (const file of inquiry.photoFiles) {
      try {
        await uploadPhoto(token, pageId, file);
        uploadedCount += 1;
      } catch (error) {
        uploadFailed = true;
        console.error(error);
      }
    }
  }

  return { ok: true, uploadedCount, uploadFailed };
}

function isUploadFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

async function parseInquiryRequest(request: Request): Promise<Inquiry> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const data = await request.formData();
    const photoFiles = data
      .getAll("photos")
      .filter(isUploadFile)
      .filter((file) => file.size <= maxPhotoSize)
      .slice(0, maxPhotoCount);

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
  return {
    name: clean(body.name),
    phone: clean(body.phone),
    lineId: clean(body.lineId),
    serviceArea: clean(body.serviceArea),
    spaceType: clean(body.spaceType),
    problem: clean(body.problem),
    photoUrl: clean(body.photoUrl),
    photoFiles: [],
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
        ? "預約資料已送出，但部分照片未能上傳，後續將由美地居家收納與您聯繫。"
        : "已送出，後續將由美地居家收納與您聯繫。";
      return new Response(JSON.stringify({ ok: true, mode: "notion", uploadedCount: result.uploadedCount, message }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true, mode: "line-fallback", lineUrl: fallbackUrl(inquiry) }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    if (inquiry) {
      return new Response(JSON.stringify({ ok: true, mode: "line-fallback", lineUrl: fallbackUrl(inquiry) }), {
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
