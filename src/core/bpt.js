// ============================================================================
// bpt.js — Bất phương trình bậc nhất hai ẩn và MIỀN NGHIỆM.
//
// Đọc chuỗi kiểu "2x + 3y <= 6" thành nửa mặt phẳng, rồi cắt dần một hình vuông
// rất lớn bằng từng nửa mặt phẳng để ra miền nghiệm (thuật toán Sutherland–Hodgman).
// Miền nghiệm của hệ bất phương trình bậc nhất luôn là một đa giác lồi.
// ============================================================================

const HOP = 400;   // nửa cạnh hình vuông khởi đầu, đủ lớn để coi như vô hạn

/** "3/4" -> 0.75 ; "2" -> 2 ; "" -> 1 ; "-" -> -1 */
function doHeSo(s) {
  const t = String(s).trim().replace(/\*$/, '');
  if (t === '' || t === '+') return 1;
  if (t === '-') return -1;
  if (t.includes('/')) {
    const [p, q] = t.split('/');
    const v = parseFloat(p) / parseFloat(q);
    if (!Number.isFinite(v)) throw new Error('Hệ số không hợp lệ: ' + s);
    return v;
  }
  const v = parseFloat(t);
  if (!Number.isFinite(v)) throw new Error('Hệ số không hợp lệ: ' + s);
  return v;
}

/** Đọc một vế: "2x+3y-6" -> {a:2, b:3, c:-6} nghĩa là 2x + 3y − 6 */
export function docVe(bieuThuc) {
  let a = 0, b = 0, c = 0;
  const s = String(bieuThuc).replace(/\s+/g, '');
  if (!s) return { a, b, c };
  // tách thành các hạng tử kèm dấu
  const hangTu = s.match(/[+-]?[^+-]+/g) || [];
  for (const t of hangTu) {
    if (!t) continue;
    if (t.includes('x') && t.includes('y')) throw new Error('Mỗi hạng tử chỉ chứa x hoặc y: ' + t);
    if (t.includes('x')) a += doHeSo(t.replace('x', ''));
    else if (t.includes('y')) b += doHeSo(t.replace('y', ''));
    else c += doHeSo(t);
  }
  return { a, b, c };
}

/**
 * Đọc bất phương trình -> nửa mặt phẳng chuẩn hoá {a, b, c, chat}
 * với ý nghĩa: giữ phần   a·x + b·y + c ≤ 0   (chat = true nghĩa là dấu < ngặt).
 */
export function docBPT(chuoi) {
  let s = String(chuoi).replace(/\s+/g, '')
    .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/[−–—]/g, '-')
    .replace(/,/g, '.');
  const m = s.match(/(<=|>=|<|>|=)/);
  if (!m) throw new Error('Thiếu dấu bất đẳng thức trong "' + chuoi + '"');
  const dau = m[1];
  const i = s.indexOf(dau);
  const trai = docVe(s.slice(0, i));
  const phai = docVe(s.slice(i + dau.length));

  // đưa hết về vế trái:  (trai - phai)  dau  0
  let a = trai.a - phai.a, b = trai.b - phai.b, c = trai.c - phai.c;
  if (Math.abs(a) < 1e-12 && Math.abs(b) < 1e-12) {
    throw new Error('"' + chuoi + '" không phải bất phương trình bậc nhất hai ẩn');
  }
  let chat = dau === '<' || dau === '>';
  // đổi mọi thứ về dạng  ≤ 0
  if (dau === '>' || dau === '>=') { a = -a; b = -b; c = -c; }
  if (dau === '=') chat = false;
  return { a, b, c, chat, gocVan: String(chuoi).trim() };
}

/** Cắt đa giác, giữ phần a·x + b·y + c ≤ 0 */
function catNua(poly, h) {
  const f = (p) => h.a * p.x + h.b * p.y + h.c;
  const ra = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const P = poly[i], Q = poly[(i + 1) % n];
    const fp = f(P), fq = f(Q);
    if (fp <= 1e-9) ra.push(P);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) {
      const t = fp / (fp - fq);
      ra.push({ x: P.x + (Q.x - P.x) * t, y: P.y + (Q.y - P.y) * t });
    }
  }
  return ra;
}

/**
 * Miền nghiệm của một hệ bất phương trình.
 * @param {string[]} dsChuoi  ví dụ ['x>=0','y>=0','x+y<=4']
 * @returns {{t:'mien', pts:Array, hp:Array, rong:boolean}}
 */
export function mienNghiem(dsChuoi) {
  const hp = dsChuoi.map(docBPT);
  let poly = [
    { x: -HOP, y: -HOP }, { x: HOP, y: -HOP }, { x: HOP, y: HOP }, { x: -HOP, y: HOP },
  ];
  for (const h of hp) {
    poly = catNua(poly, h);
    if (poly.length < 3) return { t: 'mien', pts: [], hp, rong: true };
  }
  return { t: 'mien', pts: poly, hp, rong: false };
}

/** Điểm (x,y) có thuộc miền không — dùng để kiểm thử */
export function thuocMien(mien, x, y) {
  return mien.hp.every((h) => h.a * x + h.b * y + h.c <= 1e-9);
}

/** Các đỉnh của miền nằm trong khung nhìn (bỏ các đỉnh ở "vô cực") */
export function dinhHuuHan(mien, gioiHan = HOP * 0.98) {
  return mien.pts.filter((p) => Math.abs(p.x) < gioiHan && Math.abs(p.y) < gioiHan);
}

// ---------------------------------------------------------------- Trục số
/** Đọc "[-1,3]" hoặc "(-2;5]" -> {a, b, dongA, dongB} */
export function docKhoang(chuoi) {
  const s = String(chuoi).replace(/\s+/g, '').replace(/[−–—]/g, '-');
  const m = s.match(/^([[\](])(-?[\d./]+|-?vc|-?inf)[;,](-?[\d./]+|vc|inf|\+vc)([[\])])$/i);
  if (!m) throw new Error('Khoảng phải viết dạng [-1;3] hoặc (2;5]');
  const so = (t) => {
    if (/vc|inf/i.test(t)) return t.startsWith('-') ? -1e6 : 1e6;
    return t.includes('/') ? doHeSo(t) : parseFloat(t);
  };
  return { t: 'khoang', a: so(m[2]), b: so(m[3]), dongA: m[1] === '[', dongB: m[4] === ']' };
}
