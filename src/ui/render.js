// ============================================================================
// render.js — Camera 2D/3D + vẽ toàn bộ khung hình ra chuỗi SVG.
// Vẽ lại toàn bộ mỗi khung: đơn giản, không bug đồng bộ, đủ nhanh (<1ms/100 đối tượng).
// ============================================================================

import { vSub, vAdd, vMul, vLen, vNorm, vDist, vPerp, angleABC, projectOnLine } from '../core/vec.js';
import { p3add, p3sub, p3mul, p3dot, p3cross, p3len, p3norm, P3 } from '../core/ops3d.js';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f = (n) => (Math.abs(n) < 1e-4 ? 0 : Math.round(n * 100) / 100);

// ---------------------------------------------------------------- Camera 2D
export class Cam2 {
  constructor() { this.cx = 0; this.cy = 0; this.scale = 40; this.w = 800; this.h = 600; }
  s(p) { return { x: this.w / 2 + (p.x - this.cx) * this.scale, y: this.h / 2 - (p.y - this.cy) * this.scale }; }
  u(p) { return { x: this.cx + (p.x - this.w / 2) / this.scale, y: this.cy - (p.y - this.h / 2) / this.scale }; }
  zoomAt(px, k) {
    const before = this.u(px);
    this.scale = Math.max(2, Math.min(4000, this.scale * k));
    const after = this.u(px);
    this.cx += before.x - after.x; this.cy += before.y - after.y;
  }
  panPx(dx, dy) { this.cx -= dx / this.scale; this.cy += dy / this.scale; }
}

// ---------------------------------------------------------------- Camera 3D
export class Cam3 {
  constructor() { this.yaw = -1.05; this.pitch = 0.32; this.scale = 34; this.ox = 0; this.oy = 0; this.w = 800; this.h = 600; }
  basis() {
    const ca = Math.cos(this.yaw), sa = Math.sin(this.yaw), cb = Math.cos(this.pitch), sb = Math.sin(this.pitch);
    return {
      right: P3(-sa, ca, 0),
      up: P3(-ca * sb, -sa * sb, cb),
      fwd: P3(ca * cb, sa * cb, sb),   // hướng về phía người xem
    };
  }
  s(p) {
    const b = this.basis();
    return { x: this.w / 2 + this.ox + p3dot(p, b.right) * this.scale, y: this.h / 2 + this.oy - p3dot(p, b.up) * this.scale };
  }
  depth(p) { return p3dot(p, this.basis().fwd); }
  /** Đưa điểm màn hình về mặt phẳng z = z0 (dùng khi kéo điểm 3D) */
  u(px, z0 = 0) {
    const b = this.basis();
    const X = (px.x - this.w / 2 - this.ox) / this.scale;
    const Y = -(px.y - this.h / 2 - this.oy) / this.scale;
    // P = X*right + Y*up + t*fwd, cần P.z = z0
    const zc = b.right.z * X + b.up.z * Y;
    const t = Math.abs(b.fwd.z) < 1e-6 ? 0 : (z0 - zc) / b.fwd.z;
    const P = p3add(p3add(p3mul(b.right, X), p3mul(b.up, Y)), p3mul(b.fwd, t));
    return P3(P.x, P.y, z0);
  }
  orbit(dx, dy) { this.yaw -= dx * 0.008; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + dy * 0.006)); }
  zoom(k) { this.scale = Math.max(4, Math.min(500, this.scale * k)); }
}

