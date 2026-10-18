import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const pngOne = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const pngTwo = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl2sAAAAASUVORK5CYII=",
  "base64"
);

// 第三張：同為 1x1 PNG、像素不同，內容雜湊與前兩張相異
const pngThree = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

const databaseIds = {
  home: "fixture-home",
  about: "fixture-about",
  booking: "fixture-booking",
  services: "fixture-services",
  portfolio: "fixture-portfolio",
  team: "fixture-team"
};

const title = (value) => ({ title: [{ plain_text: value }] });
const text = (value) => ({ rich_text: [{ plain_text: value }] });
const select = (value) => ({ select: { name: value } });
const checkbox = (value) => ({ checkbox: value });
const notionFile = (url) => ({ files: [{ type: "file", file: { url } }] });
const externalFile = (url) => ({ files: [{ type: "external", external: { url } }] });
const urlProp = (value) => ({ type: "url", url: value });

let scenario = "success";
const imageRequests = new Map();
let queryRequests = 0;

function recordImageRequest(pathname) {
  imageRequests.set(pathname, (imageRequests.get(pathname) ?? 0) + 1);
}

function page(id, name, image) {
  return {
    id,
    properties: {
      "名稱": title(name),
      "圖片": image,
      "啟用": checkbox(true)
    }
  };
}

function fixtureResults(databaseId, origin) {
  if (scenario === "failure") {
    if (databaseId !== databaseIds.home) return [];
    return [page("page-failure", "home.hero.image", notionFile(`${origin}/files/missing.png?X-Amz-Signature=expired`))];
  }

  if (databaseId === databaseIds.home) {
    return [page("page-home", "home.hero.image", notionFile(`${origin}/files/shared.png?X-Amz-Signature=home`))];
  }
  if (databaseId === databaseIds.about) {
    return [
      page("page-about-shared", "about.hero.image", notionFile(`${origin}/files/shared.png?X-Amz-Signature=about`)),
      page("page-about-external", "about.method.image", externalFile(`${origin}/external/customer.png?keep=external`)),
      // 上傳檔與「圖片網址」並存：上傳檔優先 → 應落地；圖片網址不應出現在頁面上
      {
        ...page("page-about-both", "about.mentor.image", notionFile(`${origin}/files/both.png?X-Amz-Signature=both`)),
        properties: {
          ...page("page-about-both", "about.mentor.image", notionFile(`${origin}/files/both.png?X-Amz-Signature=both`)).properties,
          "圖片網址": urlProp(`${origin}/external/url-field-shadowed.png?keep=shadowed`)
        }
      }
    ];
  }
  if (databaseId === databaseIds.services) {
    const service = page("page-service", "service.fixture", notionFile(`${origin}/files/service.png?X-Amz-Signature=service`));
    service.properties["前台位置"] = text("service/測試服務");
    service.properties["類型"] = select("區塊");
    service.properties["文字內容"] = text("本機模擬服務");
    // 只有「圖片網址」欄（無上傳檔）→ 外部網址必須原樣保留
    const urlOnly = page("page-service-url", "service.url-only", { files: [] });
    urlOnly.properties["圖片網址"] = urlProp(`${origin}/external/url-field-only.png?keep=url-field`);
    urlOnly.properties["前台位置"] = text("service/網址欄服務");
    urlOnly.properties["類型"] = select("區塊");
    urlOnly.properties["文字內容"] = text("本機模擬服務二");
    return [service, urlOnly];
  }
  return [];
}

