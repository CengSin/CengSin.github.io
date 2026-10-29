import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import worker from "./worker.mjs";
import { normalizeImport } from "./music.mjs";
import { sqliteD1 } from "../tools/sqlite-d1.mjs";

const track = { id: "12345", title: "测试歌曲", artist: "测试歌手", album: "测试专辑", cover: "", playCount: 4, playTime: Date.now() - 10000 };
const imported = () => ({ version: 1, observedAt: new Date().toISOString(), playlists: [{ id: "789", title: "我的歌单", cover: "", songCount: 1, songs: [track] }], recent: [track], reports: [{ period: "2026-08", startTime: Date.parse("2026-08-01T00:00:00+08:00"), endTime: Date.parse("2026-08-31T00:00:00+08:00"), songs: [track] }] });
function setup(t) {
  const db = sqliteD1(":memory:");
  db.exec(readFileSync(new URL("migrations/0001_music.sql", import.meta.url), "utf8"));
  t.after(() => db.close());
  const env = { MUSIC: db, SESSION_SECRET: "test-only-session-key" };
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now()/1000)+300, kind: "session", login: "CengSin", uid: 23357893 })).toString("base64url");
  const token = payload + "." + createHmac("sha256", env.SESSION_SECRET).update(payload).digest("hex");
  async function request(path, method = "GET", input, auth = true, origin = "https://cengsin.de5.net") {
    const headers = { "Content-Type": "application/json", "X-Admin": "1", Origin: origin };
    if (auth) headers.Cookie = "cengsin_admin="+token;
    const req = new Request("https://cengsin.de5.net"+path, { method, headers, ...(input ? {body:JSON.stringify(input)} : {}) });
    const response = await worker.fetch(req,env);
    return { status: response.status, headers: response.headers, body: await response.json() };
  }
  return { db, request };
}
test("all music management routes require the owner session", async t => {
  const { request } = setup(t);
  for (const [path,method] of [["","GET"],["/import","POST"],["/settings","PUT"],["/memory","PUT"],["/publish","POST"]]) {
    assert.equal((await request("/admin/api/music"+path,method,method==="GET"?undefined:{},false)).status,401);
  }
});
test("cross-origin mutations are rejected even with an owner session", async t => {
  const { request }=setup(t);
  assert.equal((await request("/admin/api/music/settings","PUT",{publicEnabled:true},true,"https://other.example")).status,403);
});
test("imports are atomic, deduplicated, and remove unrelated fields", async t => {
  const { request,db }=setup(t), data=imported();
  data.cookie="DO-NOT-STORE";
  data.playlists[0].creator={phone:"DO-NOT-STORE"};
  assert.equal((await request("/admin/api/music/import","POST",data)).status,200);
  assert.equal((await request("/admin/api/music/import","POST",data)).status,200);
  const rows=await db.prepare("SELECT payload FROM music_snapshots").all();
  assert.equal(rows.results.length,3);
  assert.equal(JSON.stringify(rows).includes("DO-NOT-STORE"),false);
  const bad=imported(); bad.reports[0].period="2026-07";
  assert.equal((await request("/admin/api/music/import","POST",bad)).status,400);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM music_snapshots").first()).n,3);
});
test("both master switch and per-memory publication are required, editing withdraws a memory", async t => {
  const { request }=setup(t);
  const saved=await request("/admin/api/music/memory","PUT",{song:track,period:"2026-08",memory:"这是一段由我写下的回忆。"});
  const id=saved.body.id;
  assert.equal((await request("/music/public")).body.enabled,false);
  await request("/admin/api/music/publish","POST",{id,published:true,revision:saved.body.revision});
  assert.deepEqual((await request("/music/public")).body,{enabled:false,memories:[]});
  await request("/admin/api/music/settings","PUT",{publicEnabled:true});
  const pub=await request("/music/public");
  assert.equal(pub.body.memories.length,1);
  assert.equal("playCount" in pub.body.memories[0].song,false);
  assert.equal("playTime" in pub.body.memories[0].song,false);
  assert.equal(pub.headers.get("Cache-Control"),"no-store");
  const edited = await request("/admin/api/music/memory","PUT",{id,song:track,period:"2026-08",memory:"修改后的私人内容"});
  assert.equal((await request("/music/public")).body.memories.length,0);
  await request("/admin/api/music/publish","POST",{id,published:true,revision:edited.body.revision});
  await request("/admin/api/music/publish","POST",{id,published:false});
  assert.equal((await request("/music/public")).body.memories.length,0);
});
test("private terms, missing memories and unsafe source links cannot be published", async t => {
  const { request }=setup(t);
  for(const memory of ["", "中国矿业大学"]) {
    const saved=await request("/admin/api/music/memory","PUT",{song:track,period:"2026-08",memory});
    assert.equal((await request("/admin/api/music/publish","POST",{id:saved.body.id,published:true,revision:saved.body.revision})).status,400);
  }
  assert.equal((await request("/admin/api/music/memory","PUT",{song:track,sourceUrl:"https://idea-platform.z-agent.ccwu.cc@evil.example/"})).status,400);
});
test("import limits and cover host validation reject unsafe data", () => {
  const data=imported(); data.recent[0]={...track,cover:"https://evil.example/image"};
  assert.throws(()=>normalizeImport(data),/封面/);
  assert.throws(()=>normalizeImport({...imported(),recent:Array(2001).fill(track)}),/列表/);
});

test("a concurrent edit cannot be published using an older preview", async t => {
  const { request, db } = setup(t);
  const saved = await request("/admin/api/music/memory", "PUT", { song: track, period: "2026-08", memory: "待发布内容" });
  const prepare = db.prepare;
  let changed = false;
  db.prepare = (sql) => {
    const statement = prepare(sql);
    if (sql !== "SELECT payload FROM music_memories WHERE id=?") return statement;
    return { bind: (...args) => ({ async first() {
      const row = await statement.bind(...args).first();
      if (!changed) {
        changed = true;
        await prepare("UPDATE music_memories SET payload=?,published=0 WHERE id=?").bind(JSON.stringify({ id: saved.body.id, song: track, period: "2026-08", memory: "另一标签页的私人修改" }), saved.body.id).run();
      }
      return row;
    } }) };
  };
  const result = await request("/admin/api/music/publish", "POST", { id: saved.body.id, published: true, revision: saved.body.revision });
  assert.equal(result.status, 409);
  assert.equal((await prepare("SELECT published FROM music_memories WHERE id=?").bind(saved.body.id).first()).published, 0);
});

test("a preview from an older tab cannot publish a newly edited draft", async t => {
  const { request } = setup(t);
  const first = await request("/admin/api/music/memory", "PUT", { song: track, period: "2026-08", memory: "预览过的内容" });
  await request("/admin/api/music/memory", "PUT", { id: first.body.id, song: track, period: "2026-08", memory: "还没预览的内容" });
  const result = await request("/admin/api/music/publish", "POST", { id: first.body.id, published: true, revision: first.body.revision });
  assert.equal(result.status, 409);
});
