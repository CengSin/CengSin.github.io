"""Load, validate, and save the editable site content."""

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

SRC = Path(__file__).resolve().parent
SITE_DIR = SRC.parent
REPO = SITE_DIR.parent
CONTENT = SITE_DIR / "content"
SITE_PATH = CONTENT / "site.json"
PROJECTS_PATH = CONTENT / "projects.json"
POSTS_DIR = REPO / "content" / "posts"

PRIVATE_TERMS = [
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
    "InvokeReplace",
]
RESUME_WORD = "简历"
SECTION_IDS = ("hero", "doing", "doors", "about", "history")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KEY_RE = re.compile(r"^[a-z][a-z0-9-]{0,40}$")
HANDLE_RE = re.compile(r"^[A-Za-z0-9-]{1,39}$")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
RESUME_FILE_RE = re.compile(r"^[a-z0-9][a-z0-9.-]{0,40}\.md$")
HASH_RE = re.compile(r"^#[A-Za-z][A-Za-z0-9_-]{0,40}$")
TOKENS = ("{works_url}", "{idea_platform_url}", "{mood_url}", "{github}", "{email}")


class ContentError(ValueError):
    pass


def forbidden_hits(text, allow_resume_word=False):
    lowered = text.lower()
    hits = [word for word in PRIVATE_TERMS if word.lower() in lowered]
    if not allow_resume_word and RESUME_WORD in text:
        hits.append(RESUME_WORD)
    return hits


def _text(value, label, limit):
    if not isinstance(value, str):
        raise ContentError(f"{label}需要是文字")
    if "\x00" in value:
        raise ContentError(f"{label}含有不能使用的字符")
    if len(value) > limit:
        raise ContentError(f"{label}过长")
    return value


def _https(value, label):
    value = _text(value, label, 300)
    if not value.startswith("https://") or any(char in value for char in " \n\r\t\"'<>"):
        raise ContentError(f"{label}需要是 https 链接")
    return value


def _href(value, label, allow_hash=False):
    value = _text(value, label, 300)
    if value in TOKENS or value == "mailto:{email}":
        return value
    if value.startswith("/") and ".." not in value and "\\" not in value and "\n" not in value and " " not in value:
        return value
    if value.startswith("https://") and not any(char in value for char in " \n\r\t\"'<>"):
        return value
    if value.startswith("mailto:") and not any(char in value for char in " \n\r\t\"'<>"):
        return value
    if allow_hash and HASH_RE.fullmatch(value):
        return value
    raise ContentError(f"{label}的链接格式不正确")


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ContentError(f"无法读取 {path.name}") from error


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_site():
    data = load_json(SITE_PATH)
    validate_site(data)
    return data


def load_projects():
    data = load_json(PROJECTS_PATH)
    validate_projects(data)
    return data


