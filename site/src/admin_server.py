#!/usr/bin/env python3
"""Local admin for the CengSin site. It never publishes itself."""

import hmac
import html
import json
import re
import subprocess
import sys
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from admin_auth import (
    CALLBACK_PATH,
    HOST,
    ORIGIN,
    PORT,
    SESSION_TTL,
    STATE_TTL,
    authorization_url,
    exchange_code,
    fetch_user,
    identity_allowed,
    issue_session,
    issue_state,
    oauth_config,
    read_session,
    read_state,
    save_oauth,
)
from content_store import (
    PROJECTS_PATH,
    SITE_PATH,
    ContentError,
    delete_post_source,
    list_posts,
    load_projects,
    load_site,
    read_post_source,
    restore_text,
    save_projects,
    save_site,
    write_post_source,
)

SRC = Path(__file__).resolve().parent
SITE_DIR = SRC.parent
REPO = SITE_DIR.parent
DIST = SITE_DIR / "dist"
ADMIN_DIR = SRC / "admin"
BUILD_LOCK = threading.Lock()
TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def rebuild():
    with BUILD_LOCK:
        result = subprocess.run(
            [sys.executable, str(SRC / "build.py")],
            cwd=REPO,
            capture_output=True,
            text=True,
            timeout=90,
        )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        if "forbidden content:" in detail:
            found = detail.split("forbidden content:", 1)[-1].strip()
            return False, "这些内容不能写入公开页面：" + found
        return False, detail[-1200:] or "生成网站失败"
    return True, "已保存，本地预览已更新"


def commit_text(save, path):
    previous = None
    try:
        previous = save()
        ok, message = rebuild()
        if not ok:
            restore_text(path, previous)
            return False, message
        return True, message
    except ContentError as error:
        if previous is not None:
            restore_text(path, previous)
        return False, str(error)
    except Exception:
        if previous is not None:
            restore_text(path, previous)
        return False, "保存失败"


