// ============================================================================
// ptr.js — Sinh PHƯƠNG TRÌNH cho từng đối tượng đang có trên bảng.
//
// Vì sao tách riêng: bảng vẽ lưu hình dưới dạng toạ độ, còn học sinh cần nhìn
// thấy phương trình. Hai việc đó không dính gì nhau, nên để riêng một tệp,
// chạy được trong Node và kiểm thử được mà không cần trình duyệt.
//
// Quy ước viết theo SGK Việt Nam:
//   đường thẳng   ax + by + c = 0   (kèm dạng y = mx + n khi viết được)
//   đường tròn    (x - a)² + (y - b)² = R²
//   mặt phẳng     ax + by + cz + d = 0
//   mặt cầu       (x - a)² + (y - b)² + (z - c)² = R²
//   đường trong không gian: phương trình tham số
// ============================================================================

const NHO = 1e-9;   // ngưỡng coi như bằng 0 (đặt tên riêng để bản gộp không đụng EPS của vec.js)

/** Làm tròn gọn: bỏ đuôi 0 thừa, -0 thành 0 */
export function soGon(x, n = 3) {
  if (!Number.isFinite(x)) return '?';
  const v = Math.abs(x) < 1e-10 ? 0 : x;
  let s = v.toFixed(n);
  if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s === '-0' ? '0' : s;
}

/**
 * Nhân cả bộ hệ số với một số để ra số nguyên cho đẹp, rồi đổi dấu
 * sao cho hệ số khác 0 đầu tiên là số dương — đúng thói quen viết bảng.
 */
export function lamDep(hs) {
  const khac0 = hs.filter((v) => Math.abs(v) > NHO);
  if (!khac0.length) return hs.slice();
  let r = hs.map((v) => v / Math.min(...khac0.map(Math.abs)));
  // thử nhân thêm 1..12 để triệt mẫu số (ví dụ 1,5 → 3)
  for (let q = 1; q <= 12; q++) {
    if (r.every((v) => Math.abs(v * q - Math.round(v * q)) < 1e-6)) {
      r = r.map((v) => Math.round(v * q));
      break;
    }
  }
  const dau = r.find((v) => Math.abs(v) > NHO);
  if (dau < 0) r = r.map((v) => -v);
  return r;
}

/** Ghép [[hệ số, 'x'], ...] và hằng số thành chuỗi "3x - 2y + 6" */
export function daThuc(hs, hang) {
  let s = '';
  for (const [c, bien] of hs) {
    if (Math.abs(c) < NHO) continue;
    const am = c < 0;
    s += s ? (am ? ' - ' : ' + ') : (am ? '-' : '');
    const a = Math.abs(c);
    s += (Math.abs(a - 1) < NHO ? '' : soGon(a)) + bien;
  }
  if (Math.abs(hang) > NHO || !s) {
    const am = hang < 0;
    s += s ? (am ? ' - ' : ' + ') : (am ? '-' : '');
    s += soGon(Math.abs(hang));
  }
  return s;
}

/** Đường thẳng phẳng qua điểm p, chỉ phương d → "ax + by + c = 0" */
export function ptDuongThang(p, d) {
  if (!p || !d || (Math.abs(d.x) < NHO && Math.abs(d.y) < NHO)) return null;
  // pháp tuyến (d.y, -d.x)
  const [a, b, c] = lamDep([d.y, -d.x, d.x * p.y - d.y * p.x]);
  const tq = daThuc([[a, 'x'], [b, 'y']], c) + ' = 0';
  let hs = null;
  if (Math.abs(b) > NHO) {
    const m = -a / b, n = -c / b;
    hs = 'y = ' + (Math.abs(m) < NHO ? soGon(n) : daThuc([[m, 'x']], n));
  } else {
    hs = 'x = ' + soGon(-c / a);
  }
  return { tq, hs };
}

