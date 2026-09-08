// ============================================================================
// vec.js — Toán vector 2D & các phép giao cơ bản. Thuần hàm, không phụ thuộc DOM.
// ============================================================================

export const EPS = 1e-9;

export const V = (x, y) => ({ x, y });
export const vAdd = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const vSub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const vMul = (a, k) => ({ x: a.x * k, y: a.y * k });
export const vDot = (a, b) => a.x * b.x + a.y * b.y;
export const vCross = (a, b) => a.x * b.y - a.y * b.x;
export const vLen = (a) => Math.hypot(a.x, a.y);
export const vDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const vPerp = (a) => ({ x: -a.y, y: a.x });
export const vLerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
export const vMid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function vNorm(a) {
  const l = vLen(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}
export function vRot(a, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}
export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;
export const isNum = (t) => typeof t === 'number' && Number.isFinite(t);
export const okPt = (p) => !!p && isNum(p.x) && isNum(p.y);

// --- Đường: { kind:'line'|'ray'|'seg', p:{x,y} (điểm gốc), d:{x,y} (vector chỉ phương đơn vị), a, b } ---
export function mkLine(a, b, kind = 'line') {
  const d = vNorm(vSub(b, a));
  return { t: 'line', kind, p: { ...a }, d, a: { ...a }, b: { ...b } };
}
/** Đường qua điểm p, chỉ phương d (chưa cần chuẩn hoá) */
export function mkLineDir(p, d, kind = 'line') {
  const u = vNorm(d);
  return { t: 'line', kind, p: { ...p }, d: u, a: vAdd(p, vMul(u, -1)), b: vAdd(p, u) };
}
export const mkCircle = (c, r) => ({ t: 'circle', c: { ...c }, r });

/** Tham số t của điểm p trên đường (chiếu vuông góc) */
export const lineParam = (L, p) => vDot(vSub(p, L.p), L.d);
export const linePointAt = (L, t) => vAdd(L.p, vMul(L.d, t));

/** Chiếu vuông góc điểm p xuống đường L, có kẹp biên với đoạn/tia */
export function projectOnLine(L, p, clamp = true) {
  let t = lineParam(L, p);
  if (clamp) {
    if (L.kind === 'seg') {
      const t0 = lineParam(L, L.a), t1 = lineParam(L, L.b);
      t = Math.max(Math.min(t0, t1), Math.min(Math.max(t0, t1), t));
    } else if (L.kind === 'ray') {
      const t0 = lineParam(L, L.a);
      t = Math.max(t0, t);
    }
  }
  return linePointAt(L, t);
}
export function projectOnCircle(C, p) {
  const d = vSub(p, C.c);
  const l = vLen(d);
  if (l < EPS) return { x: C.c.x + C.r, y: C.c.y };
  return vAdd(C.c, vMul(d, C.r / l));
}

/** Khoảng cách từ điểm tới đối tượng (dùng cho hit-test) */
export function distToLine(L, p) {
  return vDist(p, projectOnLine(L, p, true));
}
export function distToCircle(C, p) {
  return Math.abs(vDist(p, C.c) - C.r);
}

// --- Giao điểm -------------------------------------------------------------

/** Giao 2 đường thẳng. Trả về mảng 0 hoặc 1 điểm. */
export function interLineLine(L1, L2) {
  const den = vCross(L1.d, L2.d);
  if (Math.abs(den) < 1e-12) return [];
  const t = vCross(vSub(L2.p, L1.p), L2.d) / den;
  return [linePointAt(L1, t)];
}

/** Giao đường thẳng & đường tròn. Trả về 0..2 điểm, sắp theo tham số t tăng dần. */
export function interLineCircle(L, C) {
  const f = vSub(L.p, C.c);
  const b = vDot(f, L.d);          // hệ số bậc 1 (a = 1 vì d đơn vị)
  const c = vDot(f, f) - C.r * C.r;
  let disc = b * b - c;
  if (disc < -1e-12) return [];
  disc = Math.max(0, disc);
  const s = Math.sqrt(disc);
  const ts = s < 1e-12 ? [-b] : [-b - s, -b + s];
  return ts.map((t) => linePointAt(L, t));
}

/** Giao 2 đường tròn. Trả về 0..2 điểm. */
export function interCircleCircle(C1, C2) {
  const d = vDist(C1.c, C2.c);
  if (d < EPS) return [];
  if (d > C1.r + C2.r + 1e-9) return [];
  if (d < Math.abs(C1.r - C2.r) - 1e-9) return [];
  const a = (C1.r * C1.r - C2.r * C2.r + d * d) / (2 * d);
  const h2 = C1.r * C1.r - a * a;
  const h = Math.sqrt(Math.max(0, h2));
  const dir = vMul(vSub(C2.c, C1.c), 1 / d);
  const m = vAdd(C1.c, vMul(dir, a));
  if (h < 1e-12) return [m];
  const n = vPerp(dir);
  return [vSub(m, vMul(n, h)), vAdd(m, vMul(n, h))];
}

/** Giao tổng quát giữa 2 đối tượng bất kỳ (line/circle). */
export function intersectAny(o1, o2) {
  if (!o1 || !o2) return [];
  if (o1.t === 'line' && o2.t === 'line') return interLineLine(o1, o2);
  if (o1.t === 'line' && o2.t === 'circle') return interLineCircle(o1, o2);
  if (o1.t === 'circle' && o2.t === 'line') return interLineCircle(o2, o1);
  if (o1.t === 'circle' && o2.t === 'circle') return interCircleCircle(o1, o2);
  return [];
}

// --- Tam giác --------------------------------------------------------------

export const centroid3 = (A, B, C) => ({ x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 });

export function circumcenter3(A, B, C) {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  return {
    x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
    y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d,
  };
}
export function incenter3(A, B, C) {
  const a = vDist(B, C), b = vDist(C, A), c = vDist(A, B);
  const s = a + b + c;
  if (s < EPS) return null;
  return { x: (a * A.x + b * B.x + c * C.x) / s, y: (a * A.y + b * B.y + c * C.y) / s };
}
export function inradius3(A, B, C) {
  const a = vDist(B, C), b = vDist(C, A), c = vDist(A, B);
  const s = (a + b + c) / 2;
  if (s < EPS) return 0;
  return Math.abs(vCross(vSub(B, A), vSub(C, A))) / 2 / s;
}
export function orthocenter3(A, B, C) {
  const O = circumcenter3(A, B, C);
  if (!O) return null;
  // H = A + B + C - 2O  (vì OH = OA+OB+OC)
  return { x: A.x + B.x + C.x - 2 * O.x, y: A.y + B.y + C.y - 2 * O.y };
}
export function polyArea(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  }
  return Math.abs(s) / 2;
}
/** Góc ABC (đỉnh B) theo độ, trong [0,180] */
export function angleABC(A, B, C) {
  const u = vSub(A, B), w = vSub(C, B);
  const lu = vLen(u), lw = vLen(w);
  if (lu < EPS || lw < EPS) return 0;
  let c = vDot(u, w) / (lu * lw);
  c = Math.max(-1, Math.min(1, c));
  return deg(Math.acos(c));
}
