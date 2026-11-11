import { esc } from "./iso.js";

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let toastTimer;

export function toast(message) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

export function wireTheme() {
  document.querySelectorAll("[data-theme-toggle]").forEach(button => {
    button.addEventListener("click", () => {
      const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
      const next = dark ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("cengsin-theme", next); } catch { return; }
    });
  });
}

export function wireAgent(stage) {
  const toggle = document.getElementById("view-toggle");
  const md = document.getElementById("md");
  const text = document.getElementById("md-text");
  const copy = document.getElementById("md-copy");
  if (!toggle || !md) return;
  let loaded = false;
  const set = (on, panel = true) => {
    root.classList.toggle("agent", on);
    md.hidden = !(on && panel);
    toggle.setAttribute("aria-pressed", String(on));
    if (stage) stage.setAgent(on);
    if (on && panel && !loaded) {
      loaded = true;
      fetch("/agent/profile.md").then(r => r.ok ? r.text() : Promise.reject()).then(t => { text.textContent = t; }).catch(() => { text.textContent = "profile.md 暂时读不到，可以直接打开 /agent/profile.md。"; });
    }
  };
  toggle.addEventListener("click", () => set(!root.classList.contains("agent")));
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text.textContent);
      copy.textContent = "已复制";
    } catch {
      const range = document.createRange();
      range.selectNodeContents(text);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      copy.textContent = "已选中，按 ⌘C 复制";
    }
    setTimeout(() => { copy.textContent = "复制给 Agent"; }, 2200);
  });
  if (document.body.dataset.page === "agent") set(true, false);
}

export function wireShelves() {
  document.querySelectorAll("[data-shop]").forEach(shop => {
    const reader = shop.querySelector(".reader");
    const pull = spine => {
      shop.querySelectorAll(".spine").forEach(s => s.setAttribute("aria-pressed", "false"));
      spine.setAttribute("aria-pressed", "true");
      const d = spine.dataset;
      if (d.kind === "read") {
        reader.innerHTML = `<p class="r-kicker">读过的${d.group ? " · " + esc(d.group) : ""}</p><h3>${esc(d.title)}</h3><blockquote>${esc(d.line)}</blockquote><p class="src">${esc(d.cite)}</p>`;
      } else {
        reader.innerHTML = `<p class="r-kicker">写下的 · ${esc(d.date)}</p><h3>${esc(d.title)}</h3><blockquote>${esc(d.line)}</blockquote><a class="go" href="${esc(d.href)}">读全文 →</a>`;
      }
    };
    shop.addEventListener("click", e => {
      const spine = e.target.closest(".spine");
      if (!spine) return;
      e.preventDefault();
      pull(spine);
    });
    const first = shop.querySelector(".spine");
    if (first) pull(first);
  });
}

export function wireIdeaForm(stage) {
  const form = document.getElementById("idea-form");
  if (!form || !stage) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("idea-input");
    const value = input.value.trim().slice(0, 20);
    if (!value) { input.focus(); return; }
    stage.addIdea(value);
    input.value = "";
    toast("已经放上天空。回到顶部就能看到它。");
  });
}

export function wireCrayon() {
  if (reduce) return;
  const cv = document.getElementById("crayon");
  if (!cv) return;
  const cx = cv.getContext("2d");
  const strokes = [], drops = [];
  let ptr = null, buf = "", rainUntil = 0, animating = false;
  const fit = () => { const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); };
  fit();
  addEventListener("resize", fit);
  addEventListener("pointermove", e => { ptr = [e.clientX, e.clientY]; }, { passive: true });
  const colors = ["b-brick", "b-yellow", "b-teal", "b-blue", "b-plum", "accent"];
  const tick = now => {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i], age = (now - s.born) / 3600;
      if (age >= 1) { strokes.splice(i, 1); continue; }
      cx.strokeStyle = s.col;
      cx.lineCap = "round";
      cx.globalAlpha = .75 * (1 - age);
      s.segs.forEach(([a, b, c, d, w]) => {
        cx.lineWidth = w; cx.beginPath(); cx.moveTo(a, b); cx.lineTo(c, d); cx.stroke();
        cx.lineWidth = w * .4; cx.beginPath(); cx.moveTo(a + 1.5, b - 1.5); cx.lineTo(c + 1, d - 2); cx.stroke();
      });
    }
    if (now < rainUntil) for (let k = 0; k < 6; k++) drops.push([Math.random() * innerWidth, -20, 9 + Math.random() * 6]);
    cx.globalAlpha = .55;
    cx.strokeStyle = getComputedStyle(root).getPropertyValue("--plan-line").trim();
    cx.lineWidth = 1.4;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d[1] += d[2];
      d[0] -= 1.6;
      if (d[1] > innerHeight) { drops.splice(i, 1); continue; }
      cx.beginPath(); cx.moveTo(d[0], d[1]); cx.lineTo(d[0] + 3, d[1] - 14); cx.stroke();
    }
    cx.globalAlpha = 1;
    if (strokes.length || drops.length || now < rainUntil) requestAnimationFrame(tick);
    else { animating = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  addEventListener("keydown", e => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const cs = getComputedStyle(root);
    const col = cs.getPropertyValue("--" + colors[Math.floor(Math.random() * colors.length)]).trim();
    const ox = ptr ? ptr[0] + (Math.random() - .5) * 160 : Math.random() * innerWidth;
    const oy = ptr ? ptr[1] + (Math.random() - .5) * 120 : Math.random() * innerHeight * .8;
    const segs = [];
    let x = ox, y = oy;
    for (let i = 0; i < 14; i++) {
      const nx = x + (Math.random() - .3) * 26, ny = y + (Math.random() - .5) * 22;
      segs.push([x, y, nx, ny, 3 + Math.random() * 4]);
      x = nx; y = ny;
    }
    strokes.push({ col, segs, born: performance.now() });
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf === "rain") { rainUntil = performance.now() + 4500; toast("下雨了。"); }
    if (!animating) { animating = true; requestAnimationFrame(tick); }
  });
}
