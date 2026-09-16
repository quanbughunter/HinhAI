// ============================================================================
// docpt.js — ĐỌC một phương trình do người dùng gõ và hiểu nó là hình gì.
//
// Ngược chiều với ptr.js: ptr.js nhìn hình viết ra phương trình, tệp này nhìn
// phương trình dựng lại hình.
//
// Cách làm: không viết bộ khai triển đa thức (dài và dễ sai), mà THỬ SỐ.
// Chuyển chuỗi thành một hàm f(x,y,z) = vế trái - vế phải, rồi tính giá trị ở
// vài điểm đã chọn sẵn để rút ra từng hệ số. Vì phương trình trong chương trình
// phổ thông cao nhất là bậc hai, mười phép thử là đủ. Cuối cùng kiểm tra lại ở
// hai điểm ngẫu nhiên — không khớp nghĩa là biểu thức không phải bậc hai, báo
// lỗi thay vì dựng bừa.
// ============================================================================

import { loaiConic } from './conic.js';

const XIU = 1e-7;
const LA_DIEM = { point: 1, point3: 1 };                       // điểm tự do, dời được thoải mái
const HAI_DAU = { segment: 1, line: 1, ray: 1, vector: 1 };    // đường xác định bởi đúng hai điểm

/** Đổi cách viết của người thành biểu thức JavaScript chạy được */
export function sangJS(bt) {
  let s = String(bt || '')
    .replace(/\s+/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/[XYZ]/g, (c) => c.toLowerCase());
  // nhân ngầm: 2x → 2*x, 3(x-1) → 3*(x-1), xy → x*y, )(→)*(, 2( → 2*(
  s = s.replace(/(\d)([xyz(])/g, '$1*$2')
    .replace(/([xyz)])([xyz(])/g, '$1*$2')
    .replace(/([xyz)])(\d)/g, '$1*$2');
  s = s.replace(/\^/g, '**');
  if (!/^[0-9xyz+\-*/(). ]*$/.test(s)) return null;   // chỉ cho đúng bấy nhiêu ký tự
  return s;
}

/** Biến chuỗi "vế trái = vế phải" thành hàm f(x,y,z) = trái - phải */
export function thanhHam(chuoi) {
  const ve = String(chuoi).split('=');
  if (ve.length > 2) return null;
  const trai = sangJS(ve[0]);
  const phai = ve.length === 2 ? sangJS(ve[1]) : '0';
  if (trai === null || phai === null || !trai.trim()) return null;
  try {
    // eslint-disable-next-line no-new-func
    const f = new Function('x', 'y', 'z', `return (${trai}) - (${phai || 0});`);
    if (!Number.isFinite(f(0.3, 0.7, 1.1))) return null;
    return f;
  } catch (_) { return null; }
}

/**
 * Rút hệ số của dạng tổng quát bậc hai:
 *   A·x² + B·y² + C·z² + D·xy + E·yz + F·zx + G·x + H·y + I·z + K
 * Trả về null nếu biểu thức không phải bậc hai.
 */
export function heSo(f) {
  const t = (a, b, c) => f(a, b, c);
  const K = t(0, 0, 0);
  const bac1 = (i) => {
    const d = [0, 0, 0]; d[i] = 1;
    const p = t(...d); d[i] = -1;
    const m = t(...d);
    return { vuong: (p + m) / 2 - K, thang: (p - m) / 2 };
  };
  const X = bac1(0), Y = bac1(1), Z = bac1(2);
  const cheo = (i, j) => {
    const d = [0, 0, 0]; d[i] = 1; d[j] = 1;
    const v = [X, Y, Z];
    return t(...d) - v[i].vuong - v[j].vuong - v[i].thang - v[j].thang - K;
  };
  const hs = {
    A: X.vuong, B: Y.vuong, C: Z.vuong,
    D: cheo(0, 1), E: cheo(1, 2), F: cheo(2, 0),
    G: X.thang, H: Y.thang, I: Z.thang, K,
  };
  // kiểm tra lại: nếu biểu thức thật sự bậc hai thì công thức phải khớp mọi nơi
  for (const [x, y, z] of [[2.3, -1.7, 0.9], [-0.6, 3.1, -2.4]]) {
    const du = hs.A * x * x + hs.B * y * y + hs.C * z * z
      + hs.D * x * y + hs.E * y * z + hs.F * z * x
      + hs.G * x + hs.H * y + hs.I * z + hs.K;
    if (!Number.isFinite(du) || Math.abs(du - f(x, y, z)) > 1e-6 * (1 + Math.abs(du))) return null;
  }
  return hs;
}

