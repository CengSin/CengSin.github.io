import { P, TZ, Pen, f, pts, clamp, smooth, ease, esc, readTokens, anchorOf, drawBuilt, drawHang, drawSky } from "./iso.js";
import { openPanel, closePanel } from "./panel.js";

const SKYZ = 32;
const TREES = [[5.5, 1.6], [5.4, 3.0], [.3, 5.0], [1.1, 6.4], [2.6, 6.5], [13.2, 7.2], [12.9, 9.4], [10.2, 12.4], [3.2, 9.9], [5.2, 9.7], [2.9, 13.4], [13.3, 12.9]];

function ground() {
  const top = pts([[-1, -1, 0], [14, -1, 0], [14, 14, 0], [-1, 14, 0]]);
  const left = pts([[-1, 14, -.55], [14, 14, -.55], [14, 14, 0], [-1, 14, 0]]);
  const right = pts([[14, -1, -.55], [14, 14, -.55], [14, 14, 0], [14, -1, 0]]);
  const river = pts([[6.8, -1], [8.6, -1], [8.6, 14], [6.8, 14]]);
  let s = `<g class="solid"><polygon class="lot-l" points="${left}"/><polygon class="lot-r" points="${right}"/><polygon class="lot-t" points="${top}"/>`;
  s += `<polygon class="road" points="${pts([[-1, 5.2], [14, 5.2], [14, 6.0], [-1, 6.0]])}"/>`;
  s += `<polygon class="road" points="${pts([[5.9, -1], [6.4, -1], [6.4, 14], [5.9, 14]])}"/>`;
  s += `<polygon class="road" points="${pts([[9.0, -1], [9.5, -1], [9.5, 14], [9.0, 14]])}"/>`;
  s += `<polygon class="water" points="${river}"/>`;
  s += `<polygon class="water-d" points="${pts([[6.8, 14, -.55], [8.6, 14, -.55], [8.6, 14, 0], [6.8, 14, 0]])}"/></g>`;
  s += `<g class="wire" style="opacity:0"><polygon points="${top}"/><polygon points="${left}"/><polygon points="${right}"/><polygon points="${river}"/></g>`;
  return `<g class="on-paper">${s}</g>`;
}

function crane(T, target) {
  const p = new Pen(), c = T["b-yellow"];
  const [mx, my] = target.mast, H = target.height;
  p.line([mx - .1, my - .1, 0], [mx - .1, my - .1, H], c, 2);
  p.line([mx + .1, my + .1, 0], [mx + .1, my + .1, H], c, 2);
  for (let z = 0; z < H - .4; z += .6) p.line([mx - .1, my - .1, z], [mx + .1, my + .1, z + .6], c, 1);
  const [hx, hy, hz] = target.hook;
  const dx = hx - mx, dy = hy - my, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  p.line([mx, my, H], [hx + ux * .5, hy + uy * .5, H], c, 2.2);
  p.line([mx, my, H + .7], [hx, hy, H], c, 1);
  p.line([mx, my, H], [mx - ux * 1.1, my - uy * 1.1, H], c, 2.2);
  p.box(mx - ux * 1.1 - .2, my - uy * 1.1 - .2, .4, .4, H - .45, .45, T["b-stone"]);
  p.box(mx - .2, my - .2, .4, .4, H - .1, .5, T.accent);
  const [X1, Y1] = P(hx, hy, H), [X2, Y2] = P(hx, hy, hz);
  p.raw(`<line class="hook-line" x1="${f(X1)}" y1="${f(Y1)}" x2="${f(X2)}" y2="${f(Y2)}" stroke="${T.ink}" stroke-width="1.2"/>`);
  const [X, Y] = P(mx, my, H + 1.0);
  p.raw(`<text class="tag crane-tag" x="${f(X)}" y="${f(Y)}">Agent</text>`);
  return `<g class="on-paper"><g class="solid">${p.s}</g><g class="wire" style="opacity:0">${p.w}</g></g>`;
}

function tagAt(anchor, label) {
  const [X, Y] = P(...anchor);
  return `<text class="tag" x="${f(X)}" y="${f(Y)}">${esc(label)}</text>`;
}

function group(id, kind, label, inner, anchor, extra = "", mvClass = "mv", mvStyle = "") {
  return `<g class="bld ${kind}" data-id="${esc(id)}" tabindex="0" role="button" aria-label="${esc(label)}"><g class="${mvClass}"${mvStyle ? ` style="${mvStyle}"` : ""}>${extra}<g class="wire">${inner.w}</g><g class="solid">${inner.s}</g>${tagAt(anchor, label)}</g></g>`;
}