def rollback_post(previous, source, target):
    if previous is None:
        if target.exists():
            target.unlink()
        return
    source.parent.mkdir(parents=True, exist_ok=True)
    source.write_text(previous, encoding="utf-8")
    if target != source and target.exists():
        target.unlink()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self.route()

    def do_POST(self):
        self.route()

    def do_PUT(self):
        self.route()

    def do_DELETE(self):
        self.route()

    def route(self):
        host = self.headers.get("Host", "")
        if host.startswith("localhost:"):
            self.redirect(ORIGIN + self.path)
            return
        if host != f"{HOST}:{PORT}":
            self.send_error(400)
            return
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if self.command in {"POST", "PUT", "DELETE"} and not self.same_origin():
            self.send_json(403, {"error": "请求来源不被接受"})
            return
        if path in {"/admin", "/admin/"}:
            self.send_admin_file("index.html")
            return
        if path == "/admin/admin.css":
            self.send_admin_file("admin.css")
            return
        if path == "/admin/admin.js":
            self.send_admin_file("admin.js")
            return
        if path == "/admin/oauth/status" and self.command == "GET":
            self.send_json(200, {"configured": oauth_config() is not None})
            return
        if path == "/admin/oauth/setup" and self.command == "POST":
            self.handle_setup()
            return
        if path == "/admin/oauth/start" and self.command == "GET":
            self.handle_start()
            return
        if path == CALLBACK_PATH and self.command == "GET":
            self.handle_callback(urllib.parse.parse_qs(parsed.query))
            return
        if path == "/admin/logout" and self.command == "POST":
            self.send_json(200, {"ok": True}, [self.cookie("cengsin_admin", "", 0)])
            return
        if path == "/admin/api/session" and self.command == "GET":
            session = self.session()
            if not session:
                self.send_json(200, {"authenticated": False})
            else:
                self.send_json(200, {"authenticated": True, "login": session["login"], "id": session["uid"]})
            return
        if path.startswith("/admin/api/"):
            if not self.require_session():
                return
            self.handle_api(path, urllib.parse.parse_qs(parsed.query))
            return
        if path.startswith("/admin"):
            self.send_error(404)
            return
        self.send_site(path)

    def handle_setup(self):
        if oauth_config() is not None and not self.session():
            self.send_json(403, {"error": "只有站主可以更换 GitHub 登录配置"})
            return
        try:
            payload = self.read_json()
            save_oauth(str(payload.get("client_id", "")), str(payload.get("client_secret", "")))
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        except (json.JSONDecodeError, ContentError):
            self.send_json(400, {"error": "登录配置格式不对"})
            return
        self.send_json(200, {"ok": True})

    def handle_start(self):
        if oauth_config() is None:
            self.redirect("/admin/")
            return
        nonce, token = issue_state()
        self.redirect(authorization_url(nonce), [self.cookie("cengsin_oauth_state", token, STATE_TTL)])

    def handle_callback(self, query):
        code = (query.get("code") or [""])[0]
        state = (query.get("state") or [""])[0]
        expected = read_state(self.cookies().get("cengsin_oauth_state"))
        clear_state = self.cookie("cengsin_oauth_state", "", 0)
        if not code or not expected or not hmac_state(expected.get("nonce"), state):
            self.send_page(400, "登录没有完成", "登录状态已过期。请回到管理后台，重新使用 GitHub 登录。", [clear_state])
            return
        try:
            user = fetch_user(exchange_code(code))
        except Exception:
            self.send_page(400, "登录没有完成", "GitHub 没有完成本次登录。请确认 OAuth App 的回调地址是 http://127.0.0.1:8787/admin/oauth/callback ，然后重试。", [clear_state])
            return
        if not identity_allowed(user):
            login = html.escape(str(user.get("login") or "这个账号"))
            self.send_page(
                403,
                "不能进入管理后台",
                f"GitHub 账号 {login} 不能进入管理后台。只有 CengSin 可以登录，其他人都是访客。",
                [clear_state, self.cookie("cengsin_admin", "", 0)],
            )
            return
        self.redirect("/admin/", [self.cookie("cengsin_admin", issue_session(user), SESSION_TTL), clear_state])

    def handle_api(self, path, query):
        if path == "/admin/api/site" and self.command == "GET":
            self.send_json(200, {"site": load_site()})
            return
        if path == "/admin/api/site" and self.command == "PUT":
            self.write_document(lambda: save_site(self.read_json()), SITE_PATH)
            return
        if path == "/admin/api/projects" and self.command == "GET":
            self.send_json(200, {"projects": load_projects()})
            return
        if path == "/admin/api/projects" and self.command == "PUT":
            payload = self.read_json()
            projects = payload.get("projects") if isinstance(payload, dict) else payload
            self.write_document(lambda: save_projects(projects), PROJECTS_PATH)
            return
        if path == "/admin/api/posts" and self.command == "GET":
            self.send_json(200, {"posts": list_posts()})
            return
        if path == "/admin/api/post" and self.command == "GET":
            try:
                self.send_json(200, {"post": read_post_source((query.get("name") or [""])[0])})
            except ContentError as error:
                self.send_json(400, {"error": str(error)})
            return
        if path == "/admin/api/post" and self.command == "PUT":
            self.write_post(self.read_json())
            return
        if path == "/admin/api/post" and self.command == "DELETE":
            self.remove_post(self.read_json())
            return
        self.send_json(404, {"error": "没有这个管理功能"})

    def write_document(self, save, path):
        try:
            ok, message = commit_text(save, path)
        except (json.JSONDecodeError, ContentError) as error:
            self.send_json(400, {"error": str(error) or "内容格式不对"})
            return
        self.send_json(200 if ok else 400, {"message": message} if ok else {"error": message})

    def write_post(self, payload):
        previous = source = target = None
        try:
            previous, source, target = write_post_source(payload)
            ok, message = rebuild()
            if not ok:
                rollback_post(previous, source, target)
                self.send_json(400, {"error": message})
                return
        except ContentError as error:
            self.send_json(400, {"error": str(error)})
            return
        except Exception:
            if source is not None:
                rollback_post(previous, source, target)
            self.send_json(400, {"error": "文章保存失败"})
            return
        self.send_json(200, {"message": message})

    def remove_post(self, payload):
        try:
            previous, path = delete_post_source(payload.get("filename", ""))
            ok, message = rebuild()
            if not ok:
                path.write_text(previous, encoding="utf-8")
                self.send_json(400, {"error": message})
                return
        except ContentError as error:
            self.send_json(400, {"error": str(error)})
            return
        self.send_json(200, {"message": message})

    def send_site(self, path):
        candidate = site_file(path)
        if candidate is None:
            self.send_error(404)
            return
        self.send_bytes(200, candidate.read_bytes(), TYPES.get(candidate.suffix.lower(), "application/octet-stream"))

    def send_admin_file(self, name):
        path = ADMIN_DIR / name
        if not path.is_file():
            self.send_error(404)
            return
        self.send_bytes(200, path.read_bytes(), TYPES.get(path.suffix.lower(), "text/plain; charset=utf-8"), admin=True)

    def send_page(self, status, title, message, cookies=None):
        body = f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>{html.escape(title)}</title>
  <link rel="icon" href="/assets/favicon.svg">
  <link rel="stylesheet" href="/admin/admin.css">
