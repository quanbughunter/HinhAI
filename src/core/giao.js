// ============================================================================
// giao.js — Tìm mọi GIAO ĐIỂM đang có trên bảng, kể cả giao với hai trục toạ độ.
//
// Dùng cho hai việc:
//   1. Rê chuột lại gần chỗ hai đường cắt nhau thì bắt dính vào đúng điểm đó,
//      bấm một cái là có điểm — khỏi phải chọn công cụ "giao điểm" rồi chỉ
//      từng đường.
//   2. Với miền nghiệm thì hiện sẵn chỗ mỗi biên cắt Ox, Oy — đó chính là các
//      số học sinh cần để vẽ hình vào vở.
//
// Chỉ nhận những giao điểm THẬT SỰ NHÌN THẤY: đoạn thẳng cắt nhau ngoài phạm vi
// hai đầu mút thì không tính, vì trên hình không có chỗ nào để bấm.
// ============================================================================

import { intersectAny, lineParam, vDist, vSub, vLen } from './vec.js';
import { diemConic } from './conic.js';

const TEO = 1e-7;   // ngưỡng coi như 0 (tên riêng để bản gộp không đụng TEO của docpt.js)

/** Hai trục toạ độ, đóng gói dưới dạng "đường thẳng" để dùng chung mọi phép tính */
export const TRUC = {
  Ox: { t: 'line', kind: 'line', p: { x: 0, y: 0 }, d: { x: 1, y: 0 }, a: { x: -1, y: 0 }, b: { x: 1, y: 0 } },
  Oy: { t: 'line', kind: 'line', p: { x: 0, y: 0 }, d: { x: 0, y: 1 }, a: { x: 0, y: -1 }, b: { x: 0, y: 1 } },
};

/** Điểm p có nằm trên phần NHÌN THẤY của hình không (đoạn thì phải trong hai mút) */
export function namTren(val, p) {
  if (!val) return false;
  if (val.t !== 'line') return true;
  if (val.kind === 'line') return true;
  const dai = vLen(vSub(val.b, val.a));
  if (dai < TEO) return false;
  const t = lineParam(val, p) / dai;
  if (val.kind === 'ray') return t > -1e-6;
  return t > -1e-6 && t < 1 + 1e-6;     // đoạn thẳng, vectơ
}

/** Cắt hai đoạn thẳng (toạ độ thật). Trả về điểm giao hoặc null. */
function catDoan(a1, a2, b1, b2) {
  const r = { x: a2.x - a1.x, y: a2.y - a1.y };
  const s = { x: b2.x - b1.x, y: b2.y - b1.y };
  const d = r.x * s.y - r.y * s.x;
  if (Math.abs(d) < 1e-14) return null;
  const q = { x: b1.x - a1.x, y: b1.y - a1.y };
  const t = (q.x * s.y - q.y * s.x) / d;
  const u = (q.x * r.y - q.y * r.x) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a1.x + r.x * t, y: a1.y + r.y * t };
}

/** Đổi một hình thành đường gấp khúc để cắt bằng cách duyệt từng đoạn */
function gapKhuc(val, tamNhin) {
  if (val.t === 'conic') return diemConic(val, tamNhin);
  if (val.t === 'line') {
    if (val.kind === 'seg' || val.kind === 'vec') return [[val.a, val.b]];
    const L = Math.max(tamNhin * 3, 100);
    const A = { x: val.p.x - val.d.x * L, y: val.p.y - val.d.y * L };
    const B = { x: val.p.x + val.d.x * L, y: val.p.y + val.d.y * L };
    return [[val.kind === 'ray' ? val.a : A, B]];
  }
  if (val.t === 'circle') {
    const n = 160, ds = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 * Math.PI;
      ds.push({ x: val.c.x + val.r * Math.cos(t), y: val.c.y + val.r * Math.sin(t) });
    }
    return [ds];
  }
  return [];
}

/**
 * Giao của hai hình. Đường thẳng và đường tròn thì giải đúng bằng công thức;
 * có conic thì mới phải cắt gần đúng theo đường gấp khúc.
 */
export function giaoHai(v1, v2, tamNhin = 40) {
  if (!v1 || !v2) return [];
  const conic1 = v1.t === 'conic', conic2 = v2.t === 'conic';
  if (!conic1 && !conic2) {
    return intersectAny(v1, v2).filter((p) => p && namTren(v1, p) && namTren(v2, p));
  }
  if (conic1 && conic2) return [];        // conic cắt conic: bỏ qua, quá nặng để chạy mỗi lần rê chuột
  const A = gapKhuc(v1, tamNhin), B = gapKhuc(v2, tamNhin);
  const ra = [];
  for (const na of A) {
    for (let i = 0; i + 1 < na.length; i++) {
      for (const nb of B) {
        for (let j = 0; j + 1 < nb.length; j++) {
          const p = catDoan(na[i], na[i + 1], nb[j], nb[j + 1]);
          if (p && !ra.some((q) => vDist(q, p) < 1e-6)) ra.push(p);
        }
      }
    }
  }
  return ra;
}

const CAT_DUOC = { line: 1, circle: 1, conic: 1 };

/**
 * Mọi giao điểm hiện có. Mỗi phần tử:
 *   { p, a, b, i }   a, b là đối tượng; b có thể là chuỗi 'Ox' / 'Oy'
 *   i là thứ tự nghiệm, cần cho phép dựng "giao điểm" biết lấy nghiệm nào.
 */
export function timGiao(doc, tamNhin = 40, keCaTruc = true) {
  const ds = doc.list().filter((o) => o.visible && o.val && CAT_DUOC[o.val.t]);
  const ra = [];
  const them = (pts, a, b) => {
    pts.forEach((p, i) => {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) ra.push({ p, a, b, i });
    });
  };
  for (let i = 0; i < ds.length; i++) {
    for (let j = i + 1; j < ds.length; j++) {
      them(giaoHai(ds[i].val, ds[j].val, tamNhin), ds[i], ds[j]);
    }
    if (keCaTruc) {
      them(giaoHai(ds[i].val, TRUC.Ox, tamNhin), ds[i], 'Ox');
      them(giaoHai(ds[i].val, TRUC.Oy, tamNhin), ds[i], 'Oy');
    }
  }
  return ra;
}

/** Giao của các biên một miền nghiệm với hai trục — dùng để chấm sẵn lên hình */
export function giaoBienVoiTruc(mien) {
  if (!mien || !mien.hp) return [];
  const ra = [];
  mien.hp.forEach((h, k) => {
    const n2 = h.a * h.a + h.b * h.b;
    if (n2 < 1e-12) return;
    // a·x + b·y + c = 0
    if (Math.abs(h.b) > TEO) ra.push({ k, truc: 'Oy', p: { x: 0, y: -h.c / h.b } });
    if (Math.abs(h.a) > TEO) ra.push({ k, truc: 'Ox', p: { x: -h.c / h.a, y: 0 } });
  });
  return ra;
}
