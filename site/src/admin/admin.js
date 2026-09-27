(function () {
  const PANELS = [
    ["layout", "页面布局", "/"],
    ["copy", "文案与介绍", "/"],
    ["nav", "导航栏", "/"],
    ["about", "关于页面", "/about"],
    ["resume", "简历与下载", "/resume"],
    ["works", "旧作品", "/projects"],
    ["posts", "旧文章", "/posts/"],
  ];
  const SECTION_NAMES = {
    hero: "首屏",
    doing: "我在做什么",
    doors: "从这里继续",
    about: "关于",
    history: "历史记录",
  };
  const DEFAULT_LAYOUT = {
    sections: [
      { id: "hero", enabled: true },
      { id: "doing", enabled: true },
      { id: "doors", enabled: true },
      { id: "about", enabled: true },
      { id: "history", enabled: true },
    ],
    hero_primary_label: "了解我",
    hero_primary_href: "#about",
    hero_secondary_label: "看我在做什么",
    hero_secondary_href: "#doing",
    agentEnabled: true,
  };
  const state = { panel: "layout", site: null, projects: null, posts: null, project: null, post: null };

  const login = document.querySelector("#login");
  const app = document.querySelector("#app");
  const panel = document.querySelector("#panel");
  const status = document.querySelector("#status");
  const menu = document.querySelector("#menu");

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(function (entry) {
      const key = entry[0];
      const value = entry[1];
      if (key === "class") node.className = value;
      else if (key.slice(0, 2) === "on" && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value === true) node.setAttribute(key, "");
      else if (value !== false && value != null) node.setAttribute(key, value);
    });
    (children || []).forEach(function (child) {
      node.append(child instanceof Node ? child : document.createTextNode(child));
    });
    return node;
  }

  function field(label, value, oninput, multiline) {
    const input = el(multiline ? "textarea" : "input");
    if (multiline && (label === "正文" || label === "章节正文，可以使用 Markdown")) input.rows = 16;
    input.value = value || "";
    input.addEventListener("input", function () { oninput(input.value); });
    return el("label", { class: "field" }, [el("span", {}, [label]), input]);
  }

  function checkbox(label, checked, onchange) {
    const input = el("input", { type: "checkbox" });
    input.checked = !!checked;
    input.addEventListener("change", function () { onchange(input.checked); });
    return el("label", { class: "check" }, [input, el("span", { class: "check-label" }, [label])]);
  }

  function note(text) { return el("p", { class: "note" }, [text]); }

  function setStatus(text, kind) {
    [status, document.querySelector("#login-status")].forEach(function (node) {
      if (!node) return;
      node.textContent = text || "";
      node.className = "status" + (kind ? " " + kind : "");
    });
  }

  async function api(path, options) {
    const response = await fetch(path, Object.assign({
      headers: { "Content-Type": "application/json", "X-Admin": "1" },
    }, options || {}));
    const data = await response.json().catch(function () { return {}; });
    if (response.status === 401) {
      showLogin();
      const denied = new Error("需要重新登录");
      denied.login = true;
      throw denied;
    }
    if (!response.ok) throw new Error(data.error || "请求失败");
    return data;
  }

  async function run(action) {
    setStatus("正在保存并更新本地预览…");
    try {
      const data = await action();
      setStatus(data.message || "已保存，本地预览已更新", "ok");
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function saveBar(action, href) {
    return el("div", { class: "savebar" }, [
      el("button", { class: "button primary", type: "button", onclick: function () { run(action); } }, ["保存并更新预览"]),
      el("a", { class: "button", href: href, target: "_blank" }, ["打开预览"]),
    ]);
  }

  function move(list, index, delta) {
    const next = index + delta;
    if (next < 0 || next >= list.length) return;
    const item = list.splice(index, 1)[0];
    list.splice(next, 0, item);
    render();
  }

  function nudge(list, index) {
    return [
      el("button", { class: "button small", type: "button", disabled: index === 0, onclick: function () { move(list, index, -1); } }, ["上移"]),
      el("button", { class: "button small", type: "button", disabled: index === list.length - 1, onclick: function () { move(list, index, 1); } }, ["下移"]),
    ];
  }

  function showLogin() {
    app.hidden = true;
    login.hidden = false;
  }

  function showApp() {
    login.hidden = true;
    app.hidden = false;
    setStatus("");
    renderMenu();
    render();
  }

  function renderMenu() {
    menu.replaceChildren();
    PANELS.forEach(function (item) {
      menu.append(el("button", {
        type: "button",
        "aria-current": state.panel === item[0] ? "page" : false,
        onclick: function () { state.panel = item[0]; renderMenu(); render(); },
      }, [item[1]]));
    });
  }

  function render() {
    const current = PANELS.find(function (item) { return item[0] === state.panel; });
    document.querySelector("#panel-title").textContent = current[1];
    panel.replaceChildren();
    if (state.panel === "layout") renderLayout();
    else if (state.panel === "copy") renderCopy();
    else if (state.panel === "nav") renderNav();
    else if (state.panel === "about") renderAbout();
    else if (state.panel === "resume") renderResume();
    else if (state.panel === "works") renderWorks();
    else renderPosts();
  }

  function saveSite() {
    return api("/admin/api/site", { method: "PUT", body: JSON.stringify(state.site) });
  }

  function layoutField(label, value, oninput) {
    const input = el("input");
    input.value = value || "";
    input.addEventListener("input", function () { oninput(input.value); });
    return el("label", { class: "layout-field" }, [el("span", {}, [label]), input]);
  }

  function restoreLayout() {
    if (!window.confirm("恢复首页的默认栏目顺序、显示开关和首屏按钮？")) return;
    const home = state.site.home;
    home.sections = DEFAULT_LAYOUT.sections.map(function (section) {
      return { id: section.id, enabled: section.enabled };
    });
    home.hero_primary_label = DEFAULT_LAYOUT.hero_primary_label;
    home.hero_primary_href = DEFAULT_LAYOUT.hero_primary_href;
    home.hero_secondary_label = DEFAULT_LAYOUT.hero_secondary_label;
    home.hero_secondary_href = DEFAULT_LAYOUT.hero_secondary_href;
    home.agent.enabled = DEFAULT_LAYOUT.agentEnabled;
    render();
    run(saveSite);
  }

  function renderLayout() {
    const home = state.site.home;
    const list = el("div", { class: "layout-lines" });
    home.sections.forEach(function (section, index) {
      list.append(el("div", { class: "layout-line" }, [
        checkbox(SECTION_NAMES[section.id], section.enabled, function (value) { section.enabled = value; }),
        el("div", { class: "row" }, nudge(home.sections, index)),
      ]));
    });
    const bar = saveBar(saveSite, "/");
    bar.insertBefore(el("button", { class: "button", type: "button", onclick: restoreLayout }, ["恢复默认"]), bar.lastChild);
    panel.append(
      bar,
      note("五个栏目都保留。可以调整顺序，也可以暂时隐藏。隐藏「从这里继续」时，首页里交给 Agent 的那一块会一起隐藏，智能体页面仍然在。"),
      list,
      el("h2", {}, ["首屏按钮"]),
      el("div", { class: "layout-fields" }, [
        layoutField("主按钮文字", home.hero_primary_label, function (value) { home.hero_primary_label = value; }),
        layoutField("主按钮链接", home.hero_primary_href, function (value) { home.hero_primary_href = value; }),
        layoutField("次按钮文字", home.hero_secondary_label, function (value) { home.hero_secondary_label = value; }),
        layoutField("次按钮链接", home.hero_secondary_href, function (value) { home.hero_secondary_href = value; }),
      ]),
      el("div", { class: "switch-row" }, [
        checkbox("显示首页里的 Agent 区块", home.agent.enabled, function (value) { home.agent.enabled = value; }),
      ])
    );
  }

  function renderCopy() {
    const site = state.site;
    const identity = site.identity;
    const home = site.home;
    panel.append(
      saveBar(saveSite, "/"),
      note("这里的文字会同时出现在首页、关于页，以及交给 Agent 的 llms.txt 和 profile。"),
      field("站点名称", site.brand, function (value) { site.brand = value; }),
      field("身份介绍", identity.who, function (value) { identity.who = value; }),
      field("标题", identity.intro, function (value) { identity.intro = value; }),
      field("副标题", identity.tagline, function (value) { identity.tagline = value; }),
      note("标题和副标题会连在一起显示。标题里已经包含句号。"),
      field("背景", identity.background, function (value) { identity.background = value; }, true),
      field("关于", identity.about, function (value) { identity.about = value; }, true),
      field("我在做什么", identity.doing, function (value) { identity.doing = value; }, true),
      field("关键词，每行一个", identity.keywords.join("\n"), function (value) {
        identity.keywords = value.split("\n").map(function (item) { return item.trim(); }).filter(Boolean);
      }, true),
      field("邮箱", identity.email, function (value) { identity.email = value; }),
      field("GitHub 地址", identity.github, function (value) { identity.github = value; }),
      field("GitHub 用户名", identity.github_handle, function (value) { identity.github_handle = value; }),
      field("作品入口", site.links.works_url, function (value) { site.links.works_url = value; }),
      field("Idea Platform", site.links.idea_platform_url, function (value) { site.links.idea_platform_url = value; }),
      field("今天的天气", site.links.mood_url, function (value) { site.links.mood_url = value; }),
      field("交给 Agent 的提示词", site.prompt, function (value) { site.prompt = value; }, true),
      el("h2", {}, ["正在做的事"]),
      field("小标题", home.doing_title, function (value) { home.doing_title = value; }),
      cards(home.threads, ["title", "text", "href"], ["标题", "说明", "链接"], function () {
        home.threads.push({ title: "新事项", text: "", href: "https://" });
      }),
      el("h2", {}, ["入口卡片"]),
      field("小标题", home.doors_title, function (value) { home.doors_title = value; }),
      field("说明", home.doors_note, function (value) { home.doors_note = value; }, true),
      cards(home.doors, ["dest", "title", "text", "action", "href"], ["眉题", "标题", "说明", "动作", "链接"], function () {
        home.doors.push({ dest: "入口", title: "新入口", text: "", action: "打开", href: "https://" });
      }),
      el("h2", {}, ["首页 Agent 区块"]),
      field("眉题", home.agent.dest, function (value) { home.agent.dest = value; }),
      field("标题", home.agent.title, function (value) { home.agent.title = value; }),
      field("说明", home.agent.text, function (value) { home.agent.text = value; }, true),
      field("复制按钮", home.agent.button, function (value) { home.agent.button = value; }),
      field("llms 链接文字", home.agent.llms_label, function (value) { home.agent.llms_label = value; }),
      el("h2", {}, ["历史记录"]),
      field("小标题", home.history_title, function (value) { home.history_title = value; }),
      cards(home.history, ["title", "text", "meta", "href"], ["标题", "说明", "标记", "链接"], function () {
        home.history.push({ title: "新记录", text: "", meta: "留在本站", href: "/" });
      })
    );
  }

  function cards(items, keys, labels, add) {
    const box = el("div", { class: "stack" });
    items.forEach(function (item, index) {
      const card = el("div", { class: "card" });
      keys.forEach(function (key, keyIndex) {
        card.append(field(labels[keyIndex], item[key], function (value) { item[key] = value; }, key === "text"));
      });
      card.append(el("div", { class: "row" }, nudge(items, index).concat([
        el("button", { class: "button small danger", type: "button", onclick: function () { items.splice(index, 1); render(); } }, ["删除"]),
      ])));
      box.append(card);
    });
    box.append(el("button", { class: "button", type: "button", onclick: function () { add(); render(); } }, ["添加一项"]));
    return box;
  }

  function renderNav() {
    panel.append(
      saveBar(saveSite, "/"),
      note("页面标识用来标出当前页。作品、文章、关于、智能体分别用 projects、posts、about、agent。链接可以写站内路径、https 地址，或 {works_url}、{mood_url}、{github}、mailto:{email} 这样的占位。"),
      el("h2", {}, ["主导航"]),
      navList(state.site.nav, true),
      el("h2", {}, ["页脚"]),
      navList(state.site.footer, false)
    );
  }

  function navList(items, keyed) {
    const box = el("div", { class: "stack" });
    items.forEach(function (item, index) {
      const card = el("div", { class: "card" }, [
        field("文字", item.label, function (value) { item.label = value; }),
        field("链接", item.href, function (value) { item.href = value; }),
      ]);
      if (keyed) {
        card.append(
          field("页面标识", item.key, function (value) { item.key = value; }),
          checkbox("显示", item.enabled, function (value) { item.enabled = value; })
        );
      }
      card.append(el("div", { class: "row" }, nudge(items, index).concat([
        el("button", { class: "button small danger", type: "button", onclick: function () { items.splice(index, 1); render(); } }, ["删除"]),
      ])));
      box.append(card);
    });
    box.append(el("button", { class: "button", type: "button", onclick: function () {
      items.push(keyed
        ? { href: "/", label: "新入口", key: "link" + items.length, enabled: true }
        : { href: "/", label: "新入口" });
      render();
    } }, ["添加一项"]));
    return box;
  }

  function renderAbout() {
    const page = state.site.about_page;
    const extras = el("div", { class: "stack" });
    page.extra_paragraphs.forEach(function (paragraph, index) {
      extras.append(el("div", { class: "card" }, [
        field("补充段落", paragraph, function (value) { page.extra_paragraphs[index] = value; }, true),
        el("button", { class: "button small danger", type: "button", onclick: function () { page.extra_paragraphs.splice(index, 1); render(); } }, ["删除这段"]),
      ]));
    });
    panel.append(
      saveBar(saveSite, "/about"),
      note("关于页的第一段和首页「关于」用的是同一段介绍。"),
      field("眉题", page.kicker, function (value) { page.kicker = value; }),
      field("标题", page.title, function (value) { page.title = value; }),
      field("介绍", state.site.identity.about, function (value) { state.site.identity.about = value; }, true),
      field("第一句开头", page.intro_before, function (value) { page.intro_before = value; }),
      field("作品链接文字", page.works_link_label, function (value) { page.works_link_label = value; }),
      field("第一句中间", page.intro_between, function (value) { page.intro_between = value; }),
      field("文字链接文字", page.writing_link_label, function (value) { page.writing_link_label = value; }),
      field("第一句结尾", page.intro_after, function (value) { page.intro_after = value; }),
      field("第二句开头", page.archive_before, function (value) { page.archive_before = value; }),
      field("作品归档链接文字", page.projects_link_label, function (value) { page.projects_link_label = value; }),
      field("第二句中间", page.archive_between, function (value) { page.archive_between = value; }),
      field("文章归档链接文字", page.posts_link_label, function (value) { page.posts_link_label = value; }),
      field("第二句结尾", page.archive_after, function (value) { page.archive_after = value; }),
      field("邮箱标签", page.email_label, function (value) { page.email_label = value; }),
      field("GitHub 标签", page.github_label, function (value) { page.github_label = value; }),
      el("h2", {}, ["补充段落"]),
      extras,
      el("button", { class: "button", type: "button", onclick: function () { page.extra_paragraphs.push(""); render(); } }, ["添加段落"])
    );
  }

  function renderResume() {
    const resume = state.site.resume;
    const sections = el("div", { class: "stack" });
    resume.sections.forEach(function (section, index) {
      sections.append(el("div", { class: "card" }, [
        field("章节标题", section.heading, function (value) { section.heading = value; }),
        field("章节正文，可以使用 Markdown", section.body, function (value) { section.body = value; }, true),
        el("div", { class: "row" }, nudge(resume.sections, index).concat([
          el("button", { class: "button small danger", type: "button", onclick: function () { resume.sections.splice(index, 1); render(); } }, ["删除章节"]),
        ])),
      ]));
    });
    panel.append(
      saveBar(saveSite, resume.enabled ? "/resume" : "/"),
      note("简历页默认不公开。打开后，本地预览会出现页面和下载文件。姓名、学校、手机号、公司任职、求职城市和私有仓库仍然不能保存。"),
      el("div", { class: "switch-row" }, [
        checkbox("公开简历页", resume.enabled, function (value) { resume.enabled = value; }),
        checkbox("放进导航栏", resume.show_in_nav, function (value) { resume.show_in_nav = value; }),
        checkbox("提供下载", resume.download, function (value) { resume.download = value; }),
      ]),
      field("导航文字", resume.nav_label, function (value) { resume.nav_label = value; }),
      field("眉题", resume.kicker, function (value) { resume.kicker = value; }),
      field("标题", resume.title, function (value) { resume.title = value; }),
      field("摘要", resume.summary, function (value) { resume.summary = value; }, true),
      field("下载按钮", resume.download_label, function (value) { resume.download_label = value; }),
      field("打印按钮", resume.print_label, function (value) { resume.print_label = value; }),
      field("下载文件名", resume.filename, function (value) { resume.filename = value; }),
      note("下载得到 Markdown。打印按钮可以在浏览器里另存为 PDF。"),
      el("h2", {}, ["章节"]),
      sections,
      el("button", { class: "button", type: "button", onclick: function () { resume.sections.push({ heading: "新章节", body: "" }); render(); } }, ["添加章节"])
    );
  }

  function renderWorks() {
    if (!state.projects) {
      panel.append(note("正在读取旧作品…"));
      api("/admin/api/projects").then(function (data) {
        state.projects = data.projects;
        state.project = data.projects[0] ? data.projects[0].slug : null;
        render();
      }).catch(function (error) { setStatus(error.message, "error"); });
      return;
    }
    const list = el("div", { class: "list" });
    state.projects.forEach(function (project) {
      list.append(el("button", {
        type: "button",
        "aria-current": state.project === project.slug ? "true" : false,
        onclick: function () { state.project = project.slug; render(); },
      }, [project.name || project.slug]));
    });
    const selected = state.projects.find(function (project) { return project.slug === state.project; }) || state.projects[0];
    panel.append(
      saveBar(function () {
        return api("/admin/api/projects", { method: "PUT", body: JSON.stringify({ projects: state.projects }) });
      }, selected ? "/projects/" + selected.slug : "/projects"),
      note("分组 selected 会出现在作品页的归档列表。tool 和 experiment 仍有各自的详情页。新作品的长期发布仍在 Idea Platform，这里管理的是本站原有说明。"),
      el("div", { class: "split" }, [list, selected ? projectEditor(selected) : note("还没有作品")]),
      el("button", { class: "button", type: "button", onclick: addProject }, ["添加旧作品"])
    );
  }

  function addProject() {
    const slug = "new-work-" + (state.projects.length + 1);
    state.projects.push({
      slug: slug,
      name: "新作品",
      group: "experiment",
      number: String(state.projects.length + 1).padStart(2, "0"),
      kind: "说明",
      problem: "它解决什么问题。",
      summary: "",
      stack: "",
      diagram: null,
      links: [["查看源码", "https://github.com/CengSin"]],
      source: "",
      sections: [["它解决什么问题", [["p", "写在这里。"]]]],
      related: [],
    });
    state.project = slug;
    render();
  }

  function projectEditor(project) {
    const index = state.projects.indexOf(project);
    const editor = el("div", { class: "editor" }, [
      field("网址标识", project.slug, function (value) {
        const previous = project.slug;
        project.slug = value.trim();
        state.projects.forEach(function (item) {
          item.related = item.related.map(function (related) { return related === previous ? project.slug : related; });
        });
        state.project = project.slug;
      }),
      field("名称", project.name, function (value) { project.name = value; }),
      selectField("分组", project.group, [["selected", "selected，出现在归档"], ["tool", "tool"], ["experiment", "experiment"]], function (value) { project.group = value; }),
      field("编号", project.number, function (value) { project.number = value; }),
      field("种类", project.kind, function (value) { project.kind = value; }),
      field("它解决什么问题", project.problem, function (value) { project.problem = value; }, true),
      field("摘要", project.summary, function (value) { project.summary = value; }, true),
      field("技术栈", project.stack, function (value) { project.stack = value; }),
      selectField("示意图", project.diagram || "", [["", "无"], ["idea", "想法"], ["touch", "Touch Bar"], ["resource", "资源"], ["mark", "记号"]], function (value) {
        project.diagram = value || null;
      }),
      field("来源说明", project.source, function (value) { project.source = value; }, true),
    ]);
    editor.append(el("h2", {}, ["链接"]));
    project.links.forEach(function (link, linkIndex) {
      editor.append(el("div", { class: "card" }, [
        field("文字", link[0], function (value) { link[0] = value; }),
        field("地址", link[1], function (value) { link[1] = value; }),
        el("button", { class: "button small danger", type: "button", onclick: function () { project.links.splice(linkIndex, 1); render(); } }, ["删除链接"]),
      ]));
    });
    editor.append(el("button", { class: "button small", type: "button", onclick: function () { project.links.push(["打开", "https://"]); render(); } }, ["添加链接"]));
    editor.append(el("h2", {}, ["章节"]));
    project.sections.forEach(function (section, sectionIndex) {
      const card = el("div", { class: "card" }, [
        field("章节标题", section[0], function (value) { section[0] = value; }),
      ]);
      section[1].forEach(function (block, blockIndex) {
        card.append(selectField("内容类型", block[0], [["p", "段落"], ["ul", "列表"]], function (value) {
          block[0] = value;
          block[1] = value === "ul" ? [""] : "";
          render();
        }));
        card.append(field(block[0] === "ul" ? "每行一条" : "正文", block[0] === "ul" ? block[1].join("\n") : block[1], function (value) {
          block[1] = block[0] === "ul" ? value.split("\n").filter(function (line) { return line.trim(); }) : value;
        }, true));
        card.append(el("button", { class: "button small danger", type: "button", onclick: function () { section[1].splice(blockIndex, 1); render(); } }, ["删除这段"]));
      });
      card.append(el("div", { class: "row" }, [
        el("button", { class: "button small", type: "button", onclick: function () { section[1].push(["p", ""]); render(); } }, ["添加段落"]),
        el("button", { class: "button small danger", type: "button", onclick: function () { project.sections.splice(sectionIndex, 1); render(); } }, ["删除章节"]),
      ]));
      editor.append(card);
    });
    editor.append(el("button", { class: "button small", type: "button", onclick: function () {
      project.sections.push(["新章节", [["p", ""]]]);
      render();
    } }, ["添加章节"]));
    editor.append(el("h2", {}, ["相关作品"]));
    state.projects.forEach(function (other) {
      if (other.slug === project.slug) return;
      editor.append(checkbox(other.name, project.related.indexOf(other.slug) !== -1, function (checked) {
        project.related = project.related.filter(function (slug) { return slug !== other.slug; });
        if (checked) project.related.push(other.slug);
      }));
    });
    editor.append(el("button", { class: "button danger", type: "button", onclick: function () {
      if (!window.confirm("删除「" + project.name + "」？详情页会从本地预览里消失。")) return;
      state.projects.splice(index, 1);
      state.projects.forEach(function (item) {
        item.related = item.related.filter(function (slug) { return slug !== project.slug; });
      });
      state.project = state.projects[0] ? state.projects[0].slug : null;
      render();
    } }, ["删除这件作品"]));
    return editor;
  }

  function selectField(label, value, options, onchange) {
    const select = el("select");
    options.forEach(function (option) {
      const node = el("option", { value: option[0] }, [option[1]]);
      if (option[0] === (value || "")) node.selected = true;
      select.append(node);
    });
    select.addEventListener("change", function () { onchange(select.value); });
    return el("label", { class: "field" }, [el("span", {}, [label]), select]);
  }

  function renderPosts() {
    if (!state.posts) {
      panel.append(note("正在读取旧文章…"));
      api("/admin/api/posts").then(function (data) {
        state.posts = data.posts;
        render();
      }).catch(function (error) { setStatus(error.message, "error"); });
      return;
    }
    const list = el("div", { class: "list" });
    state.posts.forEach(function (post) {
      list.append(el("button", {
        type: "button",
        "aria-current": state.post && state.post.filename === post.filename ? "true" : false,
        onclick: function () { openPost(post.filename); },
      }, [(post.draft ? "草稿 · " : "") + post.title]));
    });
    panel.append(
      note("这里管理本站旧文章。新文章仍然写在「今天的天气」。旧文章的网址不要改。"),
      el("div", { class: "split" }, [list, state.post ? postEditor() : note("选择一篇文章，或新建。")]),
      el("button", { class: "button", type: "button", onclick: newPost }, ["新建文章"])
    );
  }

  async function openPost(filename) {
    setStatus("正在读取文章…");
    try {
      const data = await api("/admin/api/post?name=" + encodeURIComponent(filename));
      state.post = data.post;
      setStatus("");
      render();
    } catch (error) {
      setStatus(error.message, "error");
    }
  }

  function newPost() {
    const stamp = new Date();
    const pad = function (value) { return String(value).padStart(2, "0"); };
    state.post = {
      creating: true,
      filename: "new-article.md",
      title: "新文章",
      date: stamp.getFullYear() + "-" + pad(stamp.getMonth() + 1) + "-" + pad(stamp.getDate()) + "T" + pad(stamp.getHours()) + ":" + pad(stamp.getMinutes()) + ":00+08:00",
      slug: "new-article",
      draft: true,
      legacy: false,
      tags: [],
      categories: [],
      body: "",
    };
    render();
  }

  function postEditor() {
    const post = state.post;
    return el("div", { class: "editor" }, [
      saveBar(function () {
        return api("/admin/api/post", { method: "PUT", body: JSON.stringify(post) }).then(async function (result) {
          const data = await api("/admin/api/posts");
          state.posts = data.posts;
          state.post.creating = false;
          state.post.filename = post.legacy ? post.filename : post.slug + ".md";
          state.post.legacy = !!state.posts.find(function (item) { return item.filename === state.post.filename && item.legacy; });
          renderMenu();
          return result;
        });
      }, post.legacy || !post.creating ? "/posts/" + post.slug + "/" : "/posts/"),
      post.legacy ? note("这是旧文章。文件名和网址保持不变，避免原来的链接失效。") : note("新文章的网址使用小写英文和连字符。草稿不会发布正文。"),
      field("标题", post.title, function (value) { post.title = value; }),
      field("日期", post.date, function (value) { post.date = value; }),
      post.legacy
        ? el("p", { class: "meta" }, ["网址 /posts/" + post.slug + "/"])
        : field("网址", post.slug, function (value) { post.slug = value.trim(); }),
      field("标签，逗号分隔", post.tags.join(", "), function (value) {
        post.tags = value.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
      }),
      field("分类，逗号分隔", post.categories.join(", "), function (value) {
        post.categories = value.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
      }),
      checkbox("草稿", post.draft, function (value) { post.draft = value; }),
      field("正文", post.body, function (value) { post.body = value; }, true),
      post.creating ? el("span") : el("button", { class: "button danger", type: "button", onclick: function () { removePost(post); } }, ["删除这篇文章"])
    ]);
  }

  async function removePost(post) {
    if (!window.confirm("删除「" + post.title + "」？本地预览里的这篇文章会消失。")) return;
    await run(function () {
      return api("/admin/api/post", { method: "DELETE", body: JSON.stringify({ filename: post.filename }) }).then(async function (result) {
        const data = await api("/admin/api/posts");
        state.posts = data.posts;
        state.post = null;
        render();
        return result;
      });
    });
  }

  function setupForm() {
    const id = el("input", { autocomplete: "off" });
    const secret = el("input", { type: "password", autocomplete: "off" });
    return el("form", { onsubmit: function (event) { event.preventDefault(); } }, [
      note("第一次使用需要一个只给本机用的 GitHub OAuth App。回调地址填 http://127.0.0.1:8787/admin/oauth/callback ，首页地址填 http://127.0.0.1:8787 。"),
      el("p", {}, [el("a", { href: "https://github.com/settings/applications/new", target: "_blank", rel: "noopener noreferrer" }, ["去 GitHub 创建 OAuth App"])]),
      el("label", { class: "field" }, [el("span", {}, ["Client ID"]), id]),
      el("label", { class: "field" }, [el("span", {}, ["Client Secret"]), secret]),
      el("button", { class: "button primary", type: "button", onclick: async function () {
        setStatus("正在保存登录配置…");
        try {
          await api("/admin/oauth/setup", { method: "POST", body: JSON.stringify({ client_id: id.value, client_secret: secret.value }) });
          secret.value = "";
          setStatus("登录配置已保存在这台电脑上。", "ok");
          document.querySelector("#login-button").hidden = false;
        } catch (error) {
          setStatus(error.message, "error");
        }
      } }, ["保存登录配置"]),
    ]);
  }

  document.querySelector("#logout").addEventListener("click", async function () {
    await api("/admin/logout", { method: "POST", body: "{}" });
    showLogin();
  });

  async function boot() {
    try {
      const session = await api("/admin/api/session");
      if (!session.authenticated) {
        const denied = new Error("需要重新登录");
        denied.login = true;
        throw denied;
      }
      const site = await api("/admin/api/site");
      state.site = site.site;
      document.querySelector("#signed-in").textContent = "已登录 " + session.login;
      showApp();
    } catch (error) {
      showLogin();
      const statusData = await fetch("/admin/oauth/status").then(function (response) { return response.json(); });
      document.querySelector("#login-button").hidden = !statusData.configured;
      if (!statusData.configured && !document.querySelector("#setup form")) document.querySelector("#setup").append(setupForm());
      if (error.message && !error.login) setStatus(error.message, "error");
    }
  }

  boot();
})();