// ---------------------------------------------------------------- Lưới & trục 2D
function grid2(cam, opt) {
  if (!opt.grid && !opt.axes) return '';
  const out = [];
  const tl = cam.u({ x: 0, y: 0 }), br = cam.u({ x: cam.w, y: cam.h });
  const raw = 70 / cam.scale;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) || p * 10;
  if (opt.grid) {
    const g = [];
    for (let x = Math.ceil(tl.x / step) * step; x < br.x; x += step) {
      const sx = f(cam.s({ x, y: 0 }).x); g.push(`M${sx} 0V${cam.h}`);
    }
    for (let y = Math.ceil(br.y / step) * step; y < tl.y; y += step) {
      const sy = f(cam.s({ x: 0, y }).y); g.push(`M0 ${sy}H${cam.w}`);
    }
    out.push(`<path d="${g.join('')}" class="grid"/>`);
    const g2 = [];
    const s2 = step / 5;
    if (cam.scale * s2 > 7) {
      for (let x = Math.ceil(tl.x / s2) * s2; x < br.x; x += s2) { const sx = f(cam.s({ x, y: 0 }).x); g2.push(`M${sx} 0V${cam.h}`); }
      for (let y = Math.ceil(br.y / s2) * s2; y < tl.y; y += s2) { const sy = f(cam.s({ x: 0, y }).y); g2.push(`M0 ${sy}H${cam.w}`); }
      out.unshift(`<path d="${g2.join('')}" class="grid2"/>`);
    }
  }
  if (opt.axes) {
    const o = cam.s({ x: 0, y: 0 });
    out.push(`<path d="M0 ${f(o.y)}H${cam.w}M${f(o.x)} 0V${cam.h}" class="axis"/>`);
    const lab = [];
    for (let x = Math.ceil(tl.x / step) * step; x < br.x; x += step) {
      if (Math.abs(x) < 1e-9) continue;
      const s = cam.s({ x, y: 0 });
      lab.push(`<text x="${f(s.x)}" y="${f(Math.min(Math.max(o.y + 14, 12), cam.h - 4))}" class="tick">${fmt(x)}</text>`);
    }
    for (let y = Math.ceil(br.y / step) * step; y < tl.y; y += step) {
      if (Math.abs(y) < 1e-9) continue;
      const s = cam.s({ x: 0, y });
      lab.push(`<text x="${f(Math.min(Math.max(o.x - 7, 10), cam.w - 6))}" y="${f(s.y + 4)}" class="tick" text-anchor="end">${fmt(y)}</text>`);
    }
    out.push(lab.join(''));
    out.push(`<text x="${f(o.x - 7)}" y="${f(o.y + 15)}" class="tick" text-anchor="end">O</text>`);
  }
  return out.join('');
}
const fmt = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : String(r);
};

// ---------------------------------------------------------------- Vẽ 2D
function lineEndpoints(L, cam) {
  const big = (cam.w + cam.h) * 1.5 / cam.scale;
  if (L.kind === 'seg') return [L.a, L.b];
  if (L.kind === 'ray') return [L.a, vAdd(L.a, vMul(vNorm(vSub(L.b, L.a)), big))];
  return [vAdd(L.p, vMul(L.d, -big)), vAdd(L.p, vMul(L.d, big))];
}

function styleAttr(o, sel) {
  const st = o.style || {};
  const c = sel ? '#d98324' : (st.color || '#16233d');
  const w = (st.width || 1.8) * (sel ? 1.7 : 1);
  return `stroke="${c}" stroke-width="${w}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}`;
}

