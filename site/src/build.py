#!/usr/bin/env python3
"""Generate the CengSin static site into dist/."""

import html
import json
import shutil
from pathlib import Path
from urllib.parse import quote

from markdown_it import MarkdownIt

from content_store import forbidden_hits, load_site, resolve_href
from posts import build_posts
from projects import PROJECTS

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
DIST = ROOT / "dist"
OUT = DIST
SNAPSHOT = "2026-09-24"
SITE = load_site()
IDENTITY = SITE["identity"]
LINKS = SITE["links"]
WHO = IDENTITY["who"]
INTRO = IDENTITY["intro"]
TAGLINE = IDENTITY["tagline"]
BACKGROUND = IDENTITY["background"]
ABOUT = IDENTITY["about"]
DOING = IDENTITY["doing"]
WORKS_URL = LINKS["works_url"]
IDEA_PLATFORM_URL = LINKS["idea_platform_url"]
MOOD_URL = LINKS["mood_url"]
EMAIL = IDENTITY["email"]
GITHUB = IDENTITY["github"]
PROMPT = SITE["prompt"]
BY_SLUG = {item["slug"]: item for item in PROJECTS}
RESUME_MD = MarkdownIt("commonmark", {"html": False}).enable("table")
THEME_BOOTSTRAP = """(function () {
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = dark ? '#111B26' : '#F5F7FA';
})();"""


def esc(value):
    return html.escape(str(value), quote=True)


def inline(nodes):
    parts = []
    for node in nodes:
        if isinstance(node, str):
            parts.append(esc(node))
            continue
        label, href = node
        external = href.startswith("http") or href.startswith("mailto")
        attrs = ' target="_blank" rel="noopener noreferrer" class="print-url"' if external else ""
        parts.append(f'<a href="{esc(href)}"{attrs}>{esc(label)}</a>')
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
    if href.startswith("http") or href.startswith("mailto"):
        return ' target="_blank" rel="noopener noreferrer" class="print-url"'
    return ""


def link_html(label, href, klass="text-link"):
    return f'<a class="{klass}" href="{esc(href)}"{external(href)}>{esc(label)}</a>'


def diagram(kind):
    if kind == "idea":
        return """<div class="work-art idea-art" role="img" aria-label="示意图，不是产品截图。一个想法连接承接分支和完成的作品。"><span class="idea-node one">IDEA</span><span class="idea-node two">BRANCH</span><span class="idea-node three">WORK</span><span class="art-caption">示意图，不是产品截图</span></div>"""
    if kind == "touch":
        return """<div class="work-art touch-art" role="img" aria-label="示意图，不是产品截图。键盘下方有一条 Touch Bar。"><div class="touch-device"><div class="touch-line"></div><div class="touch-bar"><i></i><i></i><i></i></div></div><span class="art-caption">示意图，不是产品截图</span></div>"""
    if kind == "resource":
        return """<div class="work-art resource-art" role="img" aria-label="示意图，不是产品截图。CPU、内存和 GPU 三条占用。"><div class="resource-window"><div class="resource-title mono">RESOURCE / VIEW</div><div class="resource-line"><span class="mono">CPU</span><b></b></div><div class="resource-line"><span class="mono">MEMORY</span><b></b></div><div class="resource-line"><span class="mono">GPU</span><b></b></div></div><span class="art-caption">示意图，不是产品截图</span></div>"""
    if kind == "mark":
        return '<div class="wide-symbol" aria-hidden="true">g/o</div>'
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
        items.append({
            "href": "/resume",
            "label": resume.get("nav_label") or "简历",
            "key": "resume",
            "enabled": True,
        })
    return items


def nav(current):
    desktop = []
    mobile = []
    for item in visible_nav():
        href, label, key = item["href"], item["label"], item["key"]
        current_attr = ' aria-current="page"' if key == current else ""
        class_attr = ' class="agent-link"' if key == "agent" else ""
        desktop.append(f'<a href="{esc(href)}"{class_attr}{current_attr}>{esc(label)}</a>')
        mobile.append(f'<a href="{esc(href)}"{current_attr}>{esc(label)}</a>')
    return f"""
      <header class="site-header">
        <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span>{esc(SITE["brand"])}</a>
        <div class="header-actions">
          <nav class="desktop-nav" aria-label="主导航">{''.join(desktop)}</nav>
          <nav class="mobile-nav" aria-label="手机导航">
            <details>
              <summary>菜单</summary>
              <div class="mobile-links">{''.join(mobile)}</div>
            </details>
          </nav>
        </div>
      </header>"""


