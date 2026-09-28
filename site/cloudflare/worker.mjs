import { ADMIN_CSS, ADMIN_HTML, ADMIN_JS, FAVICON } from "./assets.mjs";
import {
  deletePost,
  listPosts,
  publicConfig,
  readPost,
  validOauth,
  validateProjects,
  validateSite,
  writePost,
} from "./validate.mjs";

const ORIGIN = "https://cengsin.de5.net";
const HOST = "cengsin.de5.net";
const CALLBACK_PATH = "/admin/oauth/callback";
const SESSION_TTL = 12 * 60 * 60;
const STATE_TTL = 10 * 60;
const ALLOWED_GITHUB_ID = 23357893;
const ALLOWED_GITHUB_LOGIN = "CengSin";

export default {
  async fetch(request, env) {
    const head = request.method === "HEAD";
    if (head) request = new Request(request, { method: "GET" });
    const response = await route(request, env);
    if (!head) return response;
    return new Response(null, { status: response.status, headers: response.headers });
  },
};

async function route(request, env) {
  const url = new URL(request.url);
  if (url.hostname !== HOST) return text(404, "not found");
  if (request.method === "OPTIONS" && url.pathname === "/config") return configCors(new Response(null, { status: 204 }));
  if (url.pathname === "/config" && request.method === "GET") return config(env);
  if (url.pathname === "/assets/favicon.svg" && request.method === "GET") {
    return new Response(FAVICON, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
  }
  if (url.pathname.startsWith("/admin")) return admin(request, env, url);
  return text(404, "not found");
}

async function config(env) {
  const site = await env.CONFIG.get("site", "json");
  if (!site) return json(503, { error: "配置还没有准备好" }, true);
  return json(200, publicConfig(site), true);
}

async function admin(request, env, url) {
  const path = url.pathname;
  if (["POST", "PUT", "DELETE"].includes(request.method) && !sameOrigin(request)) {
    return json(403, { error: "请求来源不被接受" });
  }
  if (path === "/admin" || path === "/admin/") return adminFile(ADMIN_HTML, "text/html; charset=utf-8");
  if (path === "/admin/admin.css") return adminFile(ADMIN_CSS, "text/css; charset=utf-8");
  if (path === "/admin/admin.js") return adminFile(ADMIN_JS, "text/javascript; charset=utf-8");
  if (path === "/admin/oauth/status" && request.method === "GET") {
    return json(200, { configured: (await oauthConfig(env)) !== null });
  }
  if (path === "/admin/oauth/setup" && request.method === "POST") return setup(request, env);
  if (path === "/admin/oauth/start" && request.method === "GET") return start(env);
  if (path === CALLBACK_PATH && request.method === "GET") return callback(request, env, url);
  if (path === "/admin/logout" && request.method === "POST") {
    return json(200, { ok: true }, false, [cookie("cengsin_admin", "", 0)]);
  }
  if (path === "/admin/api/session" && request.method === "GET") {
    const session = await readSession(env, request);
    if (!session) return json(200, { authenticated: false });
    return json(200, { authenticated: true, login: session.login, id: session.uid });
  }
  if (path.startsWith("/admin/api/")) {
    if (!(await readSession(env, request))) return json(401, { error: "需要使用 GitHub 账号 CengSin 登录" });
    return api(request, env, path, url);
  }
  return text(404, "not found");
}

async function setup(request, env) {
  if ((await oauthConfig(env)) && !(await readSession(env, request))) {
    return json(403, { error: "只有站主可以更换 GitHub 登录配置" });
  }
  let payload;
  try {
    payload = await readJson(request);
    const clientId = String(payload.client_id || "").trim();
    const clientSecret = String(payload.client_secret || "").trim();
    if (!validOauth({ client_id: clientId, client_secret: clientSecret })) {
      return json(400, { error: "GitHub OAuth 的 Client ID 或 Client Secret 格式不对" });
    }
    await env.CONFIG.put("oauth", JSON.stringify({ client_id: clientId, client_secret: clientSecret }));
  } catch {
    return json(400, { error: "登录配置格式不对" });
  }
  return json(200, { ok: true });
}

async function start(env) {
  const config = await oauthConfig(env);
  if (!config) return redirect("/admin/");
  const nonce = randomToken();
  const token = await sign(env, { exp: Math.floor(Date.now() / 1000) + STATE_TTL, kind: "state", nonce });
  const query = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: ORIGIN + CALLBACK_PATH,
    scope: "read:user",
    state: nonce,
    allow_signup: "false",
  });
  return redirect("https://github.com/login/oauth/authorize?" + query.toString(), [cookie("cengsin_oauth_state", token, STATE_TTL)]);
}

