#!/usr/bin/env python3
"""Generate the CengSin static site into dist/."""

import html
import json
import shutil
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
DIST = ROOT / "dist"
SNAPSHOT = "2026-09-24"
PROMPT = """请阅读这个站点的 /llms.txt，以及其中列出的页面和 /agent/profile.json。用这些材料介绍 CengSin 和他的公开作品。"""

FORBIDDEN = [
    "张泽涛",
    "15262040158",
    "中国矿业大学",
    "徐海学院",
    "zephone",
    "notcallme",
    "stock_after_action_review",
    "stock-tinder",
    "wearform",
    "yisou",
    "retrieval",
    "openclaw_status",
    "openclaw-workspace",
    "icloud_key",
    "tickflow",
    "华尔街",
    "赢时胜",
    "秉坤",
    "期望城市",
    "简历",
    "InvokeReplace",
]


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


from projects import PROJECTS
from posts import build_posts

INTRO = "从想法到作品。"
TAGLINE = "解决问题，探索想法，与 Agent 协作"
BACKGROUND = "古法编程时代从事后端开发。"
WORKS_URL = "https://idea-platform.z-agent.ccwu.cc/works?user=user_38c0e310a872"
IDEA_PLATFORM_URL = "https://idea-platform.z-agent.ccwu.cc/"
MOOD_URL = "https://mood.z-agent.ccwu.cc/"
BY_SLUG = {item["slug"]: item for item in PROJECTS}
THEME_BOOTSTRAP = """(function () {
  var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  var themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = dark ? '#111B26' : '#F5F7FA';
})();"""


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


def nav(current):
    items = [
        ("/projects", "作品", "projects"),
        ("/posts/", "文章", "posts"),
        ("/about", "关于", "about"),
        ("/agent", "智能体", "agent"),
    ]
    desktop = []
    mobile = []
    for href, label, key in items:
        current_attr = ' aria-current="page"' if key == current else ""
        klass = "agent-link" if key == "agent" else ""
        class_attr = f' class="{klass}"' if klass else ""
        desktop.append(f'<a href="{href}"{class_attr}{current_attr}>{label}</a>')
        mobile.append(f'<a href="{href}"{current_attr}>{label}</a>')
    return f"""
      <header class="site-header">
        <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span>CengSin</a>
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
    return f"""
      <footer class="site-footer">
        <span class="mono">CengSin</span>
        <div class="footer-links">
          <a href="/projects">作品</a>
          <a href="/posts/">文章</a>
          <a href="/agent">智能体</a>
          <a href="https://github.com/CengSin" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
          <a href="mailto:cengsin@icloud.com">邮箱</a>
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
<body>
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


