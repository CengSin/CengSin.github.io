import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sqliteD1 } from "./sqlite-d1.mjs";
import { musicApi, publicMusic } from "../cloudflare/music.mjs";

const root = new URL("../../.local/music/", import.meta.url);
mkdirSync(root, { recursive: true, mode: 0o700 });
const db = sqliteD1(fileURLToPath(new URL("library.sqlite", root)));
db.exec(readFileSync(new URL("../cloudflare/migrations/0001_music.sql", import.meta.url), "utf8"));
try {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const url = new URL(input.path, "http://127.0.0.1:8787");
  const req = new Request(url, { method: input.method, ...(input.method === "GET" ? {} : { body: JSON.stringify(input.body) }) });
  const result = input.path === "/music/public" ? await publicMusic({ MUSIC: db }) : await musicApi(req, { MUSIC: db }, url);
  process.stdout.write(JSON.stringify({ status: 200, body: result }));
} catch (e) { process.stdout.write(JSON.stringify({ status: e.status || 400, body: { error: e.message } })); }
finally { db.close(); }
