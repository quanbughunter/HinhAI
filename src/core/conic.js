// ============================================================================
// conic.js — Elip, parabol, hypebol.
//
// Mọi đường bậc hai đều viết được dưới dạng
//        a·x² + b·xy + c·y² + d·x + e·y + f = 0
// Việc của tệp này là đưa nó về DẠNG CHÍNH TẮC: xoay hệ trục cho mất số hạng
// xy, rồi tịnh tiến cho mất số hạng bậc nhất. Còn lại đúng ba dáng quen thuộc:
//
//        U²/A² + V²/B² = 1      elip
//        U²/A² − V²/B² = 1      hypebol
//        U²        = k·V        parabol
//
// Sau khi có tâm (hoặc đỉnh) cùng hai vectơ trục u, v thì việc vẽ chỉ còn là
// chạy tham số — và tiêu điểm, tâm sai, đường chuẩn, tiệm cận cũng rơi ra luôn,
// đúng những thứ đề bài hay hỏi.
// ============================================================================

const TI = 1e-9;

/**
 * Đưa a·x² + b·xy + c·y² + d·x + e·y + f = 0 về dạng chính tắc.
 * Trả về { kind, ... } hoặc { loi } nếu suy biến / không có điểm thực.
 *   elip, hypebol → { tam, u, v, A, B }
 *   parabol       → { dinh, u, v, k }      P(s) = dinh + s·u + (s²/k)·v
 */
export function chuanHoaConic(hs) {
  const { a, b, c, d, e, f } = hs;
  if (Math.abs(a) < TI && Math.abs(b) < TI && Math.abs(c) < TI) return { loi: 'Không phải đường bậc hai.' };

  // --- xoay cho mất số hạng xy ---
  const goc = 0.5 * Math.atan2(b, a - c);
  const co = Math.cos(goc), si = Math.sin(goc);
  const a1 = a * co * co + b * co * si + c * si * si;
  const c1 = a * si * si - b * co * si + c * co * co;
  const d1 = d * co + e * si;
  const e1 = -d * si + e * co;
  const f1 = f;
  const u = { x: co, y: si };          // trục X mới, trong toạ độ gốc
  const v = { x: -si, y: co };         // trục Y mới
  const veGoc = (X, Y) => ({ x: co * X - si * Y, y: si * X + co * Y });

  const coA = Math.abs(a1) > 1e-8 * (1 + Math.abs(c1));
  const coC = Math.abs(c1) > 1e-8 * (1 + Math.abs(a1));

  // --- có tâm: elip hoặc hypebol ---
  if (coA && coC) {
    const X0 = -d1 / (2 * a1), Y0 = -e1 / (2 * c1);
    const R = a1 * X0 * X0 + c1 * Y0 * Y0 - f1;     // a1·U² + c1·V² = R
    if (Math.abs(R) < TI * (1 + Math.abs(f1))) {
      return { loi: a1 * c1 > 0 ? 'Chỉ là một điểm.' : 'Suy biến thành hai đường thẳng cắt nhau.' };
    }
    const ra = R / a1, rb = R / c1;
    const tam = veGoc(X0, Y0);
    if (ra > 0 && rb > 0) {
      // elip — quy ước trục lớn đứng trước
      const A = Math.sqrt(ra), B = Math.sqrt(rb);
      // trục lớn đứng trước: nếu trục theo v dài hơn thì đổi vai hai vectơ cho nhau
      return A >= B
        ? { kind: 'elip', tam, u, v, A, B }
        : { kind: 'elip', tam, u: v, v: u, A: B, B: A };
    }
    if (ra > 0) return { kind: 'hypebol', tam, u, v, A: Math.sqrt(ra), B: Math.sqrt(-rb) };
    if (rb > 0) return { kind: 'hypebol', tam, u: v, v: u, A: Math.sqrt(rb), B: Math.sqrt(-ra) };
    return { loi: 'Không có điểm thực nào thoả phương trình.' };
  }

  // --- không có tâm: parabol ---
  // Trục đối xứng nằm dọc theo hướng có số hạng bình phương.
  if (coA) {
    if (Math.abs(e1) < TI) return { loi: 'Suy biến thành đường thẳng song song.' };
    const X0 = -d1 / (2 * a1);
    const Yv = (a1 * X0 * X0 - f1) / e1;
    const k = -e1 / a1;                 // U² = k·V
    return { kind: 'parabol', dinh: veGoc(X0, Yv), u, v, k };
  }
  if (Math.abs(d1) < TI) return { loi: 'Suy biến thành đường thẳng song song.' };
  const Y0 = -e1 / (2 * c1);
  const Xv = (c1 * Y0 * Y0 - f1) / d1;
  const k = -d1 / c1;
  return { kind: 'parabol', dinh: veGoc(Xv, Y0), u: v, v: u, k };
}

