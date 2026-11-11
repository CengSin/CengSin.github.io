#!/usr/bin/env python3
"""Edit repository content from the command line instead of an admin backend.

    python3 site/src/content.py books
    python3 site/src/content.py weread [--reviews]
    python3 site/src/content.py add-book --title 书名 --line "一句感想" [--year 2026] [--group 系列名] [--tone b-teal]
    python3 site/src/content.py remove-book --title 书名

`weread` needs WEREAD_API_KEY in the environment. It only lists books that are
finished and not marked private in WeChat Reading, and it writes the candidates
to .local/weread/, which is ignored by Git. Nothing from WeChat Reading reaches
the public site until someone runs add-book with a line written by a person.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

from content_store import BOOKSHOP_PATH, REPO, TONES, ContentError, load_json, validate_bookshop, write_json

GATEWAY = "https://i.weread.qq.com/api/agent/gateway"
SKILL_VERSION = "1.0.5"
CANDIDATES = REPO / ".local" / "weread" / "candidates.json"
INK_TONES = {"b-cream", "b-stone"}


def norm(title):
    title = re.sub(r"[（(【\[].*?[）)】\]]", "", title)
    title = re.split(r"[：:—]", title)[0]
    return re.sub(r"\s+", "", title).lower()


def weread(api, **params):
    key = os.environ.get("WEREAD_API_KEY", "")
    if not key:
        raise SystemExit("缺少 WEREAD_API_KEY。先执行 export WEREAD_API_KEY=wrk-…，不要把它写进仓库。")
    body = json.dumps({"api_name": api, **params, "skill_version": SKILL_VERSION}).encode()
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": "curl/8.5.0", "Accept": "*/*"}
    request = urllib.request.Request(GATEWAY, data=body, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        raise SystemExit(f"微信读书接口返回 HTTP {error.code}：{error.read().decode('utf-8', 'replace')[:200]}")
    if data.get("upgrade_info"):
        raise SystemExit("微信读书接口要求升级 skill：" + str(data["upgrade_info"].get("message", "")))
    if data.get("errcode"):
        raise SystemExit(f"微信读书接口报错：{data.get('errcode')} {data.get('errmsg', '')}")
    return data


def whole_book_review(book_id):
    data = weread("/review/list/mine", bookId=book_id)
    reviews = [item.get("review", {}) for item in data.get("reviews", [])]
    whole = [r for r in reviews if not r.get("abstract") and not r.get("chapterName") and r.get("content")]
    if not whole:
        return ""
    return max(whole, key=lambda r: len(r["content"]))["content"].strip()


def cmd_books(_args):
    shop = load_json(BOOKSHOP_PATH)
    for i, book in enumerate(shop["books"], 1):
        print(f"{i:>2}. {book['title']}（{book.get('year', '')}）{book['line']}")


def cmd_weread(args):
    shop = load_json(BOOKSHOP_PATH)
    shelved = {norm(book["title"]) for book in shop["books"]}
    data = weread("/shelf/sync")
    finished = [b for b in data.get("books", []) if b.get("finishReading") == 1 and b.get("secret") == 0]
    candidates = []
    for book in sorted(finished, key=lambda b: -(b.get("readUpdateTime") or 0)):
        key = norm(book.get("title", ""))
        if not key or any(key in s or s in key for s in shelved):
            continue
        stamp = book.get("readUpdateTime") or 0
        item = {
            "bookId": book.get("bookId"),
            "title": book.get("title", "").strip(),
            "short": re.split(r"[（(：:]", book.get("title", ""))[0].strip(),
            "author": book.get("author", ""),
            "year": datetime.fromtimestamp(stamp, timezone.utc).strftime("%Y") if stamp else "",
            "last_read": datetime.fromtimestamp(stamp, timezone.utc).strftime("%Y-%m-%d") if stamp else "",
            "suggested_line": "",
        }
        if args.reviews and item["bookId"]:
            item["suggested_line"] = whole_book_review(item["bookId"])
        candidates.append(item)
    CANDIDATES.parent.mkdir(parents=True, exist_ok=True)
    CANDIDATES.write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(CANDIDATES, 0o600)
    print(f"读完且公开、还没上架的书：{len(candidates)} 本（私密阅读的书已跳过）。")
    for i, item in enumerate(candidates, 1):
        hint = f"\n      你的点评：{item['suggested_line']}" if item["suggested_line"] else ""
        print(f"{i:>2}. {item['short']} · {item['author']} · 最近阅读 {item['last_read']}{hint}")
    print(f"候选清单只保存在本机：{CANDIDATES}")


def spine_size(title):
    units = sum(1 if ord(ch) > 0x2e80 else .55 for ch in title)
    return int(min(240, max(160, 120 + units * 16))), int(min(48, max(32, 30 + units * 2)))


def cmd_add(args):
    shop = load_json(BOOKSHOP_PATH)
    title = args.title.strip()
    if any(norm(b["title"]) == norm(title) for b in shop["books"]):
        raise SystemExit(f"「{title}」已经在书架上了。")
    if len(title) > 10:
        print(f"提醒：书脊上的书名最好在 10 个字以内，「{title}」可能显示不全。", file=sys.stderr)
    tone = args.tone or [t for t in TONES if t not in INK_TONES][len(shop["books"]) % 5]
    h, w = spine_size(title)
    book = {"title": title, "line": args.line.strip(), "tone": tone, "h": h, "w": w, "year": args.year}
    if tone in INK_TONES:
        book["ink"] = True
    if args.group:
        book["group"] = args.group
    book["cite"] = args.cite if args.cite is not None else f"读完于 {args.year} 年"
    shop["books"].append(book)
    validate_bookshop(shop)
    write_json(BOOKSHOP_PATH, shop)
    print(f"已上架「{title}」，现在书架上有 {len(shop['books'])} 本。")


def cmd_remove(args):
    shop = load_json(BOOKSHOP_PATH)
    kept = [b for b in shop["books"] if norm(b["title"]) != norm(args.title)]
    if len(kept) == len(shop["books"]):
        raise SystemExit(f"书架上没有「{args.title}」。")
    shop["books"] = kept
    validate_bookshop(shop)
    write_json(BOOKSHOP_PATH, shop)
    print(f"已从书架取下「{args.title}」。")


def main():
    parser = argparse.ArgumentParser(description="管理站点内容")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("books", help="列出书架上的书").set_defaults(run=cmd_books)
    p = sub.add_parser("weread", help="从微信读书找读完且公开、还没上架的书")
    p.add_argument("--reviews", action="store_true", help="同时取你在这本书上写的整本书评，作为感想的参考")
    p.set_defaults(run=cmd_weread)
    p = sub.add_parser("add-book", help="把一本书放上书架")
    p.add_argument("--title", required=True)
    p.add_argument("--line", required=True, help="一句感想，会公开显示")
    p.add_argument("--year", default=str(datetime.now().year))
    p.add_argument("--group", default="")
    p.add_argument("--cite", default=None, help="书下方的小字，默认是「读完于 某年」")
    p.add_argument("--tone", choices=TONES)
    p.set_defaults(run=cmd_add)
    p = sub.add_parser("remove-book", help="把一本书从书架取下")
    p.add_argument("--title", required=True)
    p.set_defaults(run=cmd_remove)
    args = parser.parse_args()
    try:
        args.run(args)
    except ContentError as error:
        raise SystemExit(str(error))


if __name__ == "__main__":
    main()
