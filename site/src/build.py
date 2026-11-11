#!/usr/bin/env python3
"""Generate the CengSin static site into dist/."""

import html
import json
import shutil
import subprocess
from pathlib import Path
from urllib.parse import quote

from markdown_it import MarkdownIt

from content_store import forbidden_hits, load_bookshop, load_site, resolve_href
from city import build_city
from posts import build_posts, excerpt, load_posts, post_url
from projects import PROJECTS

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
DIST = ROOT / "dist"
OUT = DIST
SITE = load_site()
IDENTITY = SITE["identity"]
LINKS = SITE["links"]
WHO = IDENTITY["who"]
INTRO = IDENTITY["intro"]
TAGLINE = IDENTITY["tagline"]
BACKGROUND = IDENTITY["background"]
ABOUT = IDENTITY["about"]
WORKS_URL = LINKS["works_url"]
IDEA_PLATFORM_URL = LINKS["idea_platform_url"]
MOOD_URL = LINKS["mood_url"]
EMAIL = IDENTITY["email"]
GITHUB = IDENTITY["github"]
PROMPT = SITE["prompt"]
BY_SLUG = {item["slug"]: item for item in PROJECTS}
RESUME_MD = MarkdownIt("commonmark", {"html": False}).enable("table")
THEME_BOOTSTRAP = """(function () {
  try {
    var theme = localStorage.getItem('cengsin-theme');
    if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  } catch (error) {}
})();"""
FRONTEND_CSS = ""
CITY = {}
BOOKSHOP = load_bookshop()
POSTS = []
CRUMBS = {"projects": "城市名录", "posts": "书店", "about": "关于", "agent": "智能体", "resume": "简历"}


def esc(value):
    return html.escape(str(value), quote=True)


def inline(nodes):
    parts = []
    for node in nodes:
        if isinstance(node, str):
            parts.append(esc(node))
            continue
        label, href = node
        parts.append(f'<a href="{esc(href)}"{external(href)}>{esc(label)}</a>')
    return "".join(parts)


def blocks(items):
    out = []
    for item in items:
        kind = item[0]
        if kind == "p":
            out.append(f"<p>{inline(item[1:])}</p>")
        elif kind == "ul":
            lis = "".join(f"<li>{inline(li) if isinstance(li, list) else esc(li)}</li>" for li in item[1])
            out.append(f"<ul>{lis}</ul>")
        else:
            raise ValueError(kind)
    return "".join(out)


def external(href):
    if href.startswith("http"):
        return ' target="_blank" rel="noopener noreferrer"'
    return ""


def visible_nav():
    resume = SITE["resume"]
    items = []
    for item in SITE["nav"]:
        if not item.get("enabled", True):
            continue
        href = resolve_href(item["href"], SITE)
        if not resume.get("enabled") and (item.get("key") == "resume" or href.rstrip("/") == "/resume"):
            continue
        items.append({**item, "href": href})
    if resume.get("enabled") and resume.get("show_in_nav") and not any(item.get("key") == "resume" for item in items):
        items.append({"href": "/resume", "label": resume.get("nav_label") or "简历", "key": "resume", "enabled": True})
    return items


def touchbar(current):
    keys = []
    for item in visible_nav():
        current_attr = ' aria-current="page"' if item["key"] == current else ""
        keys.append(f'<a class="tb" href="{esc(item["href"])}"{external(item["href"])}{current_attr}>{esc(item["label"])}</a>')
    return f"""
  <nav class="touchbar" aria-label="主导航">
    <a class="tb esc" href="/" aria-label="回到首页">CS</a>
    <span class="tb-sep" aria-hidden="true"></span>
    <span style="display:contents">{''.join(keys)}</span>
    <span class="tb-sep" aria-hidden="true"></span>
    <button class="tb tb-theme" type="button" data-theme-toggle aria-label="切换深浅色">◐</button>
    <button class="tb tb-toggle" type="button" id="view-toggle" aria-pressed="false" aria-label="切换到 Agent 看到的版本"><span>人</span><span>Agent</span></button>
  </nav>"""


