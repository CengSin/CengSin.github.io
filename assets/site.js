(function () {
  var themeColor = document.querySelector('meta[name="theme-color"]');
  var systemTheme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var applyTheme = function (theme) {
    document.documentElement.dataset.theme = theme;
    if (themeColor) themeColor.content = theme === "dark" ? "#111B26" : "#F5F7FA";
  };
  applyTheme(systemTheme && systemTheme.matches ? "dark" : "light");
  if (systemTheme) {
    var onSystemTheme = function (event) {
      applyTheme(event.matches ? "dark" : "light");
    };
    if (systemTheme.addEventListener) systemTheme.addEventListener("change", onSystemTheme);
    else if (systemTheme.addListener) systemTheme.addListener(onSystemTheme);
  }

  function dropBrokenAvatars() {
    document.querySelectorAll(".hero-avatar img, .home-avatar img").forEach(function (image) {
      if (image.complete && image.naturalWidth === 0) image.remove();
    });
  }
  document.addEventListener("error", function (event) {
    var image = event.target;
    if (image && image.matches && image.matches(".hero-avatar img, .home-avatar img")) image.remove();
  }, true);
  dropBrokenAvatars();

  document.addEventListener("click", function (event) {
    var printButton = event.target.closest ? event.target.closest("[data-print]") : null;
    if (printButton) {
      window.print();
      return;
    }
    var button = event.target.closest ? event.target.closest("[data-copy]") : null;
    if (!button) return;
    var node = document.getElementById(button.getAttribute("data-copy"));
    if (!node) return;
    var text = "value" in node ? node.value : node.textContent;
    var done = function (label) { button.textContent = label; };
    var legacy = function () {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      area.remove();
      if (ok) done("已复制");
      else {
        node.classList.remove("visually-hidden");
        done("请选中文本复制");
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done("已复制"); }, legacy);
    } else {
      legacy();
    }
  });

  var host = location.hostname;
  if (host !== "cengsin.is-a.dev" && host !== "cengsin.github.io") return;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveHref(value, site) {
    var links = site.links || {};
    var identity = site.identity || {};
    var map = {
      "{works_url}": links.works_url,
      "{idea_platform_url}": links.idea_platform_url,
      "{mood_url}": links.mood_url,
      "{github}": identity.github,
      "{email}": identity.email
    };
    if (value === "mailto:{email}") return "mailto:" + (identity.email || "");
    return Object.prototype.hasOwnProperty.call(map, value) ? map[value] : value;
  }

  function safeHref(value) {
    if (typeof value !== "string" || /[\s"'<>]/.test(value)) return "";
    if (value.charAt(0) === "/" && value.indexOf("..") < 0 && value.indexOf("\\") < 0) return value;
    if (value.indexOf("https://") === 0 || value.indexOf("mailto:") === 0) return value;
    if (/^#[A-Za-z][A-Za-z0-9_-]{0,40}$/.test(value)) return value;
    return "";
  }

  function hrefOf(value, site) {
    return safeHref(resolveHref(value, site)) || "#";
  }

  function externalAttrs(href) {
    return href.indexOf("https://") === 0 ? ' target="_blank" rel="noopener noreferrer"' : "";
  }

  function canonical(value) {
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map(function (key) {
        return JSON.stringify(key) + ":" + canonical(value[key]);
      }).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer)).map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function visibleNav(site, resumeOk) {
    var resume = site.resume || {};
    var items = [];
    (site.nav || []).forEach(function (item) {
      if (!item || item.enabled === false) return;
      var href = resolveHref(item.href, site);
      if ((!resume.enabled || !resumeOk) && (item.key === "resume" || String(href).replace(/\/$/, "") === "/resume")) return;
      items.push({ href: hrefOf(item.href, site), label: item.label, key: item.key });
    });
    if (resume.enabled && resume.show_in_nav && resumeOk && !items.some(function (item) { return item.key === "resume"; })) {
      items.push({ href: "/resume", label: resume.nav_label || "Resume", key: "resume" });
    }
    return items;
  }

  function renderChrome(site, resumeOk) {
    var brand = document.getElementById("site-brand");
    if (brand) {
      brand.textContent = "";
      var mark = document.createElement("span");
      mark.className = "brand-mark";
      mark.setAttribute("aria-hidden", "true");
      brand.append(mark, document.createTextNode(site.brand || ""));
    }
    var footerBrand = document.getElementById("footer-brand");
    if (footerBrand) footerBrand.textContent = site.brand || "";
    var current = document.body.getAttribute("data-page");
    var desktop = document.getElementById("desktop-nav");
    var mobile = document.getElementById("mobile-links");
    if (desktop) {
      desktop.innerHTML = visibleNav(site, resumeOk).map(function (item) {
        var currentAttr = item.key === current ? ' aria-current="page"' : "";
        var classAttr = item.key === "agent" ? ' class="agent-link"' : "";
        return '<a href="' + esc(item.href) + '"' + classAttr + currentAttr + ">" + esc(item.label) + "</a>";
      }).join("");
    }
    if (mobile) {
      mobile.innerHTML = visibleNav(site, resumeOk).map(function (item) {
        var currentAttr = item.key === current ? ' aria-current="page"' : "";
        return '<a href="' + esc(item.href) + '"' + currentAttr + ">" + esc(item.label) + "</a>";
      }).join("");
    }
    var footer = document.getElementById("footer-links");
    if (footer) {
      footer.innerHTML = (site.footer || []).map(function (item) {
        var href = hrefOf(item.href, site);
        if ((!site.resume || !site.resume.enabled || !resumeOk) && href.replace(/\/$/, "") === "/resume") return "";
        return '<a href="' + esc(href) + '"' + externalAttrs(href) + ">" + esc(item.label) + "</a>";
      }).join("");
    }
  }

  function keywordList(site) {
    return (site.identity.keywords || []).map(function (word) {
      return "          <li>" + esc(word) + "</li>";
    }).join("\n");
  }

  function renderHero(site) {
    var home = site.home;
    var identity = site.identity;
    return '      <section class="home-hero" aria-labelledby="who-name">\n        <div class="home-hero-grid">\n          <div class="home-avatar"><span aria-hidden="true">CS</span><img src="https://github.com/' + esc(identity.github_handle) + '.png?size=240" alt="" width="128" height="128" referrerpolicy="no-referrer"></div>\n          <div>\n            <h1 id="who-name">' + esc(site.brand) + '</h1>\n            <p class="home-who">' + esc(identity.who) + '</p>\n            <p class="home-support">' + esc(identity.intro) + esc(identity.tagline) + '。</p>\n            <div class="home-actions">\n              <a class="button primary" href="' + esc(hrefOf(home.hero_primary_href, site)) + '">' + esc(home.hero_primary_label) + '</a>\n              <a class="home-quiet" href="' + esc(hrefOf(home.hero_secondary_href, site)) + '">' + esc(home.hero_secondary_label) + '</a>\n            </div>\n          </div>\n        </div>\n      </section>';
  }

  function renderDoing(site) {
    var home = site.home;
    var threads = (home.threads || []).map(function (item) {
      var href = hrefOf(item.href, site);
      return '          <a class="home-thread" href="' + esc(href) + '"' + externalAttrs(href) + '>\n            <strong>' + esc(item.title) + '</strong>\n            <span>' + esc(item.text) + '</span>\n          </a>';
    }).join("\n");
    return '      <section class="home-block" id="doing" aria-labelledby="doing-title">\n        <h2 id="doing-title">' + esc(home.doing_title) + '</h2>\n        <p class="home-lede">' + esc(site.identity.doing) + '</p>\n        <div class="home-threads">\n' + threads + '\n        </div>\n      </section>';
  }

  function renderDoors(site) {
    var home = site.home;
    var cards = (home.doors || []).map(function (item) {
      var href = hrefOf(item.href, site);
      return '          <a class="home-door" href="' + esc(href) + '"' + externalAttrs(href) + '>\n            <span class="home-dest">' + esc(item.dest) + '</span>\n            <h3>' + esc(item.title) + '</h3>\n            <p>' + esc(item.text) + '</p>\n            <span class="home-go">' + esc(item.action) + '</span>\n          </a>';
    }).join("\n");
    var agent = home.agent || {};
    var agentHtml = "";
    if (agent.enabled !== false) {
      agentHtml = '\n        <div class="home-agent" id="agent">\n          <div>\n            <span class="home-dest">' + esc(agent.dest) + '</span>\n            <h3>' + esc(agent.title) + '</h3>\n            <p>' + esc(agent.text) + '</p>\n          </div>\n          <div class="home-agent-actions">\n            <button class="button secondary" type="button" data-copy="agent-prompt">' + esc(agent.button) + '</button>\n            <a href="/llms.txt">' + esc(agent.llms_label) + '</a>\n            <textarea id="agent-prompt" class="visually-hidden" readonly>' + esc(site.prompt) + '</textarea>\n          </div>\n        </div>';
    }
    return '      <section class="home-block" id="doors" aria-labelledby="doors-title">\n        <h2 id="doors-title">' + esc(home.doors_title) + '</h2>\n        <p class="home-note">' + esc(home.doors_note) + '</p>\n        <div class="home-doors">\n' + cards + '\n        </div>' + agentHtml + '\n      </section>';
  }

  function renderAboutBlock(site) {
    return '      <section class="home-block" id="about" aria-labelledby="about-title">\n        <h2 id="about-title">' + esc(site.home.about_title) + '</h2>\n        <p class="home-about-copy">' + esc(site.identity.about) + '</p>\n        <ul class="keyword-tags" aria-label="关键词">\n' + keywordList(site) + '\n        </ul>\n      </section>';
  }

  function renderHistory(site) {
    var records = (site.home.history || []).map(function (item) {
      return '        <a class="home-record" href="' + esc(hrefOf(item.href, site)) + '">\n          <strong>' + esc(item.title) + '</strong>\n          <span>' + esc(item.text) + '</span>\n          <em>' + esc(item.meta) + '</em>\n        </a>';
    }).join("\n");
    return '      <section class="home-history" aria-labelledby="history-title">\n        <h2 id="history-title">' + esc(site.home.history_title) + '</h2>\n' + records + '\n      </section>';
  }

  var homeRenderers = { hero: renderHero, doing: renderDoing, doors: renderDoors, about: renderAboutBlock, history: renderHistory };

  function renderHome(site) {
    return "\n" + (site.home.sections || []).filter(function (section) {
      return section && section.enabled !== false && homeRenderers[section.id];
    }).map(function (section) {
      return homeRenderers[section.id](site);
    }).join("\n");
  }

  function renderAboutPage(site) {
    var page = site.about_page;
    var identity = site.identity;
    var links = site.links;
    var githubText = String(identity.github || "").replace(/^https:\/\//, "").replace(/^http:\/\//, "");
    var extras = (page.extra_paragraphs || []).map(function (paragraph) {
      return "          <p>" + esc(paragraph) + "</p>";
    }).join("\n");
    return '\n      <article class="page narrow">\n        <p class="page-kicker micro">' + esc(page.kicker) + '</p>\n        <h1>' + esc(page.title) + '</h1>\n        <p class="lede">' + esc(identity.about) + '</p>\n        <ul class="keyword-tags" aria-label="关键词">\n' + keywordList(site) + '\n        </ul>\n        <div class="prose">\n          <p>' + esc(page.intro_before) + '<a href="' + esc(hrefOf(links.works_url, site)) + '" target="_blank" rel="noopener noreferrer">' + esc(page.works_link_label) + '</a>' + esc(page.intro_between) + '<a href="' + esc(hrefOf(links.mood_url, site)) + '" target="_blank" rel="noopener noreferrer">' + esc(page.writing_link_label) + '</a>' + esc(page.intro_after) + '</p>\n          <p>' + esc(page.archive_before) + '<a href="/projects">' + esc(page.projects_link_label) + '</a>' + esc(page.archive_between) + '<a href="/posts/">' + esc(page.posts_link_label) + '</a>' + esc(page.archive_after) + '</p>' + (extras ? "\n" + extras : "") + '\n        </div>\n        <dl class="facts">\n          <div><dt>' + esc(page.email_label) + '</dt><dd><a href="mailto:' + esc(identity.email) + '">' + esc(identity.email) + '</a></dd></div>\n          <div><dt>' + esc(page.github_label) + '</dt><dd><a href="' + esc(hrefOf(identity.github, site)) + '" target="_blank" rel="noopener noreferrer">' + esc(githubText) + '</a></dd></div>\n        </dl>\n      </article>';
  }

  function renderAgentPage(site) {
    var page = site.agent_page;
    var table = (page.resources || []).map(function (item) {
      var href = hrefOf(item.href, site);
      return '<tr><td><a href="' + esc(href) + '">' + esc(item.href) + '</a></td><td>' + esc(item.description) + '</td></tr>';
    }).join("");
    return '\n      <article class="page">\n        <p class="page-kicker micro">' + esc(page.kicker) + '</p>\n        <h1>' + esc(page.title) + '</h1>\n        <p class="lede">' + esc(page.lede) + '</p>\n        <table class="resource-table">\n          <thead><tr><th>资源</th><th>内容</th></tr></thead>\n          <tbody>' + table + '</tbody>\n        </table>\n        <h2>' + esc(page.copy_heading) + '</h2>\n        <textarea class="prompt" id="agent-prompt" readonly>' + esc(site.prompt) + '</textarea>\n        <p><button class="button secondary" type="button" data-copy="agent-prompt">' + esc(page.copy_button) + '</button></p>\n      </article>';
  }

  function setDescription(text) {
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", text || "");
  }

  function applyProjects(site) {
    var page = site.projects_page || {};
    document.querySelectorAll("[data-config]").forEach(function (node) {
      var key = node.getAttribute("data-config");
      if (page[key] == null) return;
      if (key === "archive_label") {
        var count = (node.textContent || "").match(/（\d+ 项）$/);
        node.textContent = page.archive_label + (count ? count[0] : "");
        return;
      }
      node.textContent = page[key];
    });
    document.querySelectorAll("[data-config-href]").forEach(function (node) {
      var key = node.getAttribute("data-config-href");
      var href = hrefOf((site.links || {})[key], site);
      if (href !== "#") node.setAttribute("href", href);
    });
  }

  function applyPage(site) {
    var page = document.body.getAttribute("data-page");
    var main = document.getElementById("main");
    if (page === "home" && main && site.home && site.identity) {
      main.innerHTML = renderHome(site);
      document.title = site.site_title || document.title;
      setDescription(site.identity.who);
    } else if (page === "about" && main && site.about_page) {
      main.innerHTML = renderAboutPage(site);
      document.title = site.about_page.title + " · " + site.brand;
      setDescription(site.identity.intro);
    } else if (page === "agent" && main && site.agent_page) {
      main.innerHTML = renderAgentPage(site);
      document.title = site.agent_page.title + " · " + site.brand;
      setDescription(site.agent_page.description);
    } else if (page === "projects" && document.querySelector(".works-portal") && site.projects_page) {
      applyProjects(site);
      document.title = site.projects_page.title + " · " + site.brand;
      setDescription(site.projects_page.description);
    }
    dropBrokenAvatars();
  }

  function resumeReady(site) {
    var resume = site.resume || {};
    if (!resume.enabled || !resume.show_in_nav) return Promise.resolve(false);
    return fetch("/resume/", { method: "HEAD" }).then(function (response) {
      return response.ok;
    }).catch(function () { return false; });
  }

  fetch("https://cengsin.de5.net/config", { cache: "no-store" }).then(function (response) {
    if (!response.ok) return null;
    return response.json();
  }).then(function (site) {
    if (!site || !site.identity || !site.home) return null;
    var published = document.querySelector('meta[name="site-config"]');
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(site))).then(function (buffer) {
      if (published && published.content === hex(buffer).slice(0, 16)) return null;
      return resumeReady(site).then(function (resumeOk) {
        renderChrome(site, resumeOk);
        applyPage(site);
      });
    });
  }).catch(function () {});
})();