const gan = (a, b = 0) => Math.abs(a - b) < XIU;

/**
 * Đọc một phương trình.
 * Trả về { loai, ... } hoặc { loi: 'câu giải thích' }.
 *   diem  → { x, y, z?, ten? }
 *   duong → { a, b, c }            đường thẳng phẳng  a·x + b·y + c = 0
 *   tron  → { x, y, r }            đường tròn
 *   mp    → { a, b, c, d }         mặt phẳng
 *   cau   → { x, y, z, r }         mặt cầu
 *   bpt   → { ds: [...] }          bất phương trình / hệ, để chuyển sang miền nghiệm
 */
export function docPT(chuoi, khongGian = false) {
  const s = String(chuoi || '').trim();
  if (!s) return { loi: 'Chưa nhập gì.' };

  // --- bất phương trình thì để phần miền nghiệm lo ---
  if (/[<>≤≥]/.test(s)) {
    return { loai: 'bpt', ds: s.split(/[;,]| và /i).map((x) => x.trim()).filter(Boolean) };
  }

  // --- điểm: A(2;3)  ·  A = (2,3)  ·  (2; 3; 4) ---
  const md = s.match(/^([A-Za-zÀ-ỹ][\wÀ-ỹ']*)?\s*=?\s*\(([^)]+)\)$/);
  if (md) {
    const so = md[2].split(/[;,]/).map((v) => Number(v.trim().replace(',', '.')));
    if (so.length >= 2 && so.length <= 3 && so.every(Number.isFinite)) {
      return { loai: 'diem', ten: md[1] || null, x: so[0], y: so[1], z: so.length === 3 ? so[2] : 0, ba: so.length === 3 };
    }
  }

  // --- còn lại: đưa về f(x,y,z) = 0 rồi đọc hệ số ---
  const f = thanhHam(s);
  if (!f) return { loi: 'Không đọc được. Chỉ dùng x, y, z, số và các dấu + - * / ( ) ^.' };
  const h = heSo(f);
  if (!h) return { loi: 'Mới hỗ trợ phương trình bậc nhất và đường tròn / mặt cầu.' };

  const coCheo = !gan(h.D) || !gan(h.E) || !gan(h.F);
  const coVuong = !gan(h.A) || !gan(h.B) || !gan(h.C);
  const coZ = !gan(h.C) || !gan(h.I) || !gan(h.E) || !gan(h.F);

  // ---- bậc nhất ----
  if (!coVuong && !coCheo) {
    if (gan(h.G) && gan(h.H) && gan(h.I)) return { loi: 'Phương trình không có x, y hay z nên không vẽ được.' };
    if (khongGian || coZ) return { loai: 'mp', a: h.G, b: h.H, c: h.I, d: h.K };
    return { loai: 'duong', a: h.G, b: h.H, c: h.K };
  }

  // ---- bậc hai trong KHÔNG GIAN: mới nhận mặt cầu ----
  const trongKG = khongGian ? coZ || !gan(h.C) : !gan(h.C);
  if (trongKG) {
    if (coCheo) return { loi: 'Có số hạng xy, yz hoặc zx — mặt bậc hai loại này chưa vẽ được.' };
    const ds3 = [h.A, h.B, h.C];
    const k3 = ds3.find((v) => !gan(v));
    if (ds3.some((v) => !gan(v - k3))) return { loi: 'Hệ số x², y², z² phải bằng nhau mới là mặt cầu. Mặt elipxôit, hypebôlôit chưa hỗ trợ.' };
    const D3 = h.G / k3, E3 = h.H / k3, F3 = h.I / k3, G3 = h.K / k3;
    const cx3 = -D3 / 2, cy3 = -E3 / 2, cz3 = -F3 / 2;
    const r3 = cx3 * cx3 + cy3 * cy3 + cz3 * cz3 - G3;
    if (r3 <= XIU) return { loi: r3 > -XIU ? 'Chỉ là một điểm, bán kính bằng 0.' : 'Vế phải âm — không có mặt cầu nào thoả.' };
    return { loai: 'cau', x: cx3, y: cy3, z: cz3, r: Math.sqrt(r3) };
  }

  // ---- bậc hai TRONG MẶT PHẲNG: đường tròn, elip, parabol, hypebol ----
  const hs = { a: h.A, b: h.D, c: h.B, d: h.G, e: h.H, f: h.K };
  if (loaiConic(hs) !== 'tron') return { loai: 'conic', ...hs, kind: loaiConic(hs) };

  // đường tròn thì viết riêng cho gọn, khỏi qua đường conic tổng quát
  const k = h.A;
  const D = h.G / k, E = h.H / k, F = h.I / k, G = h.K / k;
  const cx = -D / 2, cy = -E / 2;
  const r2 = cx * cx + cy * cy - G;
  if (r2 <= XIU) {
    return { loi: r2 > -XIU ? 'Chỉ là một điểm, bán kính bằng 0.' : 'Vế phải âm — không có hình nào thoả.' };
  }
  return { loai: 'tron', x: cx, y: cy, r: Math.sqrt(r2) };
}

// ============================================================================
// Từ phương trình → dựng hình mới, hoặc sửa một hình đã có.
// ============================================================================

/** Dựng một đối tượng mới từ kết quả đọc được. Trả về { op, args, params } */
export function specTuPT(kq) {
  switch (kq.loai) {
    case 'diem': return kq.ba
      ? { op: 'point3', args: [], params: { x: kq.x, y: kq.y, z: kq.z } }
      : { op: 'point', args: [], params: { x: kq.x, y: kq.y } };
    case 'duong': return { op: 'lineEq', args: [], params: { a: kq.a, b: kq.b, c: kq.c } };
    case 'tron': return { op: 'circleEq', args: [], params: { x: kq.x, y: kq.y, r: kq.r } };
    case 'conic': return { op: 'conicEq', args: [], params: { a: kq.a, b: kq.b, c: kq.c, d: kq.d, e: kq.e, f: kq.f } };
    case 'mp': return { op: 'planeEq', args: [], params: { a: kq.a, b: kq.b, c: kq.c, d: kq.d } };
    case 'cau': return { op: 'sphereEq', args: [], params: { x: kq.x, y: kq.y, z: kq.z, r: kq.r } };
    case 'bpt': return { op: 'region', args: [], params: { bpt: kq.ds } };
    default: return null;
  }
}

/** Chiếu vuông góc một điểm xuống đường thẳng a·x + b·y + c = 0 */
function chieuLen(p, a, b, c) {
  const n2 = a * a + b * b;
  const t = (a * p.x + b * p.y + c) / n2;
  return { x: p.x - a * t, y: p.y - b * t };
}

const dinhDangCha = (doc, o) => o.args.map((id) => { const p = doc.get(id); return p ? p.name : '?'; }).join(', ');

/**
 * Sửa một đối tượng đã có theo phương trình mới.
 *
 * Sửa được thẳng: điểm tự do, và những hình vốn sinh ra TỪ phương trình.
 * Đoạn / đường / tia / vectơ dựng từ hai điểm tự do thì chiếu hai điểm đó
 * xuống đường thẳng mới — cách đổi ít nhất mà vẫn đúng phương trình.
 * Còn lại thì từ chối và nói rõ nên kéo cái gì, vì hình đó là HỆ QUẢ của
 * những hình khác, sửa nó mà không sửa cha thì lần tính lại sau là mất.
 */
export function apDungPT(doc, o, chuoi) {
  if (!o) return { ok: false, msg: 'Không tìm thấy đối tượng.' };
  const kq = docPT(chuoi, !!(o.val && /^(p3|s3|plane|sph|f3|solid)$/.test(o.val.t)));
  if (kq.loi) return { ok: false, msg: kq.loi };
  const P = o.params;

  // --- điểm tự do ---
  if (LA_DIEM[o.op] && kq.loai === 'diem') {
    P.x = kq.x; P.y = kq.y;
    if (o.op === 'point3') P.z = kq.z;
    return { ok: true, msg: `Đã dời ${o.name}.` };
  }

  // --- hình vốn định nghĩa bằng phương trình ---
  if (o.op === 'lineEq' && kq.loai === 'duong') { P.a = kq.a; P.b = kq.b; P.c = kq.c; return { ok: true, msg: `Đã đổi ${o.name}.` }; }
  if (o.op === 'circleEq' && kq.loai === 'tron') { P.x = kq.x; P.y = kq.y; P.r = kq.r; return { ok: true, msg: `Đã đổi ${o.name}.` }; }
  if (o.op === 'conicEq' && kq.loai === 'conic') { P.a = kq.a; P.b = kq.b; P.c = kq.c; P.d = kq.d; P.e = kq.e; P.f = kq.f; return { ok: true, msg: `Đã đổi ${o.name}.` }; }
  // đổi qua lại giữa đường tròn và conic: đổi luôn kiểu dựng cho khỏi vướng
  if (o.op === 'conicEq' && kq.loai === 'tron') { P.a = 1; P.b = 0; P.c = 1; P.d = -2 * kq.x; P.e = -2 * kq.y; P.f = kq.x * kq.x + kq.y * kq.y - kq.r * kq.r; return { ok: true, msg: `Đã đổi ${o.name} thành đường tròn.` }; }
  if (o.op === 'planeEq' && kq.loai === 'mp') { P.a = kq.a; P.b = kq.b; P.c = kq.c; P.d = kq.d; return { ok: true, msg: `Đã đổi ${o.name}.` }; }
  if (o.op === 'sphereEq' && kq.loai === 'cau') { P.x = kq.x; P.y = kq.y; P.z = kq.z; P.r = kq.r; return { ok: true, msg: `Đã đổi ${o.name}.` }; }
  if (o.op === 'region' && kq.loai === 'bpt') { P.bpt = kq.ds; return { ok: true, msg: `Đã đổi ${o.name}.` }; }

  // --- đường thẳng qua hai điểm tự do: chiếu hai điểm xuống đường mới ---
  if (HAI_DAU[o.op] && kq.loai === 'duong') {
    const ds = o.args.map((id) => doc.get(id));
    if (ds.length !== 2 || ds.some((p) => !p || !LA_DIEM[p.op] || p.fixed)) {
      return { ok: false, msg: `${o.name} dựng từ ${dinhDangCha(doc, o)}; hai đầu đó không phải điểm tự do nên không dời được.` };
    }
    const m = ds.map((p) => chieuLen(p.val, kq.a, kq.b, kq.c));
    if (Math.hypot(m[0].x - m[1].x, m[0].y - m[1].y) < 1e-6) {
      return { ok: false, msg: `${ds[0].name} và ${ds[1].name} chiếu xuống trùng nhau. Hãy dời một điểm ra chỗ khác rồi thử lại.` };
    }
    ds.forEach((p, i) => { p.params.x = m[i].x; p.params.y = m[i].y; });
    return { ok: true, msg: `Đã dời ${ds[0].name} và ${ds[1].name} lên đường thẳng mới.` };
  }

  // --- đường tròn tâm O bán kính r ---
  if (o.op === 'circleR' && kq.loai === 'tron') {
    const O = doc.get(o.args[0]);
    if (!O || !LA_DIEM[O.op] || O.fixed) return { ok: false, msg: `Tâm ${O ? O.name : '?'} không phải điểm tự do nên không dời được.` };
    O.params.x = kq.x; O.params.y = kq.y; P.r = kq.r;
    return { ok: true, msg: `Đã dời tâm ${O.name} và đổi bán kính.` };
  }
  if (o.op === 'sphere' && kq.loai === 'cau') {
    const O = doc.get(o.args[0]);
    if (!O || !LA_DIEM[O.op] || O.fixed || o.args[1]) return { ok: false, msg: `${o.name} phụ thuộc hình khác nên không sửa thẳng được.` };
    O.params.x = kq.x; O.params.y = kq.y; O.params.z = kq.z; P.r = kq.r;
    return { ok: true, msg: `Đã dời tâm ${O.name} và đổi bán kính.` };
  }

  const cha = dinhDangCha(doc, o);
  return {
    ok: false,
    msg: cha
      ? `${o.name} là hệ quả của ${cha} nên phương trình của nó không sửa thẳng được. Hãy kéo ${cha}, hoặc gõ phương trình vào ô trên cùng để dựng một hình mới.`
      : `Chưa sửa được phương trình của ${o.name} theo cách này.`,
  };
}