def footer():
    links = []
    for item in SITE["footer"]:
        href = resolve_href(item["href"], SITE)
        if not SITE["resume"].get("enabled") and href.rstrip("/") == "/resume":
            continue
        links.append(f'<a href="{esc(href)}"{external(href)}>{esc(item["label"])}</a>')
    fetched = CITY.get("fetched") or ""
    note = f" · 图纸状态取自 Idea Platform，{fetched}" if fetched else ""
    return f"""
  <footer class="site-footer">
    <span>{esc(SITE["brand"])}{esc(note)}</span>
    <span class="footer-links">{''.join(links)}</span>
  </footer>"""


def chrome_tail(home):
    panel = """
  <aside class="panel" id="panel" hidden aria-labelledby="p-title">
    <button class="x" type="button" aria-label="关闭">×</button>
    <p class="p-kicker" data-p="kicker"></p>
    <h2 id="p-title" data-p="title"></h2>
    <dl data-p="body"></dl>
    <div class="p-links" data-p="links"></div>
  </aside>""" if home else ""
    return f"""{panel}
  <aside class="md" id="md" hidden aria-label="Agent 看到的版本">
    <header><span>profile.md · Agent 看到的图纸</span><button type="button" id="md-copy">复制给 Agent</button></header>
    <pre id="md-text">正在读取 /agent/profile.md …</pre>
  </aside>
  <canvas id="crayon" aria-hidden="true"></canvas>
  <div class="toast" id="toast" hidden role="status"></div>"""


def layout(title, description, current, main, crumb=None, html_class=""):
    home = current == "home"
    crumb = crumb or CRUMBS.get(current, "")
    top = "" if home else f"""
  <header class="topline"><a class="brand" href="/">CengSin</a><span aria-hidden="true">/</span><span>{esc(crumb)}</span></header>"""
    body = main if home else f'\n  <main id="main" class="wrap">{main}\n  </main>'
    return f"""<!doctype html>
<html lang="zh-CN"{f' class="{html_class}"' if html_class else ""}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#0a2150">
  <meta name="description" content="{esc(description)}">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://cengsin.is-a.dev/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://cengsin.is-a.dev/assets/og.png">
  <title>{esc(title)}</title>
  <script>{THEME_BOOTSTRAP}</script>
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="stylesheet" href="/assets/app/{FRONTEND_CSS}">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="alternate" type="application/rss+xml" title="CengSin 文章" href="/index.xml">
</head>
<body class="{'home' if home else 'inner'}" data-page="{esc(current)}" data-idea-platform="{esc(IDEA_PLATFORM_URL)}">
  <a class="skip-link" href="#main">跳到主要内容</a>{top}{body}
  {footer()}
  {touchbar(current)}
  {chrome_tail(home)}
  <script src="/assets/site.js" defer></script>
  <script type="module" src="/assets/app/app.js"></script>
</body>
</html>
"""


def thesis_html(hero):
    text = esc(hero["thesis"]).replace("，", "，<br>", 1)
    mark = esc(hero.get("mark", ""))
    if mark:
        text = text.replace(mark, f"<em>{mark}</em>", 1)
    return text


def first_sentence(text):
    text = str(text or "").strip()
    cut = text.find("。")
    return text if cut < 0 else text[:cut + 1]


