/* HNSW, implemented from Malkov & Yashunin (arXiv:1603.09320), Algorithms 1–5.
 * Small and readable on purpose: it drives the animation, so the picture shows what the
 * algorithm really does. Search records a trace of every distance computation and hop.
 * Works in the browser (window.HNSW) and in node (module.exports) for testing.
 */
(function (root) {
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class HNSW {
    // M: links per insert, Mmax0 = 2M on layer 0 (paper §4.1), mL = 1/ln(M)
    constructor({ M = 4, efConstruction = 24, seed = 1, dist } = {}) {
      this.M = M; this.Mmax = M; this.Mmax0 = 2 * M; this.efC = efConstruction;
      this.mL = 1 / Math.log(M);
      this.rand = rng(seed);
      this.dist = dist || ((a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]));
      this.pts = []; this.level = []; this.links = []; // links[i][l] = array of neighbour ids
      this.ep = -1; this.L = -1;
    }
    d(i, q) { this.ndis++; return this.dist(this.pts[i], q); }

    // Algorithm 2. Returns [{id, d}] sorted ascending. trace (optional) collects events.
    searchLayer(q, eps, ef, lc, trace) {
      const visited = new Set(eps.map((e) => e.id));
      let C = eps.slice(), W = eps.slice();
      const sortW = () => W.sort((a, b) => a.d - b.d);
      sortW();
      while (C.length) {
        C.sort((a, b) => a.d - b.d);
        const c = C.shift();
        const f = W[W.length - 1];
        if (c.d > f.d) break;
        if (trace) trace.push({ type: 'expand', layer: lc, id: c.id });
        for (const e of this.links[c.id][lc] || []) {
          if (visited.has(e)) continue;
          visited.add(e);
          const de = this.d(e, q);
          const far = W[W.length - 1];
          const accepted = de < far.d || W.length < ef;
          if (trace) trace.push({ type: 'check', layer: lc, id: e, from: c.id, d: de, accepted });
          if (accepted) {
            C.push({ id: e, d: de }); W.push({ id: e, d: de }); sortW();
            if (W.length > ef) W.pop();
            if (trace) trace.push({ type: 'list', layer: lc, ids: W.map((w) => w.id) });
          }
        }
      }
      return W;
    }

    // Algorithm 4 (extendCandidates = false, keepPrunedConnections = false)
    selectHeuristic(q, C, M) {
      const R = [];
      for (const e of C.slice().sort((a, b) => a.d - b.d)) {
        if (R.length >= M) break;
        // keep e only if it is closer to q than to every already-selected neighbour
        if (R.every((r) => e.d < this.dist(this.pts[e.id], this.pts[r.id]))) R.push(e);
      }
      return R;
    }

    // Algorithm 1
    insert(p, forcedLevel) {
      const id = this.pts.length;
      this.pts.push(p);
      const l = forcedLevel ?? Math.floor(-Math.log(1 - this.rand()) * this.mL);
      this.level.push(l);
      this.links.push(Array.from({ length: l + 1 }, () => []));
      if (this.ep < 0) { this.ep = id; this.L = l; return id; }
      this.ndis = 0;
      let eps = [{ id: this.ep, d: this.d(this.ep, p) }];
      for (let lc = this.L; lc > l; lc--) eps = [this.searchLayer(p, eps, 1, lc)[0]];
      for (let lc = Math.min(this.L, l); lc >= 0; lc--) {
        const W = this.searchLayer(p, eps, this.efC, lc);
        const nb = this.selectHeuristic(p, W, this.M);
        const mmax = lc === 0 ? this.Mmax0 : this.Mmax;
        for (const n of nb) {
          this.links[id][lc].push(n.id);
          const conn = this.links[n.id][lc];
          conn.push(id);
          if (conn.length > mmax) {
            const cand = conn.map((c) => ({ id: c, d: this.dist(this.pts[c], this.pts[n.id]) }));
            this.links[n.id][lc] = this.selectHeuristic(this.pts[n.id], cand, mmax).map((x) => x.id);
          }
        }
        eps = W;
      }
      if (l > this.L) { this.ep = id; this.L = l; }
      return id;
    }

    // Algorithm 5 with a full trace. Returns {result, trace, ndis}
    search(q, K = 1, ef = 4, { flat = false } = {}) {
      this.ndis = 0;
      const trace = [];
      const top = flat ? 0 : this.L;
      let eps = [{ id: this.ep, d: this.d(this.ep, q) }];
      trace.push({ type: 'enter', layer: top, id: this.ep, d: eps[0].d });
      for (let lc = top; lc >= 1; lc--) {
        const before = eps[0].id;
        eps = [this.searchLayer(q, eps, 1, lc, trace)[0]];
        trace.push({ type: 'layerdone', layer: lc, id: eps[0].id, from: before });
      }
      const W = this.searchLayer(q, eps, ef, 0, trace);
      trace.push({ type: 'layerdone', layer: 0, id: W[0].id });
      return { result: W.slice(0, K), trace, ndis: this.ndis };
    }

    bruteForce(q, K = 1) {
      return this.pts.map((p, i) => ({ id: i, d: this.dist(p, q) })).sort((a, b) => a.d - b.d).slice(0, K);
    }

    // the greedy path (sequence of current nodes) per layer, derived from a trace
    static hops(trace) {
      const path = [];
      let cur = null;
      for (const ev of trace) {
        if (ev.type === 'enter') { cur = ev.id; path.push({ layer: ev.layer, id: ev.id }); }
        if (ev.type === 'expand' && ev.id !== cur) { cur = ev.id; path.push({ layer: ev.layer, id: ev.id }); }
        if (ev.type === 'layerdone' && ev.layer > 0) path.push({ layer: ev.layer - 1, id: ev.id, drop: true });
      }
      return path;
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = HNSW;
  else root.HNSW = HNSW;
})(typeof window !== 'undefined' ? window : globalThis);
