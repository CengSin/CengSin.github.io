"""GitHub login for the local admin. Only CengSin's account is accepted."""

import base64
import hashlib
import hmac
import json
import re
import secrets
import time
import urllib.parse
import urllib.request
from pathlib import Path

ALLOWED_GITHUB_ID = 23357893
ALLOWED_GITHUB_LOGIN = "CengSin"
HOST = "127.0.0.1"
PORT = 8787
ORIGIN = f"http://{HOST}:{PORT}"
CALLBACK_PATH = "/admin/oauth/callback"
SESSION_TTL = 12 * 60 * 60
STATE_TTL = 10 * 60

REPO = Path(__file__).resolve().parents[2]
LOCAL = REPO / ".local"
SECRET_PATH = LOCAL / "admin-session.key"
OAUTH_PATH = LOCAL / "admin-oauth.json"
CLIENT_RE = re.compile(r"^[A-Za-z0-9._-]{8,100}$")


def identity_allowed(user):
    if not isinstance(user, dict):
        return False
    try:
        uid = int(user.get("id"))
    except (TypeError, ValueError):
        return False
    return uid == ALLOWED_GITHUB_ID and user.get("login") == ALLOWED_GITHUB_LOGIN


def secret():
    LOCAL.mkdir(parents=True, exist_ok=True)
    if not SECRET_PATH.exists():
        SECRET_PATH.write_bytes(secrets.token_bytes(32))
        SECRET_PATH.chmod(0o600)
    return SECRET_PATH.read_bytes()


def sign(payload):
    raw = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    ).decode().rstrip("=")
    signature = hmac.new(secret(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{signature}"


def unsign(token):
    if not isinstance(token, str) or token.count(".") != 1:
        return None
    raw, signature = token.split(".", 1)
    expected = hmac.new(secret(), raw.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4)))
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(payload, dict) or int(payload.get("exp", 0)) < time.time():
        return None
    return payload


def issue_session(user):
    if not identity_allowed(user):
        raise PermissionError("denied")
    return sign({
        "kind": "session",
        "uid": ALLOWED_GITHUB_ID,
        "login": ALLOWED_GITHUB_LOGIN,
        "exp": int(time.time()) + SESSION_TTL,
    })


def read_session(token):
    payload = unsign(token)
    if not payload or payload.get("kind") != "session":
        return None
    if payload.get("uid") != ALLOWED_GITHUB_ID or payload.get("login") != ALLOWED_GITHUB_LOGIN:
        return None
    return payload


def issue_state():
    nonce = secrets.token_urlsafe(24)
    token = sign({"kind": "state", "nonce": nonce, "exp": int(time.time()) + STATE_TTL})
    return nonce, token


def read_state(token):
    payload = unsign(token)
    if not payload or payload.get("kind") != "state" or not payload.get("nonce"):
        return None
    return payload


def oauth_config():
    if not OAUTH_PATH.is_file():
        return None
    try:
        data = json.loads(OAUTH_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    client_id = data.get("client_id")
    client_secret = data.get("client_secret")
    if not isinstance(client_id, str) or not isinstance(client_secret, str):
        return None
    if not CLIENT_RE.fullmatch(client_id) or not valid_secret(client_secret):
        return None
    return {"client_id": client_id, "client_secret": client_secret}


def valid_secret(value):
    return isinstance(value, str) and re.fullmatch(r"\S{8,200}", value) is not None


def save_oauth(client_id, client_secret):
    client_id = client_id.strip()
    client_secret = client_secret.strip()
    if not CLIENT_RE.fullmatch(client_id) or not valid_secret(client_secret):
        raise ValueError("GitHub OAuth 的 Client ID 或 Client Secret 格式不对")
    LOCAL.mkdir(parents=True, exist_ok=True)
    OAUTH_PATH.write_text(
        json.dumps({"client_id": client_id, "client_secret": client_secret}) + "\n",
        encoding="utf-8",
    )
    OAUTH_PATH.chmod(0o600)


def authorization_url(nonce):
    config = oauth_config()
    if not config:
        raise RuntimeError("还没有配置 GitHub 登录")
    query = urllib.parse.urlencode({
        "client_id": config["client_id"],
        "redirect_uri": ORIGIN + CALLBACK_PATH,
        "scope": "read:user",
        "state": nonce,
        "allow_signup": "false",
    })
    return "https://github.com/login/oauth/authorize?" + query


def exchange_code(code):
    config = oauth_config()
    if not config:
        raise RuntimeError("还没有配置 GitHub 登录")
    body = urllib.parse.urlencode({
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "code": code,
        "redirect_uri": ORIGIN + CALLBACK_PATH,
    }).encode()
    request = urllib.request.Request(
        "https://github.com/login/oauth/access_token",
        data=body,
        headers={"Accept": "application/json", "User-Agent": "cengsin-admin"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode())
    token = payload.get("access_token")
    if not token:
        description = payload.get("error_description") or payload.get("error") or "GitHub 没有返回登录凭证"
        raise RuntimeError(str(description))
    return token


def fetch_user(token):
    request = urllib.request.Request(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "cengsin-admin",
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        user = json.loads(response.read().decode())
    if not isinstance(user, dict):
        raise RuntimeError("GitHub 没有返回账号资料")
    return user
