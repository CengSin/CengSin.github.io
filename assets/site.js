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

  document.querySelectorAll(".hero-avatar img, .home-avatar img").forEach(function (image) {
    image.addEventListener("error", function () { image.remove(); });
    if (image.complete && image.naturalWidth === 0) image.remove();
  });

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
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
  });
})();
