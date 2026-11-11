import { f, esc, anchorOf, footprintOf } from "./iso.js";

const K = 22;
const Q = (x, y) => [(x - y) * K, (x + y) * K];
const poly = a => a.map(([x, y]) => Q(x, y).map(f).join(",")).join(" ");
const TREES = [[5.5, 1.6], [5.4, 3.0], [.3, 5.0], [1.1, 6.4], [2.6, 6.5], [13.2, 7.2], [12.9, 9.4], [10.2, 12.4], [3.2, 9.9], [5.2, 9.7], [2.9, 13.4], [13.3, 12.9]];

function items(data) {
  const out = [];
  data.built.forEach(b => {
    const [x, y, w, d] = footprintOf(b);
    const a = anchorOf(b);
    out.push({ id: b.id, kind: "built", tone: b.type === "plaza" ? "b-stone" : b.tone, fp: [x, y, w, d], pin: [a[0], a[1]] });
  });
  data.hanging.forEach(h => {
    const [x, y] = h.at;
    out.push({ id: h.id, kind: "doing", fp: [x, y, 1.0, .8], pin: [x + .5, y + .4] });
  });
  data.sky.forEach(s => {
    const [x, y] = s.at;
    out.push({ id: s.id, kind: "idea", fp: [x - .5, y - .5, 1.0, 1.0], pin: [x, y] });
  });
  return out;
}

function render(svg, data) {
  let s = `<polygon class="isle" points="${poly([[-1, -1], [14, -1], [14, 14], [-1, 14]])}"/>`;
  s += `<polygon class="road" points="${poly([[-1, 5.2], [14, 5.2], [14, 6.0], [-1, 6.0]])}"/>`;
  s += `<polygon class="road" points="${poly([[5.9, -1], [6.4, -1], [6.4, 14], [5.9, 14]])}"/>`;
  s += `<polygon class="road" points="${poly([[9.0, -1], [9.5, -1], [9.5, 14], [9.0, 14]])}"/>`;
  s += `<polygon class="water" points="${poly([[6.8, -1], [8.6, -1], [8.6, 14], [6.8, 14]])}"/>`;
  s += TREES.map(([x, y]) => { const [X, Y] = Q(x, y); return `<circle class="tree" cx="${f(X)}" cy="${f(Y)}" r="4"/>`; }).join("");
  const list = items(data);
  const fps = list.map(it => {
    const [x, y, w, d] = it.fp;
    const style = it.kind === "built" ? ` style="fill:var(--${esc(it.tone)})"` : "";
    return `<polygon class="fp ${it.kind}" data-id="${esc(it.id)}"${style} points="${poly([[x, y], [x + w, y], [x + w, y + d], [x, y + d]])}"/>`;
  });
  s += fps.filter((_, i) => list[i].kind === "built").join("");
  s += fps.filter((_, i) => list[i].kind !== "built").join("");
  s += list.map((it, i) => {
    const [X, Y] = Q(...it.pin);
    return `<g class="pin ${it.kind}" data-id="${esc(it.id)}" transform="translate(${f(X)} ${f(Y)})"><circle r="10.5"/><text y="4">${i + 1}</text></g>`;
  }).join("");
  svg.innerHTML = s;
  const box = svg.getBBox();
  const pad = 14;
  svg.setAttribute("viewBox", `${f(box.x - pad)} ${f(box.y - pad)} ${f(box.width + pad * 2)} ${f(box.height + pad * 2)}`);
}

export function mountAtlas(root, data, stage) {
  const holder = root.querySelector(".atlas-map");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "想象之城的平面导览图，编号与图例对应");
  holder.appendChild(svg);
  render(svg, data);
  const links = [...root.querySelectorAll("a.lg")];
  const byId = id => links.find(a => a.dataset.id === id);
  const mark = (id, on) => {
    root.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(n => n.classList.toggle("hl", on));
  };
  const pick = (id, event) => {
    if (stage && stage.focus(id)) { if (event) event.preventDefault(); return; }
    const link = byId(id);
    if (link && !event) link.click();
  };
  links.forEach(a => {
    a.addEventListener("mouseenter", () => mark(a.dataset.id, true));
    a.addEventListener("mouseleave", () => mark(a.dataset.id, false));
    a.addEventListener("focus", () => mark(a.dataset.id, true));
    a.addEventListener("blur", () => mark(a.dataset.id, false));
    a.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      pick(a.dataset.id, e);
    });
  });
  svg.addEventListener("mouseover", e => { const n = e.target.closest("[data-id]"); if (n) mark(n.dataset.id, true); });
  svg.addEventListener("mouseout", e => { const n = e.target.closest("[data-id]"); if (n) mark(n.dataset.id, false); });
  svg.addEventListener("click", e => {
    const n = e.target.closest("[data-id]");
    if (!n) return;
    const link = byId(n.dataset.id);
    if (root.classList.contains("folded") && link && link.closest(".extra")) setOpen(true);
    pick(n.dataset.id);
  });
  const more = root.querySelector(".legend-more");
  const extras = root.querySelectorAll(".extra");
  const setOpen = open => {
    root.classList.toggle("folded", !open);
    if (more) {
      more.setAttribute("aria-expanded", String(open));
      more.textContent = open ? more.dataset.less : more.dataset.more;
    }
  };
  if (more && extras.length && root.dataset.fold === "true") {
    more.hidden = false;
    setOpen(false);
  }
  if (more) more.addEventListener("click", () => setOpen(root.classList.contains("folded")));
}
