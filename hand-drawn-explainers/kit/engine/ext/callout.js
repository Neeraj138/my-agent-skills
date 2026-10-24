// Example engine extension: a label in a pill with a leader line to the thing it names.
// Load it from a scene:  requires: ['engine/ext/callout.js']   then   s.callout({ text, x, y, tx, ty })
// Pattern for every extension: a class built from core pieces (SA.Group, SA.Box, SA.Text, SA.Line…),
// registered with SA.extend. No edits to engine/sketchanim.js.
(() => {
  class Callout extends SA.Group {
    // x, y = centre of the label (parent coords); tx, ty = the point it names
    defaults() { return { text: '', size: 38, color: SA.C.yellow, textColor: SA.C.white, tx: 0, ty: 0, gap: 14 }; }
    constructor(props) {
      super(props);
      const P = this.props;
      const w = SA.measure(P.text.replace(/\*/g, ''), P.size) + P.size * 1.2, h = P.size * 1.6;
      // leader line from the label edge to the target, in local coords (the group sits at x, y)
      const dx = P.tx - P.x, dy = P.ty - P.y, len = Math.hypot(dx, dy) || 1;
      const ex = Math.min(w / 2 / Math.abs(dx / len || 1e-9), h / 2 / Math.abs(dy / len || 1e-9)) + P.gap;
      this.leader = this.add(new SA.Line({ points: [[dx / len * ex, dy / len * ex], [dx - dx / len * P.gap, dy - dy / len * P.gap]], color: P.color, width: 2.5, seed: SA.nextSeed() }));
      this.pill = this.add(new SA.Box({ x: -w / 2, y: -h / 2, w, h, r: h / 2, color: P.color, fillAlpha: 0, seed: SA.nextSeed() }));
      this.label = this.add(new SA.Text({ text: P.text, size: P.size, color: P.textColor, hl: P.color, align: 'center', y: -P.size * 0.06, bg: SA.C.bg }));
    }
    // localBox lets group.center()/fit()/bbox() measure it (pill + target point)
    localBox() {
      const P = this.props, w = SA.measure(P.text.replace(/\*/g, ''), P.size) + P.size * 1.2, h = P.size * 1.6;
      const dx = P.tx - P.x, dy = P.ty - P.y;
      return [Math.min(-w / 2, dx), Math.min(-h / 2, dy), Math.max(w / 2, dx), Math.max(h / 2, dy)];
    }
    drawIn(t, d = 0.6) { this.pill.drawIn(t, d * 0.6); this.label.drawIn(t + d * 0.3, d * 0.6); this.leader.drawIn(t + d * 0.5, d * 0.5); return this; }
  }
  SA.Callout = Callout;
  SA.extend({ callout(p) { return this.add(new Callout(p)); } });
})();
