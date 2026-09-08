// ============================================================================
// ops2d.js — Bảng phép dựng hình phẳng.
// Mỗi phép: { type, style?, fn(vals, params, obj, doc) -> value, drag?(obj,pos,doc) }
// ============================================================================

import {
  EPS, V, vAdd, vSub, vMul, vDot, vCross, vLen, vDist, vNorm, vPerp, vLerp, vMid, vRot,
  mkLine, mkLineDir, mkCircle, lineParam, linePointAt, projectOnLine, projectOnCircle,
  intersectAny, centroid3, circumcenter3, incenter3, inradius3, orthocenter3,
  polyArea, angleABC, deg, rad, okPt,
} from './vec.js';
import { mienNghiem, docKhoang } from './bpt.js';

const PT = { color: '#1f3f8f', size: 4.6 };
const LN = { color: '#16233d', width: 1.8 };
const CR = { color: '#8a5a2b', width: 1.8 };
const PG = { color: '#4338a8', width: 1.8, fill: 'rgba(67,56,168,.09)' };
const NUM = { color: '#b3261e' };
const AUX = { color: '#7a869a', width: 1.4, dash: '5 4' };

const num = (v, anchor) => ({ t: 'num', v, anchor: anchor || null });
const poly = (pts) => ({ t: 'poly', pts });

/** Lấy điểm tuỳ ý trên đối tượng theo tham số t (dùng cho "điểm thuộc") */
export function pointOnAt(o, t) {
  if (!o) return null;
  if (o.t === 'line') {
    if (o.kind === 'seg') return vLerp(o.a, o.b, Math.max(0, Math.min(1, t)));
    if (o.kind === 'ray') return linePointAt(mkLine(o.a, o.b, 'ray'), Math.max(0, t) * vDist(o.a, o.b));
    return linePointAt(o, t);
  }
  if (o.t === 'circle') return vAdd(o.c, { x: o.r * Math.cos(t), y: o.r * Math.sin(t) });
  if (o.t === 'poly') {
    const n = o.pts.length;
    const s = ((t % n) + n) % n;
    const i = Math.floor(s);
    return vLerp(o.pts[i], o.pts[(i + 1) % n], s - i);
  }
  return null;
}
/** Tham số t ứng với vị trí p (nghịch đảo của pointOnAt) */
export function paramOf(o, p) {
  if (!o) return 0;
  if (o.t === 'line') {
    if (o.kind === 'seg') {
      const L = mkLine(o.a, o.b, 'seg');
      const t = lineParam(L, p) / Math.max(EPS, vDist(o.a, o.b));
      return Math.max(0, Math.min(1, t));
    }
    if (o.kind === 'ray') {
      const L = mkLine(o.a, o.b, 'ray');
      return Math.max(0, lineParam(L, p) / Math.max(EPS, vDist(o.a, o.b)));
    }
    return lineParam(o, p);
  }
  if (o.t === 'circle') return Math.atan2(p.y - o.c.y, p.x - o.c.x);
  if (o.t === 'poly') {
    let best = 0, bd = Infinity;
    for (let i = 0; i < o.pts.length; i++) {
      const a = o.pts[i], b = o.pts[(i + 1) % o.pts.length];
      const L = mkLine(a, b, 'seg');
      const q = projectOnLine(L, p, true);
      const d = vDist(q, p);
      if (d < bd) { bd = d; best = i + Math.min(1, Math.max(0, lineParam(L, q) / Math.max(EPS, vDist(a, b)))); }
    }
    return best;
  }
  return 0;
}

const asLine = (x) => (x && x.t === 'line' ? x : null);
const twoPtsLine = (A, B, kind) => (okPt(A) && okPt(B) && vDist(A, B) > EPS ? mkLine(A, B, kind) : null);

