export const TW = 64;
export const TH = 32;
export const TZ = 36;

export const P = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z * TZ];
export const f = n => Math.round(n * 10) / 10;
export const pts = a => a.map(q => { const [X, Y] = P(q[0], q[1], q[2] || 0); return f(X) + "," + f(Y); }).join(" ");
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const TOKENS = ["b-blue", "b-brick", "b-yellow", "b-teal", "b-plum", "b-cream", "b-stone", "b-bar", "tree", "trunk", "up", "down", "accent", "ink", "rail"];

export function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const T = {};
  TOKENS.forEach(k => { T[k] = cs.getPropertyValue("--" + k).trim() || "#888888"; });
  return T;
}

function rgb(h) {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

export function mix(h, to, a) {
  const c = rgb(h), t = to === "w" ? [255, 255, 255] : [0, 0, 0];
  return "rgb(" + c.map((v, i) => Math.round(v + (t[i] - v) * a)).join(",") + ")";
}

const sh = h => ({ t: mix(h, "w", .22), r: mix(h, "w", 0), l: mix(h, "k", .2) });

export class Pen {
  constructor() { this.s = ""; this.w = ""; }
  face(p, fill, cls = "", style = "") {
    const d = pts(p);
    this.s += `<polygon points="${d}"${fill ? ` fill="${fill}"` : ""}${cls ? ` class="${cls}"` : ""}${style ? ` style="${style}"` : ""}/>`;
    this.w += `<polygon points="${d}"/>`;
  }
  raw(s, w = "") { this.s += s; this.w += w; }
  box(x, y, w, d, z0, h, col, win) {
    const z1 = z0 + h, C = sh(col);
    this.face([[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]], C.l);
    this.face([[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]], C.r);
    this.face([[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]], C.t);
    if (win) this.wins(x, y, w, d, z0, h, win[0], win[1], win[2]);
  }
  wins(x, y, w, d, z0, h, nx, ny, nz) {
    for (let j = 0; j < nz; j++) {
      const a = z0 + h * (j + .3) / nz, b = z0 + h * (j + .72) / nz;
      for (let i = 0; i < nx; i++) {
        const u = x + w * (i + .3) / nx, v = x + w * (i + .7) / nx;
        this.face([[u, y + d, a], [v, y + d, a], [v, y + d, b], [u, y + d, b]], "", "win");
      }
      for (let i = 0; i < ny; i++) {
        const u = y + d * (i + .3) / ny, v = y + d * (i + .7) / ny;
        this.face([[x + w, u, a], [x + w, v, a], [x + w, v, b], [x + w, u, b]], "", "win");
      }
    }
  }
  gx(x, y, w, d, z, rh, col, wall) {
    const C = sh(col), W = sh(wall || col);
    this.face([[x, y, z], [x + w, y, z], [x + w, y + d / 2, z + rh], [x, y + d / 2, z + rh]], C.t);
    this.face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d / 2, z + rh]], W.r);
    this.face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d / 2, z + rh], [x, y + d / 2, z + rh]], C.l);
  }
  pyr(x, y, w, d, z, rh, col) {
    const C = sh(col), a = [x + w / 2, y + d / 2, z + rh];
    this.face([[x, y + d, z], [x + w, y + d, z], a], C.l);
    this.face([[x + w, y, z], [x + w, y + d, z], a], C.r);
  }
  cyl(cx, cy, z0, h, r, col) {
    const C = sh(col), [X, Yb] = P(cx, cy, z0), Yt = Yb - h * TZ;
    const rx = f(r * Math.SQRT2 * TW / 2), ry = f(r * Math.SQRT2 * TH / 2);
    const L = `M${f(X - rx)} ${f(Yt)} V${f(Yb)} A${rx} ${ry} 0 0 0 ${f(X)} ${f(Yb + ry)} V${f(Yt + ry)} A${rx} ${ry} 0 0 1 ${f(X - rx)} ${f(Yt)}Z`;
    const R = `M${f(X)} ${f(Yt + ry)} V${f(Yb + ry)} A${rx} ${ry} 0 0 0 ${f(X + rx)} ${f(Yb)} V${f(Yt)} A${rx} ${ry} 0 0 1 ${f(X)} ${f(Yt + ry)}Z`;
    const E = `<ellipse cx="${f(X)}" cy="${f(Yt)}" rx="${rx}" ry="${ry}"`;
    this.s += `<path d="${L}" fill="${C.l}"/><path d="${R}" fill="${C.r}"/>${E} fill="${C.t}"/>`;
    this.w += `<path d="M${f(X - rx)} ${f(Yt)} V${f(Yb)} A${rx} ${ry} 0 0 0 ${f(X + rx)} ${f(Yb)} V${f(Yt)}"/>${E}/>`;
  }
  cone(cx, cy, z0, h, r, col) {
    const C = sh(col), [X, Yb] = P(cx, cy, z0), Ya = Yb - h * TZ;
    const rx = f(r * Math.SQRT2 * TW / 2), ry = f(r * Math.SQRT2 * TH / 2);
    this.s += `<path d="M${f(X - rx)} ${f(Yb)} A${rx} ${ry} 0 0 0 ${f(X)} ${f(Yb + ry)} L${f(X)} ${f(Ya)}Z" fill="${C.l}"/><path d="M${f(X)} ${f(Yb + ry)} A${rx} ${ry} 0 0 0 ${f(X + rx)} ${f(Yb)} L${f(X)} ${f(Ya)}Z" fill="${C.r}"/>`;
    this.w += `<path d="M${f(X - rx)} ${f(Yb)} A${rx} ${ry} 0 0 0 ${f(X + rx)} ${f(Yb)} L${f(X)} ${f(Ya)}Z"/>`;
  }
  ball(cx, cy, z, r, col) {
    const [X, Y] = P(cx, cy, z);
    this.s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${r}" fill="${mix(col, "k", .12)}"/><circle cx="${f(X - r * .25)}" cy="${f(Y - r * .3)}" r="${f(r * .62)}" fill="${mix(col, "w", .12)}"/>`;
    this.w += `<circle cx="${f(X)}" cy="${f(Y)}" r="${r}"/>`;
  }
  line(a, b, stroke, wd = 1.5) {
    const [x1, y1] = P(...a), [x2, y2] = P(...b);
    const L = `x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"`;
    this.s += `<line ${L} stroke="${stroke}" stroke-width="${wd}" stroke-linecap="round"/>`;
    this.w += `<line ${L}/>`;
  }
  ellipse(cx, cy, z, r, cls) {
    const [X, Y] = P(cx, cy, z);
    this.raw(`<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(r * Math.SQRT2 * TW / 2)}" ry="${f(r * Math.SQRT2 * TH / 2)}" class="${cls}"/>`);
  }
}