export function render2(doc, cam, opt) {
  NHAN = [];
  const out = [grid2(cam, opt)];
  const labels = [];
  const sel = opt.selected || new Set();
  const hl = opt.hover;

  // 1) đa giác
  for (const o of doc.list()) {
    if (!o.visible || !o.val || o.type !== 'polygon') continue;
    const pts = o.val.pts.map((p) => cam.s(p)).map((p) => `${f(p.x)},${f(p.y)}`).join(' ');
    out.push(`<polygon points="${pts}" fill="${o.style.fill || 'rgba(67,56,168,.09)'}" ${styleAttr(o, sel.has(o.id))} stroke-linejoin="round"/>`);
    if (o.showLabel) {
      const c = o.val.pts.reduce((a, p) => vAdd(a, p), { x: 0, y: 0 });
      labels.push(lab(o, cam.s(vMul(c, 1 / o.val.pts.length)), o.name, o.style.color, 0, 0));
    }
  }
  // 2) đường tròn & đường thẳng
  for (const o of doc.list()) {
    if (!o.visible || !o.val) continue;
    if (o.type === 'circle') {
      const c = cam.s(o.val.c);
      out.push(`<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(o.val.r * cam.scale)}" fill="none" ${styleAttr(o, sel.has(o.id))}/>`);
      if (o.showLabel) labels.push(lab(o, { x: c.x, y: c.y - o.val.r * cam.scale }, o.name, o.style.color, 0, -6));
    } else if (o.type === 'line') {
      const [a, b] = lineEndpoints(o.val, cam);
      const A = cam.s(a), B = cam.s(b);
      out.push(`<line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" ${styleAttr(o, sel.has(o.id))} stroke-linecap="round"${o.val.arrow ? ' marker-end="url(#arwr)"' : ''}/>`);
      if (o.showLabel) {
        const m = { x: A.x + (B.x - A.x) * 0.72, y: A.y + (B.y - A.y) * 0.72 };
        labels.push(lab(o, m, o.name, o.style.color, 8, -6));
      }
    }
  }
  // 3) góc
  for (const o of doc.list()) {
    if (!o.visible || !o.val || o.type !== 'angle') continue;
    const V = cam.s(o.val.at), A = cam.s(o.val.from), C = cam.s(o.val.to);
    const r = 26;
    const a1 = Math.atan2(A.y - V.y, A.x - V.x), a2 = Math.atan2(C.y - V.y, C.x - V.x);
    let da = a2 - a1;
    while (da <= -Math.PI) da += 2 * Math.PI;
    while (da > Math.PI) da -= 2 * Math.PI;
    const col = o.style.color || '#b3261e';
    if (Math.abs(o.val.v - 90) < 0.4) {
      const u = { x: Math.cos(a1), y: Math.sin(a1) }, w = { x: Math.cos(a2), y: Math.sin(a2) };
      const s = 15;
      out.push(`<path d="M${f(V.x + u.x * s)} ${f(V.y + u.y * s)}L${f(V.x + (u.x + w.x) * s)} ${f(V.y + (u.y + w.y) * s)}L${f(V.x + w.x * s)} ${f(V.y + w.y * s)}" fill="rgba(179,38,30,.10)" stroke="${col}" stroke-width="1.6"/>`);
    } else {
      const x1 = V.x + r * Math.cos(a1), y1 = V.y + r * Math.sin(a1);
      const x2 = V.x + r * Math.cos(a1 + da), y2 = V.y + r * Math.sin(a1 + da);
      out.push(`<path d="M${f(V.x)} ${f(V.y)}L${f(x1)} ${f(y1)}A${r} ${r} 0 0 ${da > 0 ? 1 : 0} ${f(x2)} ${f(y2)}Z" fill="rgba(179,38,30,.10)" stroke="${col}" stroke-width="1.6"/>`);
    }
    const am = a1 + da / 2;
    labels.push(lab(o, { x: V.x + (r + 14) * Math.cos(am), y: V.y + (r + 14) * Math.sin(am) }, `${o.val.v.toFixed(1)}°`, col, 0, 4));
  }
  // 4) số đo & chữ
  for (const o of doc.list()) {
    if (!o.visible || !o.val) continue;
    if (o.type === 'number' && o.val.anchor) {
      labels.push(lab(o, cam.s(o.val.anchor), `${o.name} = ${round3(o.val.v)}`, o.style.color, 0, -8));
    } else if (o.type === 'text') {
      labels.push(lab(o, cam.s({ x: o.val.x, y: o.val.y }), o.val.s, o.style.color, 0, 0, true));
    }
  }
  // 5) điểm
  for (const o of doc.list()) {
    if (!o.visible || !o.val || o.type !== 'point') continue;
    const p = cam.s(o.val);
    const r = (o.style.size || 4.6) * (sel.has(o.id) ? 1.45 : 1);
    const col = sel.has(o.id) ? '#d98324' : o.style.color;
    if (hl === o.id) out.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r + 5)}" fill="rgba(34,70,143,.18)"/>`);
    out.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" fill="${col}" stroke="var(--labelhalo,#fff)" stroke-width="1.6"/>`);
    if (o.showLabel) labels.push(lab(o, p, o.name, col, 12, -11));
  }
  return out.join('') + labels.join('');
}

const round3 = (v) => Math.round(v * 1000) / 1000;
/** Vị trí các nhãn của khung vừa vẽ — dùng để bắt trúng khi kéo nhãn */
let NHAN = [];
export function labelBoxes() { return NHAN; }

/**
 * Vẽ một nhãn. `o` là đối tượng sở hữu nhãn (có thể null với nhãn trục toạ độ).
 * Độ lệch riêng o.lab (đơn vị pixel màn hình) cho phép người dùng kéo chữ đi chỗ khác.
 */
function lab(o, p, text, color, dx = 0, dy = 0, plain = false) {
  const lx = o && o.lab ? (o.lab.dx || 0) : 0;
  const ly = o && o.lab ? (o.lab.dy || 0) : 0;
  const X = p.x + dx + lx, Y = p.y + dy + ly;
  if (o) NHAN.push({ id: o.id, x: X, y: Y });
  return `<text x="${f(X)}" y="${f(Y)}" class="lbl${plain ? ' plain' : ''}" fill="${color || '#16233d'}">${esc(text)}</text>`;
}