export function mountStage(root, data) {
  const svg = root.querySelector("#world");
  const descent = root;
  const hero = root.querySelector(".hero");
  const hint = root.querySelector(".hint");
  const cap = root.querySelector(".citycap");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) document.documentElement.classList.add("still");
  const state = { p: reduce ? 1 : 0, agent: false, vw: 1100, vh: 700, camSky: -1500, camCity: -200, shift: 0 };
  const userIdeas = [];
  let nodes = {};
  let last = -1;
  const built = data.built;
  const all = () => built.concat(data.hanging, data.sky, userIdeas);

  function render() {
    const T = readTokens();
    let s = `<title>想象之城：天上是还没落地的想法图纸，地上是已经做出来的作品</title><defs>
      <linearGradient id="skyg" gradientUnits="userSpaceOnUse" x1="0" y1="-2700" x2="0" y2="-40">
        <stop offset="0" class="sky-a"/><stop offset=".55" class="sky-b"/><stop offset=".86" class="sky-c"/><stop offset="1" class="sky-d"/>
      </linearGradient>
      <linearGradient id="gmg" gradientUnits="userSpaceOnUse" x1="0" y1="-2700" x2="0" y2="-200">
        <stop offset="0" stop-color="#fff"/><stop offset=".75" stop-color="#fff"/><stop offset="1" stop-color="#000"/>
      </linearGradient>
      <mask id="gm"><rect x="-4000" y="-2800" width="8000" height="4000" fill="url(#gmg)"/></mask>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" class="grid-line" stroke-width="1"/></pattern>
    </defs>`;
    s += `<rect class="sky-fill" x="-4000" y="-2800" width="8000" height="2780" fill="url(#skyg)"/>`;
    s += `<rect class="ground-fill" x="-4000" y="-40" width="8000" height="3000"/>`;
    s += `<rect class="grid" x="-4000" y="-2800" width="8000" height="4000" fill="url(#grid)" mask="url(#gm)"/>`;
    s += ground();
    const items = [];
    built.forEach(b => {
      const pen = drawBuilt(b, T);
      const a = anchorOf(b);
      items.push({ k: a[0] + a[1], html: group(b.id, "built" + (b.quiet ? " quiet" : ""), b.label, pen, a) });
    });
    TREES.forEach(([x, y]) => {
      const p = new Pen();
      p.line([x, y, 0], [x, y, .45], T.trunk, 3);
      p.ball(x, y, .75, 11, T.tree);
      items.push({ k: x + y, html: `<g class="on-paper tree"><g class="solid">${p.s}</g><g class="wire" style="opacity:0">${p.w}</g></g>` });
    });
    const active = built.find(b => b.active);
    const hook = active ? anchorOf(active) : [7.4, 2.2, 5.2];
    const mast = data.crane.mast;
    items.push({ k: mast[0] + mast[1], html: crane(T, { mast, height: data.crane.height, hook: [hook[0], hook[1], active ? hook[2] - .5 : 4.6] }) });
    items.sort((a, b) => a.k - b.k);
    s += items.map(i => i.html).join("");
    (data.loops || []).forEach(([slug, ideaId]) => {
      const b = built.find(x => x.id === slug), d = data.sky.find(x => x.id === ideaId);
      if (!b || !d) return;
      const a = P(...anchorOf(b)), c = P(d.at[0], d.at[1], d.at[2] + .3);
      s += `<path class="loop" d="M${f(a[0])} ${f(a[1] + 20)} C${f(a[0] + 260)} ${f(a[1] - 300)} ${f(c[0] + 300)} ${f(c[1] + 400)} ${f(c[0])} ${f(c[1])}"/>`;
    });
    data.hanging.forEach(d => {
      const { pen, anchor, top } = drawHang(d, T);
      const [X, Y] = P(...top);
      const extra = `<line class="cable" x1="${f(X)}" y1="-2800" x2="${f(X)}" y2="${f(Y)}"/>`;
      const cls = d.status === "实现中" ? "mv hook" : "mv";
      s += `<g class="on-paper dashed${d.status === "实现中" ? "" : " idle"}">${group(d.id, "doing", d.status + " · " + d.name, pen, anchor, extra, cls)}</g>`;
    });
    data.sky.concat(userIdeas).forEach((d, i) => {
      const { pen, anchor } = drawSky(d, T, i);
      s += `<g class="dashed">${group(d.id, "idea", d.status + " · " + d.name, pen, anchor, "", "mv bob", `animation-delay:${-i * 1.3}s`)}</g>`;
    });
    svg.innerHTML = s;
    nodes = {};
    svg.querySelectorAll(".bld").forEach(n => {
      nodes[n.dataset.id] = { el: n, mv: n.querySelector(".mv"), wire: n.querySelector(".wire"), solid: n.querySelector(".solid") };
    });
    measure();
    frame(true);
  }

  function measure() {
    const r = svg.getBoundingClientRect();
    const W = r.width || innerWidth, H = r.height || innerHeight;
    state.vw = W < 520 ? 800 : Math.max(W < 720 ? 1000 : 1100, 760 * W / H);
    state.vh = state.vw * H / W;
    state.camCity = 175 - state.vh / 2 + (W < 720 ? 0 : 28);
    state.camSky = -1290 - state.vh * .3;
    state.shift = W >= 900 ? state.vw * .2 : 0;
  }

  function frame(force) {
    const p = state.agent ? 1 : state.p;
    if (!force && p === last) return;
    last = p;
    const cp = ease(clamp(p / .62));
    const camY = state.camSky + (state.camCity - state.camSky) * cp;
    svg.setAttribute("viewBox", `${f(-state.vw / 2 - state.shift * (1 - cp))} ${f(camY)} ${f(state.vw)} ${f(state.vh)}`);
    const stagger = Math.min(.034, .32 / Math.max(1, built.length));
    built.forEach((b, i) => {
      const n = nodes[b.id];
      if (!n) return;
      const t = clamp((p - (.06 + i * stagger)) / .5);
      const off = SKYZ * (1 - ease(t)) * TZ;
      n.mv.setAttribute("transform", `translate(0 ${f(-off)})`);
      n.solid.style.opacity = smooth(.86, 1, t);
      n.wire.style.opacity = 1 - smooth(.9, 1, t);
      const landed = t >= 1;
      n.el.classList.toggle("landed", landed);
      n.el.classList.toggle("on-paper", off < 700);
      n.el.style.pointerEvents = landed || state.agent ? "" : "none";
    });
    if (!reduce) {
      const h = smooth(.04, .2, p);
      hero.style.opacity = 1 - h;
      hero.style.transform = `translateY(${f(-60 * h)}px)`;
      hint.style.opacity = .75 * (1 - smooth(.02, .1, p));
      cap.style.opacity = smooth(.84, .94, p);
    }
  }

  function onScroll() {
    if (reduce) return;
    const r = descent.getBoundingClientRect();
    const span = r.height - innerHeight;
    state.p = clamp(-r.top / (span || 1));
    requestAnimationFrame(() => frame());
  }

  function cityTop() {
    return reduce ? descent.offsetTop : descent.offsetTop + descent.offsetHeight - innerHeight;
  }

  function focusBuilding(id) {
    const item = all().find(x => x.id === id);
    if (!item) return false;
    const isBuilt = item.kind === "built";
    if (isBuilt && Math.abs(scrollY - cityTop()) > 4) scrollTo({ top: cityTop(), behavior: reduce ? "auto" : "smooth" });
    setTimeout(() => {
      openPanel(item);
      const n = nodes[id];
      if (n) n.el.focus({ preventScroll: true });
    }, isBuilt && !reduce ? 650 : 0);
    return true;
  }

  svg.addEventListener("click", e => {
    const g = e.target.closest(".bld");
    if (!g) return;
    const item = all().find(x => x.id === g.dataset.id);
    if (item) openPanel(item);
  });
  svg.addEventListener("keydown", e => {
    const g = e.target.closest(".bld");
    if (!g || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const item = all().find(x => x.id === g.dataset.id);
    if (item) openPanel(item);
  });

  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { measure(); frame(true); onScroll(); });

  let themeKey = "";
  function themeCheck() {
    const k = getComputedStyle(document.documentElement).getPropertyValue("--b-blue").trim();
    if (k !== themeKey) { themeKey = k; render(); }
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", themeCheck);
  new MutationObserver(themeCheck).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  themeCheck();
  onScroll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => frame(true));

  return {
    focus: focusBuilding,
    cityTop,
    setAgent(on) { state.agent = on; if (on) closePanel(); frame(true); },
    addIdea(name) {
      const spots = [[1 + Math.random() * 11, Math.random() * 11, 26 + Math.random() * 9]];
      userIdeas.push({ id: "u" + Date.now(), kind: "idea", name, status: "你的图纸", mine: true, text: "刚刚放上天空。", at: spots[0] });
      render();
    },
  };
}