export const TYPES = {
  plaza: {
    fp: [1, 1, 4, 4],
    anchor: [3.4, 2.2, 6.1],
    draw(p, T) {
      p.box(1, 1, 4, 4, 0, .12, T["b-stone"]);
      p.box(1.3, 1.3, 2.4, 1.7, .12, 1.5, T["b-blue"], [4, 2, 2]);
      p.gx(1.3, 1.3, 2.4, 1.7, 1.62, .8, T["b-brick"], T["b-blue"]);
      p.box(3.9, 1.4, .9, .9, .12, 4.2, T["b-cream"], [1, 1, 5]);
      p.pyr(3.9, 1.4, .9, .9, 4.32, 1.3, T["b-yellow"]);
      p.cyl(2.6, 4.0, .12, .25, .5, T["b-stone"]);
      p.ellipse(2.6, 4.0, .37, .38, "water");
    },
  },
  lightbar: {
    fp: [9.6, .6, 3.8, .7],
    anchor: [12.9, .95, .9],
    draw(p, T) {
      p.box(9.6, .6, 3.8, .7, 0, .32, T["b-bar"]);
      [.5, .8, .35, .65, .9, .45].forEach((h, i) => p.box(9.8 + i * .24, .8, .12, .3, .32, h * .7, i === 4 ? T["b-yellow"] : T["b-teal"]));
      ["b-brick", "b-blue", "b-plum", "b-yellow", "b-teal"].forEach((k, i) => {
        const x0 = 11.7 + i * .32;
        p.face([[x0, .78, .325], [x0 + .24, .78, .325], [x0 + .24, 1.12, .325], [x0, 1.12, .325]], T[k], "key", `animation-delay:${i * .5}s`);
      });
    },
  },
  cottage: {
    fp: [3.2, 7.3, 1.6, 1.3],
    anchor: [4.0, 7.95, 2.9],
    draw(p, T) {
      p.box(3.2, 7.3, 1.6, 1.3, 0, 1.0, T["b-yellow"], [2, 2, 1]);
      p.gx(3.2, 7.3, 1.6, 1.3, 1.0, .7, T["b-brick"], T["b-yellow"]);
      p.box(4.3, 7.42, .22, .22, 1.1, 1.0, T["b-brick"]);
      const [X, Y] = P(4.41, 7.53, 2.2);
      const d = [[0, 0], [5, -9], [1, -17], [10, -25], [6, -35], [15, -42], [12, -52]].map(q => f(X + q[0]) + "," + f(Y + q[1])).join(" ");
      p.raw(`<polyline points="${d}" class="spark"/>`);
    },
  },
  weather: {
    fp: [.2, 7.3, 1.75, 1.5],
    anchor: [1.0, 8.0, 4.6],
    draw(p, T) {
      p.box(.2, 7.3, 1.4, 1.3, 0, 1.0, T["b-cream"], [2, 2, 1]);
      p.cyl(1.55, 8.45, 0, 3.0, .32, T["b-stone"]);
      p.cone(1.55, 8.45, 3.0, .55, .38, T["b-teal"]);
      p.line([1.55, 8.45, 3.5], [1.55, 8.45, 4.25], T.ink, 1.5);
      p.face([[1.55, 8.45, 4.2], [1.95, 8.45, 4.1], [1.55, 8.45, 4.0]], T.accent);
    },
  },
  playground: {
    fp: [1.2, 11.2, 1.75, 1.85],
    anchor: [2.0, 12.0, 2.0],
    draw(p, T) {
      p.box(1.2, 11.2, .7, .7, 0, .7, T["b-brick"]);
      p.box(1.3, 11.3, .5, .5, .7, .5, T["b-teal"]);
      p.box(1.95, 11.25, .55, .55, 0, .55, T["b-yellow"]);
      p.cyl(2.3, 12.35, 0, .35, .6, T["b-plum"]);
      p.line([2.3, 12.35, .35], [2.3, 12.35, .95], T.ink, 1.5);
      p.cone(2.3, 12.35, .9, .6, .72, T["b-brick"]);
    },
  },
  bookshop: {
    fp: [4.2, 11.2, 1.5, 1.4],
    anchor: [4.95, 11.9, 2.3],
    draw(p, T) {
      p.box(4.2, 11.2, 1.5, 1.4, 0, 1.4, T["b-teal"], [2, 2, 1]);
      p.face([[4.25, 12.6, 1.08], [5.65, 12.6, 1.08], [5.65, 12.95, .82], [4.25, 12.95, .82]], T.accent);
      p.box(4.55, 11.45, .8, .18, 1.4, .38, T["b-cream"]);
    },
  },
  bridge: {
    fp: [6.0, 5.0, 3.4, 1.2],
    anchor: [7.7, 5.6, 3.0],
    draw(p, T) {
      const B = T["b-brick"];
      p.box(7.1, 5.3, .25, .6, 0, .62, T["b-stone"]);
      p.box(8.1, 5.3, .25, .6, 0, .62, T["b-stone"]);
      [7.08, 8.18].forEach(x => p.box(x, 5.0, .16, .16, 0, 2.3, B));
      const cab = (y, w) => {
        const a = P(6.0, y, .8), b = P(7.16, y, 2.3), c = P(7.71, y, .95), d = P(8.26, y, 2.3), e = P(9.4, y, .8);
        const path = `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} Q${f(c[0])} ${f(c[1])} ${f(d[0])} ${f(d[1])} L${f(e[0])} ${f(e[1])}`;
        p.raw(`<path d="${path}" fill="none" stroke="${B}" stroke-width="${w}"/>`, `<path d="${path}"/>`);
      };
      cab(5.08, 1.4);
      p.box(6.0, 5.1, 3.4, 1.0, .62, .18, T["b-stone"]);
      [7.08, 8.18].forEach(x => { p.box(x, 5.98, .16, .16, 0, 2.3, B); p.box(x, 5.0, .16, 1.14, 2.12, .2, B); });
      cab(6.06, 2);
    },
  },
  exchange: {
    fp: [10, 3, 2.6, 2],
    anchor: [11.3, 4.0, 2.9],
    draw(p, T) {
      p.box(10, 3, 2.6, 2, 0, .3, T["b-stone"]);
      p.box(10.1, 3.1, 2.4, 1.2, .3, 1.4, T["b-cream"], [3, 2, 1]);
      for (let i = 0; i < 6; i++) p.box(10.15 + i * .46, 4.55, .16, .16, .3, 1.4, T["b-cream"]);
      p.box(10, 3, 2.6, 2, 1.7, .2, T["b-stone"]);
      for (let i = 0; i < 8; i++) {
        const x0 = 10.12 + i * .31;
        p.face([[x0, 5, 1.74], [x0 + .2, 5, 1.74], [x0 + .2, 5, 1.86], [x0, 5, 1.86]], i % 3 === 1 ? T.down : T.up, "key", `animation-delay:${i * .3}s`);
      }
      p.gx(10, 3, 2.6, 2, 1.9, .55, T["b-cream"], T["b-cream"]);
    },
  },
  station: {
    fp: [10, 7.6, 2.4, 1.9],
    anchor: [12.4, 8.3, 2.2],
    draw(p, T) {
      p.box(10, 7.6, 2.4, 1.4, 0, 1.2, T["b-blue"], [3, 2, 1]);
      p.gx(10, 7.6, 2.4, 1.4, 1.2, .6, T["b-stone"], T["b-blue"]);
      p.face([[10, 9.0, .95], [12.4, 9.0, .95], [12.4, 9.5, .7], [10, 9.5, .7]], T["b-cream"]);
      [10.25, 10.55].forEach(y => p.line([9.6, y, 0], [13.9, y, 0], T.rail, 1.3));
      for (let x = 9.8; x < 13.9; x += .35) p.line([x, 10.18, 0], [x, 10.62, 0], T.rail, .8);
    },
  },
  train: {
    fp: [10, 10.15, 2.75, .5],
    anchor: [12.6, 10.4, 1.4],
    draw(p, T) {
      const q = new Pen();
      [["b-brick", 10.0], ["b-yellow", 10.95], ["b-teal", 11.9]].forEach(([k, x]) => q.box(x, 10.15, .85, .5, .04, .45, T[k], [2, 0, 1]));
      p.raw(`<g class="train">${q.s}</g>`, `<g class="train">${q.w}</g>`);
    },
  },
  tower: {
    fp: [11.3, 11.8, .7, .7],
    anchor: [11.65, 12.15, 4.6],
    draw(p, T) {
      p.box(11.3, 11.8, .7, .7, 0, .4, T["b-stone"]);
      for (let i = 0; i < 6; i++) p.box(11.55, 12.05, .2, .2, .4 + i * .55, .55, i % 2 ? T["b-cream"] : T["b-brick"]);
      p.ball(11.65, 12.15, 3.85, 4, T.accent);
      const [X, Y] = P(11.65, 12.15, 3.95);
      p.raw(`<ellipse class="ring" cx="${f(X)}" cy="${f(Y)}" rx="16" ry="8"/><ellipse class="ring" style="animation-delay:1.3s" cx="${f(X)}" cy="${f(Y)}" rx="16" ry="8"/>`);
    },
  },
  kiosk: {
    fp: [1.15, 4.1, .55, .55],
    anchor: [1.45, 4.35, 1.9],
    draw(p, T) {
      p.box(1.15, 4.1, .55, .55, .12, .85, T["b-teal"], [1, 1, 1]);
      p.pyr(1.15, 4.1, .55, .55, .97, .45, T["b-brick"]);
      p.face([[1.27, 4.65, .55], [1.57, 4.65, .55], [1.57, 4.65, .75], [1.27, 4.65, .75]], T["b-cream"]);
    },
  },
  signpost: {
    fp: [.2, 9.75, 1.1, .3],
    anchor: [.8, 9.9, 2.4],
    draw(p, T) {
      p.box(.55, 9.75, .3, .3, 0, .15, T["b-stone"]);
      p.line([.7, 9.9, .15], [.7, 9.9, 1.2], T.ink, 2);
      p.face([[.2, 9.9, 1.15], [1.3, 9.9, 1.15], [1.3, 9.9, 2.0], [.2, 9.9, 2.0]], T["b-yellow"]);
      [[.35, 1.85, .9], [.45, 1.65, .8], [.35, 1.45, 1.1], [.45, 1.25, .7]].forEach(([x, z, w]) => p.line([x, 9.89, z], [x + w * .9, 9.89, z], T.ink, 1.2));
    },
  },
  dock: {
    fp: [12.9, 3.2, 1.0, 1.0],
    anchor: [13.4, 3.7, 2.4],
    draw(p, T) {
      p.box(12.9, 3.2, 1.0, 1.0, 0, .8, T["b-stone"], [1, 1, 1]);
      p.line([13.1, 3.4, .8], [13.1, 3.4, 2.0], T["b-yellow"], 2.2);
      p.line([13.1, 3.4, 2.0], [13.1, 4.6, 1.7], T["b-yellow"], 2);
      p.line([13.1, 4.6, 1.7], [13.1, 4.6, 1.15], T.ink, 1);
      p.box(12.95, 4.45, .3, .3, .9, .25, T.accent);
    },
  },
  pavilion: {
    fp: [-.8, .9, 1.9, 1.3],
    anchor: [.2, 1.5, 2.0],
    draw(p, T) {
      p.box(-.8, .9, 1.9, 1.3, 0, .1, T["b-stone"]);
      p.face([[-.6, 1.2, .1], [.3, 1.2, .1], [.3, 1.2, 1.4], [-.6, 1.2, 1.4]], mix(T["b-blue"], "k", .15));
      p.face([[.3, 1.2, .1], [.95, 2.0, .1], [.95, 2.0, 1.4], [.3, 1.2, 1.4]], T["b-blue"]);
      p.face([[.38, 1.36, .3], [.86, 1.94, .3], [.86, 1.94, 1.2], [.38, 1.36, 1.2]], T.win ? T.win : mix(T["b-blue"], "w", .5), "win");
    },
  },
  shed: {
    fp: [-.7, 3.0, 1.3, 1.1],
    anchor: [0, 3.6, 1.8],
    draw(p, T) {
      p.box(-.7, 3.0, 1.3, 1.1, 0, .8, T["b-plum"], [1, 1, 1]);
      p.gx(-.7, 3.0, 1.3, 1.1, .8, .45, T["b-stone"], T["b-plum"]);
      [-.5, -.25, 0].forEach((x, i) => p.line([x, 4.12, .15], [x, 4.12, .55 + i * .08], i === 1 ? T.accent : T.ink, 1.6));
    },
  },
  generic: {
    anchor: null,
    draw(p, T, b) {
      const [x, y] = b.plot;
      p.box(x, y, 1.0, .9, 0, 1.15, T[b.tone] || T["b-teal"], [2, 2, 1]);
      p.pyr(x, y, 1.0, .9, 1.15, .6, T["b-stone"]);
    },
  },
};