// ---------------------------------------------------------------- Vẽ 3D
export function render3(doc, cam, opt) {
  NHAN = [];
  const b = cam.basis();
  const out = [];
  const labels = [];
  const sel = opt.selected || new Set();
  const S = (p) => cam.s(p);

  if (opt.axes) {
    const L = 6;
    const O = S(P3(0, 0, 0));
    for (const [v, name, col, mk] of [[P3(L, 0, 0), 'x', '#c0271c', 'arwr'], [P3(0, L, 0), 'y', '#1f7a5a', 'arwg'], [P3(0, 0, L), 'z', '#22468f', 'arwb']]) {
      const e = S(v);
      out.push(`<line x1="${f(O.x)}" y1="${f(O.y)}" x2="${f(e.x)}" y2="${f(e.y)}" stroke="${col}" stroke-width="1.3" opacity=".7" marker-end="url(#${mk})"/>`);
      labels.push(lab(null, e, name, col, 7, -5));
    }
  }
  if (opt.grid) {
    const g = [];
    for (let i = -6; i <= 6; i++) {
      const a = S(P3(i, -6, 0)), c = S(P3(i, 6, 0));
      const d = S(P3(-6, i, 0)), e = S(P3(6, i, 0));
      g.push(`M${f(a.x)} ${f(a.y)}L${f(c.x)} ${f(c.y)}M${f(d.x)} ${f(d.y)}L${f(e.x)} ${f(e.y)}`);
    }
    out.unshift(`<path d="${g.join('')}" class="grid"/>`);
  }

  // các mặt của khối: sắp theo độ sâu (thuật toán hoạ sĩ)
  const faces = [];
  for (const o of doc.list()) {
    if (!o.visible || !o.val) continue;
    if (o.val.t === 'solid') {
      const s = o.val;
      s.faces.forEach((fc) => {
        const pts = fc.map((i) => s.v[i]);
        const ctr = pts.reduce((a, p) => p3add(a, p), P3(0, 0, 0));
        faces.push({ o, pts, depth: cam.depth(p3mul(ctr, 1 / pts.length)), front: isFront(pts, b) });
      });
    } else if (o.val.t === 'f3') {
      const pts = o.val.pts;
      const ctr = pts.reduce((a, p) => p3add(a, p), P3(0, 0, 0));
      faces.push({ o, pts, depth: cam.depth(p3mul(ctr, 1 / pts.length)), front: true, flat: true });
    }
  }
  faces.sort((a, c) => a.depth - c.depth);
  for (const fa of faces) {
    if (!fa.flat && !fa.front) continue;
    const d = fa.pts.map(S).map((p) => `${f(p.x)},${f(p.y)}`).join(' ');
    out.push(`<polygon points="${d}" fill="${fa.o.style.fill || 'rgba(31,63,143,.07)'}" stroke="none"/>`);
  }

  // cạnh: nét liền nếu thấy, nét đứt nếu khuất
  for (const o of doc.list()) {
    if (!o.visible || !o.val) continue;
    const on = sel.has(o.id);
    if (o.val.t === 'solid') {
      const s = o.val;
      for (const [i, j] of s.edges) {
        const adj = s.faces.filter((fc) => fc.includes(i) && fc.includes(j));
        const vis = adj.some((fc) => isFront(fc.map((k) => s.v[k]), b));
        const A = S(s.v[i]), B = S(s.v[j]);
        out.push(`<line x1="${f(A.x)}" y1="${f(A.y)}" x2="${f(B.x)}" y2="${f(B.y)}" stroke="${on ? '#d98324' : o.style.color}" stroke-width="${(o.style.width || 1.7) * (vis ? 1 : 0.85)}"${vis ? '' : ' stroke-dasharray="6 5" opacity=".75"'} stroke-linecap="round"/>`);
      }
    } else if (o.val.t === 's3') {
      const A = S(o.val.a), B = S(o.val.b);
      let a = A, c = B;
      if (o.val.kind === 'line') {
        const dir = { x: B.x - A.x, y: B.y - A.y };
        const l = Math.hypot(dir.x, dir.y) || 1;
        const big = (cam.w + cam.h);
        a = { x: A.x - dir.x / l * big, y: A.y - dir.y / l * big };
        c = { x: A.x + dir.x / l * big, y: A.y + dir.y / l * big };
      }
      out.push(`<line x1="${f(a.x)}" y1="${f(a.y)}" x2="${f(c.x)}" y2="${f(c.y)}" ${styleAttr(o, on)} stroke-linecap="round"/>`);
      if (o.showLabel) labels.push(lab(o, { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, o.name, o.style.color, 8, -6));
    } else if (o.val.t === 'f3') {
      const pts = o.val.pts.map(S);
      out.push(`<polygon points="${pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')}" fill="none" ${styleAttr(o, on)} stroke-linejoin="round"/>`);
      if (o.showLabel) {
        const c = pts.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
        labels.push(lab(o, { x: c.x / pts.length, y: c.y / pts.length }, o.name, o.style.color, 0, 0));
      }
    } else if (o.val.t === 'sph') {
      const c = S(o.val.c), r = o.val.r * cam.scale;
      out.push(`<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${f(r)}" fill="${o.style.fill}" ${styleAttr(o, on)}/>`);
      const ry = Math.max(3, Math.abs(Math.sin(cam.pitch)) * r);
      out.push(`<ellipse cx="${f(c.x)}" cy="${f(c.y)}" rx="${f(r)}" ry="${f(ry)}" fill="none" stroke="${o.style.color}" stroke-width="1.1" opacity=".55" stroke-dasharray="5 4"/>`);
      if (o.showLabel) labels.push(lab(o, { x: c.x, y: c.y - r }, o.name, o.style.color, 0, -6));
    } else if (o.val.t === 'num' && o.val.anchor3) {
      labels.push(lab(o, S(o.val.anchor3), `${o.name} = ${round3(o.val.v)}`, o.style.color, 0, -8));
    }
  }
  // điểm 3D
  for (const o of doc.list()) {
    if (!o.visible || !o.val || o.val.t !== 'p3') continue;
    const p = S(o.val);
    const r = (o.style.size || 4.6) * (sel.has(o.id) ? 1.45 : 1);
    const col = sel.has(o.id) ? '#d98324' : o.style.color;
    if (opt.hover === o.id) out.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r + 5)}" fill="rgba(34,70,143,.18)"/>`);
    out.push(`<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(r)}" fill="${col}" stroke="var(--labelhalo,#fff)" stroke-width="1.6"/>`);
    if (o.showLabel) labels.push(lab(o, p, o.name, col, 12, -11));
  }
  return out.join('') + labels.join('');
}