async function callback(request, env, url) {
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const expected = await readState(env, cookies(request).cengsin_oauth_state);
  const clear = cookie("cengsin_oauth_state", "", 0);
  if (!code || !expected || !safeEqual(expected.nonce, state)) {
    return page(400, "登录没有完成", "登录状态已过期。请回到管理后台，重新使用 GitHub 登录。", [clear]);
  }
  try {
    const user = await fetchUser(await exchangeCode(env, code));
    if (!identityAllowed(user)) {
      const login = escapeHtml(String(user.login || "这个账号"));
      return page(403, "不能进入管理后台", `GitHub 账号 ${login} 不能进入管理后台。只有 CengSin 可以登录，其他人都是访客。`, [clear, cookie("cengsin_admin", "", 0)]);
    }
    return redirect("/admin/", [cookie("cengsin_admin", await issueSession(env, user), SESSION_TTL), clear]);
  } catch {
    return page(400, "登录没有完成", "GitHub 没有完成本次登录。请确认 OAuth App 的回调地址是 https://cengsin.de5.net/admin/oauth/callback ，然后重试。", [clear]);
  }
}

async function api(request, env, path, url) {
  try {
    if (path === "/admin/api/site" && request.method === "GET") {
      return json(200, { site: await loadSite(env) });
    }
    if (path === "/admin/api/site" && request.method === "PUT") {
      const site = await readJson(request);
      validateSite(site);
      await env.CONFIG.put("site", JSON.stringify(site));
      return json(200, { message: "已保存。" });
    }
    if (path === "/admin/api/projects" && request.method === "GET") {
      return json(200, { projects: await loadProjects(env) });
    }
    if (path === "/admin/api/projects" && request.method === "PUT") {
      const payload = await readJson(request);
      const projects = payload && !Array.isArray(payload) ? payload.projects : payload;
      validateProjects(projects);
      await env.CONFIG.put("projects", JSON.stringify(projects));
      return json(200, { message: "已保存。" });
    }
    if (path === "/admin/api/posts" && request.method === "GET") {
      return json(200, { posts: listPosts(await loadPosts(env)) });
    }
    if (path === "/admin/api/post" && request.method === "GET") {
      return json(200, { post: readPost(await loadPosts(env), url.searchParams.get("name") || "") });
    }
    if (path === "/admin/api/post" && request.method === "PUT") {
      const posts = writePost(await loadPosts(env), await readJson(request));
      await env.CONFIG.put("posts", JSON.stringify(posts));
      return json(200, { message: "已保存。" });
    }
    if (path === "/admin/api/post" && request.method === "DELETE") {
      const payload = await readJson(request);
      const posts = deletePost(await loadPosts(env), payload.filename || "");
      await env.CONFIG.put("posts", JSON.stringify(posts));
      return json(200, { message: "已保存。" });
    }
    return json(404, { error: "没有这个管理功能" });
  } catch (error) {
    return json(error.status || 400, { error: error.message || "保存失败" });
  }
}

async function loadSite(env) {
  const site = await env.CONFIG.get("site", "json");
  if (!site) {
    const error = new Error("配置还没有准备好");
    error.status = 503;
    throw error;
  }
  return site;
}

async function loadProjects(env) {
  return (await env.CONFIG.get("projects", "json")) || [];
}

async function loadPosts(env) {
  return (await env.CONFIG.get("posts", "json")) || {};
}

async function oauthConfig(env) {
  const stored = await env.CONFIG.get("oauth", "json");
  if (validOauth(stored)) return stored;
  if (validOauth({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET })) {
    return { client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET };
  }
  return null;
}

async function exchangeCode(env, code) {
  const config = await oauthConfig(env);
  if (!config) throw new Error("还没有配置 GitHub 登录");
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "cengsin-admin" },
    body: new URLSearchParams({
      client_id: config.client_id,
      client_secret: config.client_secret,
      code,
      redirect_uri: ORIGIN + CALLBACK_PATH,
    }),
  });
  const payload = await response.json();
  if (!payload.access_token) throw new Error(payload.error_description || payload.error || "GitHub 没有返回登录凭证");
  return payload.access_token;
}