export function footprintOf(b) {
  if (b.type === "generic") return [b.plot[0], b.plot[1], 1.0, .9];
  return (TYPES[b.type] || {}).fp || [0, 0, 1, 1];
}

export function anchorOf(b) {
  if (b.type === "generic") return [b.plot[0] + .5, b.plot[1] + .45, 2.3];
  return TYPES[b.type].anchor;
}

export function drawBuilt(b, T) {
  const p = new Pen();
  const type = TYPES[b.type] || TYPES.generic;
  type.draw(p, T, b);
  return p;
}

function scaffold(p, x, y, w, d, z0, h) {
  const zb = z0 - .55, zt = z0 + h + .1;
  [[x, y + d], [x + w, y + d], [x + w, y]].forEach(([a, b]) => {
    const [x1, y1] = P(a, b, zb), [x2, y2] = P(a, b, zt);
    p.raw("", `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`);
  });
  [zb + .2, z0 + h * .5].forEach(z => {
    const a = P(x, y + d, z), b = P(x + w, y + d, z), c = P(x + w, y, z);
    p.raw("", `<polyline points="${f(a[0])},${f(a[1])} ${f(b[0])},${f(b[1])} ${f(c[0])},${f(c[1])}"/>`);
  });
}

export function drawHang(d, T) {
  const p = new Pen();
  const [x, y, z] = d.at;
  p.box(x, y, 1.0, .8, z, .95, T["b-blue"]);
  p.gx(x, y, 1.0, .8, z + .95, .4, T["b-blue"]);
  scaffold(p, x, y, 1.0, .8, z, .95);
  return { pen: p, anchor: [x + .5, y + .4, z + 1.75], top: [x + .5, y + .4, z + 1.35] };
}

const SKY_SHAPES = [
  (p, x, y, z, T) => { p.box(x, y, 1.0, 1.0, z, 1.2, T["b-blue"]); p.pyr(x, y, 1.0, 1.0, z + 1.2, .8, T["b-blue"]); },
  (p, x, y, z, T) => { p.box(x, y, 1.2, 1.0, z, .9, T["b-blue"]); p.gx(x, y, 1.2, 1.0, z + .9, .5, T["b-blue"]); },
  (p, x, y, z, T) => { p.cyl(x + .4, y + .4, z, 1.4, .4, T["b-blue"]); p.cone(x + .4, y + .4, z + 1.4, .6, .45, T["b-blue"]); },
];

export function drawSky(d, T, i) {
  const p = new Pen();
  const [x, y, z] = d.at;
  SKY_SHAPES[i % SKY_SHAPES.length](p, x - .5, y - .5, z, T);
  return { pen: p, anchor: [x, y, z + 2.4] };
}