def home():
    main = f"""
      <section class="hero solo" aria-labelledby="hero-title">
        <div class="hero-copy">
          <a class="hero-identity" href="https://github.com/CengSin" target="_blank" rel="noopener noreferrer" aria-label="在 GitHub 查看 CengSin">
            <span class="hero-avatar"><span aria-hidden="true">CS</span><img src="https://github.com/CengSin.png?size=96" alt="" width="40" height="40" referrerpolicy="no-referrer"></span>
            <span class="hero-identity-copy"><strong>CengSin</strong><small>个人网站 · GitHub ↗</small></span>
          </a>
          <h1 class="display display-sentence" id="hero-title">{esc(INTRO)}</h1>
          <p class="hero-intro">{esc(TAGLINE)}</p>
          <div class="hero-actions">
            <a class="button primary" href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">看作品 <span class="button-arrow">↗</span></a>
            <a class="button secondary" href="{esc(MOOD_URL)}" target="_blank" rel="noopener noreferrer">读新文章 <span class="button-arrow">↗</span></a>
          </div>
        </div>
        <div class="mouse-scene" aria-hidden="true">
          <span class="mouse-town">
            <span class="mouse-building mouse-building-one"><i></i><i></i><i></i><i></i></span>
            <span class="mouse-building mouse-building-two"><i></i><i></i><i></i><i></i><i></i><i></i></span>
            <span class="mouse-building mouse-building-three"><i></i><i></i><i></i><i></i></span>
          </span>
          <span class="mouse-track"></span>
          <span class="mouse-crate"></span>
          <span class="mouse-cheese">
            <svg viewBox="0 0 30 30" focusable="false">
              <path d="M2 12L27 4V26H2Z" fill="currentColor"/>
              <path d="M2 12L27 4V9L2 17Z" fill="var(--cheese-top)"/>
              <path d="M7 21H11V24H7ZM18 14H22V18H18Z" fill="var(--paper)"/>
            </svg>
          </span>
          <span class="mouse-runner">
            <span class="mouse-sprite">
              <svg viewBox="0 0 96 64" focusable="false">
                <path d="M29 44H20V39H12V33H7V27H3" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="square" stroke-linejoin="miter"/>
                <path d="M32 32H40V27H69V31H77V36H85V41H91V48H83V53H75V56H39V53H32V47H28V38H32Z" fill="currentColor"/>
                <path d="M43 29V16H57V29M64 30V20H76V34" fill="currentColor"/>
                <path d="M47 20H53V29H47ZM68 24H72V31H68Z" fill="var(--paper)"/>
                <path d="M74 37H79V42H74Z" fill="var(--paper)"/>
                <path d="M88 43H94V48H88Z" fill="var(--ink)"/>
                <path class="mouse-smile" d="M80 46V50H85" fill="none" stroke="var(--ink)" stroke-width="2"/>
                <rect class="mouse-foot mouse-foot-back" x="42" y="54" width="12" height="6"/>
                <rect class="mouse-foot mouse-foot-front" x="67" y="54" width="12" height="6"/>
              </svg>
            </span>
          </span>
        </div>
      </section>
      <section class="portal-section" aria-labelledby="portal-title">
        <div class="section-heading">
          <div><span class="micro">网站入口</span><h2 id="portal-title">从这里继续</h2></div>
        </div>
        <div class="portal-grid">
          <article class="portal-card">
            <p class="micro">01 / 作品</p>
            <h3>作品与想法</h3>
            <p>在 Idea Platform 看我发布的作品，并进入每件作品的来源与详情。</p>
            <a class="portal-primary" href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">看作品 <span aria-hidden="true">↗</span></a>
            <a class="portal-secondary" href="/projects">本站原有作品说明 →</a>
          </article>
          <article class="portal-card">
            <p class="micro">02 / 写作</p>
            <h3>文章与日常</h3>
            <p>新的文字写在「今天的天气」。这里也留着以前的文章。</p>
            <a class="portal-primary" href="{esc(MOOD_URL)}" target="_blank" rel="noopener noreferrer">读新文章 <span aria-hidden="true">↗</span></a>
            <a class="portal-secondary" href="/posts/">旧文归档 →</a>
          </article>
        </div>
      </section>
      <p class="home-about"><a class="text-link internal" href="/about">关于</a></p>
      <aside class="agent-strip" aria-labelledby="agent-strip-title">
        <p id="agent-strip-title">把这份站点交给你的 Agent。</p>
        <a href="/llms.txt">llms.txt</a>
        <button class="button secondary" type="button" data-copy="agent-prompt">复制给 Agent</button>
        <textarea id="agent-prompt" class="visually-hidden" readonly>{esc(PROMPT)}</textarea>
      </aside>"""
    return layout("CengSin — 个人网站", INTRO, "home", main)