/** Phương trình tham số của đường thẳng trong không gian */
export function ptThamSo3(A, u) {
  if (!A || !u) return null;
  const dong = (ten, g, h) => {
    if (Math.abs(h) < NHO) return `${ten} = ${soGon(g)}`;
    const he = Math.abs(Math.abs(h) - 1) < NHO ? '' : soGon(Math.abs(h));
    return `${ten} = ${soGon(g)} ${h < 0 ? '-' : '+'} ${he}t`;
  };
  const v = lamDep([u.x, u.y, u.z]);
  return [dong('x', A.x, v[0]), dong('y', A.y, v[1]), dong('z', A.z, v[2])].join('\n');
}

/** Thể tích khối đa diện lồi, dùng định lý phân kỳ trên các mặt đã định hướng ra ngoài */
export function theTich(kh) {
  if (!kh || !kh.v || !kh.faces) return null;
  let s = 0;
  for (const f of kh.faces) {
    for (let i = 1; i + 1 < f.length; i++) {
      const A = kh.v[f[0]], B = kh.v[f[i]], C = kh.v[f[i + 1]];
      s += A.x * (B.y * C.z - B.z * C.y) - A.y * (B.x * C.z - B.z * C.x) + A.z * (B.x * C.y - B.y * C.x);
    }
  }
  return Math.abs(s) / 6;
}

/** Diện tích một đa giác phẳng đặt trong không gian */
export function dienTich3(pts) {
  if (!pts || pts.length < 3) return null;
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += a.y * b.z - a.z * b.y;
    ny += a.z * b.x - a.x * b.z;
    nz += a.x * b.y - a.y * b.x;
  }
  return Math.hypot(nx, ny, nz) / 2;
}

const chuVi = (pts, kin = true) => {
  let s = 0;
  const n = pts.length;
  for (let i = 0; i + (kin ? 0 : 1) < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
};
const dtGiay = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
};

const TEN_KIND = { seg: 'Đoạn thẳng', ray: 'Tia', vec: 'Vectơ', line: 'Đường thẳng' };

/**
 * Phương trình của một đối tượng.
 * Trả về { pt, phu, loai } — pt là dòng chính, phu là dòng phụ (tâm, bán kính,
 * độ dài, diện tích...). Đối tượng không có phương trình thì pt = null.
 */