def atlas_html(city, fold=True, limit=10):
    groups = [(f"已经落地 · {len(city['built'])}", city["built"])]
    hanging = {}
    for d in city["hanging"]:
        hanging.setdefault(d["status"], []).append(d)
    groups.extend((f"{status} · {len(items)}", items) for status, items in hanging.items())
    if city["sky"]:
        groups.append((f"还在天上 · {len(city['sky'])}", city["sky"]))
    n = 0
    parts = []
    for title, items in groups:
        head_extra = " extra" if n >= limit else ""
        rows = []
        for item in items:
            extra = ' class="extra"' if n >= limit else ""
            n += 1
            built = item["kind"] == "built"
            arch = item["arch"] if built else item["status"]
            tone = f' style="--c:var(--{esc(item["tone"])})"' if built else ""
            badge = f'<span class="lg-st">{esc(item["status"])}</span>' if built and item["status"] != "已落地" else ""
            rows.append(
                f'<li{extra}><a class="lg {esc(item["kind"])}" href="{esc(item["href"])}"{external(item["href"])} data-id="{esc(item["id"])}"{tone}>'
                f'<span class="n">{n}</span><span class="lg-arch">{esc(arch)}</span><span class="lg-name">{esc(item["name"])}</span>{badge}</a></li>'
            )
        parts.append(f'<p class="legend-group{head_extra}">{esc(title)}</p><ol class="legend-list" start="{n - len(items) + 1}">{"".join(rows)}</ol>')
    hidden = max(0, n - limit)
    button = f'<button class="legend-more" type="button" hidden aria-expanded="true" data-more="展开图例（还有 {hidden} 项）" data-less="收起图例">收起图例</button>' if hidden else ""
    return f"""
      <div class="atlas" data-atlas data-fold="{'true' if fold else 'false'}">
        <div class="atlas-map"></div>
        <div class="legend">{''.join(parts)}{button}</div>
      </div>"""


def city_counts(city):
    parts = [f'<span><b>{len(city["built"])}</b><span class="k">件已经落地</span></span>']
    counts = {}
    for d in city["hanging"]:
        counts[d["status"]] = counts.get(d["status"], 0) + 1
    for status, n in counts.items():
        label = "件正在吊装" if status == "实现中" else f"张图纸{status}"
        parts.append(f'<span><b>{n}</b><span class="k">{esc(label)}</span></span>')
    parts.append(f'<span><b>{len(city["sky"])}</b><span class="k">张图纸还在天上</span></span>')
    return "".join(parts)


def spine_for_post(post, index):
    meta = BOOKSHOP.get("spines", {}).get(post["slug"], {})
    tones = ["b-blue", "b-brick", "b-teal", "b-plum", "b-yellow"]
    short = meta.get("short") or post["title"].split("：")[0][:14]
    tone = meta.get("tone") or tones[index % len(tones)]
    line = meta.get("blurb") or excerpt(post)
    date = str(post["date"])[:10]
    units = sum(1 if ord(ch) > 0x2e80 else .55 for ch in short)
    height = int(min(250, max(170, 64 + units * 15.5)))
    width = 46 if units > 11 else 40
    ink = " ink" if meta.get("ink") else ""
    return (
        f'<button class="spine{ink}" type="button" aria-pressed="false" data-kind="write" data-title="{esc(post["title"])}" '
        f'data-line="{esc(line)}" data-date="{esc(date)}" data-href="{esc(post_url(post))}" '
        f'style="--c:var(--{esc(tone)});--h:{height}px;--w:{width}px"><span>{esc(short)}</span><small>{esc(date[:4])}</small></button>'
    )


def shop_html(posts):
    shop = BOOKSHOP
    books = shop["books"]
    read = []
    for i, book in enumerate(books):
        lean = " lean" if i == len(books) - 1 else ""
        ink = " ink" if book.get("ink") else ""
        read.append(
            f'<button class="spine{lean}{ink}" type="button" aria-pressed="false" data-kind="read" data-title="{esc(book["title"])}" '
            f'data-line="{esc(book["line"])}" data-cite="{esc(book.get("cite") or shop["read_cite"])}" data-group="{esc(book.get("group", ""))}" data-year="{esc(book.get("year", ""))}" '
            f'style="--c:var(--{esc(book["tone"])});--h:{int(book["h"])}px;--w:{int(book["w"])}px">{esc(book["title"])}</button>'
        )
    write = [spine_for_post(post, i) for i, post in enumerate(posts)]
    first = books[0]
    years = sorted({str(p["date"])[:4] for p in posts})
    span = f"{years[0]}—{years[-1]}" if years else ""
    return f"""
        <div class="shop" data-shop>
          <div class="shelves">
            <div>
              <p class="shelf-label"><span>{esc(shop["read_label"])}</span><span>{len(books)} 本</span></p>
              <div class="shelf">{''.join(read)}</div>
              <p class="shelf-cap">{esc(shop["read_caption"])}</p>
            </div>
            <div>
              <p class="shelf-label"><span>{esc(shop["write_label"])} · {esc(span)}</span><a href="{esc(MOOD_URL)}" target="_blank" rel="noopener noreferrer">{esc(shop["write_note"])} ↗</a></p>
              <div class="shelf">{''.join(write)}</div>
            </div>
          </div>
          <article class="reader" aria-live="polite">
            <p class="r-kicker">读过的{(" · " + esc(first["year"])) if first.get("year") else ""}</p><h3>{esc(first["title"])}</h3><blockquote>{esc(first["line"])}</blockquote><p class="src">{esc(first.get("cite") or shop["read_cite"])}</p>
          </article>
        </div>"""


