import { forbiddenHits } from "./validate.mjs";

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const object = (x) => x && typeof x === "object" && !Array.isArray(x);
const text = (x, max, label) => {
  if (typeof x !== "string" || x.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x)) fail(`${label}格式不对`);
  return x.trim();
};
const id = (x) => {
  if (!/^[1-9]\d{0,19}$/.test(String(x))) fail("歌曲编号格式不对");
  return String(x);
};
const number = (x) => {
  if (!Number.isFinite(x) || x < 0 || x > 1e14) fail("统计数字格式不对");
  return x;
};
const list = (x, max) => {
  if (!Array.isArray(x) || x.length > max) fail("列表过长或格式不对");
  return x;
};
function cover(x) {
  if (!x) return "";
  const url = new URL(text(x, 600, "封面"));
  if (url.protocol !== "https:" || !/^p\d+\.music\.126\.net$/.test(url.hostname) || url.username || url.password || url.port) fail("封面地址不被接受");
  return url.href;
}
export function song(x) {
  if (!object(x)) fail("歌曲格式不对");
  const item = { id: id(x.id), title: text(x.title, 240, "歌名"), artist: text(x.artist, 400, "歌手"), album: text(x.album || "", 240, "专辑"), cover: cover(x.cover) };
  if (!item.title) fail("需要歌名");
  if (x.playCount != null) item.playCount = number(x.playCount);
  if (x.playTime != null) {
    if (!Number.isSafeInteger(x.playTime) || x.playTime < 946684800000 || x.playTime > Date.now() + 86400000) fail("播放时间格式不对");
    item.playTime = x.playTime;
  }
  return item;
}
export function normalizeImport(input) {
  if (!object(input) || input.version !== 1) fail("需要版本为 1 的音乐导入文件");
  const observedAt = text(input.observedAt, 40, "采集时间");
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed) || observed < 946684800000 || observed > Date.now() + 86400000) fail("采集时间格式不对");
  const snapshots = [];
  const push = (kind, period, payload) => {
    if (new TextEncoder().encode(JSON.stringify(payload)).length > 1500000) fail("单份音乐快照过大，暂时无法导入", 413);
    snapshots.push({ id: `${kind}:${period}:${new Date(observed).toISOString()}`, kind, period, observedAt: new Date(observed).toISOString(), payload });
  };
  if (input.playlists != null) push("playlists", "all", list(input.playlists, 500).map((p) => ({ id: id(p.id), title: text(p.title, 240, "歌单名"), cover: cover(p.cover), songCount: number(p.songCount), songs: list(p.songs, 20000).map(song) })));
  if (input.recent != null) push("recent", "latest", list(input.recent, 2000).map(song));
  for (const r of list(input.reports || [], 120)) {
    if (!object(r)) fail("报告格式不对");
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(r.period)) fail("月份格式不对");
    const startTime = number(r.startTime), endTime = number(r.endTime);
    const month = new Date(startTime + 28800000).toISOString().slice(0, 7);
    if (month !== r.period || endTime < startTime || endTime - startTime > 32 * 86400000) fail("报告月份与来源时间不一致");
    const groups = (items) => list(items || [], 30).map((g) => ({ name: text(g.name, 100, "分类"), value: text(String(g.value), 80, "统计值") }));
    push("report", r.period, {
      period: r.period, startTime, endTime,
      durationText: text(r.durationText || "", 100, "听歌时长"),
      listenDays: number(r.listenDays || 0),
      songs: list(r.songs || [], 100).map(song),
      styles: groups(r.styles), languages: groups(r.languages), ages: groups(r.ages),
      days: list(r.days || [], 32).map((d) => ({ date: text(String(d.date), 40, "日期"), duration: number(d.duration) })),
    });
  }
  if (!snapshots.length) fail("文件中没有音乐数据");
  return snapshots;
}
export function memoryDraft(input) {
  if (!object(input)) fail("回忆格式不对");
  const item = {
    id: input.id ? text(input.id, 50, "回忆编号") : crypto.randomUUID(),
    song: song(input.song),
    period: text(input.period || "", 60, "时期"),
    title: text(input.title || "", 120, "标题"),
    memory: text(input.memory || "", 4000, "回忆"),
    sourceTitle: text(input.sourceTitle || "", 160, "关联记录"),
    sourceUrl: text(input.sourceUrl || "", 600, "关联链接"),
  };
  if (!/^[a-zA-Z0-9-]{1,50}$/.test(item.id)) fail("回忆编号格式不对");
  if (item.sourceUrl) {
    let url;
    try { url = new URL(item.sourceUrl); } catch { fail("关联链接格式不对"); }
    if (url.protocol !== "https:" || url.hostname !== "idea-platform.z-agent.ccwu.cc" || url.username || url.password || url.port) fail("请选择 Idea Platform 的记录链接");
  }
  return item;
}
export function publicMemory(item) {
  const d = memoryDraft(item);
  if (!d.memory || !d.period) fail("公开前需要填写时期和回忆");
  const projected = { id: d.id, song: { id: d.song.id, title: d.song.title, artist: d.song.artist, album: d.song.album, cover: d.song.cover }, period: d.period, title: d.title, memory: d.memory, sourceTitle: d.sourceTitle, sourceUrl: d.sourceUrl };
  if (forbiddenHits(JSON.stringify(projected), false).length) fail("回忆中含有不能公开的内容");
  return projected;
}
async function revision(payload) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}
function dbOf(env) {
  if (!env.MUSIC) fail("音乐资料库尚未配置", 503);
  return env.MUSIC;
}
export async function publicMusic(env) {
  if (!env.MUSIC) return { enabled: false, memories: [] };
  const db = dbOf(env);
  const settings = await db.prepare("SELECT public_enabled FROM music_settings WHERE id=1").first();
  if (!settings?.public_enabled) return { enabled: false, memories: [] };
  const { results } = await db.prepare("SELECT payload FROM music_memories WHERE published=1 ORDER BY updated_at DESC LIMIT 100").all();
  const memories = [];
  for (const row of results) {
    try { memories.push(publicMemory(JSON.parse(row.payload))); } catch {}
  }
  return { enabled: true, memories };
}
export async function musicApi(request, env, url) {
  const db = dbOf(env), path = url.pathname, method = request.method;
  if (path === "/admin/api/music" && method === "GET") {
    const { results: rows } = await db.prepare("SELECT s.id,s.kind,s.period,s.observed_at,s.payload FROM music_snapshots s WHERE NOT EXISTS (SELECT 1 FROM music_snapshots n WHERE n.kind=s.kind AND n.period=s.period AND n.observed_at>s.observed_at) ORDER BY s.observed_at DESC").all();
    const latest = new Map();
    for (const row of rows) if (!latest.has(`${row.kind}:${row.period}`)) latest.set(`${row.kind}:${row.period}`, { ...row, payload: JSON.parse(row.payload) });
    const { results } = await db.prepare("SELECT payload,published,updated_at FROM music_memories ORDER BY updated_at DESC").all();
    const settings = await db.prepare("SELECT public_enabled FROM music_settings WHERE id=1").first();
    return { snapshots: [...latest.values()], memories: await Promise.all(results.map(async (r) => ({ ...JSON.parse(r.payload), published: !!r.published, updatedAt: r.updated_at, revision: await revision(r.payload) }))), publicEnabled: !!settings?.public_enabled };
  }
  const input = method === "GET" ? null : await readBody(request);
  if (path === "/admin/api/music/import" && method === "POST") {
    const snapshots = normalizeImport(input);
    await db.batch(snapshots.map((s) => db.prepare("INSERT INTO music_snapshots(id,kind,period,observed_at,payload) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").bind(s.id,s.kind,s.period,s.observedAt,JSON.stringify(s.payload))));
    return { message: "已导入私人资料库", imported: snapshots.length };
  }
  if (path === "/admin/api/music/settings" && method === "PUT") {
    if (typeof input.publicEnabled !== "boolean") fail("公开开关格式不对");
    await db.prepare("UPDATE music_settings SET public_enabled=? WHERE id=1").bind(input.publicEnabled ? 1 : 0).run();
    return { message: input.publicEnabled ? "音乐名片已开启" : "音乐名片已关闭" };
  }
  if (path === "/admin/api/music/memory" && method === "PUT") {
    const draft = memoryDraft(input);
    await db.prepare("INSERT INTO music_memories(id,payload,published,updated_at) VALUES (?,?,0,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,published=0,updated_at=excluded.updated_at").bind(draft.id,JSON.stringify(draft),new Date().toISOString()).run();
    return { message: "已保存为私人草稿", id: draft.id, revision: await revision(JSON.stringify(draft)) };
  }
  if (path === "/admin/api/music/publish" && method === "POST") {
    if (typeof input.published !== "boolean") fail("发布状态格式不对");
    const row = await db.prepare("SELECT payload FROM music_memories WHERE id=?").bind(text(input.id, 50, "回忆编号")).first();
    if (!row) fail("找不到这段回忆", 404);
    if (input.published) {
      if (input.revision !== await revision(row.payload)) fail("回忆已被修改，请重新预览后发布", 409);
      publicMemory(JSON.parse(row.payload));
    }
    const result = await db.prepare("UPDATE music_memories SET published=?,updated_at=? WHERE id=? AND payload=?").bind(input.published ? 1 : 0,new Date().toISOString(),input.id,row.payload).run();
    if ((result.meta?.changes ?? result.changes) !== 1) fail("回忆已被修改，请重新预览后发布", 409);
    return { message: input.published ? "这段回忆已发布" : "这段回忆已撤回" };
  }
  fail("没有这个音乐管理功能", 404);
}
async function readBody(request) {
  if (Number(request.headers.get("Content-Length") || 0) > 8 * 1024 * 1024) fail("导入文件不能超过 8 MB", 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 8 * 1024 * 1024) fail("导入文件不能超过 8 MB", 413);
  let input;
  try { input = JSON.parse(raw); } catch { fail("需要 JSON 格式的数据"); }
  if (!object(input)) fail("数据格式不对");
  return input;
}
