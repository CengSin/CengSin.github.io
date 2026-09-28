import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "../src");

function moduleText(name, value) {
  return `export const ${name} = ${JSON.stringify(value)};\n`;
}

const output = [
  moduleText("ADMIN_HTML", readFileSync(join(src, "admin/index.html"), "utf8")),
  moduleText("ADMIN_CSS", readFileSync(join(src, "admin/admin.css"), "utf8")),
  moduleText("ADMIN_JS", readFileSync(join(src, "admin/admin.js"), "utf8")),
  moduleText("FAVICON", readFileSync(join(src, "favicon.svg"), "utf8")),
].join("");
writeFileSync(join(root, "assets.mjs"), output);
