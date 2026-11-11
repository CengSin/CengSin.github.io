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
})();