def projects_page():
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
        <p class="page-kicker micro">作品</p>
        <h1>作品</h1>
        <p class="lede">我的公开作品在 Idea Platform 持续更新。也可以从那里浏览其他人的想法，参与创作。</p>
        <a class="works-portal" href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">
          <span class="micro">我的公开作品</span>
          <strong>在 Idea Platform 查看我的作品</strong>
          <span>这里展示我已发布的作品，并可进入每件作品的来源与详情。</span>
          <span class="works-portal-action">查看我的作品 ↗</span>
        </a>
        <a class="platform-entry" href="{esc(IDEA_PLATFORM_URL)}" target="_blank" rel="noopener noreferrer">探索 Idea Platform 平台 <span aria-hidden="true">↗</span></a>
        <details class="work-archive" open>
          <summary>本站原有作品说明（{len(cards)} 项）</summary>
          <div class="feature-list">{''.join(cards)}</div>
        </details>
      </div>"""
    return layout("作品 · CengSin", "CengSin 的公开作品。", "projects", main)


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
    main = f"""
      <article class="page narrow">
        <p class="page-kicker micro">关于</p>
        <h1>关于</h1>
        <p class="lede">{esc(BACKGROUND)}</p>
        <div class="prose">
          <p>作品与想法在 <a href="{esc(WORKS_URL)}" target="_blank" rel="noopener noreferrer">Idea Platform</a>，新的文字在 <a href="{esc(MOOD_URL)}" target="_blank" rel="noopener noreferrer">今天的天气</a>。</p>
          <p>本站保留 <a href="/projects">原有作品说明</a> 和 <a href="/posts/">旧文归档</a>。</p>
        </div>
        <dl class="facts">
          <div><dt>邮箱</dt><dd><a href="mailto:cengsin@icloud.com">cengsin@icloud.com</a></dd></div>
          <div><dt>GitHub</dt><dd><a href="https://github.com/CengSin" target="_blank" rel="noopener noreferrer">github.com/CengSin</a></dd></div>
        </dl>
      </article>"""
    return layout("关于 · CengSin", INTRO, "about", main)


def agent_page():
    rows = [
        ("/llms.txt", "站点地图：介绍、作品和联系方式"),
        ("/agent/profile.json", "同一份介绍的 JSON"),
        ("/agent/profile.md", "同一份介绍的 Markdown"),
    ]
    table = "".join(
        f'<tr><td><a href="{esc(href)}">{esc(href)}</a></td><td>{esc(desc)}</td></tr>' for href, desc in rows
    )
    main = f"""
      <article class="page">
        <p class="page-kicker micro">智能体</p>
        <h1>让 Agent 了解我</h1>
        <p class="lede">把这份站点交给你的 Agent。文件和页面是同一份介绍、作品和链接。</p>
        <table class="resource-table">
          <thead><tr><th>资源</th><th>内容</th></tr></thead>
          <tbody>{table}</tbody>
        </table>
        <h2>复制给 Agent</h2>
        <textarea class="prompt" id="agent-prompt" readonly>{esc(PROMPT)}</textarea>
        <p><button class="button secondary" type="button" data-copy="agent-prompt">复制给 Agent</button></p>
      </article>"""
    return layout("智能体入口 · CengSin", "把 CengSin 的公开介绍交给你的 Agent。", "agent", main)


def profile_data():
    return {
        "handle": "CengSin",
        "intro": INTRO,
        "tagline": TAGLINE,
        "background": BACKGROUND,
        "contact": {"email": "cengsin@icloud.com", "github": "https://github.com/CengSin"},
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
        data["intro"],
        "",
        data["tagline"],
        "",
        data["background"],
        "",
        "## 联系",
        "",
        "- 邮箱：cengsin@icloud.com",
        "- GitHub：https://github.com/CengSin",
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
    return f"""# CengSin

> {INTRO}

{TAGLINE}

{BACKGROUND}

## 页面

- / 首页
- /projects 作品
- /posts/ 文章
- /about 介绍
- /agent 把这份介绍交给 Agent

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

- Email: cengsin@icloud.com
- GitHub: https://github.com/CengSin
"""


def write(rel, content):
    path = DIST / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main():
    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / "assets").mkdir(parents=True)
    shutil.copy(SRC / "site.css", DIST / "assets" / "site.css")
    shutil.copy(SRC / "site.js", DIST / "assets" / "site.js")
    shutil.copy(SRC / "favicon.svg", DIST / "assets" / "favicon.svg")
    pages = {
        "index.html": home(),
        "projects/index.html": projects_page(),
        "about/index.html": about_page(),
        "agent/index.html": agent_page(),
    }
    for project in PROJECTS:
        pages[f"projects/{project['slug']}/index.html"] = project_page(project)
    for rel, content in pages.items():
        write(rel, content)
    build_posts(ROOT.parent / "content" / "posts", ROOT.parent / "static" / "images", DIST, layout, write, esc)
    routes = sorted(
        "/" + path.parent.relative_to(DIST).as_posix().strip(".") + "/"
        for path in DIST.rglob("index.html")
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
    removed = ["resume/index.html", "resume.md", "now/index.html", "timeline/index.html"]
    leaked = [name for name in removed if (DIST / name).exists()]
    if leaked:
        raise SystemExit(f"removed routes still exist: {leaked}")
    blob = "\n".join(
        path.read_text(encoding="utf-8")
        for path in DIST.rglob("*")
        if path.is_file() and path.suffix.lower() in {".html", ".xml", ".txt", ".json", ".md", ".css", ".js"}
    )
    hits = [word for word in FORBIDDEN if word.lower() in blob.lower()]
    if hits:
        raise SystemExit(f"forbidden content: {hits}")
    print(f"wrote {len(pages)} html pages to {DIST}")


if __name__ == "__main__":
    main()
