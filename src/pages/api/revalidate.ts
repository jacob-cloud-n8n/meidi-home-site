import type { APIRoute } from "astro";
import { clearMeidiCache } from "@lib/meidi";

export const POST: APIRoute = async ({ request, url }) => {
  const token = url.searchParams.get("token");
  const expectedToken = import.meta.env.REVALIDATE_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  clearMeidiCache();
  return new Response(
    JSON.stringify({ ok: true, message: "Cache revalidated" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
};