def validate_site(site):
    if not isinstance(site, dict):
        raise ContentError("站点配置格式不对")
    identity = site.get("identity")
    links = site.get("links")
    home = site.get("home")
    if not isinstance(identity, dict) or not isinstance(links, dict) or not isinstance(home, dict):
        raise ContentError("站点配置缺少介绍、链接或首页")
    _text(site.get("site_title", ""), "网站标题", 80)
    _text(site.get("brand", ""), "站点名称", 40)
    _text(site.get("prompt", ""), "交给 Agent 的提示词", 2000)
    for key, label, limit in (
        ("who", "身份介绍", 200),
        ("intro", "标题", 80),
        ("tagline", "副标题", 120),
        ("background", "背景", 400),
        ("about", "关于正文", 2000),
        ("doing", "我在做什么", 2000),
    ):
        _text(identity.get(key, ""), label, limit)
    email = _text(identity.get("email", ""), "邮箱", 120)
    if not EMAIL_RE.fullmatch(email):
        raise ContentError("邮箱格式不正确")
    _https(identity.get("github", ""), "GitHub 地址")
    handle = identity.get("github_handle", "")
    if not isinstance(handle, str) or not HANDLE_RE.fullmatch(handle):
        raise ContentError("GitHub 用户名格式不正确")
    keywords = identity.get("keywords")
    if not isinstance(keywords, list) or len(keywords) > 12:
        raise ContentError("关键词需要是列表")
    for word in keywords:
        _text(word, "关键词", 20)
    for key, label in (
        ("works_url", "作品入口"),
        ("idea_platform_url", "Idea Platform 地址"),
        ("mood_url", "今天的天气地址"),
    ):
        _https(links.get(key, ""), label)
    _items(site.get("nav"), "导航", nav=True)
    _items(site.get("footer"), "页脚", nav=False)
    sections = home.get("sections")
    if not isinstance(sections, list):
        raise ContentError("首页栏目格式不对")
    seen = []
    for item in sections:
        if not isinstance(item, dict) or item.get("id") not in SECTION_IDS or not isinstance(item.get("enabled"), bool):
            raise ContentError("首页栏目开关格式不对")
        seen.append(item["id"])
    if sorted(seen) != sorted(SECTION_IDS):
        raise ContentError("首页栏目需要保留原有五项，可以调整顺序和开关")
    _text(home.get("hero_primary_label", ""), "首屏主按钮", 40)
    _text(home.get("hero_secondary_label", ""), "首屏次按钮", 40)
    _href(home.get("hero_primary_href", ""), "首屏主按钮", allow_hash=True)
    _href(home.get("hero_secondary_href", ""), "首屏次按钮", allow_hash=True)
    _text(home.get("doing_title", ""), "我在做什么标题", 40)
    _text(home.get("doors_title", ""), "入口标题", 40)
    _text(home.get("doors_note", ""), "入口说明", 300)
    _text(home.get("about_title", ""), "首页关于标题", 40)
    _text(home.get("history_title", ""), "历史记录标题", 40)
    _cards(home.get("threads"), "正在做的事", ("title", "text", "href"))
    _cards(home.get("doors"), "入口卡片", ("dest", "title", "text", "action", "href"))
    _cards(home.get("history"), "历史记录", ("title", "text", "meta", "href"), href_hash=False)
    agent = home.get("agent")
    if not isinstance(agent, dict) or not isinstance(agent.get("enabled"), bool):
        raise ContentError("首页 Agent 区块格式不对")
    for key, label, limit in (
        ("dest", "Agent 区块眉题", 40),
        ("title", "Agent 区块标题", 40),
        ("text", "Agent 区块说明", 400),
        ("button", "复制按钮", 40),
        ("llms_label", "llms 链接文字", 40),
    ):
        _text(agent.get(key, ""), label, limit)
    for page_key in ("projects_page", "about_page", "agent_page", "resume"):
        if not isinstance(site.get(page_key), dict):
            raise ContentError("页面配置不完整")
    about = site["about_page"]
    for key in (
        "kicker", "title", "intro_before", "works_link_label", "intro_between",
        "writing_link_label", "intro_after", "archive_before", "projects_link_label",
        "archive_between", "posts_link_label", "archive_after", "email_label", "github_label",
    ):
        _text(about.get(key, ""), "关于页面", 200)
    extras = about.get("extra_paragraphs")
    if not isinstance(extras, list) or len(extras) > 12:
        raise ContentError("关于页面的补充段落格式不对")
    for paragraph in extras:
        _text(paragraph, "关于页面补充", 2000)
    projects_page = site["projects_page"]
    for key in (
        "kicker", "title", "description", "lede", "portal_kicker", "portal_title",
        "portal_text", "portal_action", "platform_label", "archive_label",
    ):
        _text(projects_page.get(key, ""), "作品页", 400)
    agent_page = site["agent_page"]
    for key in ("kicker", "title", "lede", "description", "copy_heading", "copy_button"):
        _text(agent_page.get(key, ""), "智能体页面", 400)
    resources = agent_page.get("resources")
    if not isinstance(resources, list) or len(resources) > 12:
        raise ContentError("智能体资源列表格式不对")
    for item in resources:
        if not isinstance(item, dict):
            raise ContentError("智能体资源格式不对")
        _href(item.get("href", ""), "智能体资源")
        _text(item.get("description", ""), "智能体资源说明", 200)
    _validate_resume(site["resume"])
    _reject_private(site)


def _items(items, label, nav):
    if not isinstance(items, list) or not items or len(items) > 12:
        raise ContentError(f"{label}至少保留一项")
    keys = []
    for item in items:
        if not isinstance(item, dict):
            raise ContentError(f"{label}格式不对")
        text = _text(item.get("label", ""), f"{label}文字", 40)
        if not text.strip():
            raise ContentError(f"{label}文字不能为空")
        _href(item.get("href", ""), f"{label}链接")
        if nav:
            key = item.get("key", "")
            if not isinstance(key, str) or not KEY_RE.fullmatch(key):
                raise ContentError(f"{label}标识格式不对")
            if not isinstance(item.get("enabled"), bool):
                raise ContentError(f"{label}开关格式不对")
            keys.append(key)
    if nav and len(keys) != len(set(keys)):
        raise ContentError("导航标识重复了")


