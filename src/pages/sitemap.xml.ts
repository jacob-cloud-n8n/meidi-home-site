import type { APIRoute } from "astro";
import { getMeidiArticles } from "../lib/meidi";

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = process.env.SITE_URL || (site ? site.origin : "https://meidi-home-untitled-20260509.zeabur.app");
  const baseUrl = siteUrl.replace(/\/$/, "");

  const staticPages = [
    "",
    "/about/",
    "/services/",
    "/portfolio/",
    "/booking/",
    "/team/",
    "/privacy/",
  ];

  let articleSlugs: string[] = [];
  try {
    const articles = await getMeidiArticles();
    articleSlugs = articles.map((a) => `/team/${a.slug}/`);
  } catch (e) {
    console.error("Failed to get articles for sitemap:", e);
  }

  const allPages = [...staticPages, ...articleSlugs];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>${page === "" ? "daily" : "weekly"}</changefreq>
    <priority>${page === "" ? "1.0" : page.startsWith("/team/") ? "0.6" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8"
    }
  });
};
