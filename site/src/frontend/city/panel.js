import { esc } from "./iso.js";

const ext = href => /^https?:/.test(href) ? ' target="_blank" rel="noopener noreferrer"' : "";

export function closePanel() {
  const panel = document.getElementById("panel");
  if (panel) panel.hidden = true;
}

export function openPanel(item) {
  const panel = document.getElementById("panel");
  if (!panel) return;
  const kicker = panel.querySelector("[data-p=kicker]");
  const title = panel.querySelector("[data-p=title]");
  const body = panel.querySelector("[data-p=body]");
  const links = panel.querySelector("[data-p=links]");
  if (item.kind === "built") {
    kicker.textContent = `${item.arch} · ${item.status}`;
    title.textContent = item.name;
    body.innerHTML =
      (item.idea ? `<div><dt>原来的想法</dt><dd class="q">${esc(item.idea)}</dd></div>` : "") +
      `<div><dt>拿出来之后</dt><dd>${esc(item.made)}</dd></div>` +
      (item.trade ? `<div><dt>我做的取舍</dt><dd>${esc(item.trade)}</dd></div>` : "") +
      `<div><dt>材料</dt><dd>${esc(item.stack)}</dd></div>`;
    const more = item.href.startsWith("/") ? `<a href="${esc(item.href)}">走进这栋楼 →</a>` : "";
    const go = item.go ? `<a href="${esc(item.go)}">进书店 →</a>` : "";
    links.innerHTML = more + go + item.links.map(([l, u]) => `<a href="${esc(u)}"${ext(u)}>${esc(l)} ↗</a>`).join("");
  } else {
    kicker.textContent = `${item.mine ? "你的图纸" : "Idea Platform"} · ${item.status}`;
    title.textContent = item.name;
    const from = item.from ? `<div><dt>从哪来</dt><dd>从「${esc(item.from)}」长出来的新想法。</dd></div>` : "";
    body.innerHTML = `<div><dt>状态</dt><dd>${esc(item.status)}${item.date ? " · " + esc(item.date) : ""}</dd></div>` + from +
      (item.text ? `<div><dt>${item.mine ? "现在" : "想法"}</dt><dd class="q pre">${esc(item.text)}</dd></div>` : "");
    links.innerHTML = item.href ? `<a href="${esc(item.href)}" target="_blank" rel="noopener noreferrer">查看 ↗</a>` : "";
  }
  panel.hidden = false;
  panel.querySelector(".x").focus({ preventScroll: true });
}

export function wirePanel() {
  const panel = document.getElementById("panel");
  if (!panel) return;
  panel.querySelector(".x").addEventListener("click", closePanel);
  addEventListener("keydown", e => { if (e.key === "Escape") closePanel(); });
}
