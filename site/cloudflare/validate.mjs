const PRIVATE_TERMS = [
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
];
const RESUME_WORD = "简历";
const SECTION_IDS = ["hero", "doing", "doors", "about", "history"];
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KEY_RE = /^[a-z][a-z0-9-]{0,40}$/;
const HANDLE_RE = /^[A-Za-z0-9-]{1,39}$/;
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const RESUME_FILE_RE = /^[a-z0-9][a-z0-9.-]{0,40}\.md$/;
const HASH_RE = /^#[A-Za-z][A-Za-z0-9_-]{0,40}$/;
const CLIENT_RE = /^[A-Za-z0-9._-]{8,100}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const TOKENS = new Set(["{works_url}", "{idea_platform_url}", "{mood_url}", "{github}", "{email}"]);

export const LEGACY_SLUGS = {
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
};

function fail(message) {
  const error = new Error(message);
  error.status = 400;
  throw error;
}

function ulen(value) {
  return [...value].length;
}

function text(value, label, limit) {
  if (typeof value !== "string") fail(`${label}需要是文字`);
  if (value.includes("\u0000")) fail(`${label}含有不能使用的字符`);
  if (ulen(value) > limit) fail(`${label}过长`);
  return value;
}

function https(value, label) {
  value = text(value, label, 300);
  if (!value.startsWith("https://") || /[ \n\r\t"'<>]/.test(value)) fail(`${label}需要是 https 链接`);
  return value;
}

function href(value, label, allowHash) {
  value = text(value, label, 300);
  if (TOKENS.has(value) || value === "mailto:{email}") return value;
  if (value.startsWith("/") && !value.includes("..") && !value.includes("\\") && !value.includes("\n") && !value.includes(" ")) return value;
  if (value.startsWith("https://") && !/[ \n\r\t"'<>]/.test(value)) return value;
  if (value.startsWith("mailto:") && !/[ \n\r\t"'<>]/.test(value)) return value;
  if (allowHash && HASH_RE.test(value)) return value;
  fail(`${label}的链接格式不正确`);
}

export function forbiddenHits(value, allowResumeWord) {
  const lowered = value.toLowerCase();
  const hits = PRIVATE_TERMS.filter((word) => lowered.includes(word.toLowerCase()));
  if (!allowResumeWord && value.includes(RESUME_WORD)) hits.push(RESUME_WORD);
  return hits;
}

function items(list, label, nav) {
  if (!Array.isArray(list) || list.length === 0 || list.length > 12) fail(`${label}至少保留一项`);
  const keys = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(`${label}格式不对`);
    const labelText = text(item.label ?? "", `${label}文字`, 40);
    if (!labelText.trim()) fail(`${label}文字不能为空`);
    href(item.href ?? "", `${label}链接`);
    if (nav) {
      if (typeof item.key !== "string" || !KEY_RE.test(item.key)) fail(`${label}标识格式不对`);
      if (typeof item.enabled !== "boolean") fail(`${label}开关格式不对`);
      keys.push(item.key);
    }
  }
  if (nav && new Set(keys).size !== keys.length) fail("导航标识重复了");
}

function cards(list, label, fields) {
  if (!Array.isArray(list) || list.length > 12) fail(`${label}格式不对`);
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail(`${label}格式不对`);
    for (const field of fields) {
      if (field === "href") href(item.href ?? "", label, false);
      else text(item[field] ?? "", label, 400);
    }
  }
}

function validateResume(resume) {
  if (typeof resume.enabled !== "boolean" || typeof resume.show_in_nav !== "boolean") fail("简历页面开关格式不对");
  if (typeof resume.download !== "boolean") fail("简历下载开关格式不对");
  for (const [key, limit] of [
    ["nav_label", 20], ["kicker", 40], ["title", 80], ["summary", 2000],
    ["download_label", 40], ["print_label", 40],
  ]) text(resume[key] ?? "", "简历", limit);
  if (typeof resume.filename !== "string" || !RESUME_FILE_RE.test(resume.filename)) {
    fail("简历下载文件名只能使用小写英文、数字和连字符，并以 .md 结尾");
  }
  if (!Array.isArray(resume.sections) || resume.sections.length > 20) fail("简历章节格式不对");
  for (const section of resume.sections) {
    if (!section || typeof section !== "object" || Array.isArray(section)) fail("简历章节格式不对");
    text(section.heading ?? "", "简历章节标题", 80);
    text(section.body ?? "", "简历章节正文", 8000);
  }
}

function rejectPrivate(site) {
  const payload = JSON.parse(JSON.stringify(site));
  const allowResumeWord = !!(payload.resume && payload.resume.enabled);
  if (!allowResumeWord) delete payload.resume;
  const hits = forbiddenHits(JSON.stringify(payload), allowResumeWord);
  for (const word of forbiddenHits(JSON.stringify(site.resume || {}), true)) {
    if (!hits.includes(word)) hits.push(word);
  }
  if (hits.length) fail("这些内容不能写入公开页面：" + hits.join("、"));
}

export function validateSite(site) {
  if (!site || typeof site !== "object" || Array.isArray(site)) fail("站点配置格式不对");
  const identity = site.identity;
  const links = site.links;
  const home = site.home;
  if (!identity || typeof identity !== "object" || !links || typeof links !== "object" || !home || typeof home !== "object") {
    fail("站点配置缺少介绍、链接或首页");
  }
  text(site.site_title ?? "", "网站标题", 80);
  text(site.brand ?? "", "站点名称", 40);
  text(site.prompt ?? "", "交给 Agent 的提示词", 2000);
  for (const [key, label, limit] of [
    ["who", "身份介绍", 200],
    ["intro", "标题", 80],
    ["tagline", "副标题", 120],
    ["background", "背景", 400],
    ["about", "关于正文", 2000],
    ["doing", "我在做什么", 2000],
  ]) text(identity[key] ?? "", label, limit);
  const email = text(identity.email ?? "", "邮箱", 120);
  if (!EMAIL_RE.test(email)) fail("邮箱格式不正确");
  https(identity.github ?? "", "GitHub 地址");
  if (typeof identity.github_handle !== "string" || !HANDLE_RE.test(identity.github_handle)) fail("GitHub 用户名格式不正确");
  if (!Array.isArray(identity.keywords) || identity.keywords.length > 12) fail("关键词需要是列表");
  for (const word of identity.keywords) text(word, "关键词", 20);
  for (const [key, label] of [
    ["works_url", "作品入口"],
    ["idea_platform_url", "Idea Platform 地址"],
    ["mood_url", "今天的天气地址"],
  ]) https(links[key] ?? "", label);
  items(site.nav, "导航", true);
  items(site.footer, "页脚", false);
  if (!Array.isArray(home.sections)) fail("首页栏目格式不对");
  const seen = [];
  for (const item of home.sections) {
    if (!item || typeof item !== "object" || !SECTION_IDS.includes(item.id) || typeof item.enabled !== "boolean") {
      fail("首页栏目开关格式不对");
    }
    seen.push(item.id);
  }
  if (seen.slice().sort().join() !== SECTION_IDS.slice().sort().join()) {
    fail("首页栏目需要保留原有五项，可以调整顺序和开关");
  }
  text(home.hero_primary_label ?? "", "首屏主按钮", 40);
  text(home.hero_secondary_label ?? "", "首屏次按钮", 40);
  href(home.hero_primary_href ?? "", "首屏主按钮", true);
  href(home.hero_secondary_href ?? "", "首屏次按钮", true);
  text(home.doing_title ?? "", "我在做什么标题", 40);
  text(home.doors_title ?? "", "入口标题", 40);
  text(home.doors_note ?? "", "入口说明", 300);
  text(home.about_title ?? "", "首页关于标题", 40);
  text(home.history_title ?? "", "历史记录标题", 40);
  cards(home.threads, "正在做的事", ["title", "text", "href"]);
  cards(home.doors, "入口卡片", ["dest", "title", "text", "action", "href"]);
  cards(home.history, "历史记录", ["title", "text", "meta", "href"]);
  const agent = home.agent;
  if (!agent || typeof agent !== "object" || typeof agent.enabled !== "boolean") fail("首页 Agent 区块格式不对");
  for (const [key, label, limit] of [
    ["dest", "Agent 区块眉题", 40],
    ["title", "Agent 区块标题", 40],
    ["text", "Agent 区块说明", 400],
    ["button", "复制按钮", 40],
    ["llms_label", "llms 链接文字", 40],
  ]) text(agent[key] ?? "", label, limit);
  for (const pageKey of ["projects_page", "about_page", "agent_page", "resume"]) {
    if (!site[pageKey] || typeof site[pageKey] !== "object" || Array.isArray(site[pageKey])) fail("页面配置不完整");
  }
  const about = site.about_page;
  for (const key of [
    "kicker", "title", "intro_before", "works_link_label", "intro_between",
    "writing_link_label", "intro_after", "archive_before", "projects_link_label",
    "archive_between", "posts_link_label", "archive_after", "email_label", "github_label",
  ]) text(about[key] ?? "", "关于页面", 200);
  if (!Array.isArray(about.extra_paragraphs) || about.extra_paragraphs.length > 12) fail("关于页面的补充段落格式不对");
  for (const paragraph of about.extra_paragraphs) text(paragraph, "关于页面补充", 2000);
  const projectsPage = site.projects_page;
  for (const key of [
    "kicker", "title", "description", "lede", "portal_kicker", "portal_title",
    "portal_text", "portal_action", "platform_label", "archive_label",
  ]) text(projectsPage[key] ?? "", "作品页", 400);
  const agentPage = site.agent_page;
  for (const key of ["kicker", "title", "lede", "description", "copy_heading", "copy_button"]) {
    text(agentPage[key] ?? "", "智能体页面", 400);
  }
  if (!Array.isArray(agentPage.resources) || agentPage.resources.length > 12) fail("智能体资源列表格式不对");
  for (const item of agentPage.resources) {
    if (!item || typeof item !== "object" || Array.isArray(item)) fail("智能体资源格式不对");
    href(item.href ?? "", "智能体资源");
    text(item.description ?? "", "智能体资源说明", 200);
  }
  validateResume(site.resume);
  rejectPrivate(site);
}

export function validateProjects(projects) {
  if (!Array.isArray(projects)) fail("作品列表格式不对");
  const slugs = [];
  for (const project of projects) {
    if (!project || typeof project !== "object" || Array.isArray(project)) fail("作品格式不对");
    const slug = project.slug ?? "";
    if (typeof slug !== "string" || !SLUG_RE.test(slug)) fail("作品网址标识只能用小写英文、数字和连字符");
    slugs.push(slug);
    if (!String(project.name ?? "").trim() || !String(project.problem ?? "").trim()) {
      fail(`${slug} 需要名称，也需要写明它解决什么问题`);
    }
    for (const [key, limit] of [
      ["name", 80], ["number", 12], ["kind", 40], ["problem", 400],
      ["summary", 600], ["stack", 80], ["source", 400],
    ]) text(project[key] ?? "", `${slug} 的${key}`, limit);
    if (!["selected", "tool", "experiment"].includes(project.group)) fail(`${slug} 的分组只能是 selected、tool 或 experiment`);
    if (![null, "idea", "touch", "resource", "mark"].includes(project.diagram)) fail(`${slug} 的示意图类型不正确`);
    const links = project.links;
    const sections = project.sections;
    const related = project.related;
    if (!Array.isArray(links) || !Array.isArray(sections) || !Array.isArray(related)) fail(`${slug} 的链接或章节格式不对`);
    if (!links.length) fail(`${slug} 至少需要一个链接`);
    if (links.length > 8 || sections.length > 8 || related.length > 8) fail(`${slug} 的条目过多`);
    for (const link of links) {
      if (!Array.isArray(link) || link.length !== 2) fail(`${slug} 的链接格式不对`);
      text(link[0], "链接文字", 40);
      href(link[1], "作品链接");
    }
    for (const section of sections) {
      if (!Array.isArray(section) || section.length !== 2) fail(`${slug} 的章节格式不对`);
      text(section[0], "章节标题", 80);
      const blocks = section[1];
      if (!Array.isArray(blocks) || blocks.length > 8) fail(`${slug} 的章节内容格式不对`);
      for (const block of blocks) {
        if (!Array.isArray(block) || !block.length) fail(`${slug} 的段落格式不对`);
        if (block[0] === "p" && block.length === 2) text(block[1], "段落", 4000);
        else if (block[0] === "ul" && block.length === 2 && Array.isArray(block[1]) && block[1].length > 0 && block[1].length <= 20) {
          for (const item of block[1]) text(item, "列表项", 400);
        } else fail(`${slug} 的段落类型只能是正文或列表`);
      }
    }
  }
  if (new Set(slugs).size !== slugs.length) fail("作品网址标识重复了");
  const known = new Set(slugs);
  for (const project of projects) {
    for (const related of project.related) {
      if (typeof related !== "string" || !known.has(related) || related === project.slug) {
        fail(`${project.slug} 的相关作品不存在`);
      }
    }
  }
  const hits = forbiddenHits(JSON.stringify(projects), false);
  if (hits.length) fail("作品说明里有不能公开的内容：" + hits.join("、"));
}

export function publicConfig(site) {
  const data = JSON.parse(JSON.stringify(site));
  if (!data.resume || !data.resume.enabled) data.resume = { enabled: false, show_in_nav: false };
  return data;
}

export function validOauth(config) {
  if (!config || typeof config !== "object") return false;
  return CLIENT_RE.test(config.client_id || "") && typeof config.client_secret === "string" && /^\S{8,200}$/.test(config.client_secret);
}

function safePostName(filename) {
  if (typeof filename !== "string" || filename !== filename.split(/[/\\]/).pop() || !filename.endsWith(".md")) {
    fail("文章文件名需要以 .md 结尾");
  }
  if (filename.startsWith(".") || filename.includes("/") || filename.includes("\\")) fail("文章文件名不能包含路径");
  return filename;
}

function asList(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

function stringList(value, label) {
  if (value == null || value === "") return [];
  if (typeof value === "string") value = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (!Array.isArray(value) || value.length > 12) fail(`${label}格式不对`);
  return value.map((item) => text(item, label, 40).trim());
}

function parsePost(markdown) {
  if (!markdown.startsWith("---\n")) fail("文章缺少文件头");
  const rest = markdown.slice(4);
  const end = rest.indexOf("\n---\n");
  if (end < 0) fail("文章文件头没有结束");
  const header = rest.slice(0, end);
  const body = rest.slice(end + 5);
  const meta = {};
  for (const line of header.split("\n")) {
    const index = line.indexOf(":");
    if (index < 0) continue;
    let value = line.slice(index + 1).trim();
    if (value.startsWith('"') || value.startsWith("[")) value = JSON.parse(value);
    meta[line.slice(0, index).trim()] = value;
  }
  return { meta, body };
}

function publishablePostBody(body) {
  return body.replaceAll("易搜(yisou.xin)", "一个实验项目").replaceAll("易搜（yisou.xin）", "一个实验项目");
}

function renderPost(title, date, draft, tags, categories, body, slug) {
  const lines = ["---", `title: ${JSON.stringify(title)}`, `date: ${date}`, `draft: ${draft ? "true" : "false"}`];
  if (slug) lines.push(`slug: ${slug}`);
  if (tags.length) lines.push("tags: " + JSON.stringify(tags));
  if (categories.length) lines.push("categories: " + JSON.stringify(categories));
  lines.push("---");
  return lines.join("\n") + "\n\n" + body.replace(/^\n+|\n+$/g, "") + "\n";
}

export function listPosts(store) {
  const names = Object.keys(store || {}).filter((name) => name !== "README.md").sort((a, b) => a.localeCompare(b));
  const items = [];
  for (const filename of names) {
    const markdown = store[filename];
    const legacy = Object.prototype.hasOwnProperty.call(LEGACY_SLUGS, filename);
    if (!legacy && !String(markdown).startsWith("---\n")) continue;
    const { meta } = parsePost(markdown);
    items.push({
      filename,
      title: meta.title || filename.replace(/\.md$/, ""),
      date: String(meta.date ?? ""),
      slug: legacy ? LEGACY_SLUGS[filename] : (meta.slug || ""),
      draft: meta.draft === "true" || meta.draft === true,
      legacy,
      tags: asList(meta.tags),
      categories: asList(meta.categories),
    });
  }
  return items;
}

export function readPost(store, filename) {
  const name = safePostName(filename);
  if (!store || typeof store[name] !== "string") fail("找不到这篇文章");
  const { meta, body } = parsePost(store[name]);
  const legacy = Object.prototype.hasOwnProperty.call(LEGACY_SLUGS, name);
  return {
    filename: name,
    title: meta.title || name.replace(/\.md$/, ""),
    date: String(meta.date ?? ""),
    slug: legacy ? LEGACY_SLUGS[name] : (meta.slug || ""),
    draft: meta.draft === "true" || meta.draft === true,
    legacy,
    tags: asList(meta.tags),
    categories: asList(meta.categories),
    body: body.replace(/^\n+/, ""),
  };
}

export function writePost(store, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail("文章格式不对");
  const next = { ...(store || {}) };
  let filename = safePostName(payload.filename || "");
  const original = safePostName(payload.original_filename || filename);
  const legacy = Object.prototype.hasOwnProperty.call(LEGACY_SLUGS, original);
  const creating = !!payload.creating;
  const title = text(payload.title ?? "", "文章标题", 200).trim();
  if (!title) fail("文章标题不能为空");
  const date = text(payload.date ?? "", "文章日期", 40).trim();
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) fail("文章日期需要是 2026-09-27T12:00:00+08:00 这样的格式");
  const draft = !!payload.draft;
  const tags = stringList(payload.tags, "标签");
  const categories = stringList(payload.categories, "分类");
  const body = payload.body ?? "";
  if (typeof body !== "string" || ulen(body) > 200000) fail("文章正文格式不对");
  let slug;
  let storedSlug = null;
  if (legacy) {
    if (filename !== original) fail("旧文章的文件名不能修改，否则原来的网址会失效");
    slug = LEGACY_SLUGS[original];
  } else {
    slug = text(payload.slug ?? "", "文章网址", 80).trim();
    if (!SLUG_RE.test(slug)) fail("新文章的网址只能用小写英文、数字和连字符");
    if (Object.values(LEGACY_SLUGS).includes(slug)) fail("这个网址已经被一篇旧文章使用");
    filename = `${slug}.md`;
    storedSlug = slug;
  }
  if (creating) {
    if (Object.prototype.hasOwnProperty.call(next, filename)) fail("已经有同名文章");
  } else if (!Object.prototype.hasOwnProperty.call(next, original)) fail("找不到原来的文章");
  else if (filename !== original && Object.prototype.hasOwnProperty.call(next, filename)) fail("已经有同名文章");
  const publishable = [title, slug, tags.join(" "), categories.join(" "), publishablePostBody(body)].join("\n");
  const hits = forbiddenHits(publishable, false);
  if (hits.length) fail("文章里有不能公开的内容：" + hits.join("、"));
  if (!creating && filename !== original) delete next[original];
  next[filename] = renderPost(title, date, draft, tags, categories, body, storedSlug);
  return next;
}

export function deletePost(store, filename) {
  const name = safePostName(filename);
  if (name === "README.md") fail("目录说明不能删除");
  if (!store || typeof store[name] !== "string") fail("找不到这篇文章");
  const next = { ...store };
  delete next[name];
  return next;
}
