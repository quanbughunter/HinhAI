// ============================================================================
// ops3d.js — Hình không gian: điểm/đoạn/mặt/khối, mặt phẳng và THIẾT DIỆN.
// Chiếu trực giao (đúng kiểu hình vẽ SGK), nét khuất tự động.
// ============================================================================

export const P3 = (x, y, z) => ({ t: 'p3', x, y, z });
export const p3add = (a, b) => P3(a.x + b.x, a.y + b.y, a.z + b.z);
export const p3sub = (a, b) => P3(a.x - b.x, a.y - b.y, a.z - b.z);
export const p3mul = (a, k) => P3(a.x * k, a.y * k, a.z * k);
export const p3dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const p3cross = (a, b) => P3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const p3len = (a) => Math.hypot(a.x, a.y, a.z);
export const p3dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const p3norm = (a) => { const l = p3len(a); return l < 1e-12 ? P3(0, 0, 0) : p3mul(a, 1 / l); };
export const p3lerp = (a, b, t) => P3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);
export const isP3 = (p) => !!p && p.t === 'p3' && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

const S3 = { color: '#16233d', width: 1.7 };
const F3 = { color: '#4338a8', width: 1.6, fill: 'rgba(67,56,168,.12)' };
const K3 = { color: '#16233d', width: 1.7, fill: 'rgba(31,63,143,.07)' };

const seg3 = (a, b, kind = 'seg') => ({ t: 's3', a, b, kind });
const face3 = (pts) => ({ t: 'f3', pts });

/** Khối đa diện: v = đỉnh, faces = vòng chỉ số (đã định hướng ra ngoài), edges = cặp chỉ số */
function solid(v, faces) {
  const c = v.reduce((a, p) => p3add(a, p), P3(0, 0, 0));
  const ctr = p3mul(c, 1 / v.length);
  const F = faces.map((f) => orientOut(v, f, ctr));
  const es = new Set();
  const edges = [];
  for (const f of F) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      const k = a < b ? a + '-' + b : b + '-' + a;
      if (!es.has(k)) { es.add(k); edges.push([a, b]); }
    }
  }
  return { t: 'solid', v, faces: F, edges, ctr };
}
function faceNormal(v, f) {
  let n = P3(0, 0, 0);
  for (let i = 0; i < f.length; i++) {
    const a = v[f[i]], b = v[f[(i + 1) % f.length]];
    n = p3add(n, P3((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)));
  }
  return p3norm(n);
}
function orientOut(v, f, ctr) {
  const n = faceNormal(v, f);
  const c = f.reduce((a, i) => p3add(a, v[i]), P3(0, 0, 0));
  const fc = p3mul(c, 1 / f.length);
  return p3dot(n, p3sub(fc, ctr)) < 0 ? [...f].reverse() : f;
}

/** Mặt phẳng qua 3 điểm */
function planeFrom3(A, B, C) {
  const n = p3norm(p3cross(p3sub(B, A), p3sub(C, A)));
  if (p3len(n) < 1e-9) return null;
  return { t: 'plane', p: A, n };
}
const sd = (pl, p) => p3dot(pl.n, p3sub(p, pl.p)); // khoảng cách có dấu

/** THIẾT DIỆN: cắt khối bởi mặt phẳng -> đa giác (mảng điểm đã sắp vòng) */
export function sectionOf(sol, pl) {
  if (!sol || sol.t !== 'solid' || !pl) return null;
  const tol = 1e-7;
  const segs = [];
  for (const f of sol.faces) {
    const hits = [];
    for (let i = 0; i < f.length; i++) {
      const A = sol.v[f[i]], B = sol.v[f[(i + 1) % f.length]];
      const da = sd(pl, A), db = sd(pl, B);
      if (Math.abs(da) <= tol) pushU(hits, A);
      if (Math.abs(da) > tol && Math.abs(db) > tol && da * db < 0) {
        pushU(hits, p3lerp(A, B, da / (da - db)));
      }
    }
    if (hits.length >= 2) segs.push([hits[0], hits[hits.length - 1]]);
  }
  if (segs.length < 3) return null;
  // nối các đoạn thành vòng kín
  const used = new Array(segs.length).fill(false);
  used[0] = true;
  const loop = [segs[0][0], segs[0][1]];
  for (let guard = 0; guard < segs.length + 2; guard++) {
    const tail = loop[loop.length - 1];
    let found = false;
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      if (near(segs[i][0], tail)) { loop.push(segs[i][1]); used[i] = true; found = true; break; }
      if (near(segs[i][1], tail)) { loop.push(segs[i][0]); used[i] = true; found = true; break; }
    }
    if (!found) break;
  }
  if (near(loop[0], loop[loop.length - 1])) loop.pop();
  return loop.length >= 3 ? face3(loop) : null;
}
const near = (a, b) => p3dist(a, b) < 1e-6;
function pushU(arr, p) { if (!arr.some((q) => near(q, p))) arr.push(p); }

/** Giao đường thẳng (2 điểm) với mặt phẳng */
function lineMeetPlane(A, B, pl) {
  const u = p3sub(B, A);
  const den = p3dot(pl.n, u);
  if (Math.abs(den) < 1e-12) return null;
  return p3lerp(A, B, p3dot(pl.n, p3sub(pl.p, A)) / den);
}