const server = createServer(async (request, response) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = new URL(request.url, origin);

  const queryMatch = url.pathname.match(/^\/v1\/databases\/([^/]+)\/query$/);
  if (request.method === "POST" && queryMatch) {
    queryRequests += 1;
    request.resume();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ results: fixtureResults(decodeURIComponent(queryMatch[1]), origin), has_more: false }));
    return;
  }

  if (url.pathname === "/files/shared.png" || url.pathname === "/files/service.png" || url.pathname === "/files/both.png") {
    recordImageRequest(url.pathname);
    response.writeHead(200, { "content-type": "image/png" });
    response.end(url.pathname.includes("shared") ? pngOne : url.pathname.includes("both") ? pngThree : pngTwo);
    return;
  }

  if (url.pathname === "/files/missing.png") {
    recordImageRequest(url.pathname);
    response.writeHead(503, { "content-type": "text/plain" });
    response.end("fixture failure");
    return;
  }

  response.writeHead(404, { "content-type": "text/plain" });
  response.end("not found");
});

// ⚠️ Vite 會自動載入 repo 的 .env；只 delete process.env 擋不住它（2026-10-18 實測：
// 舊版「無 token」建置因此吃到 .env 裡的真 token）。所以無 token 情境一律
// 「設成空字串」（process.env 優先於 .env）＋把 API 指向本機假伺服器，
// 即使 token 仍漏進來也只會打到本機，並由 queryRequests 抓出來。
function runBuild(extraEnv, unsetNotion = false, script = "build:cloudflare") {
  const env = { ...process.env };
  const notionKeys = [
    "NOTION_TOKEN",
    "NOTION_API_BASE_URL",
    "NOTION_MEIDI_HOME_DB_ID",
    "NOTION_MEIDI_ABOUT_DB_ID",
    "NOTION_MEIDI_BOOKING_DB_ID",
    "NOTION_MEIDI_SERVICES_DB_ID",
    "NOTION_MEIDI_PORTFOLIO_DB_ID",
    "NOTION_MEIDI_TEAM_DB_ID",
    "NOTION_MEIDI_ARTICLES_DB_ID"
  ];

  if (unsetNotion) {
    for (const key of notionKeys) env[key] = "";
  }
  Object.assign(env, extraEnv);

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["run", script], {
      cwd: process.cwd(),
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(entryPath));
    if (entry.isFile() && entry.name.endsWith(".html")) files.push(entryPath);
  }
  return files;
}