/**
 * Sinh các nhánh điểm để vẽ. `tam` là quãng nhìn thấy (đơn vị toạ độ thật),
 * dùng để biết nên chạy tham số tới đâu thì phủ kín màn hình.
 */
export function diemConic(K, tamNhin = 40) {
  if (!K || K.loi) return [];
  const di = (g, s, t) => ({ x: g.x + K.u.x * s + K.v.x * t, y: g.y + K.u.y * s + K.v.y * t });

  if (K.kind === 'elip') {
    const n = 180, ds = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 * Math.PI;
      ds.push(di(K.tam, K.A * Math.cos(t), K.B * Math.sin(t)));
    }
    return [ds];
  }

  if (K.kind === 'hypebol') {
    const T = Math.asinh(Math.max(2, tamNhin / Math.max(1e-6, K.B))) * 1.05;
    const n = 140;
    const nhanh = (dau) => {
      const ds = [];
      for (let i = 0; i <= n; i++) {
        const t = -T + (2 * T * i) / n;
        ds.push(di(K.tam, dau * K.A * Math.cosh(t), K.B * Math.sinh(t)));
      }
      return ds;
    };
    return [nhanh(1), nhanh(-1)];
  }

  // parabol: chạy s sao cho phủ hết tầm nhìn theo cả hai hướng
  const S = Math.max(tamNhin, Math.sqrt(Math.abs(K.k) * tamNhin)) * 1.2;
  const n = 160, ds = [];
  for (let i = 0; i <= n; i++) {
    const s = -S + (2 * S * i) / n;
    ds.push(di(K.dinh, s, (s * s) / K.k));
  }
  return [ds];
}

/** Tiêu điểm, tâm sai, đường chuẩn, tiệm cận — những thứ đề bài hay hỏi */
export function soLieuConic(K) {
  if (!K || K.loi) return null;
  const di = (g, s, t) => ({ x: g.x + K.u.x * s + K.v.x * t, y: g.y + K.u.y * s + K.v.y * t });
  if (K.kind === 'elip') {
    const c = Math.sqrt(Math.max(0, K.A * K.A - K.B * K.B));
    return { c, e: c / K.A, F: [di(K.tam, -c, 0), di(K.tam, c, 0)] };
  }
  if (K.kind === 'hypebol') {
    const c = Math.sqrt(K.A * K.A + K.B * K.B);
    return { c, e: c / K.A, F: [di(K.tam, -c, 0), di(K.tam, c, 0)], hsTiemCan: K.B / K.A };
  }
  const p = Math.abs(K.k) / 4;          // U² = 4p·V
  return { p, F: [di(K.dinh, 0, K.k / 4)] };
}

/** Nhận dạng nhanh bằng biệt thức, không cần chuẩn hoá */
export function loaiConic(hs) {
  const D = hs.b * hs.b - 4 * hs.a * hs.c;
  if (D < -TI) return Math.abs(hs.a - hs.c) < TI && Math.abs(hs.b) < TI ? 'tron' : 'elip';
  return D > TI ? 'hypebol' : 'parabol';
}