export const OPS3 = {
  point3: {
    type: 'p3', style: { color: '#1f3f8f', size: 4.6 },
    fn: (_, p) => P3(p.x || 0, p.y || 0, p.z || 0),
    drag: (o, pos) => { o.params.x = pos.x; o.params.y = pos.y; if (pos.z != null) o.params.z = pos.z; },
  },
  mid3: { type: 'p3', style: { color: '#1f3f8f', size: 4.6 }, fn: ([a, b]) => (isP3(a) && isP3(b) ? p3lerp(a, b, 0.5) : null) },
  ratio3: { type: 'p3', style: { color: '#1f3f8f', size: 4.6 }, fn: ([a, b], p) => (isP3(a) && isP3(b) ? p3lerp(a, b, p.t == null ? 0.5 : p.t) : null) },
  segment3: { type: 's3', style: S3, fn: ([a, b]) => (isP3(a) && isP3(b) ? seg3(a, b) : null) },
  line3: { type: 's3', style: { ...S3, dash: '6 4' }, fn: ([a, b]) => (isP3(a) && isP3(b) ? seg3(a, b, 'line') : null) },
  face: { type: 'f3', style: F3, fn: (vals) => { const pts = vals.filter(isP3); return pts.length >= 3 ? face3(pts) : null; } },

  pyramid: { // đáy = các đỉnh đầu, đỉnh chóp = đối số cuối
    type: 'solid', style: K3,
    fn: (vals) => {
      const pts = vals.filter(isP3);
      if (pts.length < 4) return null;
      const apex = pts[pts.length - 1];
      const base = pts.slice(0, -1);
      const v = [...base, apex];
      const n = base.length;
      const faces = [base.map((_, i) => i)];
      for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n]);
      return solid(v, faces);
    },
  },
  prism: { // lăng trụ: đáy + vector tịnh tiến (mặc định thẳng đứng cao h)
    type: 'solid', style: K3,
    fn: (vals, p) => {
      const base = vals.filter(isP3);
      if (base.length < 3) return null;
      const u = P3(p.dx || 0, p.dy || 0, p.dz == null ? (p.h == null ? 4 : p.h) : p.dz);
      const n = base.length;
      const v = [...base, ...base.map((q) => p3add(q, u))];
      const faces = [base.map((_, i) => i), base.map((_, i) => n + i)];
      for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
      return solid(v, faces);
    },
  },
  box: { // hình hộp chữ nhật từ 1 đỉnh + 3 kích thước
    type: 'solid', style: K3,
    fn: ([a], p) => {
      const A = isP3(a) ? a : P3(0, 0, 0);
      const dx = p.a == null ? 4 : p.a, dy = p.b == null ? 3 : p.b, dz = p.c == null ? 3 : p.c;
      const v = [
        P3(A.x, A.y, A.z), P3(A.x + dx, A.y, A.z), P3(A.x + dx, A.y + dy, A.z), P3(A.x, A.y + dy, A.z),
        P3(A.x, A.y, A.z + dz), P3(A.x + dx, A.y, A.z + dz), P3(A.x + dx, A.y + dy, A.z + dz), P3(A.x, A.y + dy, A.z + dz),
      ];
      return solid(v, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]);
    },
  },
  sphere: {
    type: 'sph', style: { color: '#2b6a8c', width: 1.7, fill: 'rgba(43,106,140,.08)' },
    fn: ([o, a], p) => {
      if (!isP3(o)) return null;
      const r = isP3(a) ? p3dist(o, a) : (p.r == null ? 3 : p.r);
      return r > 0 ? { t: 'sph', c: o, r } : null;
    },
  },
  plane3: { type: 'plane', style: { color: '#1f7a5a' }, fn: ([a, b, c]) => (isP3(a) && isP3(b) && isP3(c) ? planeFrom3(a, b, c) : null) },
  section: { // thiết diện của khối cắt bởi mặt phẳng (hoặc bởi 3 điểm)
    type: 'f3', style: { color: '#c0271c', width: 2.1, fill: 'rgba(192,39,28,.14)' },
    fn: ([s, a, b, c]) => {
      if (!s || s.t !== 'solid') return null;
      let pl = a && a.t === 'plane' ? a : null;
      if (!pl && isP3(a) && isP3(b) && isP3(c)) pl = planeFrom3(a, b, c);
      return pl ? sectionOf(s, pl) : null;
    },
  },
  meet3: { // giao của đường thẳng AB với mặt phẳng
    type: 'p3', style: { color: '#c0271c', size: 4.6 },
    fn: ([a, b, pl]) => {
      if (!isP3(a) || !isP3(b)) return null;
      let P = pl && pl.t === 'plane' ? pl : null;
      if (!P) return null;
      return lineMeetPlane(a, b, P);
    },
  },
  dist3: {
    type: 'number', style: { color: '#b3261e' },
    fn: ([a, b]) => {
      if (a && a.t === 's3') return { t: 'num', v: p3dist(a.a, a.b), anchor3: p3lerp(a.a, a.b, 0.5) };
      return isP3(a) && isP3(b) ? { t: 'num', v: p3dist(a, b), anchor3: p3lerp(a, b, 0.5) } : null;
    },
  },
};
