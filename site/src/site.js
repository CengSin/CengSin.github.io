(function () {
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
    var label = button.textContent;
    var done = function (message) {
      button.textContent = message;
      setTimeout(function () { button.textContent = label; }, 2200);
    };
    var legacy = function () {
      if (node.select) {
        node.focus();
        node.select();
      }
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      done(ok ? "已复制" : "已选中，请手动复制");
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

  function pick(site, path) {
    return path.split(".").reduce(function (value, key) {
      return value && typeof value === "object" ? value[key] : undefined;
    }, site);
  }

  function renderNav(site) {
    var nav = document.getElementById("touchbar-nav");
    if (!nav || !Array.isArray(site.nav)) return;
    var current = document.body.getAttribute("data-page");
    var resume = site.resume || {};
    nav.innerHTML = site.nav.filter(function (item) {
      if (!item || item.enabled === false) return false;
      var href = resolveHref(item.href, site);
      return resume.enabled || (item.key !== "resume" && String(href).replace(/\/$/, "") !== "/resume");
    }).map(function (item) {
      var href = hrefOf(item.href, site);
      var currentAttr = item.key === current ? ' aria-current="page"' : "";
      return '<a class="tb" href="' + esc(href) + '"' + externalAttrs(href) + currentAttr + ">" + esc(item.label) + "</a>";
    }).join("");
  }

  function renderFooter(site) {
    var brand = document.getElementById("footer-brand");
    if (brand && site.brand) brand.textContent = site.brand;
    var footer = document.getElementById("footer-links");
    if (!footer || !Array.isArray(site.footer)) return;
    var resume = site.resume || {};
    footer.innerHTML = site.footer.map(function (item) {
      var href = hrefOf(item.href, site);
      if (!resume.enabled && href.replace(/\/$/, "") === "/resume") return "";
      return '<a href="' + esc(href) + '"' + externalAttrs(href) + ">" + esc(item.label) + "</a>";
    }).join("");
  }

  function applyText(site) {
    document.querySelectorAll("[data-cfg]").forEach(function (node) {
      var value = pick(site, node.getAttribute("data-cfg"));
      if (typeof value !== "string" || !value) return;
      if ("value" in node && node.tagName === "TEXTAREA") node.value = value;
      else node.textContent = value;
    });
    document.querySelectorAll("[data-config]").forEach(function (node) {
      var value = (site.projects_page || {})[node.getAttribute("data-config")];
      if (typeof value === "string" && value) node.textContent = value;
    });
    document.querySelectorAll("[data-config-href]").forEach(function (node) {
      var href = hrefOf((site.links || {})[node.getAttribute("data-config-href")], site);
      if (href !== "#") node.setAttribute("href", href);
    });
    var meta = document.querySelector('meta[name="description"]');
    if (meta && document.body.getAttribute("data-page") === "home" && site.identity && site.identity.who) {
      meta.setAttribute("content", site.identity.who);
    }
  }

  fetch("https://cengsin.de5.net/config", { cache: "no-store" }).then(function (response) {
    if (!response.ok) return null;
    return response.json();
  }).then(function (site) {
    if (!site || !site.identity) return null;
    var published = document.querySelector('meta[name="site-config"]');
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(site))).then(function (buffer) {
      if (published && published.content === hex(buffer).slice(0, 16)) return;
      renderNav(site);
      renderFooter(site);
      applyText(site);
      document.dispatchEvent(new Event("site-updated"));
    });
  }).catch(function () {});
})();