def _cards(items, label, fields, href_hash=False):
    if not isinstance(items, list) or len(items) > 12:
        raise ContentError(f"{label}格式不对")
    for item in items:
        if not isinstance(item, dict):
            raise ContentError(f"{label}格式不对")
        for field in fields:
            if field == "href":
                _href(item.get("href", ""), label, allow_hash=href_hash)
            else:
                _text(item.get(field, ""), label, 400)


def _validate_resume(resume):
    if not isinstance(resume.get("enabled"), bool) or not isinstance(resume.get("show_in_nav"), bool):
        raise ContentError("简历页面开关格式不对")
    if not isinstance(resume.get("download"), bool):
        raise ContentError("简历下载开关格式不对")
    for key, limit in (
        ("nav_label", 20), ("kicker", 40), ("title", 80), ("summary", 2000),
        ("download_label", 40), ("print_label", 40),
    ):
        _text(resume.get(key, ""), "简历", limit)
    filename = resume.get("filename", "")
    if not isinstance(filename, str) or not RESUME_FILE_RE.fullmatch(filename):
        raise ContentError("简历下载文件名只能使用小写英文、数字和连字符，并以 .md 结尾")
    sections = resume.get("sections")
    if not isinstance(sections, list) or len(sections) > 20:
        raise ContentError("简历章节格式不对")
    for section in sections:
        if not isinstance(section, dict):
            raise ContentError("简历章节格式不对")
        _text(section.get("heading", ""), "简历章节标题", 80)
        _text(section.get("body", ""), "简历章节正文", 8000)


def _reject_private(site):
    payload = json.loads(json.dumps(site))
    allow_resume_word = bool(payload.get("resume", {}).get("enabled"))
    if not allow_resume_word:
        payload.pop("resume", None)
    hits = forbidden_hits(json.dumps(payload, ensure_ascii=False), allow_resume_word=allow_resume_word)
    resume_hits = [word for word in forbidden_hits(json.dumps(site.get("resume", {}), ensure_ascii=False), allow_resume_word=True)]
    hits.extend(word for word in resume_hits if word not in hits)
    if hits:
        raise ContentError("这些内容不能写入公开页面：" + "、".join(hits))


def validate_projects(projects):
    if not isinstance(projects, list):
        raise ContentError("作品列表格式不对")
    slugs = []
    for project in projects:
        if not isinstance(project, dict):
            raise ContentError("作品格式不对")
        slug = project.get("slug", "")
        if not isinstance(slug, str) or not SLUG_RE.fullmatch(slug):
            raise ContentError("作品网址标识只能用小写英文、数字和连字符")
        slugs.append(slug)
        if not str(project.get("name", "")).strip() or not str(project.get("problem", "")).strip():
            raise ContentError(f"{slug} 需要名称，也需要写明它解决什么问题")
        for key, limit in (
            ("name", 80), ("number", 12), ("kind", 40), ("problem", 400),
            ("summary", 600), ("stack", 80), ("source", 400),
        ):
            _text(project.get(key, ""), f"{slug} 的{key}", limit)
        group = project.get("group", "")
        if group not in {"selected", "tool", "experiment"}:
            raise ContentError(f"{slug} 的分组只能是 selected、tool 或 experiment")
        if project.get("diagram") not in {None, "idea", "touch", "resource", "mark"}:
            raise ContentError(f"{slug} 的示意图类型不正确")
        links = project.get("links")
        sections = project.get("sections")
        related = project.get("related")
        if not isinstance(links, list) or not isinstance(sections, list) or not isinstance(related, list):
            raise ContentError(f"{slug} 的链接或章节格式不对")
        if not links:
            raise ContentError(f"{slug} 至少需要一个链接")
        if len(links) > 8 or len(sections) > 8 or len(related) > 8:
            raise ContentError(f"{slug} 的条目过多")
        for link in links:
            if not isinstance(link, list) or len(link) != 2:
                raise ContentError(f"{slug} 的链接格式不对")
            _text(link[0], "链接文字", 40)
            _href(link[1], "作品链接")
        for section in sections:
            if not isinstance(section, list) or len(section) != 2:
                raise ContentError(f"{slug} 的章节格式不对")
            _text(section[0], "章节标题", 80)
            blocks = section[1]
            if not isinstance(blocks, list) or len(blocks) > 8:
                raise ContentError(f"{slug} 的章节内容格式不对")
            for block in blocks:
                if not isinstance(block, list) or not block:
                    raise ContentError(f"{slug} 的段落格式不对")
                if block[0] == "p" and len(block) == 2:
                    _text(block[1], "段落", 4000)
                elif block[0] == "ul" and len(block) == 2 and isinstance(block[1], list) and 0 < len(block[1]) <= 20:
                    for item in block[1]:
                        _text(item, "列表项", 400)
                else:
                    raise ContentError(f"{slug} 的段落类型只能是正文或列表")
    if len(slugs) != len(set(slugs)):
        raise ContentError("作品网址标识重复了")
    known = set(slugs)
    for project in projects:
        for related in project["related"]:
            if not isinstance(related, str) or related not in known or related == project["slug"]:
                raise ContentError(f"{project['slug']} 的相关作品不存在")
    hits = forbidden_hits(json.dumps(projects, ensure_ascii=False), allow_resume_word=False)
    if hits:
        raise ContentError("作品说明里有不能公开的内容：" + "、".join(hits))