function isFront(pts, b) {
  if (pts.length < 3) return true;
  let n = P3(0, 0, 0);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], c = pts[(i + 1) % pts.length];
    n = p3add(n, P3((a.y - c.y) * (a.z + c.z), (a.z - c.z) * (a.x + c.x), (a.x - c.x) * (a.y + c.y)));
  }
  return p3dot(n, b.fwd) > 0;
}

// ---------------------------------------------------------------- Hit test
/** Tìm đối tượng gần con trỏ nhất (ưu tiên điểm). px = toạ độ màn hình. */
export function pick(doc, cam, px, mode, tol = 13) {
  let best = null, bd = tol;
  const is3 = mode === '3d';
  // ưu tiên điểm
  for (const o of doc.list()) {
    if (!o.visible || !o.val) continue;
    const isPt = is3 ? o.val.t === 'p3' : o.type === 'point';
    if (!isPt) continue;
    const s = cam.s(o.val);
    const d = Math.hypot(s.x - px.x, s.y - px.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (best) return best;
  bd = tol;
  for (const o of doc.list()) {
    if (!o.visible || !o.val) continue;
    let d = Infinity;
    if (!is3 && o.type === 'line') {
      const [a, b] = lineEndpoints(o.val, cam);
      d = distSegPx(cam.s(a), cam.s(b), px);
    } else if (!is3 && o.type === 'circle') {
      const c = cam.s(o.val.c);
      d = Math.abs(Math.hypot(px.x - c.x, px.y - c.y) - o.val.r * cam.scale);
    } else if (!is3 && o.type === 'polygon') {
      d = Math.min(...o.val.pts.map((p, i) => distSegPx(cam.s(p), cam.s(o.val.pts[(i + 1) % o.val.pts.length]), px)));
    } else if (is3 && o.val.t === 's3') {
      d = distSegPx(cam.s(o.val.a), cam.s(o.val.b), px);
    } else if (is3 && (o.val.t === 'f3')) {
      d = Math.min(...o.val.pts.map((p, i) => distSegPx(cam.s(p), cam.s(o.val.pts[(i + 1) % o.val.pts.length]), px)));
    } else if (is3 && o.val.t === 'solid') {
      d = Math.min(...o.val.edges.map(([i, j]) => distSegPx(cam.s(o.val.v[i]), cam.s(o.val.v[j]), px)));
    }
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function distSegPx(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
