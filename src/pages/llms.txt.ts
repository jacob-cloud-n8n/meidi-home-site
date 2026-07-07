import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = process.env.SITE_URL || (site ? site.origin : "https://meidi-home-untitled-20260509.zeabur.app");
  const baseUrl = siteUrl.replace(/\/$/, "");

  const content = `# 美地居家收納

美地居家收納承襲納爺體系的空間診斷邏輯，提供專業空間診斷、收納規劃與親子家庭生活系統設計，幫助台灣家庭建立不復亂的居家秩序。

## 網站架構與主要頁面

- [首頁](${baseUrl}/) - 品牌初衷、收納邏輯與空間分類系統
- [關於美地](${baseUrl}/about/) - 主理人華琍老師介紹與師承納爺收納研究室說明
- [收納大小事](${baseUrl}/team/) - 整理心法、服務消息與居家整理文章
- [服務項目](${baseUrl}/services/) - 提供居家收納、收納講座、收納品代買、搬家打包、空間診斷與全屋整理等空間系統規劃
- [精選案例](${baseUrl}/portfolio/) - 展示去識別化與授權的 Before & After 空間改善案例
- [預約聯繫](${baseUrl}/booking/) - 線上空間診斷預約表單及官方 LINE 線上諮詢入口
- [隱私權政策](${baseUrl}/privacy/) - 個人資料與居家照片隱私保護規範
`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