def footer():
    links = []
    for item in SITE["footer"]:
        href = resolve_href(item["href"], SITE)
        if not SITE["resume"].get("enabled") and href.rstrip("/") == "/resume":
            continue
        attrs = ' target="_blank" rel="noopener noreferrer"' if href.startswith("https://") else ""
        links.append(f'          <a href="{esc(href)}"{attrs}>{esc(item["label"])}</a>')
    return f"""
      <footer class="site-footer">
        <span class="mono">{esc(SITE["brand"])}</span>
        <div class="footer-links">
{chr(10).join(links)}
        </div>
      </footer>"""


def layout(title, description, current, main):
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#F5F7FA">
  <meta name="description" content="{esc(description)}">
  <title>{esc(title)}</title>
  <script>{THEME_BOOTSTRAP}</script>
  <link rel="stylesheet" href="/assets/site.css">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
</head>
<body{" class='home'" if current == "home" else ""}>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <div class="shell">
    {nav(current)}
    <main id="main">
      {main}
    </main>
    {footer()}
  </div>
  <script src="/assets/site.js" defer></script>
</body>
</html>
"""


def keyword_list():
    return "\n".join(f"          <li>{esc(word)}</li>" for word in IDENTITY["keywords"])


def render_hero():
    home = SITE["home"]
    handle = IDENTITY["github_handle"]
    primary = resolve_href(home["hero_primary_href"], SITE)
    secondary = resolve_href(home["hero_secondary_href"], SITE)
    return f"""      <section class="home-hero" aria-labelledby="who-name">
        <div class="home-hero-grid">
          <div class="home-avatar"><span aria-hidden="true">CS</span><img src="https://github.com/{esc(handle)}.png?size=240" alt="" width="128" height="128" referrerpolicy="no-referrer"></div>
          <div>
            <h1 id="who-name">{esc(SITE["brand"])}</h1>
            <p class="home-who">{esc(WHO)}</p>
            <p class="home-support">{esc(INTRO)}{esc(TAGLINE)}。</p>
            <div class="home-actions">
              <a class="button primary" href="{esc(primary)}">{esc(home["hero_primary_label"])}</a>
              <a class="home-quiet" href="{esc(secondary)}">{esc(home["hero_secondary_label"])}</a>
            </div>
          </div>
        </div>
      </section>"""


def render_doing():
    home = SITE["home"]
    threads = []
    for item in home["threads"]:
        href = resolve_href(item["href"], SITE)
        attrs = ' target="_blank" rel="noopener noreferrer"' if href.startswith("http") else ""
        threads.append(
            f"""          <a class="home-thread" href="{esc(href)}"{attrs}>
            <strong>{esc(item["title"])}</strong>
            <span>{esc(item["text"])}</span>
          </a>"""
        )
    return f"""      <section class="home-block" id="doing" aria-labelledby="doing-title">
        <h2 id="doing-title">{esc(home["doing_title"])}</h2>
        <p class="home-lede">{esc(DOING)}</p>
        <div class="home-threads">
{chr(10).join(threads)}
        </div>
      </section>"""


def render_doors():
    home = SITE["home"]
    cards = []
    for item in home["doors"]:
        href = resolve_href(item["href"], SITE)
        attrs = ' target="_blank" rel="noopener noreferrer"' if href.startswith("http") else ""
        cards.append(
            f"""          <a class="home-door" href="{esc(href)}"{attrs}>
            <span class="home-dest">{esc(item["dest"])}</span>
            <h3>{esc(item["title"])}</h3>
            <p>{esc(item["text"])}</p>
            <span class="home-go">{esc(item["action"])}</span>
          </a>"""
        )
    agent = home["agent"]
    agent_html = ""
    if agent.get("enabled", True):
        agent_html = f"""
        <div class="home-agent" id="agent">
          <div>
            <span class="home-dest">{esc(agent["dest"])}</span>
            <h3>{esc(agent["title"])}</h3>
            <p>{esc(agent["text"])}</p>
          </div>
          <div class="home-agent-actions">
            <button class="button secondary" type="button" data-copy="agent-prompt">{esc(agent["button"])}</button>
            <a href="/llms.txt">{esc(agent["llms_label"])}</a>
            <textarea id="agent-prompt" class="visually-hidden" readonly>{esc(PROMPT)}</textarea>
          </div>
        </div>"""
    return f"""      <section class="home-block" id="doors" aria-labelledby="doors-title">
        <h2 id="doors-title">{esc(home["doors_title"])}</h2>
        <p class="home-note">{esc(home["doors_note"])}</p>
        <div class="home-doors">
{chr(10).join(cards)}
        </div>{agent_html}
      </section>"""


def render_about():
    return f"""      <section class="home-block" id="about" aria-labelledby="about-title">
        <h2 id="about-title">{esc(SITE["home"]["about_title"])}</h2>
        <p class="home-about-copy">{esc(ABOUT)}</p>
        <ul class="keyword-tags" aria-label="关键词">
{keyword_list()}
        </ul>
      </section>"""


def render_history():
    records = []
    for item in SITE["home"]["history"]:
        href = resolve_href(item["href"], SITE)
        records.append(
            f"""        <a class="home-record" href="{esc(href)}">
          <strong>{esc(item["title"])}</strong>
          <span>{esc(item["text"])}</span>
          <em>{esc(item["meta"])}</em>
        </a>"""
        )
    return f"""      <section class="home-history" aria-labelledby="history-title">
        <h2 id="history-title">{esc(SITE["home"]["history_title"])}</h2>
{chr(10).join(records)}
      </section>"""


RENDERERS = {
    "hero": render_hero,
    "doing": render_doing,
    "doors": render_doors,
    "about": render_about,
    "history": render_history,
}


def home():
    parts = [RENDERERS[section["id"]]() for section in SITE["home"]["sections"] if section.get("enabled", True)]
    return layout(SITE["site_title"], WHO, "home", "\n" + "\n".join(parts))


def projects_page():
    page = SITE["projects_page"]
    cards = []
    for project in PROJECTS:
        if project["group"] != "selected":
            continue
        art = diagram(project["diagram"]) if project["diagram"] not in {None, "mark"} else ""
        primary = project["links"][0]
        links = link_html(primary[0], primary[1]) + link_html("看这件作品", f"/projects/{project['slug']}", "text-link internal")
        klass = "card feature-card" if art else "card feature-card no-art"
        cards.append(f"""
          <article class="{klass}">
            <div class="work-copy">
              <div class="work-meta mono"><span class="number">{project["number"]}</span><span>/</span><span>{esc(project["kind"])}</span></div>
              <h3><a href="/projects/{project["slug"]}">{esc(project["name"])}</a></h3>
              <p>{esc(project["problem"])}</p>
              <div class="links">{links}</div>
            </div>
            {art}
          </article>""")
    main = f"""
      <div class="page">
        <p class="page-kicker micro">{esc(page["kicker"])}</p>
        <h1>{esc(page["title"])}</h1>
        <p class="lede">{esc(page["lede"])}</p>
        <a class="works-portal" href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">
          <span class="micro">{esc(page["portal_kicker"])}</span>
          <strong>{esc(page["portal_title"])}</strong>
          <span>{esc(page["portal_text"])}</span>
          <span class="works-portal-action">{esc(page["portal_action"])}</span>
        </a>
        <a class="platform-entry" href="{esc(IDEA_PLATFORM_URL)}" target="_blank" rel="noopener noreferrer">{esc(page["platform_label"])} <span aria-hidden="true">↗</span></a>
        <details class="work-archive" open>
          <summary>{esc(page["archive_label"])}（{len(cards)} 项）</summary>
          <div class="feature-list">{''.join(cards)}</div>
        </details>
      </div>"""
    return layout(f"{page['title']} · {SITE['brand']}", page["description"], "projects", main)


def project_page(project):
    links = "".join(f"<li>{link_html(label, href)}</li>" for label, href in project["links"])
    sections = []
    for title, content in project["sections"]:
        sections.append(f"<section><h2>{esc(title)}</h2>{blocks(content)}</section>")
    related = []
    for slug in project["related"]:
        other = BY_SLUG[slug]
        related.append(f'<li><a href="/projects/{slug}">{esc(other["name"])}</a></li>')
    related_html = f'<aside class="related"><h2>相关作品</h2><ul>{"".join(related)}</ul></aside>' if related else ""
    art = ""
    if project["diagram"] in {"idea", "touch", "resource"}:
        art = f'<div class="card" style="margin-top:28px">{diagram(project["diagram"])}</div>'
    main = f"""
      <article class="page detail-top">
        <p><a class="text-link internal" href="/projects">全部作品</a></p>
        <p class="page-kicker micro">{esc(project["number"])} / {esc(project["kind"])}</p>
        <h1>{esc(project["name"])}</h1>
        <p class="lede">{esc(project["problem"])}</p>
        <ul class="entry-links">{links}</ul>
        {art}
        <div class="prose">{''.join(sections)}</div>
        {related_html}
        <p class="source-note">{esc(project["source"])}</p>
      </article>"""
    return layout(f"{project['name']} · CengSin", project["problem"], "projects", main)


def about_page():
    page = SITE["about_page"]
    extra_html = ""
    if page["extra_paragraphs"]:
        extra_html = "\n" + "\n".join(f"          <p>{esc(paragraph)}</p>" for paragraph in page["extra_paragraphs"])
    github_text = GITHUB.removeprefix("https://").removeprefix("http://")
    main = f"""
      <article class="page narrow">
        <p class="page-kicker micro">{esc(page["kicker"])}</p>
        <h1>{esc(page["title"])}</h1>
        <p class="lede">{esc(ABOUT)}</p>
        <ul class="keyword-tags" aria-label="关键词">
{keyword_list()}
        </ul>
        <div class="prose">
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
      <article class="page">
        <p class="page-kicker micro">{esc(page["kicker"])}</p>
        <h1>{esc(page["title"])}</h1>
        <p class="lede">{esc(page["lede"])}</p>
        <table class="resource-table">
          <thead><tr><th>资源</th><th>内容</th></tr></thead>
          <tbody>{table}</tbody>
        </table>
        <h2>{esc(page["copy_heading"])}</h2>
        <textarea class="prompt" id="agent-prompt" readonly>{esc(PROMPT)}</textarea>
        <p><button class="button secondary" type="button" data-copy="agent-prompt">{esc(page["copy_button"])}</button></p>
      </article>"""
    return layout(f"智能体入口 · {SITE['brand']}", page["description"], "agent", main)


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
        actions.append(
            f'<a class="button primary" href="/resume/{esc(filename)}" download="{esc(filename)}">{esc(resume["download_label"])}</a>'
        )
    if resume.get("print_label"):
        actions.append(f'<button class="button" type="button" data-print>{esc(resume["print_label"])}</button>')
    action_html = f'<div class="hero-actions">{"".join(actions)}</div>' if actions else ""
    summary = f'<p class="lede">{esc(resume["summary"])}</p>' if resume["summary"].strip() else ""
    main = f"""
      <article class="page narrow">
        <p class="page-kicker micro">{esc(resume["kicker"])}</p>
        <h1>{esc(resume["title"])}</h1>
        {summary}
        {action_html}
        <div class="prose">{''.join(parts)}</div>
      </article>"""
    return layout(f"{resume['title']} · {SITE['brand']}", resume["summary"] or resume["title"], "resume", main)


def profile_data():
    return {
        "handle": "CengSin",
        "who": WHO,
        "intro": INTRO,
        "tagline": TAGLINE,
        "background": BACKGROUND,
        "about": ABOUT,
        "contact": {"email": EMAIL, "github": GITHUB},
        "primary_works_url": WORKS_URL,
        "idea_platform_url": IDEA_PLATFORM_URL,
        "primary_writing_url": MOOD_URL,
        "project_archive_path": "/projects/",
        "article_archive_path": "/posts/",
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
        data["who"],
        "",
        data["intro"],
        "",
        data["tagline"],
        "",
        data["about"],
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
        "- 本站原有作品说明：/projects/",
        "- 旧文归档：/posts/",
        "",
        "## 本站原有作品说明",
        "",
    ]
    if SITE["resume"]["enabled"]:
        lines.insert(lines.index("- 旧文归档：/posts/") + 1, "- 简历：/resume")
    for project in PROJECTS:
        links = "，".join(f"{label} {href}" for label, href in project["links"])
        lines.append(f"### {project['name']}")
        lines.append("")
        lines.append(project["problem"])
        lines.append("")
        lines.append(project["summary"])
        lines.append("")
        lines.append(f"页面：/projects/{project['slug']}")
        lines.append(f"入口：{links}")
        lines.append("")
    return "\n".join(lines)


def llms_text():
    project_lines = "\n".join(
        f"- {project['name']}: /projects/{project['slug']} — {project['problem']}" for project in PROJECTS
    )
    resume_line = "\n- /resume 简历" if SITE["resume"]["enabled"] else ""
    return f"""# CengSin