</head>
<body>
  <main class="login-wrap">
    <section class="card login-card">
      <p class="kicker">CengSin</p>
      <h1>{html.escape(title)}</h1>
      <p>{message}</p>
      <div class="actions">
        <a class="button primary" href="/admin/">返回登录</a>
        <a class="button" href="/">回到网站</a>
      </div>
    </section>
  </main>
</body>
</html>
"""
        self.send_bytes(status, body.encode(), "text/html; charset=utf-8", cookies=cookies, admin=True)

    def send_json(self, status, payload, cookies=None):
        self.send_bytes(
            status,
            json.dumps(payload, ensure_ascii=False).encode(),
            "application/json; charset=utf-8",
            cookies=cookies,
            admin=True,
        )

    def send_bytes(self, status, body, content_type, cookies=None, admin=False):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if admin:
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("X-Robots-Tag", "noindex")
            self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' https://github.com; base-uri 'none'; form-action 'self'")
        for cookie in cookies or []:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def redirect(self, location, cookies=None):
        self.send_response(303)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.send_header("Cache-Control", "no-store")
        for cookie in cookies or []:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length < 0 or length > 1_500_000:
            raise ContentError("内容过大")
        raw = self.rfile.read(length) if length else b""
        data = json.loads(raw.decode())
        if not isinstance(data, (dict, list)):
            raise ContentError("内容格式不对")
        return data

    def cookies(self):
        found = {}
        for part in self.headers.get("Cookie", "").split(";"):
            if "=" not in part:
                continue
            key, value = part.strip().split("=", 1)
            found[key] = value
        return found

    def cookie(self, name, value, max_age):
        return f"{name}={value}; HttpOnly; SameSite=Lax; Path=/; Max-Age={max_age}"

    def session(self):
        return read_session(self.cookies().get("cengsin_admin"))

    def require_session(self):
        if self.session():
            return True
        self.send_json(401, {"error": "需要使用 GitHub 账号 CengSin 登录"})
        return False

    def same_origin(self):
        origin = self.headers.get("Origin")
        if origin and origin not in {ORIGIN, f"http://localhost:{PORT}"}:
            return False
        return self.headers.get("X-Admin") == "1"

    def log_message(self, fmt, *args):
        redacted = []
        for arg in args:
            if isinstance(arg, str):
                redacted.append(re.sub(r"(code|state|client_secret)=[^&\s]+", r"\1=redacted", arg))
            else:
                redacted.append(arg)
        super().log_message(fmt, *redacted)


def hmac_state(expected, actual):
    if not isinstance(expected, str) or not isinstance(actual, str) or len(expected) != len(actual):
        return False
    return hmac.compare_digest(expected, actual)


def site_file(url_path):
    rel = urllib.parse.unquote(url_path.split("?", 1)[0])
    if rel in {"", "/"}:
        rel = "/index.html"
    elif rel.endswith("/"):
        rel += "index.html"
    if "\\" in rel or rel.startswith("//"):
        return None
    root = DIST.resolve()
    candidate = (DIST / rel.lstrip("/")).resolve()
    if candidate != root and root not in candidate.parents:
        return None
    if candidate.is_dir():
        candidate = candidate / "index.html"
    if candidate.is_file():
        return candidate
    return None


def main():
    if not (DIST / "index.html").exists():
        ok, message = rebuild()
        if not ok:
            raise SystemExit(message)
    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
        server.daemon_threads = True
    except OSError as error:
        raise SystemExit(f"无法在 {ORIGIN} 启动。如果管理后台已经开着，先停掉它。\n{error}") from error
    print(f"网站预览  {ORIGIN}/")
    print(f"管理后台  {ORIGIN}/admin/")
    print("只有 GitHub 账号 CengSin 可以登录。保存只更新本地预览，不会推送。")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