async function fetchUser(token) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "cengsin-admin",
    },
  });
  const user = await response.json();
  if (!user || typeof user !== "object") throw new Error("GitHub 没有返回账号资料");
  return user;
}

function identityAllowed(user) {
  return Number(user.id) === ALLOWED_GITHUB_ID && user.login === ALLOWED_GITHUB_LOGIN;
}

async function issueSession(env, user) {
  if (!identityAllowed(user)) throw new Error("denied");
  return sign(env, {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL,
    kind: "session",
    login: ALLOWED_GITHUB_LOGIN,
    uid: ALLOWED_GITHUB_ID,
  });
}

async function readSession(env, request) {
  const payload = await unsign(env, cookies(request).cengsin_admin);
  if (!payload || payload.kind !== "session") return null;
  if (payload.uid !== ALLOWED_GITHUB_ID || payload.login !== ALLOWED_GITHUB_LOGIN) return null;
  return payload;
}

async function readState(env, token) {
  const payload = await unsign(env, token);
  if (!payload || payload.kind !== "state" || !payload.nonce) return null;
  return payload;
}

async function sign(env, payload) {
  const raw = base64url(JSON.stringify(sorted(payload)));
  const key = await hmacKey(env);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  return raw + "." + [...signature].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function unsign(env, token) {
  if (typeof token !== "string" || token.split(".").length !== 2) return null;
  const [raw, signature] = token.split(".");
  const key = await hmacKey(env);
  const bytes = new Uint8Array(signature.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(signature.slice(index * 2, index * 2 + 2), 16);
  const ok = await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(raw));
  if (!ok || bytes.length * 2 !== signature.length) return null;
  try {
    const payload = JSON.parse(base64urlDecode(raw));
    if (!payload || typeof payload !== "object" || Number(payload.exp || 0) < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hmacKey(env) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET || ""), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function sorted(payload) {
  return Object.keys(payload).sort().reduce((result, key) => {
    result[key] = payload[key];
    return result;
  }, {});
}

function base64url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64urlDecode(value) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return base64url(String.fromCharCode(...bytes)).replace(/=+$/, "");
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ORIGIN) return false;
  return request.headers.get("X-Admin") === "1";
}

function cookies(request) {
  const found = {};
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    found[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return found;
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length < 0 || length > 1500000) {
    const error = new Error("内容过大");
    error.status = 400;
    throw error;
  }
  const data = await request.json();
  if (!data || typeof data !== "object") {
    const error = new Error("内容格式不对");
    error.status = 400;
    throw error;
  }
  return data;
}

function adminFile(body, contentType) {
  return new Response(body, { headers: securityHeaders(contentType) });
}

function page(status, title, message, cookies) {
  const body = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/assets/favicon.svg">
  <link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
  <main class="login-wrap">
    <section class="card login-card">
      <p class="kicker">CengSin</p>
      <h1>${escapeHtml(title)}</h1>
      <p>${message}</p>
      <div class="actions">
        <a class="button primary" href="/admin/">返回登录</a>
        <a class="button" href="https://cengsin.is-a.dev/">回到网站</a>
      </div>
    </section>
  </main>
</body>
</html>`;
  return new Response(body, { status, headers: securityHeaders("text/html; charset=utf-8", cookies) });
}

function json(status, payload, pub, cookies) {
  const headers = pub ? publicHeaders() : securityHeaders("application/json; charset=utf-8", cookies);
  if (!pub) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload), { status, headers });
}

function text(status, message) {
  return new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

function redirect(location, cookies) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const item of cookies || []) headers.append("Set-Cookie", item);
  return new Response(null, { status: 303, headers });
}

function securityHeaders(contentType, cookies) {
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "X-Robots-Tag": "noindex",
    "Content-Security-Policy": "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' https://github.com; base-uri 'none'; form-action 'self'",
  });
  for (const item of cookies || []) headers.append("Set-Cookie", item);
  return headers;
}

function publicHeaders() {
  return new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff",
  });
}

function configCors(response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return response;
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