def city_json():
    return json.dumps(CITY, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")


def home():
    hero = CITY["hero"]
    reg = CITY["registry"]
    form = CITY["sky_form"]
    listed = [post for post in POSTS if not post["draft"]]
    main = f"""
  <div class="descent" id="descent">
    <div class="stage">
      <svg id="world" role="img" aria-label="想象之城：天上是还没落地的想法图纸，地上是已经做出来的作品" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="hero">
        <p class="eyebrow">{esc(hero["eyebrow"])}</p>
        <h1>{thesis_html(hero)}</h1>
        <p class="lede">{esc(hero["lede"])}</p>
      </div>
      <p class="hint"><span>{esc(hero["hint"])}</span></p>
      <p class="citycap" aria-hidden="true">{city_counts(CITY)}</p>
    </div>
  </div>
  <main id="main">
    <section class="sec" id="registry" aria-labelledby="registry-title">
      <div class="sec-head">
        <p class="eyebrow">{esc(reg["eyebrow"])}</p>
        <h2 id="registry-title">{esc(reg["title"])}</h2>
        <p>{esc(reg["lede"])}</p>
      </div>
      {atlas_html(CITY)}
    </section>
    <section class="sec" id="books" aria-labelledby="books-title">
      <div class="sec-head">
        <p class="eyebrow">{esc(BOOKSHOP["eyebrow"])}</p>
        <h2 id="books-title">{esc(BOOKSHOP["title"])}</h2>
      </div>{shop_html(listed)}
      <p class="sec-more"><a href="/posts/">走进书店，看全部文章 →</a></p>
    </section>
    <section class="sec" id="ideas" aria-labelledby="ideas-title">
      <div class="sec-head">
        <p class="eyebrow">{esc(form["eyebrow"])}</p>
        <h2 id="ideas-title">{esc(form["title"])}</h2>
      </div>
      <form class="idea-form" id="idea-form">
        <label class="sr" for="idea-input">你的想法</label>
        <input id="idea-input" maxlength="20" autocomplete="off" placeholder="{esc(form["placeholder"])}">
        <button class="btn" type="submit">{esc(form["button"])}</button>
      </form>
      <p class="fine">{esc(form["note_before"])}<a href="{esc(IDEA_PLATFORM_URL)}" target="_blank" rel="noopener noreferrer">{esc(form["note_link"])}</a></p>
    </section>
  </main>
  <script type="application/json" id="city-data">{city_json()}</script>"""
    return layout(SITE["site_title"], WHO, "home", main)


def projects_page():
    page = SITE["projects_page"]
    reg = CITY["registry"]
    main = f"""
    <div class="page">
      <header class="page-head">
        <p class="eyebrow">{esc(reg["eyebrow"])}</p>
        <h1>{esc(reg["title"])}</h1>
        <p class="lede">新的作品在 Idea Platform 上持续更新，每次构建，城里就会多出新盖好的楼。</p>
      </header>
      <p class="portal">
        <a class="button" href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">{esc(page["portal_action"])}</a>
        <a class="button secondary" href="{esc(IDEA_PLATFORM_URL)}" target="_blank" rel="noopener noreferrer">{esc(page["platform_label"])}</a>
      </p>
      {atlas_html(CITY, fold=False)}
    </div>
    <script type="application/json" id="city-data">{city_json()}</script>"""
    return layout(f"{page['title']} · {SITE['brand']}", page["description"], "projects", main)


def building_of(slug):
    return next((b for b in CITY["built"] if b["id"] == slug), None)


def project_page(project):
    b = building_of(project["slug"])
    links = "".join(f'<li><a href="{esc(href)}"{external(href)}>{esc(label)} ↗</a></li>' for label, href in project["links"])
    sections = "".join(f"<section><h2>{esc(title)}</h2>{blocks(content)}</section>" for title, content in project["sections"])
    related = [f'<li><a href="/projects/{slug}">{esc(BY_SLUG[slug]["name"])}</a></li>' for slug in project["related"]]
    related_html = f'<aside class="related"><h2>相邻的楼</h2><ul>{"".join(related)}</ul></aside>' if related else ""
    if b:
        kicker = f'{b["arch"]} · {b["status"]}'
        lot = f'<div class="lot" data-type="{esc(b["type"])}" data-tone="{esc(b["tone"])}" data-label="{esc(b["arch"])}：{esc(project["name"])}"><span class="lot-tag">{esc(b["arch"])}</span></div>'
        facts = (
            (f'<div><dt>原来的想法</dt><dd class="q">{esc(b["idea"])}</dd></div>' if b["idea"] else "")
            + f'<div><dt>拿出来之后</dt><dd>{esc(b["made"])}</dd></div>'
            + (f'<div><dt>我做的取舍</dt><dd>{esc(b["trade"])}</dd></div>' if b["trade"] else "")
            + f'<div><dt>材料</dt><dd>{esc(project["stack"])}</dd></div>'
        )
    else:
        kicker = f'{project["number"]} · {project["kind"]}'
        lot = ""
        facts = f'<div><dt>做成了什么</dt><dd>{esc(project["summary"])}</dd></div><div><dt>材料</dt><dd>{esc(project["stack"])}</dd></div>'
    main = f"""
    <article class="page">
      <div class="building">
        <header class="page-head">
          <p class="eyebrow">{esc(kicker)}</p>
          <h1>{esc(project["name"])}</h1>
          <p class="lede">{esc(project["problem"])}</p>
        </header>
        {lot}
      </div>
      <dl class="facts">{facts}</dl>
      <ul class="entry-links">{links}</ul>
      <div class="prose">{sections}</div>
      {related_html}
      <p class="source-note">{esc(project["source"])} · <a href="/projects">回到城市名录</a></p>
    </article>"""
    return layout(f"{project['name']} · CengSin", project["problem"], "projects", main)


def about_page():
    page = SITE["about_page"]
    principles = "".join(f"<li><span>0{i + 1}</span>{esc(x)}</li>" for i, x in enumerate(SITE["about_page"].get("principles", [])))
    stack = "".join(f"<li>{esc(x)}</li>" for x in SITE["about_page"].get("stack", []))
    keywords = "".join(f"<li>{esc(word)}</li>" for word in IDENTITY["keywords"])
    extra_html = "".join(f"<p>{esc(paragraph)}</p>" for paragraph in page["extra_paragraphs"])
    github_text = GITHUB.removeprefix("https://").removeprefix("http://")
    main = f"""
    <article class="page narrow">
      <header class="page-head">
        <p class="eyebrow">{esc(page["kicker"])}</p>
        <h1>{esc(page["title"])}</h1>
      </header>
      <p class="about-copy">{esc(ABOUT)}</p>
      {f'<h2 class="minor">做事方式</h2><ol class="principles">{principles}</ol>' if principles else ""}
      {f'<h2 class="minor">常用工具</h2><ul class="stack-list">{stack}</ul>' if stack else ""}
      <ul class="keyword-tags" aria-label="关键词">{keywords}</ul>
      <div class="about-links prose">
        <p>{esc(page["intro_before"])}<a href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">{esc(page["works_link_label"])}</a>{esc(page["intro_between"])}<a href="{esc(MOOD_URL)}" target="_blank" rel="noopener noreferrer">{esc(page["writing_link_label"])}</a>{esc(page["intro_after"])}</p>
        <p>{esc(page["archive_before"])}<a href="/projects">{esc(page["projects_link_label"])}</a>{esc(page["archive_between"])}<a href="/posts/">{esc(page["posts_link_label"])}</a>{esc(page["archive_after"])}</p>{extra_html}
      </div>
      <dl class="facts">
        <div><dt>{esc(page["email_label"])}</dt><dd><a href="mailto:{esc(EMAIL)}">{esc(EMAIL)}</a></dd></div>
        <div><dt>{esc(page["github_label"])}</dt><dd><a href="{esc(GITHUB)}" target="_blank" rel="noopener noreferrer">{esc(github_text)}</a></dd></div>
      </dl>
    </article>"""
    return layout(f"{page['title']} · {SITE['brand']}", INTRO, "about", main)


def agent_page():
    page = SITE["agent_page"]
    table = "".join(
        f'<tr><td><a href="{esc(item["href"])}">{esc(item["href"])}</a></td><td>{esc(item["description"])}</td></tr>'
        for item in page["resources"]
    )
    main = f"""
    <article class="page narrow">
      <header class="page-head">
        <p class="eyebrow">{esc(page["kicker"])}</p>
        <h1>{esc(page["title"])}</h1>
        <p class="lede">{esc(page["lede"])}</p>
      </header>
      <div class="table-wrap">
        <table class="resource-table">
          <thead><tr><th>资源</th><th>内容</th></tr></thead>
          <tbody>{table}</tbody>
        </table>
      </div>
      <h2 class="minor">{esc(page["copy_heading"])}</h2>
      <textarea class="prompt" id="agent-prompt" aria-label="交给 Agent 的提示词" readonly>{esc(PROMPT)}</textarea>
      <p><button class="button secondary" type="button" data-copy="agent-prompt">{esc(page["copy_button"])}</button></p>
    </article>"""
    return layout(f"{page['title']} · {SITE['brand']}", page["description"], "agent", main, html_class="agent")


def resume_markdown():
    resume = SITE["resume"]
    lines = [f"# {resume['title']}", ""]
    if resume["summary"].strip():
        lines.extend([resume["summary"].strip(), ""])
    for section in resume["sections"]:
        lines.extend([f"## {section['heading']}", ""])
        if section["body"].strip():
            lines.extend([section["body"].strip(), ""])
    return "\n".join(lines).rstrip() + "\n"


def resume_page():
    resume = SITE["resume"]
    parts = []
    for section in resume["sections"]:
        body = RESUME_MD.render(section["body"]) if section["body"].strip() else ""
        parts.append(f"<section><h2>{esc(section['heading'])}</h2>{body}</section>")
    actions = []
    if resume.get("download"):
        filename = resume["filename"]
        actions.append(f'<a class="button" href="/resume/{esc(filename)}" download="{esc(filename)}">{esc(resume["download_label"])}</a>')
    if resume.get("print_label"):
        actions.append(f'<button class="button secondary" type="button" data-print>{esc(resume["print_label"])}</button>')
    action_html = f'<p class="portal">{"".join(actions)}</p>' if actions else ""
    summary = f'<p class="lede">{esc(resume["summary"])}</p>' if resume["summary"].strip() else ""
    main = f"""
    <article class="page narrow">
      <header class="page-head">
        <p class="eyebrow">{esc(resume["kicker"])}</p>
        <h1>{esc(resume["title"])}</h1>
        {summary}
      </header>
      {action_html}
      <div class="prose">{''.join(parts)}</div>
    </article>"""
    return layout(f"{resume['title']} · {SITE['brand']}", resume["summary"] or resume["title"], "resume", main)


def city_lines():
    lines = [f"### 已经落地（{len(CITY['built'])}）", ""]
    for b in CITY["built"]:
        lines.append(f"- {b['name']}（{b['arch']} · {b['status']}）：{first_sentence(b['made'])} {b['href'] if b['href'].startswith('http') else b['href']}")
    groups = {}
    for d in CITY["hanging"]:
        groups.setdefault(d["status"], []).append(d)
    for status, items in groups.items():
        lines.extend(["", f"### {status}（{len(items)}）", ""])
        lines.extend(f"- {d['name']} · {d['date']} · {d['href']}" for d in items)
    if CITY["sky"]:
        lines.extend(["", f"### 还在天上（{len(CITY['sky'])}）", ""])
        lines.extend(f"- {d['name']} · {d['date']}{' · 由「' + d['from'] + '」衍生' if d.get('from') else ''} · {d['href']}" for d in CITY["sky"])
    return lines


def profile_data():
    return {
        "handle": "CengSin",
        "who": WHO,
        "intro": INTRO,
        "thesis": CITY["hero"]["thesis"],
        "lede": CITY["hero"]["lede"],
        "tagline": TAGLINE,
        "background": BACKGROUND,
        "about": ABOUT,
        "contact": {"email": EMAIL, "github": GITHUB},
        "primary_works_url": WORKS_URL,
        "idea_platform_url": IDEA_PLATFORM_URL,
        "primary_writing_url": MOOD_URL,
        "project_archive_path": "/projects/",
        "article_archive_path": "/posts/",
        "city": {
            "snapshot": CITY.get("fetched", ""),
            "built": [{"name": b["name"], "building": b["arch"], "status": b["status"], "url": b["href"], "idea": b["idea"], "made": b["made"]} for b in CITY["built"]],
            "unbuilt": [{"name": d["name"], "status": d["status"], "date": d["date"], "url": d["href"]} for d in CITY["hanging"] + CITY["sky"]],
        },
        "projects": [
            {
                "name": project["name"],
                "path": f"/projects/{project['slug']}",
                "problem": project["problem"],
                "summary": project["summary"],
                "links": [{"label": label, "url": href} for label, href in project["links"]],
            }
            for project in PROJECTS
        ],
    }


def markdown_profile(data):
    lines = [
        "# CengSin",
        "",
        f"> {data['thesis']}",
        "",
        data["lede"],
        "",
        data["about"],
        "",
        "做事方式：" + "；".join(SITE["about_page"].get("principles", [])) + "。",
        "",
        "## 想象之城",
        "",
        f"本站把每件作品画成一栋楼：做出来的落在地上，还没做的是天上的图纸。状态取自 Idea Platform（{CITY.get('fetched', '')}）。",
        "",
        *city_lines(),
        "",
        "## 联系",
        "",
        f"- 邮箱：{EMAIL}",
        f"- GitHub：{GITHUB}",
        "",
        "## 入口",
        "",
        f"- 作品与想法：{WORKS_URL}",
        f"- Idea Platform 平台：{IDEA_PLATFORM_URL}",
        f"- 新文章：{MOOD_URL}",
        "- 城市名录：/projects/",
        "- 书店（文章）：/posts/",
        "",
        "## 作品详情",
        "",
    ]
    if SITE["resume"]["enabled"]:
        lines.insert(lines.index("- 书店（文章）：/posts/") + 1, "- 简历：/resume")
    for project in PROJECTS:
        links = "，".join(f"{label} {href}" for label, href in project["links"])
        lines.extend([f"### {project['name']}", "", project["problem"], "", project["summary"], "", f"页面：/projects/{project['slug']}", f"入口：{links}", ""])
    return "\n".join(lines)


def llms_text():
    project_lines = "\n".join(f"- {project['name']}: /projects/{project['slug']} — {project['problem']}" for project in PROJECTS)
    resume_line = "\n- /resume 简历" if SITE["resume"]["enabled"] else ""
    city = "\n".join(city_lines())
    return f"""# CengSin

> {CITY["hero"]["thesis"]}

{CITY["hero"]["lede"]}

{ABOUT}

## 页面

- / 首页：想象之城
- /projects 城市名录
- /posts/ 书店：读过的书和写下的文章
- /about 关于
- /agent 把这份介绍交给 Agent{resume_line}

## 想象之城

{city}

## 主要入口

- 作品与想法：{WORKS_URL}
- Idea Platform 平台：{IDEA_PLATFORM_URL}
- 新文章：{MOOD_URL}

## 机器可读

- /agent/profile.json
- /agent/profile.md

## 作品详情

{project_lines}

## 联系

- Email: {EMAIL}
- GitHub: {GITHUB}
"""


def write(rel, content):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def generate():
    global FRONTEND_CSS, CITY, POSTS
    CITY = build_city(SITE, PROJECTS)
    POSTS = load_posts(ROOT.parent / "content" / "posts")
    subprocess.run(["npm", "run", "build"], cwd=ROOT, check=True, timeout=180)
    frontend = ROOT / ".frontend"
    FRONTEND_CSS = next(frontend.glob("*.css")).name
    (OUT / "assets").mkdir(parents=True)
    shutil.copy(SRC / "site.css", OUT / "assets" / "site.css")
    shutil.copy(SRC / "site.js", OUT / "assets" / "site.js")
    shutil.copy(SRC / "favicon.svg", OUT / "assets" / "favicon.svg")
    shutil.copy(SRC / "og.png", OUT / "assets" / "og.png")
    shutil.copytree(ROOT / ".frontend", OUT / "assets" / "app")
    pages = {
        "index.html": home(),
        "projects/index.html": projects_page(),
        "about/index.html": about_page(),
        "agent/index.html": agent_page(),
    }
    if SITE["resume"]["enabled"]:
        pages["resume/index.html"] = resume_page()
    for project in PROJECTS:
        pages[f"projects/{project['slug']}/index.html"] = project_page(project)
    for rel, content in pages.items():
        write(rel, content)
    if SITE["resume"]["enabled"] and SITE["resume"].get("download"):
        write(f"resume/{SITE['resume']['filename']}", resume_markdown())
    build_posts(
        ROOT.parent / "content" / "posts",
        ROOT.parent / "static" / "images",
        OUT,
        layout,
        write,
        esc,
        mood_url=MOOD_URL,
        shop=shop_html,
    )
    routes = sorted(
        "/" + path.parent.relative_to(OUT).as_posix().strip(".") + "/"
        for path in OUT.rglob("index.html")
    )
    routes = ["/" if route == "//" else route for route in routes]
    write(
        "sitemap.xml",
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(f"<url><loc>https://cengsin.is-a.dev{quote(route, safe='/')}</loc></url>" for route in routes)
        + "</urlset>\n",
    )
    data = profile_data()
    write("agent/profile.json", json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    write("agent/profile.md", markdown_profile(data))
    write("llms.txt", llms_text())
    write("CNAME", "cengsin.is-a.dev\n")
    write(".nojekyll", "")
    removed = ["now/index.html", "timeline/index.html", "resume.md", "music/index.html"]
    if not SITE["resume"]["enabled"]:
        removed.append("resume/index.html")
    leaked = [name for name in removed if (OUT / name).exists()]
    if not SITE["resume"]["enabled"] and (OUT / "resume").exists():
        leaked.append("resume/")
    if leaked:
        raise SystemExit(f"removed routes still exist: {leaked}")
    OUT.chmod(0o755)
    for path in OUT.rglob("*"):
        path.chmod(0o755 if path.is_dir() else 0o644)
    blob = "\n".join(
        path.read_text(encoding="utf-8")
        for path in OUT.rglob("*")
        if path.is_file() and path.suffix.lower() in {".html", ".xml", ".txt", ".json", ".md", ".css", ".js"}
    )
    hits = forbidden_hits(blob, allow_resume_word=bool(SITE["resume"]["enabled"]))
    if hits:
        raise SystemExit(f"forbidden content: {hits}")
    return len(pages)


def main():
    global OUT
    staging = DIST.parent / ".dist-staging"
    previous = DIST.parent / ".dist-previous"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)
    OUT = staging
    try:
        count = generate()
    except BaseException:
        shutil.rmtree(staging, ignore_errors=True)
        raise
    if previous.exists():
        shutil.rmtree(previous)
    if DIST.exists():
        DIST.rename(previous)
    try:
        staging.rename(DIST)
    except BaseException:
        if previous.exists() and not DIST.exists():
            previous.rename(DIST)
        raise
    if previous.exists():
        shutil.rmtree(previous)
    print(f"wrote {count} html pages to {DIST}")


if __name__ == "__main__":
    main()