def save_site(site):
    validate_site(site)
    previous = SITE_PATH.read_text(encoding="utf-8")
    write_json(SITE_PATH, site)
    return previous


def save_projects(projects):
    validate_projects(projects)
    previous = PROJECTS_PATH.read_text(encoding="utf-8")
    write_json(PROJECTS_PATH, projects)
    return previous


def restore_text(path, previous):
    path.write_text(previous, encoding="utf-8")


def list_posts():
    from posts import LEGACY_SLUGS

    items = []
    for path in sorted(POSTS_DIR.glob("*.md"), key=lambda item: item.name):
        if path.name == "README.md":
            continue
        text = path.read_text(encoding="utf-8")
        legacy = path.name in LEGACY_SLUGS
        if not legacy and not text.startswith("---\n"):
            continue
        meta, _body = parse_post(text)
        slug = LEGACY_SLUGS[path.name] if legacy else meta.get("slug", "")
        items.append({
            "filename": path.name,
            "title": meta.get("title", path.stem),
            "date": str(meta.get("date", "")),
            "slug": slug,
            "draft": meta.get("draft") == "true",
            "legacy": legacy,
            "tags": _as_list(meta.get("tags")),
            "categories": _as_list(meta.get("categories")),
        })
    return items


def read_post_source(filename):
    path = post_path(filename)
    meta, body = parse_post(path.read_text(encoding="utf-8"))
    from posts import LEGACY_SLUGS

    legacy = filename in LEGACY_SLUGS
    return {
        "filename": filename,
        "title": meta.get("title", path.stem),
        "date": str(meta.get("date", "")),
        "slug": LEGACY_SLUGS[filename] if legacy else meta.get("slug", ""),
        "draft": meta.get("draft") == "true",
        "legacy": legacy,
        "tags": _as_list(meta.get("tags")),
        "categories": _as_list(meta.get("categories")),
        "body": body.lstrip("\n"),
    }