function buildEnv(origin) {
  return {
    NOTION_TOKEN: "fixture-only-not-a-secret",
    NOTION_API_BASE_URL: `${origin}/v1`,
    NOTION_CACHE_SECONDS: "60",
    NOTION_MEIDI_HOME_DB_ID: databaseIds.home,
    NOTION_MEIDI_ABOUT_DB_ID: databaseIds.about,
    NOTION_MEIDI_BOOKING_DB_ID: databaseIds.booking,
    NOTION_MEIDI_SERVICES_DB_ID: databaseIds.services,
    NOTION_MEIDI_PORTFOLIO_DB_ID: databaseIds.portfolio,
    NOTION_MEIDI_TEAM_DB_ID: databaseIds.team,
    NOTION_MEIDI_ARTICLES_DB_ID: databaseIds.team
  };
}

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const env = buildEnv(origin);

  scenario = "success";
  imageRequests.clear();
  await rm("dist", { recursive: true, force: true });
  const success = await runBuild(env);
  assert.equal(success.code, 0, `success build failed\n${success.stdout}\n${success.stderr}`);

  const html = (await Promise.all((await htmlFiles("dist")).map((file) => readFile(file, "utf8")))).join("\n");
  const signedUrls = html.match(/X-Amz-(?:Signature|Credential|Algorithm)|[?&](?:sig|signature)=/gi) ?? [];
  const internalPaths = new Set(html.match(/\/_notion\/[a-f0-9]{64}\.[a-z0-9]+/g) ?? []);
  const assets = (await readdir("dist/_notion")).sort();
  const readableAssets = await Promise.all(assets.map(async (asset) => {
    const bytes = await readFile(path.join("dist/_notion", asset));
    return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  }));

  const fixtureFileUrls = html.match(/127\.0\.0\.1:\d+\/files\//g) ?? [];
  const aboutHtml = await readFile("dist/about/index.html", "utf8");
  const servicesHtml = (await Promise.all((await htmlFiles("dist/services")).map((file) => readFile(file, "utf8")))).join("\n");

  assert.equal(signedUrls.length, 0);
  assert.equal(fixtureFileUrls.length, 0, "a Notion-hosted fixture URL survived in HTML");
  assert.equal(internalPaths.size, 3);
  assert.equal(assets.length, 3);
  assert.equal(readableAssets.filter(Boolean).length, 3);
  assert.equal(imageRequests.get("/files/shared.png"), 1);
  assert.equal(imageRequests.get("/files/service.png"), 1);
  assert.equal(imageRequests.get("/files/both.png"), 1);
  assert.match(aboutHtml, /\/external\/customer\.png\?keep=external/);
  assert.doesNotMatch(aboutHtml, /url-field-shadowed/);
  assert.match(servicesHtml, /\/external\/url-field-only\.png\?keep=url-field/);

  console.log(`success.exit=${success.code}`);
  console.log(`success.signed_urls=${signedUrls.length}`);
  console.log(`success.internal_paths=${internalPaths.size}`);
  console.log(`success.asset_files=${assets.length}`);
  console.log(`success.readable_files=${readableAssets.filter(Boolean).length}`);
  console.log(`success.shared_download_requests=${imageRequests.get("/files/shared.png")}`);
  console.log(`success.fixture_file_urls=${fixtureFileUrls.length}`);
  console.log("success.external_file_unchanged=true");
  console.log("success.upload_wins_over_url_field=true");
  console.log("success.url_field_only_unchanged=true");

  scenario = "failure";
  imageRequests.clear();
  await rm("dist", { recursive: true, force: true });
  const failure = await runBuild(env);
  const failureOutput = `${failure.stdout}\n${failure.stderr}`;
  assert.notEqual(failure.code, 0, "failure fixture unexpectedly built successfully");
  assert.match(failureOutput, /\[notion-assets\] download failed with HTTP 503/);
  assert.match(failureOutput, /page=page-failure/);
  assert.match(failureOutput, /field=properties\.圖片\.files\[0\]\.file\.url/);
  assert.doesNotMatch(failureOutput, /X-Amz-Signature=expired/);

  const failureMessage = failureOutput.split("\n").find((line) => line.includes("[notion-assets]"))?.trim() ?? "missing";
  console.log(`failure.exit=${failure.code}`);
  console.log(`failure.message=${failureMessage}`);

  const exists = async (target) => stat(target).then(() => true, () => false);
  const isolatedNoToken = { NOTION_API_BASE_URL: `${origin}/v1` };

  scenario = "success";
  queryRequests = 0;
  imageRequests.clear();
  await rm("dist", { recursive: true, force: true });
  const noToken = await runBuild(isolatedNoToken, true);
  assert.equal(noToken.code, 0, `no-token build failed\n${noToken.stdout}\n${noToken.stderr}`);
  assert.equal(queryRequests, 0, "no-token build still queried Notion (token leaked from .env?)");
  assert.equal(await exists("dist/_notion"), false, "no-token build produced Notion assets");
  console.log(`no_token.exit=${noToken.code}`);
  console.log(`no_token.notion_queries=${queryRequests}`);
  console.log("no_token.notion_assets_dir=absent");

  // 伺服器版（舊 Zeabur 路徑）：localize 不得啟動
  queryRequests = 0;
  imageRequests.clear();
  await rm("dist", { recursive: true, force: true });
  const serverBuild = await runBuild(isolatedNoToken, true, "build");
  assert.equal(serverBuild.code, 0, `server build failed\n${serverBuild.stdout}\n${serverBuild.stderr}`);
  assert.equal(await exists("dist/server/entry.mjs"), true, "server build missing entry.mjs");
  assert.equal(await exists("dist/_notion"), false, "server build produced Notion assets");
  assert.equal(await exists("dist/client/_notion"), false, "server build produced Notion assets");
  console.log(`server_build.exit=${serverBuild.code}`);
  console.log(`server_build.notion_queries=${queryRequests}`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
