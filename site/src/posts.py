"""Render archived Hugo Markdown with its original public article URLs."""

import json
import re
import shutil
from datetime import datetime
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

from markdown_it import MarkdownIt


# Hugo's Chinese slug generation is not reversible from the file name alone.
LEGACY_SLUGS = {
    "2025_content.md": "2025_content",
    "2025_content_ai.md": "2025_content_ai",
    "Go语言实现的APNs推送服务：一次稳定性问题的排查与优化实录.md": "go语言实现的apns推送服务一次稳定性问题的排查与优化实录",
    "Non_negative_Integers_without_Consecutive_Ones.md": "non_negative_integers_without_consecutive_ones",
    "implement_rand10_use_rand7.md": "implement_rand10_use_rand7",
    "my-first-post.md": "my-first-post",
    "number_of_boomerangs.md": "number_of_boomerangs",
    "什么才是传统互联网公司进入AI时代的敲门砖.md": "什么才是传统互联网公司进入ai时代的敲门砖",
    "从Golang后端到AI指挥官：我与Agent深度协作的48小时实录.md": "从golang后端到ai指挥官我与agent深度协作的48小时实录",
    "从小米YU7爆火看如今国内的品牌现状.md": "从小米yu7爆火看如今国内的品牌现状",
    "🧶-代理社会的黎明.md": "-代理社会的黎明",
}

MARKDOWN = MarkdownIt("commonmark", {"html": False}).enable("table")


def read_post(path):
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError(f"missing front matter: {path}")
    header, separator, body = text[4:].partition("\n---\n")
    if not separator:
        raise ValueError(f"unclosed front matter: {path}")
    meta = {}
    for line in header.splitlines():
        key, _, value = line.partition(":")
        if not _:
            continue
        value = value.strip()
        if value.startswith(('"', "[")):
            value = json.loads(value)
        meta[key.strip()] = value
    # The earlier site excluded this project from the public profile.
    body = body.replace("易搜(yisou.xin)", "一个实验项目")
    body = body.replace("易搜（yisou.xin）", "一个实验项目")
    slug = LEGACY_SLUGS.get(path.name, meta.get("slug"))
    if not slug or (path.name not in LEGACY_SLUGS and not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug)):
        raise ValueError(f"new post needs an ASCII slug in front matter: {path}")
    return {
        "title": meta.get("title", path.stem),
        "date": meta.get("date", ""),
        "tags": meta.get("tags", []),
        "categories": meta.get("categories", []),
        "draft": meta.get("draft", "false") == "true",
        "body": body,
        "slug": slug,
    }


def post_url(post):
    return f"/posts/{post['slug']}/"


def article(post, layout, esc):
    date = str(post["date"])[:10]
    body = MARKDOWN.render(post["body"])
    main = f"""
      <article class="page narrow article-page">
        <p class="page-kicker micro"><a href="/posts/">文章</a></p>
        <h1>{esc(post['title'])}</h1>
        <p class="article-date"><time datetime="{esc(date)}">{esc(date)}</time></p>
        <div class="prose article-prose">{body}</div>
        <p class="article-back"><a href="/posts/">← 返回文章列表</a></p>
      </article>"""
    return layout(f"{post['title']} · CengSin", post["title"], "posts", main)


def listing(title, posts, layout, esc):
    rows = "".join(
        f'<li><a href="{esc(post_url(post))}"><span>{esc(str(post["date"])[:10])}</span><strong>{esc(post["title"])}</strong></a></li>'
        for post in posts
    )
    main = f"""
      <div class="page narrow">
        <p class="page-kicker micro">Writing</p>
        <h1>{esc(title)}</h1>
        <ul class="post-list">{rows}</ul>
      </div>"""
    return layout(f"{title} · CengSin", title, "posts", main)


def rss(posts):
    items = []
    for post in posts:
        url = "https://cengsin.is-a.dev" + post_url(post)
        date = format_datetime(datetime.fromisoformat(str(post["date"])))
        items.append(
            f"<item><title>{xml_escape(post['title'])}</title>"
            f"<link>{xml_escape(url)}</link><guid>{xml_escape(url)}</guid>"
            f"<pubDate>{date}</pubDate></item>"
        )
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<rss version="2.0"><channel><title>CengSin 文章</title>'
        '<link>https://cengsin.is-a.dev/posts/</link>'
        '<description>CengSin 的文章归档</description>'
        + "".join(items) + '</channel></rss>\n'
    )


def build_posts(source, images, dist, layout, write, esc):
    files = [
        path for path in source.glob("*.md")
        if path.name in LEGACY_SLUGS or path.read_text(encoding="utf-8").startswith("---\n")
    ]
    posts = [read_post(path) for path in files]
    slugs = [post["slug"] for post in posts]
    if len(slugs) != len(set(slugs)):
        raise ValueError("duplicate article URL slug")
    posts.sort(key=lambda post: post["date"], reverse=True)
    for post in posts:
        if post["draft"]:
            if post["slug"] == "my-first-post":
                # Keep the historical URL without publishing the draft body.
                write(
                    "posts/my-first-post/index.html",
                    layout("文章 · CengSin", "文章归档", "posts", '<div class="page"><p>这篇文章尚未发布。<a href="/posts/">查看文章列表</a></p></div>'),
                )
            continue
        write(f"posts/{post['slug']}/index.html", article(post, layout, esc))
    listed = [post for post in posts if not post["draft"]]
    write("posts/index.html", listing("文章", listed, layout, esc))
    write("posts/index.xml", rss(listed))
    write("index.xml", rss(listed))
    for group, field in (("tags", "tags"), ("categories", "categories")):
        values = sorted({value for post in listed for value in post[field]})
        write(f"{group}/index.html", listing("标签" if group == "tags" else "分类", listed, layout, esc))
        for value in values:
            slug = value.lower().replace(" ", "-")
            selected = [post for post in listed if value in post[field]]
            write(f"{group}/{slug}/index.html", listing(value, selected, layout, esc))
    # An old Hugo route pointed to its source directory instructions.
    write("posts/readme/index.html", layout("文章 · CengSin", "文章归档", "posts", '<div class="page"><p><a href="/posts/">查看文章列表</a></p></div>'))
    (dist / "images").mkdir(parents=True)
    for image in images.glob("*"):
        if image.is_file():
            shutil.copy2(image, dist / "images" / image.name)
    return len(posts)
