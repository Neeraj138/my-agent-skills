/* sketchanim — a tiny deterministic engine for Excalidraw-style explainer animations.
 *
 * Everything is a function of time t (seconds), so the same scene renders identically
 * in the live player and in the frame-by-frame MP4 renderer.
 *
 * Scenes are plain JS files that call SA.scene(name, opts, build). See scenes/*.js.
 */
(function () {
  const W = 1920, H = 1080;
  const SA = (window.SA = { W, H, scenes: {} });

  // ---------- palettes ----------
  // A scene picks one with opts.theme ('dark' default | 'light') or --param theme=light; SA.C is swapped before it builds.
  // Use the role names in scenes, never hex greys: ink = main text/strokes (C.white is the same colour, kept for old scenes),
  // muted = secondary text, dim = faded structure, bg = background (also label pills).
  SA.THEMES = {
    dark: {   // sampled from the reference clip
      bg: '#121212', blue: '#4a90e2', teal: '#20a07a', purple: '#a98bf5', lilac: '#d58cf0', pink: '#f27fa0',
      orange: '#f47b35', red: '#d0574f', grey: '#6a6d73', green: '#4caf50', yellow: '#f2c94c',
      white: '#e6e6e6', ink: '#e6e6e6', muted: '#bdbdbd', dim: '#3a3a3e',
      mid: '#8a8a8a', star: '#9a9a9a', glyph: '#4a4a4a', node: '#c9c9c9', edge: '#55657c',
    },
    light: {  // Excalidraw's light palette on warm paper; yellow is amber so it reads on white
      bg: '#faf9f6', blue: '#1971c2', teal: '#0c8599', purple: '#6741d9', lilac: '#9c36b5', pink: '#c2255c',
      orange: '#e8590c', red: '#e03131', grey: '#868e96', green: '#2f9e44', yellow: '#e67700',
      white: '#1e1e1e', ink: '#1e1e1e', muted: '#555a60', dim: '#d4d4d8',
      mid: '#7a7f86', star: '#b8b8b8', glyph: '#cfcfcf', node: '#3d3d3d', edge: '#8fa3bf',
    },
  };
  SA.C = Object.assign({}, SA.THEMES.dark);
  SA.theme = 'dark';
  SA.useTheme = function (name) {
    if (!SA.THEMES[name]) throw new Error(`unknown theme '${name}' (have: ${Object.keys(SA.THEMES).join(', ')})`);
    Object.assign(SA.C, SA.THEMES[name]); SA.theme = name;
  };

  // ---------- utils ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  SA.rng = mulberry32;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  SA.clamp = clamp;

  const EASE = {
    linear: (t) => t,
    in: (t) => t * t * t,
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    smooth: (t) => t * t * (3 - 2 * t),
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    step: (t) => (t < 1 ? 0 : 1),
  };
  SA.EASE = EASE;

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, u) {
    if (typeof a === 'number') return lerp(a, b, u);
    if (typeof a === 'string' && a[0] === '#') {
      const A = hexToRgb(a), B = hexToRgb(b);
      return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], u))).join(',') + ')';
    }
    if (Array.isArray(a)) return a.map((v, i) => mix(v, b[i], u));
    return u < 1 ? a : b;
  }
  SA.mix = mix;

  // ---------- keyframe tracks ----------
  class Track {
    constructor(def) { this.def = def; this.keys = []; }
    key(t, v, ease = 'inOut') {
      this.keys.push({ t, v, ease });
      this.keys.sort((a, b) => a.t - b.t);
    }
    at(t) {
      const k = this.keys;
      if (!k.length) return this.def;
      if (t <= k[0].t) return k[0].v;
      for (let i = 1; i < k.length; i++) {
        if (t < k[i].t) {
          const a = k[i - 1], b = k[i];
          const u = (t - a.t) / (b.t - a.t || 1e-9);
          const e = typeof b.ease === 'function' ? b.ease : EASE[b.ease] || EASE.inOut;
          return mix(a.v, b.v, e(u));
        }
      }
      return k[k.length - 1].v;
    }
  }

  // ---------- base node ----------
  class Node {
    constructor(props = {}) {
      this.props = Object.assign({ x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, draw: 1 }, this.defaults(), props);
      this.tracks = {};
      this.children = [];
    }
    defaults() { return {}; }
    get(p, t) { const tr = this.tracks[p]; return tr ? tr.at(t) : this.props[p]; }
    track(p) { return this.tracks[p] || (this.tracks[p] = new Track(this.props[p])); }
    add(c) { this.children.push(c); c.parent = this; return c; }

    // animate props from their current value at t to new values over d seconds
    to(t, d, obj, ease = 'inOut') {
      for (const k in obj) { const tr = this.track(k); tr.key(t, tr.at(t), ease); tr.key(t + d, obj[k], ease); }
      return this;
    }
    // jump instantly
    set(t, obj) {
      for (const k in obj) { const tr = this.track(k); tr.key(t, tr.at(t), 'step'); tr.key(t + 1e-4, obj[k], 'linear'); }
      return this;
    }
    drawIn(t, d = 0.8, ease = 'inOut') { const tr = this.track('draw'); tr.key(t, 0); tr.key(t + d, 1, ease); return this; }
    undraw(t, d = 0.5, ease = 'inOut') { return this.to(t, d, { draw: 0 }, ease); }
    fadeIn(t, d = 0.4) { const tr = this.track('opacity'); tr.key(t, 0); tr.key(t + d, 1, 'out'); return this; }
    fadeOut(t, d = 0.4) { return this.to(t, d, { opacity: 0 }); }
    // dim never brightens: a node that's already faded out stays out
    dim(t, d = 0.5, v = 0.15) { return this.to(t, d, { opacity: Math.min(v, this.get('opacity', t)) }); }
    // move along a polyline [[x,y],...] over d seconds at constant speed
    along(t, d, points, ease = 'linear') {
      const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
      const total = seg.reduce((a, b) => a + b, 0) || 1;
      const tx = this.track('x'), ty = this.track('y');
      tx.key(t, points[0][0], 'step'); ty.key(t, points[0][1], 'step');
      let acc = 0;
      seg.forEach((len, i) => { acc += len; const tt = t + d * EASE[ease](acc / total); tx.key(tt, points[i + 1][0], 'linear'); ty.key(tt, points[i + 1][1], 'linear'); });
      return this;
    }
    popIn(t, d = 0.45) {
      const s = this.track('scale'); s.key(t, 0); s.key(t + d, 1, 'back');
      const o = this.track('opacity'); o.key(t, 0); o.key(t + d * 0.4, 1, 'out');
      return this;
    }
    moveTo(t, d, x, y, ease = 'inOut') { return this.to(t, d, { x, y }, ease); }
    recolor(t, d, color) {
      this.to(t, d, { color });
      for (const c of this.children) if (c.props.followColor) c.recolor(t, d, color);
      return this;
    }
    pivot() { return [0, 0]; }
    // own geometry in local coords [x0, y0, x1, y1] (null = none); subclasses override
    localBox() { return null; }
    // bounding box in the parent's coords, including children (scale applied around pivot)
    bbox(t = 1e9) {
      let b = this.localBox(t);
      for (const c of this.children) { const cb = c.bbox(t); if (cb) b = b ? union(b, cb) : cb; }
      if (!b) return null;
      const s = this.get('scale', t);
      if (s !== 1) { const [px, py] = this.pivot(t); b = [px + (b[0] - px) * s, py + (b[1] - py) * s, px + (b[2] - px) * s, py + (b[3] - py) * s]; }
      const x = this.get('x', t), y = this.get('y', t);
      return [b[0] + x, b[1] + y, b[2] + x, b[3] + y];
    }
    render(ctx, t, pa = 1) {
      const o = this.get('opacity', t) * pa;
      const s = this.get('scale', t);
      if (o <= 0.002 || s <= 0.002) return;
      ctx.save();
      ctx.translate(this.get('x', t), this.get('y', t));
      const r = this.get('rotation', t);
      if (s !== 1 || r) {
        const [px, py] = this.pivot(t);
        ctx.translate(px, py); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-px, -py);
      }
      this.paint(ctx, t, o);
      for (const c of this.children) c.render(ctx, t, o);
      ctx.restore();
    }
    paint() {}
  }
  SA.Node = Node;
  const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  SA.union = union;

  // ---------- rough.js geometry with draw-on ----------
  const gen = rough.generator();
  const measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const measurePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  measureSvg.appendChild(measurePath);
  measureSvg.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
  document.documentElement.appendChild(measureSvg);
  function pathLen(d) { measurePath.setAttribute('d', d); return measurePath.getTotalLength(); }
  function pathBox(d) { measurePath.setAttribute('d', d); const b = measurePath.getBBox(); return [b.x, b.y, b.x + b.width, b.y + b.height]; }

  function splitSub(d) {
    return d.split(/(?=M)/).filter((s) => s.trim()).map((s) => ({ p: new Path2D(s), len: Math.max(0.01, pathLen(s)) }));
  }

  const geoCache = new Map();
  // Returns {passes:[[{p,len}]], fill: Path2D|null}
  function roughGeo(paths, o) {
    const key = JSON.stringify([paths, o]);
    let g = geoCache.get(key);
    if (g) return g;
    const base = { roughness: o.roughness, bowing: o.bowing, strokeWidth: 1, disableMultiStroke: true, preserveVertices: true };
    const passes = [];
    let fillD = '', solidD = '';
    for (let pass = 0; pass < (o.passes || 2); pass++) {
      const subs = [];
      for (let i = 0; i < paths.length; i++) {
        const opts = Object.assign({}, base, { seed: o.seed + pass * 977 + i * 31 });
        if (pass === 0 && o.fill && !(o.noFillIdx || []).includes(i)) {
          Object.assign(opts, { fill: '#000', fillStyle: o.fillStyle || 'hachure', hachureGap: o.hachureGap, hachureAngle: o.hachureAngle, fillWeight: 1 });
        }
        const dr = gen.path(paths[i], opts);
        for (const set of dr.sets) {
          const sd = gen.opsToPath(set);
          if (set.type === 'path') subs.push(...splitSub(sd));
          else if (set.type === 'fillSketch') fillD += sd;
          else if (set.type === 'fillPath') solidD += sd;
        }
      }
      passes.push(subs);
    }
    g = { passes, fill: fillD ? new Path2D(fillD) : null, solid: solidD ? new Path2D(solidD) : null };
    if (geoCache.size > 4000) geoCache.clear();
    geoCache.set(key, g);
    return g;
  }

  function strokePartial(ctx, subs, prog) {
    const total = subs.reduce((a, s) => a + s.len, 0);
    let target = prog * total;
    for (const s of subs) {
      if (target <= 0) break;
      if (target >= s.len) ctx.setLineDash([]);
      else ctx.setLineDash([target, s.len + 50]);
      ctx.stroke(s.p);
      target -= s.len;
    }
    ctx.setLineDash([]);
  }

  // Generic hand-drawn shape from SVG path strings (local coords).
  class Rough extends Node {
    defaults() {
      return {
        color: SA.C.white, strokeWidth: 2.4, fill: false, fillColor: null, fillAlpha: 0.32,
        roughness: 1, bowing: 1, hachureGap: 9, hachureAngle: -50, seed: 1, passes: 2, fillStyle: 'hachure',
      };
    }
    paths() { return this.props.paths || []; }
    localBox(t) {
      if (this.bounds) { const b = this.bounds(t); return [b[0], b[1], b[0] + b[2], b[1] + b[3]]; }
      const ps = this.paths(t); if (!ps.length) return null;
      return ps.map(pathBox).reduce(union);
    }
    geo(t) {
      const P = this.props;
      return roughGeo(this.paths(t), {
        seed: P.seed, roughness: P.roughness, bowing: P.bowing, fill: !!P.fill, hachureGap: P.hachureGap,
        hachureAngle: P.hachureAngle, passes: P.passes, fillStyle: P.fillStyle, noFillIdx: P.noFillIdx,
      });
    }
    paint(ctx, t, o) {
      const prog = this.get('draw', t);
      if (prog <= 0) return;
      const g = this.geo(t);
      const color = this.get('color', t);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (g.solid) {
        ctx.save(); ctx.globalAlpha = o * clamp(prog * 1.6 - 0.3) * (this.props.solidAlpha ?? 1);
        ctx.fillStyle = this.get('fillColor', t) || color; ctx.fill(g.solid, 'evenodd'); ctx.restore();
      }
      if (g.fill) {
        const fp = clamp((prog - 0.15) / 0.85);
        if (fp > 0) {
          ctx.save();
          const b = this.bounds ? this.bounds(t) : [-5000, -5000, 10000, 10000];
          if (fp < 1) { ctx.beginPath(); ctx.rect(b[0] - 20, b[1] - 20, (b[2] + 40) * fp, b[3] + 40); ctx.clip(); }
          ctx.globalAlpha = o * this.get('fillAlpha', t);
          ctx.strokeStyle = this.get('fillColor', t) || color;
          ctx.lineWidth = 1.3;
          ctx.stroke(g.fill);
          ctx.restore();
        }
      }
      ctx.globalAlpha = o;
      ctx.strokeStyle = color;
      ctx.lineWidth = this.get('strokeWidth', t);
      if (this.props.dash) {
        // dashed/dotted strokes can't use the dash-offset draw-on trick: fade them in instead
        ctx.globalAlpha = o * prog; ctx.setLineDash(this.props.dash);
        g.passes[0].forEach((sp) => ctx.stroke(sp.p)); ctx.setLineDash([]);
      } else g.passes.forEach((subs, i) => {
        // second pass lags slightly behind the first, like a pen going over it again
        const pp = i === 0 ? prog : clamp((prog - 0.08) / 0.92);
        ctx.globalAlpha = o * (i === 0 ? 1 : 0.75);
        strokePartial(ctx, subs, pp);
      });
      ctx.globalAlpha = o;
    }
  }
  SA.Rough = Rough;

  function rrect(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const R = (v) => Math.round(v * 2) / 2;
    [x, y, w, h, r] = [x, y, w, h, r].map(R);
    return `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }
  SA.rrect = rrect;

  // Rounded rectangle; (x,y) is top-left.
  class Box extends Rough {
    defaults() { return Object.assign(super.defaults(), { w: 200, h: 80, r: 16, fill: true }); }
    paths(t) { return [rrect(0, 0, this.get('w', t), this.get('h', t), this.get('r', t))]; }
    bounds(t) { return [0, 0, this.get('w', t), this.get('h', t)]; }
    pivot(t) { return [this.get('w', t) / 2, this.get('h', t) / 2]; }
  }
  SA.Box = Box;

  class Ellipse extends Rough {
    defaults() { return Object.assign(super.defaults(), { rx: 30, ry: 30 }); }
    paths(t) {
      const rx = this.get('rx', t), ry = this.get('ry', t);
      return [`M ${-rx} 0 A ${rx} ${ry} 0 1 0 ${rx} 0 A ${rx} ${ry} 0 1 0 ${-rx} 0`];
    }
    bounds(t) { const rx = this.get('rx', t), ry = this.get('ry', t); return [-rx, -ry, rx * 2, ry * 2]; }
  }
  SA.Ellipse = Ellipse;

  // Polyline (optionally with arrowhead). points are local coords.
  class Line extends Rough {
    defaults() { return Object.assign(super.defaults(), { points: [[0, 0], [100, 0]], arrow: false, roughness: 0.8 }); }
    paths(t) {
      const pts = this.get('points', t);
      const out = ['M ' + pts.map((p) => p[0] + ' ' + p[1]).join(' L ')];
      if (this.props.arrow) {
        const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 16;
        const p1 = [b[0] - L * Math.cos(ang - 0.45), b[1] - L * Math.sin(ang - 0.45)];
        const p2 = [b[0] - L * Math.cos(ang + 0.45), b[1] - L * Math.sin(ang + 0.45)];
        out.push(`M ${p1[0]} ${p1[1]} L ${b[0]} ${b[1]} L ${p2[0]} ${p2[1]}`);
      }
      return out;
    }
  }
  Line.prototype.localBox = function (t) {
    const pts = this.get('points', t);
    return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  };
  SA.Line = Line;

  // ---------- text ----------
  SA.FONT = 'Virgil';
  // Text supports multiple lines ("\n") and *highlighted* words (drawn in `hl` color).
  function parseRich(line, base, hl) {
    const segs = []; let on = false;
    for (const part of line.split('*')) { if (part) segs.push({ s: part, c: on ? hl : base }); on = !on; }
    return segs;
  }
  const plain = (txt) => String(txt).replace(/\*/g, '');
  class Text extends Node {
    defaults() { return { text: '', size: 32, color: SA.C.white, hl: null, align: 'left', reveal: 'write', font: SA.FONT, weight: '', lineHeight: 1.22, maxW: null }; }
    font(t) { return `${this.props.weight} ${this.get('size', t)}px ${this.props.font}, cursive`.trim(); }
    // text with line breaks added so no line is wider than maxW (px); *highlights* stay intact across breaks
    lines(t) {
      const raw = String(this.get('text', t)), maxW = this.props.maxW;
      if (!maxW) return raw;
      const ctx = SA._mctx || (SA.measure('x'), SA._mctx); ctx.font = this.font(t);
      const fits = (l) => ctx.measureText(plain(l)).width <= maxW;
      return raw.split('\n').map((para) => {
        if (fits(para)) return para;
        const words = para.split(' ');
        const wrap = (w) => { const out = []; let cur = '';
          for (const x of words) { const next = cur ? cur + ' ' + x : x;
            if (cur && ctx.measureText(plain(next)).width > w) { out.push(cur); cur = x; } else cur = next; }
          if (cur) out.push(cur); return out; };
        // fewest lines that fit maxW, then the narrowest width that keeps that many lines → even lines, no orphan word
        let out = wrap(maxW), lo = 0, hi = maxW;
        while (hi - lo > 4) { const mid = (lo + hi) / 2; if (wrap(mid).length <= out.length) hi = mid; else lo = mid; }
        out = wrap(hi);
        // a highlight split across lines: close it at the line end, reopen on the next line
        for (let i = 0; i < out.length - 1; i++) if ((out[i].split('*').length - 1) % 2) { out[i] += '*'; out[i + 1] = '*' + out[i + 1]; }
        return out.join('\n');
      }).join('\n');
    }
    width(ctx, t) { ctx.font = this.font(t); return Math.max(...plain(this.lines(t)).split('\n').map((l) => ctx.measureText(l).width)); }
    pivot(t) {
      const w = this.width(SA._ctx || SA._mctx, t);
      const a = this.props.align;
      return [a === 'center' ? 0 : a === 'right' ? -w / 2 : w / 2, 0];
    }
    localBox(t) {
      const w = this.width(SA._mctx || (SA.measure('x'), SA._mctx), t), size = this.get('size', t);
      const n = this.lines(t).split('\n').length, h = n * size * this.props.lineHeight;
      const a = this.props.align, x0 = a === 'center' ? -w / 2 : a === 'right' ? -w : 0;
      return [x0, -h / 2, x0 + w, h / 2];
    }
    paint(ctx, t, o) {
      const prog = this.get('draw', t);
      if (prog <= 0) return;
      const size = this.get('size', t);
      ctx.font = this.font(t);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      const base = this.get('color', t), hl = this.get('hl', t) || SA.C.orange;
      const lines = this.lines(t).split('\n').map((l) => {
        const segs = parseRich(l, base, hl);
        for (const g of segs) g.w = ctx.measureText(g.s).width;
        return { segs, w: segs.reduce((a, g) => a + g.w, 0), n: segs.reduce((a, g) => a + g.s.length, 0) };
      });
      const lh = size * this.props.lineHeight;
      const mode = this.props.reveal;
      const totalN = lines.reduce((a, l) => a + l.n, 0), totalW = lines.reduce((a, l) => a + l.w, 0);
      let budget = mode === 'type' ? prog * totalN : prog * totalW;
      ctx.globalAlpha = mode === 'fade' ? o * prog : o;
      if (this.props.bg) {
        const mw = Math.max(...lines.map((l) => l.w)), pad = size * 0.35, hh = lines.length * lh;
        const bx = this.props.align === 'center' ? -mw / 2 : this.props.align === 'right' ? -mw : 0;
        ctx.save(); ctx.fillStyle = this.props.bg; ctx.globalAlpha *= 0.92;
        ctx.beginPath(); ctx.roundRect(bx - pad, -hh / 2 - pad * 0.4, mw + pad * 2, hh + pad * 0.8, size * 0.4); ctx.fill(); ctx.restore();
      }
      lines.forEach((L, i) => {
        const y = (i - (lines.length - 1) / 2) * lh;
        let x = this.props.align === 'center' ? -L.w / 2 : this.props.align === 'right' ? -L.w : 0;
        if (prog >= 1 || mode === 'fade') {
          for (const g of L.segs) { ctx.fillStyle = g.c; ctx.fillText(g.s, x, y); x += g.w; }
          return;
        }
        if (budget <= 0) return;
        if (mode === 'type') {
          for (const g of L.segs) {
            if (budget <= 0) break;
            const k = Math.min(g.s.length, Math.floor(budget));
            ctx.fillStyle = g.c;
            ctx.fillText(g.s.slice(0, k), x, y);
            if (k < g.s.length && budget - k > 0) {
              // the next glyph is "being written": reveal it with a horizontal clip
              const bw = ctx.measureText(g.s.slice(0, k)).width, cw = ctx.measureText(g.s[k]).width;
              ctx.save(); ctx.beginPath(); ctx.rect(x + bw, y - size, cw * (budget - k), size * 2); ctx.clip();
              ctx.fillText(g.s.slice(0, k + 1), x, y); ctx.restore();
            }
            budget -= g.s.length; x += g.w;
          }
        } else {
          // 'write': left-to-right wipe, line by line
          const x0 = x, cw = Math.min(L.w, budget);
          ctx.save(); ctx.beginPath(); ctx.rect(x0 - 10, y - size, cw + 10, size * 2); ctx.clip();
          for (const g of L.segs) { ctx.fillStyle = g.c; ctx.fillText(g.s, x, y); x += g.w; }
          ctx.restore();
          budget -= L.w;
        }
      });
    }
  }
  SA.Text = Text;
  // width of a string in the hand-drawn font (use in scene layout)
  SA.measure = (text, size = 32, font = SA.FONT) => {
    const c = SA._mctx || (SA._mctx = document.createElement('canvas').getContext('2d'));
    c.font = `${size}px ${font}, cursive`;
    return Math.max(...plain(text).split('\n').map((l) => c.measureText(l).width));
  };

  // ---------- smooth dashed connector (bezier) ----------
  class Curve extends Node {
    defaults() { return { from: [0, 0], to: [100, 100], c1: null, c2: null, color: SA.C.white, width: 2.5, dash: [7, 7], bend: 0.5 }; }
    ctrl(t) {
      const a = this.get('from', t), b = this.get('to', t);
      const c1 = this.get('c1', t) || [lerp(a[0], b[0], this.props.bend), a[1]];
      const c2 = this.get('c2', t) || [lerp(a[0], b[0], 1 - this.props.bend), b[1]];
      return [a, c1, c2, b];
    }
    paint(ctx, t, o) {
      const prog = this.get('draw', t);
      if (prog <= 0) return;
      const [a, c1, c2, b] = this.ctrl(t);
      const N = 120, pts = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N, v = 1 - u;
        pts.push([
          v * v * v * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * b[0],
          v * v * v * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * b[1],
        ]);
      }
      const end = prog * N;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= Math.floor(end); i++) ctx.lineTo(pts[i][0], pts[i][1]);
      const k = Math.floor(end);
      if (k < N) { const f = end - k; ctx.lineTo(lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)); }
      ctx.globalAlpha = o;
      ctx.strokeStyle = this.get('color', t);
      ctx.lineWidth = this.get('width', t);
      ctx.lineCap = 'round';
      ctx.setLineDash(this.props.dash || []);
      ctx.lineDashOffset = this.props.flow ? -t * this.props.flow : 0;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  Curve.prototype.localBox = function (t) { const p = this.ctrl(t); return [Math.min(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[0])), Math.max(...p.map((q) => q[1]))]; };
  SA.Curve = Curve;

  // ---------- particle stream inside a rounded bar ----------
  // style: 'dots' | 'dashes'. Use `gate` to transform particles that pass a point.
  class Flow extends Node {
    defaults() {
      return {
        w: 600, h: 60, r: 14, style: 'dots', count: 30, rows: 2, colors: [SA.C.blue], speed: 40,
        size: 7, density: 1, gate: null, gateOn: 1, seed: 7, lenRange: [30, 90], jitter: 0.25,
      };
    }
    particles() {
      if (this._ps) return this._ps;
      const P = this.props, R = mulberry32(P.seed), ps = [];
      // stratified: particles evenly spaced along each row (with jitter), one speed per row -> no clumping
      const perRow = Math.ceil(P.count / P.rows);
      for (let row = 0; row < P.rows; row++) {
        const sp = 0.8 + R() * 0.4, off = R();
        for (let k = 0; k < perRow; k++) {
          ps.push({
            x0: (k + off + (R() - 0.5) * 0.45) / perRow, row, jy: (R() - 0.5) * P.jitter, rank: R(), sp,
            len: lerp(P.lenRange[0], P.lenRange[1], R()) * (P.style === 'dashes' ? Math.min(1, 1.6 / (perRow / 10)) : 1),
            color: P.colors[Math.floor(R() * P.colors.length)], tilt: (R() - 0.5) * 0.06,
          });
        }
      }
      return (this._ps = ps);
    }
    pivot(t) { return [this.get('w', t) / 2, this.get('h', t) / 2]; }
    paint(ctx, t, o) {
      const P = this.props;
      const w = this.get('w', t), h = this.get('h', t), dens = this.get('density', t);
      if (dens <= 0) return;
      ctx.save();
      ctx.beginPath(); ctx.roundRect(5, 5, w - 10, h - 10, Math.max(2, this.get('r', t) - 4)); ctx.clip();
      ctx.globalAlpha = o;
      const gate = P.gate ? Object.assign({}, P.gate, { x: this.get('gateX', t) ?? P.gate.x }) : null;
      const gateOn = gate ? this.get('gateOn', t) ?? 1 : 0;
      const rowH = (h - 16) / P.rows;
      const span = w + 120;
      // two passes: originals left of the gate, transformed particles right of it
      const passes = gate && gateOn > 0 ? [[-100, gate.x, false], [gate.x, w + 100, true]] : [[-100, w + 100, false]];
      for (const [x0, x1, after] of passes) {
        ctx.save(); ctx.beginPath(); ctx.rect(x0, -50, x1 - x0, h + 100); ctx.clip();
        for (const p of this.particles()) {
          if (p.rank > dens) continue;
          const x = ((p.x0 * span + t * P.speed * p.sp) % span) - 60;
          let y = 8 + rowH * (p.row + 0.5 + p.jy), color = p.color, len = p.len, tilt = p.tilt;
          if (after) {
            color = gate.color; tilt = 0; y = 8 + rowH * (p.row + 0.5);
            if (gate.len) len = gate.len;
          }
          ctx.fillStyle = ctx.strokeStyle = color;
          if (P.style === 'dots') {
            ctx.beginPath(); ctx.arc(x, y, after && gate.size ? gate.size : P.size, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.lineWidth = P.size * 1.6; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + len * tilt); ctx.stroke();
          }
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }
  Flow.prototype.localBox = function (t) { return [0, 0, this.get('w', t), this.get('h', t)]; };
  SA.Flow = Flow;

  // ---------- grid box (the "filter/gate" in the reference) ----------
  class Grid extends Box {
    defaults() { return Object.assign(super.defaults(), { cell: 14, r: 10, fill: false }); }
    paint(ctx, t, o) {
      super.paint(ctx, t, o);
      const prog = this.get('draw', t); if (prog <= 0) return;
      const w = this.get('w', t), h = this.get('h', t), c = this.props.cell;
      ctx.save(); ctx.globalAlpha = o * 0.85 * clamp(prog * 1.5 - 0.3);
      ctx.strokeStyle = this.get('color', t); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.rect(4, 4, w - 8, (h - 8) * prog); ctx.clip();
      ctx.beginPath();
      for (let x = c; x < w - 4; x += c) { ctx.moveTo(x, 6); ctx.lineTo(x, h - 6); }
      for (let y = c; y < h - 4; y += c) { ctx.moveTo(6, y); ctx.lineTo(w - 6, y); }
      ctx.stroke(); ctx.restore();
    }
  }
  SA.Grid = Grid;

  // ---------- dot: a data point (filled circle with a soft ring) ----------
  class Dot extends Node {
    defaults() { return { r: 8, color: SA.C.white, ring: 0.35 }; }
    paint(ctx, t, o) {
      const r = this.get('r', t), c = this.get('color', t);
      ctx.globalAlpha = o * this.get('ring', t); ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, 6.283); ctx.fill();
      ctx.globalAlpha = o; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
    }
  }
  Dot.prototype.localBox = function (t) { const r = this.get('r', t) * (this.get('ring', t) > 0 ? 1.9 : 1); return [-r, -r, r, r]; };
  SA.Dot = Dot;

  // ---------- counter: a number that rolls between values ----------
  class Counter extends Text {
    defaults() { return Object.assign(super.defaults(), { value: 0, decimals: 0, prefix: '', suffix: '', reveal: 'fade' }); }
    get(p, t) {
      if (p !== 'text') return super.get(p, t);
      const v = super.get('value', t), d = this.props.decimals;
      const n = d ? v.toFixed(d) : Math.round(v).toLocaleString('en-US');
      return this.props.prefix + n + this.props.suffix;
    }
  }
  SA.Counter = Counter;

  // ---------- coin: flips (squashes horizontally) while `spin` advances ----------
  class Coin extends Node {
    defaults() { return { r: 18, color: SA.C.yellow, spin: 0, face: 'up' }; }
    paint(ctx, t, o) {
      const r = this.get('r', t), sp = this.get('spin', t), c = this.get('color', t);
      const sx = Math.abs(Math.cos(sp * Math.PI)) * 0.9 + 0.1;
      ctx.save(); ctx.scale(sx, 1); ctx.globalAlpha = o;
      ctx.fillStyle = c; ctx.globalAlpha = o * 0.25; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();
      ctx.globalAlpha = o; ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, 6.283); ctx.stroke();
      ctx.restore();
    }
  }
  Coin.prototype.localBox = function (t) { const r = this.get('r', t); return [-r, -r, r, r]; };
  SA.Coin = Coin;

  // ---------- subtitles: word-synced captions from TTS timings ----------
  // words: [{w, start, end}] (seconds, relative to audio start); offset = when audio starts in the scene.
  class Subtitles extends Node {
    defaults() { return { words: [], offset: 0, size: 54, color: SA.C.white, hl: SA.C.yellow, maxChars: 26, lines: 2, gap: 0.35, display: null }; }
    chunks() {
      if (this._chunks) return this._chunks;
      const P = this.props, cap = P.maxChars * P.lines * 0.8;
      const len = (ws) => ws.reduce((a, w) => a + w.txt.length + 1, -1);
      // 1. phrases: break at sentence ends, at real pauses, or when the block is full
      const out = []; let cur = [];
      P.words.forEach((w, i) => {
        const word = { txt: (P.display && P.display[i]) || w.w, start: w.start + P.offset, end: w.end + P.offset };
        const prev = cur[cur.length - 1];
        // words left in this sentence: if only 1-2 remain, let the block run a little long instead of stranding them
        let rest = 0; for (let k = i; k < P.words.length; k++) { rest++; if (/[.?!]$/.test(P.words[k].w)) break; }
        const full = len(cur) + word.txt.length + 1 > (rest <= 2 ? cap * 1.35 : cap);
        if (cur.length && (full || /[.?!]$/.test(prev.txt) || word.start - prev.end > P.gap)) { out.push(cur); cur = []; }
        cur.push(word);
      });
      if (cur.length) out.push(cur);
      // 2. never leave one or two words alone: merge them into a neighbour when they fit
      for (let i = 0; i < out.length; i++) {
        if (out[i].length > 2) continue;
        // only across a short breath — never across a real pause (words would show before they're said)
        const near = (A, B) => B[0].start - A[A.length - 1].end < 0.45;
        if (i > 0 && near(out[i - 1], out[i]) && len(out[i - 1]) + len(out[i]) + 1 <= cap * 1.15) { out[i - 1] = out[i - 1].concat(out[i]); out.splice(i--, 1); }
        else if (i + 1 < out.length && near(out[i], out[i + 1]) && len(out[i]) + len(out[i + 1]) + 1 <= cap * 1.15) { out[i + 1] = out[i].concat(out[i + 1]); out.splice(i--, 1); }
      }
      // 3. lines: balanced split; don't end line 1 on a little word ("a", "the", "to"...), don't orphan one word
      const weak = /^(a|an|the|to|of|and|or|in|on|at|for|with|is|its|it's|your|by|from|but|so)[,.]?$/i;
      const split = (ws) => {
        if (len(ws) <= P.maxChars) return [ws];
        let best = null, bestS = Infinity;
        for (let k = 1; k < ws.length; k++) {
          const a = ws.slice(0, k), b = ws.slice(k);
          let sc = Math.abs(len(a) - len(b)) + Math.max(0, len(a) - P.maxChars) * 4 + Math.max(0, len(b) - P.maxChars) * 4;
          if (weak.test(a[a.length - 1].txt)) sc += 25;
          if (b.length === 1 || a.length === 1) sc += 30;
          if (/[,;:]$/.test(a[a.length - 1].txt)) sc -= 6;
          if (sc < bestS) { bestS = sc; best = [a, b]; }
        }
        return best;
      };
      return (this._chunks = out.map((ws) => ({ lines: split(ws), start: ws[0].start, end: ws[ws.length - 1].end })));
    }
    paint(ctx, t, o) {
      const P = this.props, ch = this.chunks();
      const c = ch.find((c, i) => t >= c.start - 0.05 && t < (ch[i + 1] ? Math.min(ch[i + 1].start - 0.05, c.end + 0.8) : c.end + 0.8));
      if (!c) return;
      const size = P.size, lh = size * 1.25;
      ctx.font = `${size}px ${SA.FONT}, cursive`; ctx.textBaseline = 'middle';
      const space = ctx.measureText(' ').width;
      const appear = clamp((t - (c.start - 0.05)) / 0.18);
      c.lines.forEach((line, li) => {
        const ws = line.map((w) => ctx.measureText(w.txt).width);
        let x = -(ws.reduce((a, b) => a + b, 0) + space * (line.length - 1)) / 2;
        const y = (li - (c.lines.length - 1) / 2) * lh + (1 - EASE.out(appear)) * 14;
        line.forEach((w, i) => {
          const spoken = t >= w.start - 0.02, active = spoken && t < w.end + 0.08;
          ctx.globalAlpha = o * appear * (spoken ? 1 : 0.4);
          ctx.fillStyle = active ? P.hl : P.color;
          ctx.fillText(w.txt, x, y);
          x += ws[i] + space;
        });
      });
    }
  }
  Subtitles.prototype.localBox = () => null;
  SA.Subtitles = Subtitles;
  // find when a phrase is spoken: cue(words, 'jumps get shorter') -> start time of its first word
  SA.cue = (words, phrase, after = 0) => {
    const n = (x) => x.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const p = phrase.split(/\s+/).map(n);
    for (let i = 0; i < words.length; i++) {
      if (words[i].start < after) continue;
      if (p.every((x, k) => words[i + k] && n(words[i + k].w).replace(/\.$/, '') === x.replace(/\.$/, ''))) return { start: words[i].start, end: words[i + p.length - 1].end };
    }
    throw new Error('cue not found: ' + phrase);
  };

  // ---------- sparkle ✦ ----------
  class Sparkle extends Node {
    defaults() { return { size: 16, color: SA.C.orange, width: 2.2, phase: 0, twinkle: 1 }; }
    paint(ctx, t, o) {
      const s = this.get('size', t) * (1 + 0.14 * this.props.twinkle * Math.sin(t * 2.6 + this.props.phase));
      ctx.save(); ctx.rotate(0.15 * Math.sin(t * 0.9 + this.props.phase));
      ctx.globalAlpha = o; ctx.strokeStyle = this.get('color', t); ctx.lineWidth = this.props.width; ctx.lineJoin = 'round';
      const k = s * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, -s); ctx.quadraticCurveTo(k, -k, s, 0); ctx.quadraticCurveTo(k, k, 0, s);
      ctx.quadraticCurveTo(-k, k, -s, 0); ctx.quadraticCurveTo(-k, -k, 0, -s); ctx.closePath();
      ctx.stroke(); ctx.restore();
    }
  }
  Sparkle.prototype.localBox = function (t) { const r = this.get('size', t) * 1.15; return [-r, -r, r, r]; };
  SA.Sparkle = Sparkle;

  // ---------- icon library (paths in a 64x64 box) ----------
  SA.ICONS = {
    doc: ['M12 4 H40 L52 16 V60 H12 Z', 'M40 4 V16 H52', 'M20 26 H44 M20 33 H44 M20 40 H44 M20 47 H44 M20 54 H36'],
    flow: ['M4 6 H26 V20 H4 Z', 'M38 6 H60 V20 H38 Z', 'M21 44 H43 V58 H21 Z', 'M26 13 H38', 'M15 20 L27 44', 'M49 20 L37 44'],
    browser: ['M3 8 H61 V56 H3 Z', 'M3 18 H61', 'M9 13 h1 M14 13 h1 M19 13 h1', 'M9 24 H29 V50 H9 Z', 'M35 24 H55 V35 H35 Z', 'M35 39 H55 V50 H35 Z'],
    play: ['M3 10 H61 V54 H3 Z', 'M32 18 A14 14 0 1 0 32 46 A14 14 0 1 0 32 18', 'M27 24 L41 32 L27 40 Z'],
    model: ['M4 4 H60 V60 H4 Z', 'M32 18 V46 M20 25 L44 39 M44 25 L20 39'],
    db: ['M10 14 A22 7 0 1 0 54 14 A22 7 0 1 0 10 14', 'M10 14 V50 A22 7 0 0 0 54 50 V14', 'M10 32 A22 7 0 0 0 54 32'],
    user: ['M32 8 A11 11 0 1 0 32 30 A11 11 0 1 0 32 8', 'M10 58 Q12 36 32 36 Q52 36 54 58'],
    cloud: ['M16 46 Q4 46 6 35 Q8 26 18 28 Q20 14 34 15 Q46 16 47 28 Q58 27 58 37 Q58 46 48 46 Z'],
    gear: ['M32 20 A12 12 0 1 0 32 44 A12 12 0 1 0 32 20', 'M32 4 V14 M32 50 V60 M4 32 H14 M50 32 H60 M12 12 L19 19 M45 45 L52 52 M52 12 L45 19 M19 45 L12 52'],
    bolt: ['M36 4 L14 36 H30 L26 60 L50 26 H34 Z'],
    lock: ['M14 28 H50 V58 H14 Z', 'M20 28 V18 Q20 6 32 6 Q44 6 44 18 V28', 'M32 40 V48'],
    chat: ['M6 8 H58 V44 H26 L14 56 V44 H6 Z', 'M16 20 H48 M16 30 H40'],
    brain: ['M30 8 Q16 6 14 18 Q4 22 8 34 Q4 46 16 50 Q20 60 30 56 Z', 'M34 8 Q48 6 50 18 Q60 22 56 34 Q60 46 48 50 Q44 60 34 56 Z', 'M14 30 Q22 28 22 36 M50 30 Q42 28 42 36 M24 16 Q28 22 24 26 M40 16 Q36 22 40 26'],
  };
  class Icon extends Rough {
    defaults() { return Object.assign(super.defaults(), { name: 'doc', size: 64, roughness: 0.6, strokeWidth: 2, hachureGap: 6, fillAlpha: 0.28 }); }
    paths() {
      const k = this.props.size / 64;
      return SA.ICONS[this.props.name].map((d) => k === 1 ? d : d.replace(/-?\d+(\.\d+)?/g, (n) => String(+n * k)));
    }
    bounds() { return [0, 0, this.props.size, this.props.size]; }
    pivot() { return [this.props.size / 2, this.props.size / 2]; }
  }
  SA.Icon = Icon;

  // ---------- stick figure ("you") ----------
  class Stick extends Rough {
    defaults() { return Object.assign(super.defaults(), { size: 1, roughness: 0.5, passes: 1, strokeWidth: 2.6 }); }
    paths() {
      const k = this.props.size;
      const s = (d) => d.replace(/-?\d+(\.\d+)?/g, (n) => String(+n * k));
      return [
        s('M0 -60 A16 16 0 1 0 0 -28 A16 16 0 1 0 0 -60'),
        s('M0 -28 V24'), s('M-26 6 L0 -8 L26 6'), s('M-20 70 L0 24 L20 70'),
      ];
    }
    pivot() { return [0, 0]; }
  }
  Stick.prototype.localBox = function () { const k = this.props.size; return [-26 * k, -60 * k, 26 * k, 70 * k]; };
  SA.Stick = Stick;

  // ---------- composite: labelled lane bar with particle flow ----------
  class Bar extends Node {
    defaults() { return { w: 700, h: 50, color: SA.C.blue, label: '', labelSize: 28, flow: null, r: 16 }; }
    constructor(props) {
      super(props);
      const P = this.props;
      this.box = this.add(new Box({ w: P.w, h: P.h, r: P.r, color: P.color, seed: P.seed || 3, followColor: true, fillAlpha: 0.34, hachureGap: 10 }));
      if (P.flow) this.flow = this.add(new Flow(Object.assign({ w: P.w, h: P.h, r: P.r, density: 0, colors: [P.color] }, P.flow)));
      if (P.label) this.label = this.add(new Text({ text: P.label, size: P.labelSize, color: P.color, x: 22, y: -22, followColor: true }));
      // put flow beneath the outline
      if (this.flow) this.children = [this.flow, this.box, ...(this.label ? [this.label] : [])];
    }
    pivot(t) { return [this.get('w', t) / 2, this.get('h', t) / 2]; }
    drawIn(t, d = 0.9) {
      this.box.drawIn(t, d);
      if (this.label) this.label.drawIn(t + d * 0.3, 0.5);
      if (this.flow) this.flow.to(t + d * 0.4, 1.2, { density: 1 }, 'out');
      return this;
    }
    resize(t, d, w, h, ease = 'inOut') {
      this.box.to(t, d, { w, h }, ease);
      if (this.flow) this.flow.to(t, d, { w, h }, ease);
      this.to(t, d, { w, h }, ease);
      return this;
    }
  }
  SA.Bar = Bar;

  // ---------- scrim: background-colored band that keeps captions readable ----------
  class Scrim extends Node {
    // unset top/solid/fade follow the format: reels fade the top (subtitles at y≈335), 16:9 fades the bottom (subtitles at the bottom)
    defaults() { return { top: null, solid: null, fade: null, color: SA.C.bg }; }
    paint(ctx, t, o) {
      const sc = SA._scene, [r, g, b] = hexToRgb(this.props.color), wide = !sc.reel;
      const top = this.props.top ?? !wide, solid = this.props.solid ?? (wide ? 120 : 420), fade = this.props.fade ?? (wide ? 110 : 160);
      const y0 = top ? 0 : sc.H - solid - fade;
      const gr = ctx.createLinearGradient(0, top ? solid : y0 + fade, 0, top ? solid + fade : y0);
      gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.globalAlpha = o; ctx.fillStyle = gr; ctx.fillRect(0, y0, sc.W, solid + fade);
    }
  }
  SA.Scrim = Scrim;

  // ---------- background starfield ----------
  function starfield(seed, w, h, worldH) {
    const R = mulberry32(seed), stars = [];
    const X0 = -0.8 * w, SW = 2.7 * w, Y0 = -0.8 * h, SH = Math.max(3.3 * h, worldH + 1.6 * h);
    const k = (SW * SH) / (5200 * 3600);
    for (let i = 0; i < 260 * k; i++) stars.push({ x: X0 + R() * SW, y: Y0 + R() * SH, r: 0.8 + R() * 1.6, a: 0.08 + R() * 0.25, ph: R() * 6.28, c: R() < 0.12 ? (R() < 0.5 ? SA.C.orange : SA.C.blue) : SA.C.star });
    const glyphs = [];
    for (let i = 0; i < 26 * k; i++) glyphs.push(new Sparkle({ x: X0 + R() * SW, y: Y0 + R() * SH, size: 6 + R() * 5, color: SA.C.glyph, width: 1.5, phase: R() * 6 }));
    return { stars, glyphs };
  }


  // =====================================================================================
  // Layout + reusable components. Build a diagram inside a group at any coordinates, then
  // call group.center() so it sits in the middle of the frame (or .fit() to a max width).
  // =====================================================================================
  let seedCounter = 100;
  const nextSeed = () => (seedCounter += 17);
  SA.nextSeed = nextSeed;

  // Helper methods shared by Scene and Group (both have add()).
  const Build = {
    box(p) { return this.add(new Box(Object.assign({ seed: nextSeed() }, p))); },
    ellipse(p) { return this.add(new Ellipse(Object.assign({ seed: nextSeed() }, p))); },
    line(p) { return this.add(new Line(Object.assign({ seed: nextSeed() }, p))); },
    arrow(p) { return this.add(new Line(Object.assign({ seed: nextSeed(), arrow: true }, p))); },
    text(p) { return this.add(new Text(p)); },
    curve(p) { return this.add(new Curve(p)); },
    flow(p) { return this.add(new Flow(Object.assign({ seed: nextSeed() }, p))); },
    grid(p) { return this.add(new Grid(Object.assign({ seed: nextSeed() }, p))); },
    sparkle(p) { return this.add(new Sparkle(p)); },
    dot(p) { return this.add(new Dot(p)); },
    counter(p) { return this.add(new Counter(p)); },
    coin(p) { return this.add(new Coin(p)); },
    shape(p) { return this.add(new Rough(Object.assign({ seed: nextSeed() }, p))); },
    icon(name, p) { return this.add(new Icon(Object.assign({ name, seed: nextSeed() }, p))); },
    stick(p) { return this.add(new Stick(Object.assign({ seed: nextSeed() }, p))); },
    bar(p) { return this.add(new Bar(Object.assign({ seed: nextSeed() }, p))); },
    group(p) { return this.add(new Group(p)); },
    chip(p) { return this.add(new Chip(p)); },
    plane(p) { return this.add(new Plane(p)); },
    graph(p) { return this.add(new Graph(p)); },
    barChart(p) { return this.add(new BarChart(p)); },
    // a row (or wrapped rows) of chips, centered on cx. Returns the chips.
    chips(words, p = {}) {
      const g = this.group({ x: 0, y: 0 });
      const { size = 40, gap = 22, rowGap = 26, maxW = 800, cx = SA._buildScene ? SA._buildScene.W / 2 : 540, y = 0 } = p;
      const chips = words.map((w) => g.chip(Object.assign({ text: w, size }, p.chip || {})));
      const rows = [[]]; let rw = 0;
      chips.forEach((c) => { if (rows[rows.length - 1].length && rw + c.w > maxW) { rows.push([]); rw = 0; } rows[rows.length - 1].push(c); rw += c.w + gap; });
      rows.forEach((r, ri) => {
        const total = r.reduce((a, c) => a + c.w, 0) + gap * (r.length - 1);
        let x = cx - total / 2;
        r.forEach((c) => { c.props.x = x + c.w / 2; c.props.y = y + ri * (chips[0].h + rowGap); x += c.w + gap; });
      });
      chips.group = g; return chips;
    },
  };
  SA.Build = Build;

  class Group extends Node {
    add(c) { this.children.push(c); c.parent = this; return c; }
    // move so the content's bbox is centered on (cx, cy). cy omitted = only horizontal.
    center(cx, cy, t = 1e9) {
      const sc = SA._buildScene;
      if (cx == null) cx = sc ? sc.W / 2 : 540;
      const b = this.bbox(t); if (!b) return this;
      this.props.x += cx - (b[0] + b[2]) / 2;
      if (cy != null) this.props.y += cy - (b[1] + b[3]) / 2;
      return this;
    }
    // scale down (never up unless allowUp) so content fits maxW x maxH, then center
    fit(maxW, maxH = Infinity, cx, cy, allowUp = false) {
      const b = this.bbox(); if (!b) return this;
      let k = Math.min(maxW / (b[2] - b[0]), maxH / (b[3] - b[1]));
      if (!allowUp) k = Math.min(1, k);
      this.props.scale = (this.props.scale || 1) * k;
      return this.center(cx, cy);
    }
    // draw all children in order over `span` seconds
    drawIn(t, d = 0.8, span = 0) {
      this.children.forEach((c, i) => c.drawIn(t + (this.children.length > 1 ? (i / (this.children.length - 1)) * span : 0), d));
      return this;
    }
  }
  Object.assign(Group.prototype, Build);
  SA.Group = Group;

  // Rounded box sized to its text, anchored at its center. chip.w / chip.h are known at build time.
  class Chip extends Group {
    defaults() { return { text: '', size: 40, color: SA.C.blue, textColor: SA.C.white, padX: 0.8, padY: 0.45, r: 14, fillAlpha: 0.22 }; }
    constructor(props) {
      super(props);
      const P = this.props;
      this.w = Math.round(SA.measure(P.text, P.size) + P.size * P.padX * 2);
      this.h = Math.round(P.size * (1 + P.padY * 2));
      this.box = this.add(new Box({ x: -this.w / 2, y: -this.h / 2, w: this.w, h: this.h, r: P.r, color: P.color, fillAlpha: P.fillAlpha, seed: nextSeed(), followColor: true }));
      this.label = this.add(new Text({ text: P.text, size: P.size, color: P.textColor, align: 'center', y: -P.size * 0.06 }));
    }
    drawIn(t, d = 0.5) { this.box.drawIn(t, d); this.label.drawIn(t + d * 0.45, Math.max(0.25, d * 0.6)); return this; }
    recolor(t, d, color, textColor) { this.box.recolor(t, d, color); if (textColor) this.label.to(t, d, { color: textColor }); return this; }
  }
  SA.Chip = Chip;

  // A tilted "floor" (parallelogram). Use plane.at(u, v) (0..1) to place things on it, in the
  // plane's parent coords. Good for layers / maps / stacked levels.
  class Plane extends Group {
    defaults() { return { w: 640, h: 220, shear: 160, color: SA.C.blue, label: '', labelSize: 34, fillAlpha: 0.09, margin: 0.06 }; }
    constructor(props) {
      super(props);
      const P = this.props, m = P.margin;
      const c = [[-m, -m], [1 + m, -m], [1 + m, 1 + m], [-m, 1 + m]].map(([u, v]) => this.local(u, v));
      this.floor = this.add(new Rough({ paths: ['M ' + c.map((q) => q.join(' ')).join(' L ') + ' Z'], color: P.color, fill: true, fillAlpha: P.fillAlpha, hachureGap: 14, strokeWidth: 2, seed: nextSeed(), followColor: true }));
      if (P.label) this.labelNode = this.add(new Text({ text: P.label, size: P.labelSize, color: P.color, x: c[0][0], y: c[0][1] - P.labelSize * 0.9 }));
    }
    local(u, v) { const P = this.props; return [u * P.w + v * P.shear, v * P.h]; }
    at(u, v) { const [x, y] = this.local(u, v); return [x + this.props.x, y + this.props.y]; }
    drawIn(t, d = 0.8) { this.floor.drawIn(t, d); if (this.labelNode) this.labelNode.drawIn(t + d * 0.5, 0.5); return this; }
  }
  SA.Plane = Plane;

  // Nodes + undirected edges. nodes: [[x,y], ...] (local coords), edges: [[i,j], ...].
  class Graph extends Group {
    defaults() { return { nodes: [], edges: [], r: 8, color: SA.C.node, edgeColor: SA.C.edge, edgeWidth: 1.8 }; }
    constructor(props) {
      super(props);
      const P = this.props;
      this.adj = P.nodes.map(() => new Set());
      P.edges.forEach(([i, j]) => { this.adj[i].add(j); this.adj[j].add(i); });
      this.edgeLines = P.edges.map(([i, j]) => this.add(new Line({ points: [P.nodes[i], P.nodes[j]], color: P.edgeColor, passes: 1, roughness: 0.4, strokeWidth: P.edgeWidth, seed: nextSeed() })));
      this.dots = P.nodes.map(([x, y]) => this.add(new Dot({ x, y, r: P.r, color: P.color })));
    }
    // pop nodes in over nodeSpan, then draw edges over edgeSpan
    drawIn(t, nodeSpan = 0.8, edgeSpan = 1.2) {
      this.dots.forEach((d, i) => d.popIn(t + (i / Math.max(1, this.dots.length)) * nodeSpan));
      this.edgeLines.forEach((l, k) => l.drawIn(t + nodeSpan * 0.6 + (k / Math.max(1, this.edgeLines.length)) * edgeSpan, 0.3));
      return this;
    }
    hasEdge(i, j) { return this.adj[i].has(j); }
    // animate a walk along existing edges; returns {end, arrows}
    walk(path, t0, dt = 0.5, color = SA.C.orange, opts = {}) {
      const P = this.props, arrows = [];
      const hl = (i, t) => this.dots[i].to(t, 0.25, { color, r: P.r * 1.4 }, 'back');
      hl(path[0], t0);
      for (let k = 1; k < path.length; k++) {
        if (!this.hasEdge(path[k - 1], path[k])) throw new Error(`walk: no edge ${path[k - 1]}-${path[k]}`);
        const t = t0 + k * dt;
        arrows.push(this.add(new Line({ points: [P.nodes[path[k - 1]], P.nodes[path[k]]], arrow: true, color, passes: 1, roughness: 0.3, strokeWidth: opts.width || 5, seed: nextSeed() })).drawIn(t - dt * 0.8, dt * 0.7, 'out'));
        hl(path[k], t - 0.1);
        if (opts.onStep) opts.onStep(k, t);
      }
      return { end: t0 + (path.length - 1) * dt, arrows };
    }
    reset(t, ids, d = 0.4) { (ids || this.dots.map((_, i) => i)).forEach((i) => this.dots[i].to(t, d, { color: this.props.color, r: this.props.r })); return this; }
  }
  SA.Graph = Graph;

  // Simple vertical bar chart. values: numbers; labels: strings under bars; anchored at bottom-left (0,0).
  class BarChart extends Group {
    defaults() { return { values: [], labels: [], colors: [], max: null, h: 420, barW: 120, gap: 60, valueFmt: (v) => String(v), labelSize: 38, valueSize: 44 }; }
    constructor(props) {
      super(props);
      const P = this.props, max = P.max || Math.max(...P.values);
      this.bars = P.values.map((v, i) => {
        const x = i * (P.barW + P.gap), bh = Math.max(14, (v / max) * P.h), col = P.colors[i] || SA.C.blue;
        const bar = this.add(new Box({ x, y: -14, w: P.barW, h: 14, r: 10, color: col, fillAlpha: 0.45, hachureGap: 8, seed: nextSeed() }));
        const val = this.add(new Text({ text: P.valueFmt(v), x: x + P.barW / 2, y: -bh - P.valueSize * 0.8, align: 'center', size: P.valueSize, color: col, reveal: 'fade' }));
        const lab = P.labels[i] ? this.add(new Text({ text: P.labels[i], x: x + P.barW / 2, y: P.labelSize * 0.9, align: 'center', size: P.labelSize, color: SA.C.white })) : null;
        return { bar, val, lab, bh };
      });
    }
    // bars grow one after another
    drawIn(t, stagger = 0.35, grow = 1.0) {
      this.bars.forEach((b, i) => {
        const t0 = t + i * stagger;
        if (b.lab) b.lab.drawIn(t0, 0.4);
        b.bar.drawIn(t0, 0.2).to(t0 + 0.2, grow, { y: -b.bh, h: b.bh }, 'out');
        b.val.drawIn(t0 + grow * 0.8, 0.4);
      });
      return this;
    }
  }
  SA.BarChart = BarChart;

  // Voiceover: words + timing from tools/voice.mjs output (window.VO[id]).
  //   const vo = SA.voice('hnsw_vo', { offset: 0.4, display: [['H. N. S. W.', 'HNSW']] });
  //   vo.cue('phrase') -> seconds in the scene when that phrase starts; vo.words -> for subtitles.
  SA.voice = function (id, { offset = 0.4, display = [] } = {}) {
    const raw = (window.VO && window.VO[id] && window.VO[id].words) || null;
    if (!raw) throw new Error('voiceover not loaded: ' + id + ' (add it to opts.requires)');
    const n = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
    const words = [];
    for (let i = 0; i < raw.length; i++) {
      const hit = display.find(([from]) => from.split(' ').every((f, k) => raw[i + k] && n(raw[i + k].w) === n(f)));
      if (!hit) { words.push(raw[i]); continue; }
      const fromWords = hit[0].split(' '), len = fromWords.length, last = raw[i + len - 1];
      // punctuation after the phrase is kept, except a dot that belongs to the spoken spelling ("W.")
      // and isn't followed by a new sentence
      let punct = (last.w.match(/[,.?!:;]+$/) || [''])[0];
      const own = (fromWords[len - 1].match(/[,.?!:;]+$/) || [''])[0];
      const next = raw[i + len];
      if (punct && punct === own && next && !/^[A-Z"“]/.test(next.w)) punct = '';
      words.push({ w: hit[1] + punct, start: raw[i].start, end: last.end });
      i += len - 1;
    }
    return {
      raw, words, offset,
      cue: (phrase, after = 0) => SA.cue(raw, phrase, after - offset).start + offset,
      cueEnd: (phrase, after = 0) => SA.cue(raw, phrase, after - offset).end + offset,
      end: raw[raw.length - 1].end + offset,
    };
  };

  // Find a spot for a w×h label near (x, y) that doesn't overlap any obstacle box [x0,y0,x1,y1].
  // Returns the label centre. Tries right, below, above, left, then diagonals; falls back to least overlap.
  // bounds (optional) = [x0,y0,x1,y1] the label must stay inside (e.g. the visible, safe part of the frame).
  SA.freeSpot = function (x, y, w, h, obstacles = [], gap = 30, bounds = null) {
    const offs = [[1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let best = null, bestO = Infinity;
    for (const [dx, dy] of offs) {
      const cx = x + dx * (w / 2 + gap), cy = y + dy * (h / 2 + gap);
      const r = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
      let o = obstacles.reduce((a, b) => a + Math.max(0, Math.min(r[2], b[2]) - Math.max(r[0], b[0])) * Math.max(0, Math.min(r[3], b[3]) - Math.max(r[1], b[1])), 0);
      if (bounds && (r[0] < bounds[0] || r[1] < bounds[1] || r[2] > bounds[2] || r[3] > bounds[3])) o += 1e9;
      if (o === 0) return [cx, cy];
      if (o < bestO) { bestO = o; best = [cx, cy]; }
    }
    return best;
  };

  // Type scale for 1080-wide reels (px). Never go below `small` for anything meant to be read.
  SA.TYPE = { hero: 150, title: 84, big: 66, caption: 56, body: 46, label: 38, small: 34 };


  // =====================================================================================
  // Excalidraw library items ("packs", made by tools/excalidraw-lib.mjs) drawn natively.
  //   s.sketch({ pack: 'youritjang-stick-figures', item: 'guy', size: 160, x, y }).drawIn(t)
  // colors: 'snap' (default: Excalidraw dark-mode transform, then snapped to SA.C palette),
  //         'dark' (dark-mode transform only), 'raw', or tint: '#hex' (monochrome).
  // =====================================================================================
  function darkMode(hex) {
    // Excalidraw's own dark theme: filter: invert(93%) hue-rotate(180deg)
    let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    [r, g, b] = [r, g, b].map((c) => 0.93 * (1 - c) + 0.07 * c);
    const R = -0.574 * r + 1.43 * g + 0.144 * b, G = 0.426 * r + 0.43 * g + 0.144 * b, B = 0.426 * r + 1.43 * g - 0.856 * b;
    return [R, G, B].map((v) => clamp(v));
  }
  function hsl([r, g, b]) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  }
  const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  const HUES = [['red', 4], ['orange', 24], ['yellow', 46], ['green', 122], ['teal', 160], ['blue', 212], ['purple', 255], ['lilac', 285], ['pink', 335]];
  // map one Excalidraw (light-theme) colour to our dark palette. kind: 'stroke' | 'fill'
  SA.mapColor = function (c, mode = 'snap', kind = 'stroke') {
    if (!c || c === 'transparent') return null;
    if (c[0] !== '#') return c;
    if (mode === 'raw') return c;
    const light = SA.theme === 'light';     // libraries are drawn for light mode: only invert for dark scenes
    const rgb = light ? hexToRgb(c).map((v) => v / 255) : darkMode(c);
    if (mode === 'dark') return toHex(rgb);
    const [h, sat, l] = hsl(rgb);
    if (sat < 0.22 || l < 0.08) {          // neutrals
      if (light) {
        if (l < 0.4) return SA.C.ink;
        if (l > 0.78) return kind === 'fill' ? SA.C.bg : SA.C.dim;
        return SA.C.mid;
      }
      if (l > 0.6) return SA.C.white;
      if (l < 0.22) return kind === 'fill' ? SA.C.bg : SA.C.dim;
      return SA.C.mid;
    }
    let best = HUES[0], bd = 999;
    for (const hh of HUES) { const d = Math.min(Math.abs(h - hh[1]), 360 - Math.abs(h - hh[1])); if (d < bd) { bd = d; best = hh; } }
    return SA.C[best[0]];
  };
  SA.PACKS = () => window.PACKS || {};
  SA.packItem = function (pack, item) {
    const P = SA.PACKS()[pack];
    if (!P) throw new Error(`pack not loaded: ${pack} (add 'assets/packs/${pack}.js' to opts.requires)`);
    const it = typeof item === 'number' ? P.items[item] : P.items.find((i) => i.name === item);
    if (!it) throw new Error(`no item "${item}" in pack ${pack}. Items: ${P.items.map((i) => i.name).join(', ')}`);
    return it;
  };
  const smoothPath = (pts) => {
    if (pts.length < 3) return 'M ' + pts.map((p) => p.join(' ')).join(' L ');
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {   // Catmull-Rom -> cubic Bézier
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`;
    }
    return d;
  };
  const arrowHead = (tip, from, kind, size) => {
    const ang = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
    const p = (da, L = size) => [tip[0] - L * Math.cos(ang + da), tip[1] - L * Math.sin(ang + da)];
    if (kind === 'bar') { const a = p(Math.PI / 2, size * 0.6), b = p(-Math.PI / 2, size * 0.6); return `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`; }
    if (kind === 'dot' || kind === 'circle') { const r = size * 0.35; return `M ${tip[0] - r} ${tip[1]} A ${r} ${r} 0 1 0 ${tip[0] + r} ${tip[1]} A ${r} ${r} 0 1 0 ${tip[0] - r} ${tip[1]}`; }
    const a = p(0.42), b = p(-0.42);
    return kind === 'triangle' ? `M ${a[0]} ${a[1]} L ${tip[0]} ${tip[1]} L ${b[0]} ${b[1]} Z` : `M ${a[0]} ${a[1]} L ${tip[0]} ${tip[1]} L ${b[0]} ${b[1]}`;
  };

  // freehand stroke (Excalidraw "freedraw"): smooth line with draw-on
  class FreeDraw extends Node {
    defaults() { return { d: '', color: SA.C.white, strokeWidth: 3 }; }
    paint(ctx, t, o) {
      const prog = this.get('draw', t); if (prog <= 0) return;
      if (!this._p) { this._p = new Path2D(this.props.d); this._len = Math.max(1, pathLen(this.props.d)); }
      ctx.globalAlpha = o; ctx.strokeStyle = this.get('color', t); ctx.lineWidth = this.get('strokeWidth', t);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (prog < 1) ctx.setLineDash([this._len * prog, this._len + 10]);
      ctx.stroke(this._p); ctx.setLineDash([]);
    }
  }
  FreeDraw.prototype.localBox = function () { return pathBox(this.props.d); };
  SA.FreeDraw = FreeDraw;

  class Sketch extends Group {
    defaults() { return { pack: '', item: 0, size: null, height: null, colors: 'snap', tint: null, stroke: 2.6, roughness: null, solid: false, text: true }; }
    constructor(props) {
      // pack-level defaults (assets/packs/meta.json) sit under the caller's props
      const packDefaults = (SA.PACKS()[props.pack] || {}).defaults || {};
      super(Object.assign({}, packDefaults, props));
      const P = this.props, it = SA.packItem(P.pack, P.item);
      this.item = it;
      const k = P.size ? P.size / Math.max(1, it.w) : P.height ? P.height / Math.max(1, it.h) : 1;
      this.props.scale = (props.scale || 1) * k;
      const col = (c, kind) => (P.tint ? (c && c !== 'transparent' ? (kind === 'fill' ? P.tint : P.tint) : null) : SA.mapColor(c, P.colors, kind));
      for (let e of it.els) {
        const sw = Math.max(1.6, Math.min(5, (e.sw || 1) * 1.3 * (P.stroke / 2.6))) / k;   // keep on-screen stroke weight consistent
        const stroke = col(e.sc, 'stroke') || SA.C.white;
        const fillC = e.bg && e.bg !== 'transparent' ? col(e.bg, 'fill') : null;
        // solid fills become dense hatching (our look) unless solid: true
        const solid = e.fs === 'solid' && P.solid;
        const hatchSolid = e.fs === 'solid' && !P.solid;
        const common = {
          x: e.x, y: e.y, color: stroke, strokeWidth: sw, seed: e.seed || nextSeed(), opacity: (e.op ?? 100) / 100,
          roughness: P.roughness ?? (e.ro ?? 1), bowing: 1, rotation: e.a || 0, passes: (e.ro ?? 1) === 0 ? 1 : 2,
          fill: !!fillC, fillColor: fillC, fillStyle: solid ? 'solid' : e.fs === 'cross-hatch' ? 'cross-hatch' : e.fs === 'zigzag' ? 'zigzag' : 'hachure',
          fillAlpha: P.tint ? 0.3 : hatchSolid ? 0.75 : 0.55, solidAlpha: P.tint ? 0.25 : 1, hachureGap: (hatchSolid ? 5 : Math.max(4, (e.sw || 1) * 4) * 1.2) / k, hachureAngle: -41,
          dash: e.ss === 'dashed' ? [8 / k, 8 / k] : e.ss === 'dotted' ? [1.5 / k, 6 / k] : null,
        };
        let node;
        if (e.t === 'rectangle') {
          const r = e.rd ? (e.rd === 3 ? Math.min(32, Math.min(e.w, e.h) * 0.25) : Math.min(e.w, e.h) * 0.25) : 0;
          node = new Rough(Object.assign(common, { paths: [r ? rrect(0, 0, e.w, e.h, r) : `M 0 0 H ${e.w} V ${e.h} H 0 Z`] }));
        } else if (e.t === 'diamond') {
          node = new Rough(Object.assign(common, { paths: [`M ${e.w / 2} 0 L ${e.w} ${e.h / 2} L ${e.w / 2} ${e.h} L 0 ${e.h / 2} Z`] }));
        } else if (e.t === 'ellipse') {
          const rx = e.w / 2, ry = e.h / 2;
          node = new Rough(Object.assign(common, { paths: [`M 0 ${ry} A ${rx} ${ry} 0 1 0 ${e.w} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry}`] }));
        } else if (e.t === 'line' || e.t === 'arrow') {
          const pts = e.p || [[0, 0], [e.w, e.h]];
          const closed = e.t === 'line' && pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1;
          const paths = [e.rd ? smoothPath(pts) : 'M ' + pts.map((q) => q.join(' ')).join(' L ') + (closed ? ' Z' : '')];
          const hs = Math.max(10, Math.min(30, (e.sw || 1) * 6)) / Math.max(0.5, k * 0.9);
          if (e.t === 'arrow' && e.ea !== null) paths.push(arrowHead(pts[pts.length - 1], pts[pts.length - 2] || pts[0], e.ea || 'arrow', hs));
          if (e.sa) paths.push(arrowHead(pts[0], pts[1] || pts[0], e.sa, hs));
          node = new Rough(Object.assign(common, { paths, fill: closed && !!fillC, noFillIdx: paths.map((_, i) => i).slice(1) }));
        } else if (e.t === 'freedraw') {
          const pts = e.p || [];
          if (pts.length < 2) continue;
          node = new FreeDraw({ x: e.x, y: e.y, d: smoothPath(pts), color: stroke, strokeWidth: Math.max(1.4, (e.sw || 1) * 1.6) / Math.max(0.6, k), opacity: common.opacity, rotation: common.rotation });
        } else if (e.t === 'text') {
          if (!P.text) continue;   // text: false drops labels baked into an icon (e.g. 'Location' under a pin)
          const align = e.ta || 'left';
          const ax = align === 'center' ? e.w / 2 : align === 'right' ? e.w : 0;
          node = new Text({ text: e.text, size: e.fz || 20, color: stroke, align, x: e.x + ax, y: e.y + e.h / 2, opacity: common.opacity, reveal: 'write', rotation: e.a || 0 });
          if (e.a) { const pv = [e.w / 2 - ax, 0]; node.pivot = () => pv; e = Object.assign({}, e, { a: 0 }); }
        }
        if (!node) continue;
        if (e.a) { const pv = e.pv || [e.w / 2, e.h / 2]; node.pivot = () => pv; }   // Excalidraw rotates around the element's own centre
        this.add(node);
      }
    }
    // pen-like: elements are drawn one after another across d seconds
    drawIn(t, d = 1.2) {
      const n = this.children.length;
      this.children.forEach((c, i) => c.drawIn(t + (n > 1 ? (i / n) * d * 0.75 : 0), Math.max(0.25, d * 0.4)));
      return this;
    }
    bbox(t = 1e9) {
      const s = this.get('scale', t), x = this.get('x', t), y = this.get('y', t), it = this.item;
      return [x - (it.w / 2) * s, y - (it.h / 2) * s, x + (it.w / 2) * s, y + (it.h / 2) * s];
    }
    recolor(t, d, color) { this.children.forEach((c) => c.to(t, d, { color })); return this; }
  }
  SA.Sketch = Sketch;
  Build.sketch = function (p) { return this.add(new Sketch(p)); };

  // ---------- scene ----------
  class Scene {
    constructor(opts) {
      this.opts = opts;
      SA.useTheme((SA.params && SA.params.theme) || opts.theme || 'dark');
      this.theme = SA.theme;
      this.duration = opts.duration || 10;
      this.bg = opts.bg || SA.C.bg;
      this.W = opts.width || W; this.H = opts.height || H;
      // alternate frame sizes of the same scene: opts.formats = { '4x5': [1080, 1350] }, picked with --param format=4x5
      const fmt = SA.params && SA.params.format;
      if (fmt && opts.formats && opts.formats[fmt]) [this.W, this.H] = opts.formats[fmt];
      this.reel = this.H / this.W > 1.6;   // 9:16-style vertical video (reels/shorts); 4:5 and 1:1 lay out like 16:9
      this.platform = (SA.params && SA.params.platform) || opts.platform || 'instagram';
      this.items = [];
      this.hudItems = []; // screen-fixed layer (captions), not moved by the camera
      this.camera = new Node({ cx: this.W / 2, cy: this.H / 2, zoom: 1 });
      // where content should live (reels: clear of Instagram/TikTok UI; centered on W/2)
      // reels: Instagram/TikTok cover the top 220 px, the bottom 380 px, and a right strip (x > 940) from y 1000 to 1540.
      // Keep content centred in x 140–940; the subtitle/caption band is y 260–430, so diagrams live in y 500–1540.
      // platform UI zones (SA.PLATFORMS) set the bottom edge: instagram 1540, shorts/all 1440, linkedin 1620
      const ui = SA.PLATFORMS[this.platform] || SA.PLATFORMS.instagram;
      this.safe = this.reel ? { left: 140, right: 940, top: 500, bottom: this.H - ui.bottom, cx: this.W / 2, captionY: 345, labelY: 520, ui }
        : { left: 80, right: this.W - 80, top: 60, bottom: this.H - 170, cx: this.W / 2, captionY: this.H - 95, labelY: 90, ui: null };
      this.sky = opts.stars === false ? null : starfield(opts.seed || 11, this.W, this.H, opts.worldHeight || 0);
      this._seed = 100;
    }
    add(node) { this.items.push(node); return node; }
    // move a node to the screen-fixed layer (coords = screen pixels)
    hud(node) { this.items = this.items.filter((n) => n !== node); this.hudItems.push(node); return node; }
    scrim(p) { const n = new Scrim(p); this.hudItems.unshift(n); return n; }
    caption(p) { return this.hud(this.text(Object.assign({ align: 'center', reveal: 'type', maxW: this.W - 120 }, p))); }
    // captions-only narration: one line of story at the subtitle position, typed in, faded out before the next
    say(text, t0, t1, opts = {}) {
      const c = this.caption(Object.assign({ text, x: this.W / 2, y: this.reel ? 345 : this.safe.captionY, size: this.reel ? 62 : 50, color: SA.C.white, hl: SA.C.orange }, opts));
      c.drawIn(t0, opts.d || Math.min(1.3, 0.04 * text.length));
      if (t1) c.fadeOut(t1, 0.3);
      return c;
    }
    nextSeed() { return nextSeed(); }
    subtitles(p) { return this.hud(this.add(new Subtitles(p))); }
    // hook a voiceover into the scene: audio for render/preview, subtitles, duration. Returns SA.voice(...)
    // subtitles are OFF unless asked for: subtitles: true, or an object of overrides ({ y, size, maxChars, color, hl })
    useVoice(id, { offset = 0.4, display = [], tail = 2.5, subtitles = false } = {}) {
      const vo = SA.voice(id, { offset, display });
      this.opts.audio = this.opts.audio || `out/voice/${id}.mp3`;
      this.opts.audioOffset = offset;
      this.duration = vo.end + tail;
      if (subtitles) this.subtitles(Object.assign({ words: vo.words, offset, x: this.W / 2, y: this.reel ? 335 : this.safe.captionY, size: this.reel ? 54 : 46, hl: SA.C.yellow, maxChars: this.reel ? 28 : 52 }, subtitles === true ? {} : subtitles));
      return vo;
    }
    cam(t, d, cx, cy, zoom, ease = 'inOut') { this.camera.to(t, d, { cx, cy, zoom }, ease); return this; }

    render(ctx, t) {
      SA._ctx = ctx; SA._scene = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.bg; ctx.fillRect(0, 0, this.W, this.H);
      const cx = this.camera.get('cx', t), cy = this.camera.get('cy', t), z = this.camera.get('zoom', t);
      ctx.translate(this.W / 2, this.H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
      if (this.sky) {
        for (const s of this.sky.stars) {
          ctx.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(t * 1.3 + s.ph));
          ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (const g of this.sky.glyphs) g.render(ctx, t, 1);
      }
      for (const n of this.items) n.render(ctx, t, 1);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const n of this.hudItems) n.render(ctx, t, 1);
    }
  }
  Object.assign(Group.prototype, Build);
  Object.assign(Scene.prototype, Object.fromEntries(Object.entries(Build).filter(([k]) => !(k in Scene.prototype))));
  SA.Scene = Scene;

  // UI that covers a 1080×1920 vertical video, per platform (px from the top/bottom edge; strip = right-hand
  // button column [y0, y1], x > 940). Approximate, from 2026 platform guides; 'all' = the union, for one video posted everywhere.
  SA.PLATFORMS = {
    instagram: { top: 220, bottom: 380, strip: [1000, 1540] },
    shorts: { top: 225, bottom: 480, strip: [900, 1440] },
    linkedin: { top: 150, bottom: 300, strip: null },
    all: { top: 225, bottom: 480, strip: [900, 1540] },
  };

  // Add builders without editing the core: SA.extend({ cell(p) { return this.add(new MyCell(p)); } })
  // makes s.cell(...) and group.cell(...) available. Existing names are protected unless { override: true }.
  SA.nextSeed = nextSeed;
  SA.extend = function (builders, { override = false } = {}) {
    for (const [name, fn] of Object.entries(builders)) {
      if (!override && (name in Build || name in Scene.prototype)) throw new Error(`SA.extend: '${name}' already exists (pass { override: true } to replace it on purpose)`);
      Build[name] = fn; Group.prototype[name] = fn; Scene.prototype[name] = fn;
    }
  };

  SA.scene = function (name, opts, build) {
    SA.scenes[name] = { opts, build };
  };
  SA.build = function (name) {
    const def = SA.scenes[name];
    if (!def) throw new Error('unknown scene ' + name);
    seedCounter = 100;
    const s = new Scene(Object.assign({}, def.opts || {}));
    SA._buildScene = s;
    def.build(s, SA);
    return s;
  };
})();