export const OPS = {
  // ---------------- Điểm ----------------
  point: {
    type: 'point', style: PT,
    fn: (_, p) => ({ x: p.x, y: p.y }),
    drag: (o, pos) => { o.params.x = pos.x; o.params.y = pos.y; },
  },
  pointOn: {
    type: 'point', style: { ...PT, color: '#2f7fa8' },
    fn: ([o], p) => pointOnAt(o, p.t),
    drag: (o, pos, doc) => {
      const par = doc.get(o.args[0]);
      o.params.t = paramOf(par && par.val, pos);
    },
  },
  intersect: {
    type: 'point', style: PT,
    fn: ([a, b], p) => {
      const arr = intersectAny(a, b);
      if (!arr.length) return null;
      return arr[Math.min(p.i || 0, arr.length - 1)];
    },
  },
  midpoint: {
    type: 'point', style: PT,
    fn: ([a, b]) => {
      if (a && a.t === 'line' && !b) return vMid(a.a, a.b);
      return okPt(a) && okPt(b) ? vMid(a, b) : null;
    },
  },
  ratioPoint: { // chia đoạn AB theo tỉ số t (t=0 -> A, t=1 -> B)
    type: 'point', style: PT,
    fn: ([a, b], p) => (okPt(a) && okPt(b) ? vLerp(a, b, p.t) : null),
  },
  centroid: { type: 'point', style: PT, fn: ([a, b, c]) => (okPt(a) && okPt(b) && okPt(c) ? centroid3(a, b, c) : null) },
  circumcenter: { type: 'point', style: PT, fn: ([a, b, c]) => (okPt(a) && okPt(b) && okPt(c) ? circumcenter3(a, b, c) : null) },
  incenter: { type: 'point', style: PT, fn: ([a, b, c]) => (okPt(a) && okPt(b) && okPt(c) ? incenter3(a, b, c) : null) },
  orthocenter: { type: 'point', style: PT, fn: ([a, b, c]) => (okPt(a) && okPt(b) && okPt(c) ? orthocenter3(a, b, c) : null) },
  foot: { // chân đường vuông góc hạ từ P xuống đường L
    type: 'point', style: PT,
    fn: ([p, L]) => (okPt(p) && asLine(L) ? projectOnLine(L, p, false) : null),
  },
  footBC: { // chân đường cao từ A trong tam giác ABC
    type: 'point', style: PT,
    fn: ([a, b, c]) => {
      if (!okPt(a) || !okPt(b) || !okPt(c)) return null;
      const L = twoPtsLine(b, c, 'line');
      return L ? projectOnLine(L, a, false) : null;
    },
  },
  reflectPt: { // đối xứng qua điểm hoặc qua đường
    type: 'point', style: PT,
    fn: ([p, m]) => {
      if (!okPt(p) || !m) return null;
      if (m.t === 'line') { const q = projectOnLine(m, p, false); return vAdd(p, vMul(vSub(q, p), 2)); }
      if (okPt(m)) return { x: 2 * m.x - p.x, y: 2 * m.y - p.y };
      return null;
    },
  },
  rotatePt: {
    type: 'point', style: PT,
    fn: ([p, o], pr) => (okPt(p) && okPt(o) ? vAdd(o, vRot(vSub(p, o), rad(pr.ang || 0))) : null),
  },
  translatePt: {
    type: 'point', style: PT,
    fn: ([p, u], pr) => {
      if (!okPt(p)) return null;
      if (u && u.t === 'line') return vAdd(p, vSub(u.b, u.a));
      return vAdd(p, { x: pr.dx || 0, y: pr.dy || 0 });
    },
  },
  dilatePt: {
    type: 'point', style: PT,
    fn: ([p, o], pr) => (okPt(p) && okPt(o) ? vAdd(o, vMul(vSub(p, o), pr.k == null ? 1 : pr.k)) : null),
  },

  // ---------------- Đường ----------------
  segment: { type: 'line', style: LN, fn: ([a, b]) => twoPtsLine(a, b, 'seg') },
  line: { type: 'line', style: LN, fn: ([a, b]) => twoPtsLine(a, b, 'line') },
  ray: { type: 'line', style: LN, fn: ([a, b]) => twoPtsLine(a, b, 'ray') },
  vector: {
    type: 'line', style: { ...LN, color: '#c0271c', arrow: true },
    fn: ([a, b]) => { const L = twoPtsLine(a, b, 'seg'); if (L) L.arrow = true; return L; },
  },
  perpLine: { // đường thẳng qua P vuông góc với L
    type: 'line', style: AUX,
    fn: ([L, p]) => (asLine(L) && okPt(p) ? mkLineDir(p, vPerp(L.d), 'line') : null),
  },
  paraLine: {
    type: 'line', style: AUX,
    fn: ([L, p]) => (asLine(L) && okPt(p) ? mkLineDir(p, L.d, 'line') : null),
  },
  perpBisector: { // trung trực AB
    type: 'line', style: AUX,
    fn: ([a, b]) => (okPt(a) && okPt(b) && vDist(a, b) > EPS ? mkLineDir(vMid(a, b), vPerp(vSub(b, a)), 'line') : null),
  },
  bisector: { // phân giác góc ABC (đỉnh B)
    type: 'line', style: AUX,
    fn: ([a, b, c]) => {
      if (!okPt(a) || !okPt(b) || !okPt(c)) return null;
      const u = vNorm(vSub(a, b)), w = vNorm(vSub(c, b));
      let d = vAdd(u, w);
      if (vLen(d) < 1e-9) d = vPerp(u);
      return mkLineDir(b, d, 'line');
    },
  },
  altitude: { // đường cao từ A của tam giác ABC
    type: 'line', style: AUX,
    fn: ([a, b, c]) => {
      if (!okPt(a) || !okPt(b) || !okPt(c)) return null;
      const L = twoPtsLine(b, c, 'line');
      return L ? mkLineDir(a, vPerp(L.d), 'line') : null;
    },
  },
  median: { // trung tuyến từ A của tam giác ABC
    type: 'line', style: AUX,
    fn: ([a, b, c]) => (okPt(a) && okPt(b) && okPt(c) ? twoPtsLine(a, vMid(b, c), 'seg') : null),
  },
  tangent: { // tiếp tuyến từ điểm P tới đường tròn (i = 0/1)
    type: 'line', style: AUX,
    fn: ([C, p], pr) => {
      if (!C || C.t !== 'circle' || !okPt(p)) return null;
      const d = vDist(p, C.c);
      if (d < C.r - 1e-9) return null;
      if (Math.abs(d - C.r) < 1e-9) return mkLineDir(p, vPerp(vSub(p, C.c)), 'line');
      const mid = vMid(p, C.c);
      const arr = intersectAny(mkCircle(mid, d / 2), C);
      if (!arr.length) return null;
      const T = arr[Math.min(pr.i || 0, arr.length - 1)];
      return twoPtsLine(p, T, 'line');
    },
  },

  // ---------------- Đường tròn ----------------
  circleCP: { // tâm O đi qua A
    type: 'circle', style: CR,
    fn: ([o, a]) => (okPt(o) && okPt(a) ? mkCircle(o, vDist(o, a)) : null),
  },
  circleR: { // tâm O bán kính r (số hoặc đối tượng số)
    type: 'circle', style: CR,
    fn: ([o, n], p) => {
      if (!okPt(o)) return null;
      const r = n && n.t === 'num' ? n.v : p.r;
      return r > 0 ? mkCircle(o, r) : null;
    },
  },
  circle3: { // đường tròn ngoại tiếp / qua 3 điểm
    type: 'circle', style: CR,
    fn: ([a, b, c]) => {
      if (!okPt(a) || !okPt(b) || !okPt(c)) return null;
      const o = circumcenter3(a, b, c);
      return o ? mkCircle(o, vDist(o, a)) : null;
    },
  },
  incircle: {
    type: 'circle', style: CR,
    fn: ([a, b, c]) => {
      if (!okPt(a) || !okPt(b) || !okPt(c)) return null;
      const i = incenter3(a, b, c);
      return i ? mkCircle(i, inradius3(a, b, c)) : null;
    },
  },

  // ---------------- Đa giác ----------------
  polygon: {
    type: 'polygon', style: PG,
    fn: (vals) => { const pts = vals.filter(okPt); return pts.length >= 3 ? poly(pts) : null; },
  },

  // ---------------- Đo đạc ----------------
  distance: {
    type: 'number', style: NUM,
    fn: ([a, b]) => {
      if (a && a.t === 'line' && !b) return num(vDist(a.a, a.b), vMid(a.a, a.b));
      if (a && a.t === 'line' && okPt(b)) return num(vDist(b, projectOnLine(a, b, false)), vMid(b, projectOnLine(a, b, false)));
      return okPt(a) && okPt(b) ? num(vDist(a, b), vMid(a, b)) : null;
    },
  },
  angleM: {
    type: 'angle', style: { color: '#b3261e' },
    fn: ([a, b, c]) => {
      if (!okPt(a) || !okPt(b) || !okPt(c)) return null;
      return { t: 'angle', at: b, from: a, to: c, v: angleABC(a, b, c) };
    },
  },
  areaM: {
    type: 'number', style: NUM,
    fn: ([p]) => (p && p.t === 'poly' ? num(polyArea(p.pts), centroidOf(p.pts)) : null),
  },
  numberFree: {
    type: 'number', style: NUM,
    fn: (_, p) => num(p.v == null ? 1 : p.v, null),
  },
  // ---------------- Miền nghiệm ----------------
  region: {   // miền nghiệm của một hệ bất phương trình bậc nhất hai ẩn
    type: 'mien', style: { color: '#b3261e', width: 1.8, fill: 'rgba(179,38,30,.10)' },
    fn: (_, p) => {
      const ds = (p.bpt || []).filter((x) => String(x).trim());
      if (!ds.length) return null;
      const m = mienNghiem(ds);
      m.hatch = p.hatch || 0;
      return m;
    },
  },
  interval: {   // biểu diễn một khoảng / đoạn trên trục số
    type: 'khoang', style: { color: '#b3261e', width: 2.2 },
    fn: (_, p) => (p.k ? docKhoang(p.k) : null),
  },

  text: {
    type: 'text', style: { color: '#16233d' },
    fn: (_, p) => ({ t: 'text', s: p.s || '', x: p.x || 0, y: p.y || 0 }),
    drag: (o, pos) => { o.params.x = pos.x; o.params.y = pos.y; },
  },
};

function centroidOf(pts) {
  const s = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / pts.length, y: s.y / pts.length };
}
