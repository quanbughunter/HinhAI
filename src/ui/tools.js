// ============================================================================
// tools.js — Định nghĩa thanh công cụ. Mỗi công cụ = "cần chọn gì" + "tạo ra gì".
// ============================================================================

const I = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
const DOT = (x, y, r = 2.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;

export const ICONS = {
  move: I('<path d="M5 3l5.5 15 2-6.2 6.2-2z"/>'),
  point: I(DOT(12, 12, 3.6)),
  pointOn: I('<path d="M3 17L21 7"/>' + DOT(12, 12, 3.2)),
  inter: I('<path d="M4 5l16 14M20 5L4 19"/>' + DOT(12, 12, 3)),
  mid: I('<path d="M4 12h16"/>' + DOT(4, 12) + DOT(20, 12) + DOT(12, 12, 3)),
  seg: I('<path d="M5 18L19 6"/>' + DOT(5, 18) + DOT(19, 6)),
  ray: I('<path d="M5 18L21 5"/>' + DOT(5, 18)),
  line: I('<path d="M3 19L21 5"/>' + DOT(8, 15.4) + DOT(16, 9.4)),
  vector: I('<path d="M5 18L18 7M18 7h-4.5M18 7v4.5"/>' + DOT(5, 18)),
  poly: I('<path d="M12 4L20 18H4z"/>'),
  circ: I('<circle cx="12" cy="12" r="7.5"/>' + DOT(12, 12) + DOT(19.5, 12)),
  circ3: I('<circle cx="12" cy="12" r="7.5"/>' + DOT(12, 4.5) + DOT(18.5, 15.7) + DOT(5.5, 15.7)),
  perp: I('<path d="M12 3v18M4 21h16M12 18h3v3"/>'),
  para: I('<path d="M3 9h18M3 16h18"/>'),
  bisec: I('<path d="M4 20L20 8M4 20L20 16"/><path d="M4 20l14-6" stroke-dasharray="2.5 2.5"/>'),
  perpbi: I('<path d="M5 17L19 7"/><path d="M8.6 8.4l6.8 10.2" stroke-dasharray="2.5 2.5"/>' + DOT(5, 17) + DOT(19, 7)),
  tang: I('<circle cx="10" cy="14" r="6"/><path d="M3 5h18"/>'),
  refl: I('<path d="M12 2v20" stroke-dasharray="3 3"/><path d="M9 7L4 12l5 5zM15 7l5 5-5 5"/>'),
  dist: I('<path d="M4 8v8M20 8v8M4 12h16"/>'),
  ang: I('<path d="M5 19h15M5 19L18 6"/><path d="M12.5 19a8 8 0 00-2.3-5.6" stroke-dasharray="2 2"/>'),
  text: I('<path d="M5 6h14M12 6v13"/>'),
  del: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  pt3: I('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/>' + DOT(12, 12, 2.6)),
  seg3: I('<path d="M5 17l14-9"/>' + DOT(5, 17) + DOT(19, 8)),
  face3: I('<path d="M3 14l7-8 11 3-7 9z"/>'),
  pyr: I('<path d="M12 3L3 19h18zM12 3l-3 16M12 3l6 16" stroke-dasharray="0"/>'),
  prism: I('<path d="M6 20V9l6-5 6 5v11zM6 9l6 5 6-5M12 14v6"/>'),
  box: I('<path d="M4 8l8-4 8 4v9l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v9"/>'),
  sph: I('<circle cx="12" cy="12" r="8"/><ellipse cx="12" cy="12" rx="8" ry="3.2" stroke-dasharray="3 2.5"/>'),
  sect: I('<path d="M6 19V8l6-4 6 4v11z"/><path d="M4 14l16-4" stroke="currentColor" stroke-dasharray="0"/>'),
  rot: I('<path d="M20 12a8 8 0 11-2.4-5.7M20 4v4h-4"/>'),
  mien: I('<path d="M3 17L21 5"/><path d="M5 19l3-3M9 19l5-5M13 19l6-6M17 19l4-4" stroke-width="1.1"/>'),
  khoang: I('<path d="M3 12h18M7 8v8M17 8v8"/>' + DOT(7, 12, 2.6) + DOT(17, 12, 2.6)),
};

// pick kinds: 'point' | 'curve' (đường/đường tròn) | 'any' | 'solid' | 'p3'
export const TOOLS_2D = [
  { g: 'Chọn', t: [
    { id: 'move', name: 'Chọn / Kéo', icon: ICONS.move, n: 0, hint: 'Kéo đỉnh → hình biến đổi · kéo CHỮ → chỉ dời chữ · kéo cạnh → dời cả hình · bấm đúp để đổi tên.' },
    { id: 'del', name: 'Xoá', icon: ICONS.del, n: 0, hint: 'Bấm vào đối tượng để xoá (xoá cả hình phụ thuộc nó).' },
  ]},
  { g: 'Điểm', t: [
    { id: 'point', name: 'Điểm', icon: ICONS.point, n: 1, kinds: ['point'], hint: 'Bấm lên bảng để tạo điểm. Bấm lên đường/đường tròn để tạo điểm thuộc hình đó.', make: () => null },
    { id: 'inter', name: 'Giao điểm', icon: ICONS.inter, n: 2, kinds: ['curve', 'curve'], hint: 'Chọn 2 đường (thẳng / tròn) để lấy giao điểm.',
      make: (p, app) => { app.addAll(p[0], p[1]); return null; } },
    { id: 'mid', name: 'Trung điểm', icon: ICONS.mid, n: 2, kinds: ['point', 'point'], hint: 'Chọn 2 điểm.', op: 'midpoint' },
  ]},
  { g: 'Đường', t: [
    { id: 'seg', name: 'Đoạn thẳng', icon: ICONS.seg, n: 2, kinds: ['point', 'point'], op: 'segment', hint: 'Chọn 2 điểm.' },
    { id: 'line', name: 'Đường thẳng', icon: ICONS.line, n: 2, kinds: ['point', 'point'], op: 'line', hint: 'Chọn 2 điểm.' },
    { id: 'ray', name: 'Tia', icon: ICONS.ray, n: 2, kinds: ['point', 'point'], op: 'ray', hint: 'Chọn gốc tia rồi điểm thứ hai.' },
    { id: 'vector', name: 'Vectơ', icon: ICONS.vector, n: 2, kinds: ['point', 'point'], op: 'vector', hint: 'Chọn điểm đầu rồi điểm cuối.' },
    { id: 'poly', name: 'Đa giác', icon: ICONS.poly, n: -1, kinds: ['point'], op: 'polygon', hint: 'Chọn lần lượt các đỉnh, bấm lại đỉnh đầu (hoặc Enter) để đóng hình.' },
  ]},
  { g: 'Đường tròn', t: [
    { id: 'circ', name: 'Đường tròn (tâm, điểm)', icon: ICONS.circ, n: 2, kinds: ['point', 'point'], op: 'circleCP', hint: 'Chọn tâm rồi một điểm trên đường tròn.' },
    { id: 'circ3', name: 'Đường tròn qua 3 điểm', icon: ICONS.circ3, n: 3, kinds: ['point', 'point', 'point'], op: 'circle3', hint: 'Chọn 3 điểm.' },
    { id: 'tang', name: 'Tiếp tuyến', icon: ICONS.tang, n: 2, kinds: ['curve', 'point'], hint: 'Chọn đường tròn rồi điểm ngoài đường tròn.',
      make: (p, app) => { app.add('tangent', [p[0], p[1]], { i: 0 }); app.add('tangent', [p[0], p[1]], { i: 1 }); return null; } },
  ]},
  { g: 'Quan hệ', t: [
    { id: 'perp', name: 'Đường vuông góc', icon: ICONS.perp, n: 2, kinds: ['curve', 'point'], op: 'perpLine', hint: 'Chọn đường thẳng rồi điểm đi qua.' },
    { id: 'para', name: 'Đường song song', icon: ICONS.para, n: 2, kinds: ['curve', 'point'], op: 'paraLine', hint: 'Chọn đường thẳng rồi điểm đi qua.' },
    { id: 'perpbi', name: 'Trung trực', icon: ICONS.perpbi, n: 2, kinds: ['point', 'point'], op: 'perpBisector', hint: 'Chọn 2 điểm.' },
    { id: 'bisec', name: 'Phân giác', icon: ICONS.bisec, n: 3, kinds: ['point', 'point', 'point'], op: 'bisector', hint: 'Chọn 3 điểm, điểm GIỮA là đỉnh góc.' },
    { id: 'refl', name: 'Đối xứng', icon: ICONS.refl, n: 2, kinds: ['point', 'any'], op: 'reflectPt', hint: 'Chọn điểm cần lấy đối xứng, rồi chọn trục (đường thẳng) hoặc tâm (điểm).' },
  ]},
  { g: 'Miền nghiệm', t: [
    { id: 'mien', name: 'Miền nghiệm BPT', icon: ICONS.mien, n: 0,
      hint: 'Bấm để nhập bất phương trình, ví dụ 2x+3y<=6. Nhiều bất phương trình thì ngăn bằng dấu phẩy.' },
    { id: 'khoang', name: 'Khoảng trên trục số', icon: ICONS.khoang, n: 0,
      hint: 'Bấm rồi nhập khoảng, ví dụ [-1;3] hoặc (2;5].' },
  ]},
  { g: 'Đo', t: [
    { id: 'dist', name: 'Khoảng cách', icon: ICONS.dist, n: 2, kinds: ['point', 'point'], op: 'distance', hint: 'Chọn 2 điểm.' },
    { id: 'ang', name: 'Số đo góc', icon: ICONS.ang, n: 3, kinds: ['point', 'point', 'point'], op: 'angleM', hint: 'Chọn 3 điểm, điểm GIỮA là đỉnh góc.' },
    { id: 'text', name: 'Ghi chú', icon: ICONS.text, n: 0, hint: 'Bấm lên bảng rồi nhập nội dung.' },
  ]},
];

export const TOOLS_3D = [
  { g: 'Chọn', t: [
    { id: 'move', name: 'Chọn / Xoay', icon: ICONS.move, n: 0, hint: 'Kéo nền → xoay góc nhìn · kéo đỉnh → dời đỉnh · kéo CHỮ → chỉ dời chữ khỏi chỗ bị che · bấm đúp để đổi tên.' },
    { id: 'rot', name: 'Xoay hình', icon: ICONS.rot, n: 0, hint: 'Kéo để xoay góc nhìn.' },
    { id: 'del', name: 'Xoá', icon: ICONS.del, n: 0, hint: 'Bấm vào đối tượng để xoá.' },
  ]},
  { g: 'Điểm & cạnh', t: [
    { id: 'pt3', name: 'Điểm', icon: ICONS.pt3, n: 1, kinds: ['p3'], hint: 'Bấm lên mặt phẳng đáy để tạo điểm (z = 0).', make: () => null },
    { id: 'mid3', name: 'Trung điểm', icon: ICONS.mid, n: 2, kinds: ['p3', 'p3'], op: 'mid3', hint: 'Chọn 2 điểm.' },
    { id: 'seg3', name: 'Đoạn thẳng', icon: ICONS.seg3, n: 2, kinds: ['p3', 'p3'], op: 'segment3', hint: 'Chọn 2 điểm.' },
    { id: 'face3', name: 'Mặt phẳng qua 3 điểm', icon: ICONS.face3, n: -1, kinds: ['p3'], op: 'face', hint: 'Chọn các điểm rồi bấm Enter.' },
    { id: 'dist3', name: 'Độ dài', icon: ICONS.dist, n: 2, kinds: ['p3', 'p3'], op: 'dist3', hint: 'Chọn 2 điểm.' },
  ]},
  { g: 'Khối', t: [
    { id: 'pyr', name: 'Hình chóp', icon: ICONS.pyr, n: -1, kinds: ['p3'], op: 'pyramid', hint: 'Chọn các đỉnh ĐÁY, rồi chọn ĐỈNH CHÓP sau cùng, bấm Enter.' },
    { id: 'prism', name: 'Lăng trụ đứng', icon: ICONS.prism, n: -1, kinds: ['p3'], op: 'prism', params: { h: 6 }, hint: 'Chọn các đỉnh đáy rồi bấm Enter (cao 6).' },
    { id: 'box', name: 'Hình hộp', icon: ICONS.box, n: 1, kinds: ['p3'], op: 'box', params: { a: 6, b: 4, c: 4 }, hint: 'Chọn một đỉnh làm gốc.' },
    { id: 'sph', name: 'Mặt cầu', icon: ICONS.sph, n: 2, kinds: ['p3', 'p3'], op: 'sphere', hint: 'Chọn tâm rồi một điểm trên mặt cầu.' },
  ]},
  { g: 'Thiết diện', t: [
    { id: 'sect', name: 'Thiết diện', icon: ICONS.sect, n: 4, kinds: ['solid', 'p3', 'p3', 'p3'], op: 'section', hint: 'Chọn KHỐI rồi 3 điểm xác định mặt phẳng cắt.' },
  ]},
];

export const QUICK_2D = [
  ['Tam giác', 'A=(-4,-2)\nB=(5,-2)\nC=(0,4)\nt=tamgiac(A,B,C)'],
  ['Tam giác vuông', 'A=(-3,-2)\nB=(5,-2)\nC=(-3,4)\nt=tamgiac(A,B,C)\ng=goc(B,A,C)'],
  ['Tam giác đều', 'A=(-3,-2)\nB=(3,-2)\nC=(0,3.196)\nt=tamgiac(A,B,C)'],
  ['Đường tròn', 'O=(0,0)\nA=(4,0)\nc=duongtron(O,A)'],
  ['Hình vuông', 'A=(-3,-3)\nB=(3,-3)\nC=(3,3)\nD=(-3,3)\nt=tugiac(A,B,C,D)'],
  ['Miền nghiệm', 'mien 2x+3y<=6'],
  ['Hệ BPT', 'mien x>=0, y>=0, x+y<=4, 2x+y<=6'],
  ['3 đường cao', 'A=(-4,-2)\nB=(5,-2)\nC=(1,4)\nt=tamgiac(A,B,C)\nha=duongcao(A,B,C)\nhb=duongcao(B,C,A)\nhc=duongcao(C,A,B)\nH=tructam(A,B,C)'],
];
export const QUICK_3D = [
  ['Chóp tứ giác', 'A=(0,0,0)\nB=(6,0,0)\nC=(6,5,0)\nD=(0,5,0)\nS=(3,2.5,7)\nK=chop(A,B,C,D,S)'],
  ['Chóp tam giác', 'A=(0,0,0)\nB=(6,0,0)\nC=(2,5,0)\nS=(2.7,1.7,6)\nK=chop(A,B,C,S)'],
  ['Hình hộp', 'A=(0,0,0)\nK=hop(A,6,4,4)'],
  ['Lăng trụ', 'A=(0,0,0)\nB=(6,0,0)\nC=(2,5,0)\nK=langtru(A,B,C,6)'],
  ['Mặt cầu', 'O=(0,0,0)\nS=matcau(O,4)'],
  ['Thiết diện mẫu', 'A=(0,0,0)\nB=(6,0,0)\nC=(6,5,0)\nD=(0,5,0)\nS=(3,2.5,7)\nK=chop(A,B,C,D,S)\nM=trungdiem3(S,A)\nN=trungdiem3(S,B)\nP=trungdiem3(S,C)\ntd=thietdien(K,M,N,P)'],
];

export const CHIPS = [
  'Vẽ miền nghiệm của hệ x≥0, y≥0, x+y≤4, 2x+y≤6',
  'Vẽ tam giác ABC vuông tại A, kẻ đường cao AH',
  'Vẽ đường tròn tâm O bán kính 5 và một dây AB',
  'Tam giác ABC nội tiếp đường tròn tâm O, kẻ ba đường cao',
  'Hình chóp S.ABCD đáy là hình vuông, cắt bởi mặt phẳng qua trung điểm SA, SB, SC',
];