export function phuongTrinh(o) {
  if (!o || !o.val) return null;
  const v = o.val;

  // ---- điểm ----
  if (o.type === 'point') return { loai: 'Điểm', pt: `${o.name}(${soGon(v.x)}; ${soGon(v.y)})`, phu: null };
  if (v.t === 'p3') return { loai: 'Điểm', pt: `${o.name}(${soGon(v.x)}; ${soGon(v.y)}; ${soGon(v.z)})`, phu: null };

  // ---- đường thẳng, đoạn, tia, vectơ ----
  if (v.t === 'line') {
    const e = ptDuongThang(v.p, v.d);
    if (!e) return null;
    // vectơ được lưu như một đoạn có cờ arrow, nên phải xét cờ đó trước
    if (v.arrow || v.kind === 'vec') {
      const u = { x: v.b.x - v.a.x, y: v.b.y - v.a.y };
      return {
        loai: 'Vectơ',
        pt: `${o.name} = (${soGon(u.x)}; ${soGon(u.y)})`,
        phu: `|${o.name}| = ${soGon(Math.hypot(u.x, u.y))}`,
      };
    }
    const loai = TEN_KIND[v.kind] || 'Đường thẳng';
    const dai = Math.hypot(v.b.x - v.a.x, v.b.y - v.a.y);
    return {
      loai,
      pt: e.tq,
      phu: (e.hs ? e.hs : '') + (v.kind === 'seg' ? `   ·   ${o.name} = ${soGon(dai)}` : ''),
    };
  }

  // ---- đường tròn ----
  if (v.t === 'circle') {
    const a = soGon(v.c.x), b = soGon(v.c.y);
    const tx = Math.abs(v.c.x) < NHO ? 'x²' : `(x ${v.c.x > 0 ? '-' : '+'} ${soGon(Math.abs(v.c.x))})²`;
    const ty = Math.abs(v.c.y) < NHO ? 'y²' : `(y ${v.c.y > 0 ? '-' : '+'} ${soGon(Math.abs(v.c.y))})²`;
    return {
      loai: 'Đường tròn',
      pt: `${tx} + ${ty} = ${soGon(v.r * v.r)}`,
      phu: `Tâm (${a}; ${b})   ·   R = ${soGon(v.r)}`,
    };
  }

  // ---- mặt cầu ----
  if (v.t === 'sph') {
    const bien = (ten, g) => (Math.abs(g) < NHO ? `${ten}²` : `(${ten} ${g > 0 ? '-' : '+'} ${soGon(Math.abs(g))})²`);
    return {
      loai: 'Mặt cầu',
      pt: `${bien('x', v.c.x)} + ${bien('y', v.c.y)} + ${bien('z', v.c.z)} = ${soGon(v.r * v.r)}`,
      phu: `Tâm (${soGon(v.c.x)}; ${soGon(v.c.y)}; ${soGon(v.c.z)})   ·   R = ${soGon(v.r)}`,
    };
  }

  // ---- mặt phẳng ----
  if (v.t === 'plane') {
    const [a, b, c] = lamDep([v.n.x, v.n.y, v.n.z]);
    const d = -(a * v.p.x + b * v.p.y + c * v.p.z);
    return {
      loai: 'Mặt phẳng',
      pt: daThuc([[a, 'x'], [b, 'y'], [c, 'z']], d) + ' = 0',
      phu: `Pháp tuyến (${soGon(a)}; ${soGon(b)}; ${soGon(c)})`,
    };
  }

  // ---- đoạn thẳng trong không gian ----
  if (v.t === 's3') {
    const u = { x: v.b.x - v.a.x, y: v.b.y - v.a.y, z: v.b.z - v.a.z };
    const dai = Math.hypot(u.x, u.y, u.z);
    return {
      loai: v.kind === 'seg' ? 'Đoạn thẳng' : 'Đường thẳng',
      pt: ptThamSo3(v.a, u),
      phu: `${o.name} = ${soGon(dai)}`,
    };
  }

  // ---- đa giác phẳng ----
  if (v.t === 'poly') {
    return {
      loai: 'Đa giác',
      pt: v.pts.map((p) => `(${soGon(p.x)}; ${soGon(p.y)})`).join('  '),
      phu: `S = ${soGon(dtGiay(v.pts))}   ·   Chu vi = ${soGon(chuVi(v.pts))}`,
    };
  }

  // ---- mặt / thiết diện trong không gian ----
  if (v.t === 'f3') {
    const s = dienTich3(v.pts);
    return { loai: 'Mặt phẳng (đa giác)', pt: v.pts.map((p) => `(${soGon(p.x)}; ${soGon(p.y)}; ${soGon(p.z)})`).join('  '), phu: s == null ? null : `S = ${soGon(s)}` };
  }

  // ---- khối đa diện ----
  if (v.t === 'solid') {
    const V = theTich(v);
    return {
      loai: 'Khối đa diện',
      pt: `${v.v.length} đỉnh · ${v.faces.length} mặt · ${v.edges.length} cạnh`,
      phu: V == null ? null : `V = ${soGon(V)}`,
    };
  }

  // ---- miền nghiệm ----
  if (v.t === 'mien') {
    const ds = (o.params && o.params.bpt) || [];
    return {
      loai: 'Miền nghiệm',
      pt: ds.length ? ds.join('\n') : null,
      phu: v.rong ? 'Hệ vô nghiệm' : `Miền ${v.pts.length >= 3 ? 'đa giác ' + v.pts.length + ' đỉnh' : 'rỗng'}`,
    };
  }

  // ---- khoảng trên trục số ----
  if (v.t === 'khoang') {
    return {
      loai: 'Tập số',
      pt: `${o.name} = ${v.dongA ? '[' : '('}${soGon(v.a)}; ${soGon(v.b)}${v.dongB ? ']' : ')'}`,
      phu: null,
    };
  }

  // ---- số đo, góc ----
  if (v.t === 'num') return { loai: 'Số đo', pt: `${o.name} = ${soGon(v.v)}`, phu: null };
  if (v.t === 'angle') return { loai: 'Góc', pt: `${o.name} = ${soGon(v.v)}°`, phu: null };

  return null;
}