> {WHO}

{INTRO}{TAGLINE}。

{ABOUT}

## 页面

- / 首页
- /projects 作品
- /posts/ 文章
- /about 介绍
- /agent 把这份介绍交给 Agent{resume_line}

## 主要入口

- 作品与想法：{WORKS_URL}
- Idea Platform 平台：{IDEA_PLATFORM_URL}
- 新文章：{MOOD_URL}
- 本站原有作品说明：/projects/
- 旧文归档：/posts/

## 机器可读

- /agent/profile.json
- /agent/profile.md

## 本站原有作品说明

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
    (OUT / "assets").mkdir(parents=True)
    shutil.copy(SRC / "site.css", OUT / "assets" / "site.css")
    shutil.copy(SRC / "site.js", OUT / "assets" / "site.js")
    shutil.copy(SRC / "favicon.svg", OUT / "assets" / "favicon.svg")
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
    removed = ["now/index.html", "timeline/index.html", "resume.md"]
    if not SITE["resume"]["enabled"]:
        removed.append("resume/index.html")
    leaked = [name for name in removed if (OUT / name).exists()]
    if not SITE["resume"]["enabled"] and (OUT / "resume").exists():
        leaked.append("resume/")
    if leaked:
        raise SystemExit(f"removed routes still exist: {leaked}")
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
