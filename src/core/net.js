// ============================================================================
// net.js — Các kiểu nét vẽ.
//
// Để riêng một tệp vì cả ba nơi đều cần dùng chung một bảng: hộp thoại sửa đối
// tượng, lệnh `net d cham` trong thanh lệnh, và trợ lý AI.
//
// Giá trị là chuỗi stroke-dasharray của SVG. Nét "chấm" dựa vào đầu nét bo tròn
// (stroke-linecap="round") để đoạn dài 0 hiện ra thành một chấm tròn.
// ============================================================================

export const KIEU_NET = [
  { id: 'lien', ten: 'Liền', dash: null },
  { id: 'dut', ten: 'Đứt', dash: '7 5' },
  { id: 'cham', ten: 'Chấm', dash: '0.01 6' },
  { id: 'dutcham', ten: 'Đứt chấm', dash: '11 4 0.01 4' },
  { id: 'dutdai', ten: 'Đứt dài', dash: '16 7' },
  { id: 'dutngan', ten: 'Đứt ngắn', dash: '3 3' },
];

/** Tên kiểu (hoặc alias tiếng Anh) → chuỗi dasharray */
export function dashCuaKieu(ten) {
  const k = String(ten || '').toLowerCase().trim();
  const alias = {
    solid: 'lien', none: 'lien', dash: 'dut', dashed: 'dut',
    dot: 'cham', dotted: 'cham', chamcham: 'cham',
    dashdot: 'dutcham', chamgach: 'dutcham', gachcham: 'dutcham',
    longdash: 'dutdai', dai: 'dutdai', ngan: 'dutngan', short: 'dutngan',
  };
  const id = alias[k] || k;
  const m = KIEU_NET.find((x) => x.id === id);
  return m ? m.dash : null;
}

/** Ngược lại: nhìn dasharray đoán ra đang là kiểu nào (để tô sáng nút đang chọn) */
export function kieuCuaDash(dash) {
  if (!dash) return 'lien';
  const m = KIEU_NET.find((x) => x.dash === dash);
  return m ? m.id : 'dut';       // kiểu lạ (từ bản cũ) thì coi như nét đứt
}
