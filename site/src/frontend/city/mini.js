import { f, readTokens, drawBuilt, TYPES } from "./iso.js";

export function mountMini(el) {
  const type = el.dataset.type;
  if (!TYPES[type] || type === "generic") return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", el.dataset.label || "");
  el.appendChild(svg);
  function render() {
    const T = readTokens();
    const pen = drawBuilt({ type, tone: el.dataset.tone }, T);
    svg.innerHTML = `<g class="bld landed on-paper"><g class="solid">${pen.s}</g></g>`;
    const box = svg.querySelector("g").getBBox();
    const pad = Math.max(box.width, box.height) * .22 + 12;
    const x = box.x - pad, y = box.y - pad, w = box.width + pad * 2, h = box.height + pad * 2;
    const cx = box.x + box.width / 2, cy = box.y + box.height;
    const shadow = `<ellipse class="mini-shadow" cx="${f(cx)}" cy="${f(cy - 4)}" rx="${f(box.width * .62)}" ry="${f(box.width * .16)}"/>`;
    svg.innerHTML = shadow + svg.innerHTML;
    svg.setAttribute("viewBox", `${f(x)} ${f(y)} ${f(w)} ${f(h)}`);
  }
  render();
  let key = "";
  const check = () => {
    const k = getComputedStyle(document.documentElement).getPropertyValue("--b-blue").trim();
    if (k !== key) { key = k; render(); }
  };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", check);
  new MutationObserver(check).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  key = getComputedStyle(document.documentElement).getPropertyValue("--b-blue").trim();
}
