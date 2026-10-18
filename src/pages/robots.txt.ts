import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = import.meta.env.PUBLIC_SITE_URL || process.env.SITE_URL || (site ? site.origin : "https://meidi-home-untitled-20260509.zeabur.app");
  const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl.replace(/\/$/, "")}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
