import { access, copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = new URL("../dist/", import.meta.url);
const distPath = fileURLToPath(distDir);
const sections = ["team", "portfolio"];
const rules = [
  "# Generated after the Astro static build. Do not edit dist/_redirects by hand."
];
const fallbackRules = [];
const redirectTargetRoot = join(distPath, "_redirect-targets");

await mkdir(redirectTargetRoot, { recursive: true });

for (const section of sections) {
  const sectionPath = join(distPath, section);
  const targetPath = join(redirectTargetRoot, section);
  const entries = await readdir(sectionPath, { withFileTypes: true });
  await mkdir(targetPath, { recursive: true });

  for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const sourceFile = join(sectionPath, entry.name, "index.html");
    const targetDirectory = join(targetPath, entry.name);
    const targetFile = join(targetDirectory, "index.html");
    await access(sourceFile);
    await mkdir(targetDirectory, { recursive: true });
    await copyFile(sourceFile, targetFile);
    const route = `/${section}/${entry.name}`;
    const targetRoute = `/_redirect-targets/${section}/${entry.name}/`;
    rules.push(`${route} ${targetRoute} 200`);
    rules.push(`${route}/ ${targetRoute} 200`);
  }

  fallbackRules.push(`/${section}/:slug /${section}/ 302`);
  fallbackRules.push(`/${section}/:slug/ /${section}/ 302`);
}

await writeFile(join(distPath, "_redirects"), `${[...rules, ...fallbackRules].join("\n")}\n`, "utf8");