def write_post_source(payload):
    from posts import LEGACY_SLUGS, publishable_post_body

    if not isinstance(payload, dict):
        raise ContentError("文章格式不对")
    filename = safe_post_name(payload.get("filename", ""))
    original = payload.get("original_filename") or filename
    original = safe_post_name(original)
    legacy = original in LEGACY_SLUGS
    creating = bool(payload.get("creating"))
    title = _text(payload.get("title", ""), "文章标题", 200).strip()
    if not title:
        raise ContentError("文章标题不能为空")
    date = _text(payload.get("date", ""), "文章日期", 40).strip()
    try:
        datetime.fromisoformat(date)
    except ValueError as error:
        raise ContentError("文章日期需要是 2026-09-27T12:00:00+08:00 这样的格式") from error
    draft = bool(payload.get("draft"))
    tags = _string_list(payload.get("tags"), "标签")
    categories = _string_list(payload.get("categories"), "分类")
    body = payload.get("body", "")
    if not isinstance(body, str) or len(body) > 200_000:
        raise ContentError("文章正文格式不对")
    if legacy:
        if filename != original:
            raise ContentError("旧文章的文件名不能修改，否则原来的网址会失效")
        slug = LEGACY_SLUGS[original]
        stored_slug = None
    else:
        slug = _text(payload.get("slug", ""), "文章网址", 80).strip()
        if not SLUG_RE.fullmatch(slug):
            raise ContentError("新文章的网址只能用小写英文、数字和连字符")
        if slug in LEGACY_SLUGS.values():
            raise ContentError("这个网址已经被一篇旧文章使用")
        filename = f"{slug}.md"
        stored_slug = slug
    target = POSTS_DIR / filename
    source = target if creating else POSTS_DIR / original
    if creating:
        if target.exists():
            raise ContentError("已经有同名文章")
    elif not source.is_file():
        raise ContentError("找不到原来的文章")
    elif target.exists() and target != source:
        raise ContentError("已经有同名文章")
    publishable = "\n".join([title, slug, " ".join(tags), " ".join(categories), publishable_post_body(body)])
    hits = forbidden_hits(publishable, allow_resume_word=False)
    if hits:
        raise ContentError("文章里有不能公开的内容：" + "、".join(hits))
    text = render_post(title, date, draft, tags, categories, body, stored_slug)
    previous = source.read_text(encoding="utf-8") if source.exists() else None
    target.write_text(text, encoding="utf-8")
    if source != target and source.exists():
        source.unlink()
    return previous, source, target


def delete_post_source(filename):
    path = post_path(filename)
    if filename == "README.md":
        raise ContentError("目录说明不能删除")
    previous = path.read_text(encoding="utf-8")
    path.unlink()
    return previous, path


def parse_post(text):
    if not text.startswith("---\n"):
        raise ContentError("文章缺少文件头")
    header, separator, body = text[4:].partition("\n---\n")
    if not separator:
        raise ContentError("文章文件头没有结束")
    meta = {}
    for line in header.splitlines():
        key, found, value = line.partition(":")
        if not found:
            continue
        value = value.strip()
        if value.startswith(('"', "[")):
            value = json.loads(value)
        meta[key.strip()] = value
    return meta, body


def render_post(title, date, draft, tags, categories, body, slug):
    lines = ["---", f"title: {json.dumps(title, ensure_ascii=False)}", f"date: {date}", f"draft: {'true' if draft else 'false'}"]
    if slug:
        lines.append(f"slug: {slug}")
    if tags:
        lines.append("tags: " + json.dumps(tags, ensure_ascii=False))
    if categories:
        lines.append("categories: " + json.dumps(categories, ensure_ascii=False))
    lines.append("---")
    body = body.strip("\n")
    return "\n".join(lines) + "\n\n" + body + "\n"


def post_path(filename):
    name = safe_post_name(filename)
    path = POSTS_DIR / name
    if not path.is_file():
        raise ContentError("找不到这篇文章")
    return path


def safe_post_name(filename):
    if not isinstance(filename, str) or filename != Path(filename).name or not filename.endswith(".md"):
        raise ContentError("文章文件名需要以 .md 结尾")
    if filename.startswith(".") or "/" in filename or "\\" in filename:
        raise ContentError("文章文件名不能包含路径")
    return filename


def _as_list(value):
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    return [str(value)]


def _string_list(value, label):
    if value in (None, ""):
        return []
    if isinstance(value, str):
        value = [part.strip() for part in value.split(",") if part.strip()]
    if not isinstance(value, list) or len(value) > 12:
        raise ContentError(f"{label}格式不对")
    return [_text(item, label, 40).strip() for item in value]


def public_config(site):
    data = json.loads(json.dumps(site))
    resume = data.get("resume") if isinstance(data.get("resume"), dict) else {}
    if not resume.get("enabled"):
        data["resume"] = {"enabled": False, "show_in_nav": False}
    return data


def config_hash(site):
    raw = json.dumps(public_config(site), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def resolve_href(value, site):
    identity = site["identity"]
    links = site["links"]
    replacements = {
        "{works_url}": links["works_url"],
        "{idea_platform_url}": links["idea_platform_url"],
        "{mood_url}": links["mood_url"],
        "{github}": identity["github"],
        "{email}": identity["email"],
    }
    for token, replacement in replacements.items():
        value = value.replace(token, replacement)
    return value
