import type { APIRoute } from "astro";
import { lineUrl } from "@lib/meidi";

const notionVersion = "2022-06-28";
const defaultInquiryDatabaseId = "ae9b716c250c46e49ffbeeb1e0e8a32a";

type Inquiry = {
  name: string;
  phone: string;
  lineId: string;
  serviceArea: string;
  spaceType: string;
  problem: string;
  photoUrl: string;
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
    inquiry.photoUrl ? `照片連結：${inquiry.photoUrl}` : ""
  ].filter(Boolean).join("\n");

  return `${lineUrl}?text=${encodeURIComponent(message)}`;
}

async function createInquiry(inquiry: Inquiry): Promise<boolean> {
  const token = import.meta.env.NOTION_TOKEN;
  const databaseId = import.meta.env.NOTION_MEIDI_INQUIRY_DB_ID || defaultInquiryDatabaseId;
  if (!token || !databaseId) return false;

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
  return true;
}

export const POST: APIRoute = async ({ request }) => {
  let inquiry: Inquiry | null = null;
  try {
    const body = await request.json();
    inquiry = {
      name: clean(body.name),
      phone: clean(body.phone),
      lineId: clean(body.lineId),
      serviceArea: clean(body.serviceArea),
      spaceType: clean(body.spaceType),
      problem: clean(body.problem),
      photoUrl: clean(body.photoUrl),
      privacyConsent: body.privacyConsent === "on" || body.privacyConsent === true,
      submittedAt: new Date().toISOString()
    };

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

    if (await createInquiry(inquiry)) {
      return new Response(JSON.stringify({ ok: true, mode: "notion" }), {
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
