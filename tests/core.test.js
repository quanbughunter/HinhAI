// Kiểm thử lõi toán học — chạy: node tests/core.test.js
import { GeoDoc } from '../src/core/model.js';
import { runScript } from '../src/core/dsl.js';
import { phuongTrinh, ptDuongThang, ptThamSo3, theTich, dienTich3, lamDep, soGon } from '../src/core/ptr.js';
import { docPT, specTuPT, apDungPT } from '../src/core/docpt.js';
import { chuanHoaConic, diemConic, soLieuConic, loaiConic } from '../src/core/conic.js';
import { timGiao, giaoHai, giaoBienVoiTruc, namTren, TRUC } from '../src/core/giao.js';
import { Cam3, render3 } from '../src/ui/render.js';
import { angleABC, vDist } from '../src/core/vec.js';
import { p3dist } from '../src/core/ops3d.js';
import { docBPT, mienNghiem, thuocMien, dinhHuuHan, docKhoang } from '../src/core/bpt.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  ' + extra : '')); }
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const nearP = (p, x, y, e = 1e-6) => p && near(p.x, x, e) && near(p.y, y, e);

function T(title, fn) { console.log('\n' + title); fn(); }

// ---------------------------------------------------------------- 2D cơ bản
T('Tam giác & các tâm', () => {
  const d = new GeoDoc();
  const r = runScript(d, `
    A = (0,0)
    B = (6,0)
    C = (0,8)
    G = trongtam(A,B,C)
    O = tamngoaitiep(A,B,C)
    H = tructam(A,B,C)
    I = tamnoitiep(A,B,C)
    t = tamgiac(A,B,C)
    S = dientich(t)
  `);
  ok('script không lỗi', r.errors.length === 0, JSON.stringify(r.errors));
  ok('trọng tâm G(2, 8/3)', nearP(d.byName('G').val, 2, 8 / 3));
  ok('tâm ngoại tiếp O(3,4) (tam giác vuông tại A)', nearP(d.byName('O').val, 3, 4));
  ok('trực tâm H trùng A(0,0)', nearP(d.byName('H').val, 0, 0));
  ok('tâm nội tiếp I(2,2) (r=2)', nearP(d.byName('I').val, 2, 2));
  ok('diện tích = 24', near(d.byName('S').val.v, 24));
});

T('Giao điểm đường thẳng / đường tròn', () => {
  const d = new GeoDoc();
  const r = runScript(d, `
    O = (0,0)
    A = (5,0)
    c = duongtron(O,A)
    P = (-9,0)
    Q = (9,3)
    k = duongthang(P,Q)
    X = giao(k,c,0)
    Y = giao(k,c,1)
    u = duongthang(O,A)
    M = giao(u,c,0)
    N = giao(u,c,1)
  `);
  ok('không lỗi', r.errors.length === 0, JSON.stringify(r.errors));
  ok('bán kính = 5', near(d.byName('c').val.r, 5));
  ok('M(-5,0)', nearP(d.byName('M').val, -5, 0));
  ok('N(5,0)', nearP(d.byName('N').val, 5, 0));
  const X = d.byName('X').val, Y = d.byName('Y').val;
  ok('X,Y nằm trên đường tròn', near(Math.hypot(X.x, X.y), 5) && near(Math.hypot(Y.x, Y.y), 5));
});

T('Trung trực, vuông góc, song song, phân giác', () => {
  const d = new GeoDoc();
  runScript(d, `
    A = (0,0)
    B = (4,2)
    m = trungtruc(A,B)
    M = trungdiem(A,B)
    C = (10,0)
    p = vuonggoc(duongthang(A,B), C)
    q = songsong(duongthang(A,B), C)
    F = chan(C, duongthang(A,B))
  `);
  const m = d.byName('m').val;
  ok('trung trực đi qua trung điểm', near((m.p.x - 2) * m.d.y - (m.p.y - 1) * m.d.x, 0));
  ok('trung trực ⟂ AB', near(m.d.x * 4 + m.d.y * 2, 0));
  const p = d.byName('p').val, q = d.byName('q').val;
  ok('đường vuông góc ⟂ AB', near(p.d.x * 4 + p.d.y * 2, 0));
  ok('đường song song // AB', near(q.d.x * 2 - q.d.y * 4, 0));
  const F = d.byName('F').val;
  ok('chân đường vuông góc từ C(10,0) xuống AB = (8,4)', nearP(F, 8, 4));
});

T('Đo góc & khoảng cách', () => {
  const d = new GeoDoc();
  runScript(d, `
    A = (1,0)
    B = (0,0)
    C = (0,1)
    g = goc(A,B,C)
    k = khoangcach(A,C)
  `);
  ok('góc ABC = 90°', near(d.byName('g').val.v, 90, 1e-9));
  ok('AC = √2', near(d.byName('k').val.v, Math.SQRT2));
});

T('Phép biến hình', () => {
  const d = new GeoDoc();
  runScript(d, `
    A = (2,3)
    O = (0,0)
    B = doixung(A,O)
    x = duongthang(O, diem(1,0))
    C = doixung(A,x)
    D = quay(A,O,90)
    E = vitu(A,O,2)
  `);
  ok('đối xứng tâm O: B(-2,-3)', nearP(d.byName('B').val, -2, -3));
  ok('đối xứng trục Ox: C(2,-3)', nearP(d.byName('C').val, 2, -3));
  ok('quay 90° quanh O: D(-3,2)', nearP(d.byName('D').val, -3, 2));
  ok('vị tự k=2: E(4,6)', nearP(d.byName('E').val, 4, 6));
});

T('Tiếp tuyến', () => {
  const d = new GeoDoc();
  runScript(d, `
    O = (0,0)
    c = duongtron(O, 3)
    P = (5,0)
    t1 = tieptuyen(c,P,0)
    t2 = tieptuyen(c,P,1)
  `);
  const t1 = d.byName('t1').val;
  const dist = Math.abs((O => 0)() + Math.abs(t1.d.y * (0 - t1.p.x) - t1.d.x * (0 - t1.p.y)));
  ok('tiếp tuyến cách tâm đúng bằng R', near(dist, 3, 1e-6), 'd=' + dist);
});

T('Ràng buộc động: kéo điểm thì hình cập nhật', () => {
  const d = new GeoDoc();
  runScript(d, `A=(0,0)\nB=(4,0)\nM=trungdiem(A,B)`);
  ok('M = (2,0)', nearP(d.byName('M').val, 2, 0));
  d.moveTo(d.byName('B'), { x: 10, y: 6 });
  ok('kéo B → M = (5,3)', nearP(d.byName('M').val, 5, 3));
});

T('Xoá theo dây chuyền', () => {
  const d = new GeoDoc();
  runScript(d, `A=(0,0)\nB=(4,0)\nM=trungdiem(A,B)\nc=duongtron(M,A)`);
  const n0 = d.order.length;
  d.remove(d.byName('B').id);
  ok('xoá B kéo theo M và c', d.order.length === n0 - 3, 'còn ' + d.order.length);
});

T('Lưu / mở lại', () => {
  const d = new GeoDoc();
  runScript(d, `A=(0,0)\nB=(6,0)\nC=(1,5)\nH=tructam(A,B,C)`);
  const j = JSON.parse(JSON.stringify(d.toJSON()));
  const d2 = GeoDoc.fromJSON(j);
  ok('trực tâm giữ nguyên sau khi mở lại',
    nearP(d2.byName('H').val, d.byName('H').val.x, d.byName('H').val.y));
});

// ---------------------------------------------------------------- 3D
T('Hình không gian & thiết diện', () => {
  const d = new GeoDoc();
  const r = runScript(d, `
    A = (0,0,0)
    B = (4,0,0)
    C = (4,4,0)
    D = (0,4,0)
    S = (2,2,6)
    K = chop(A,B,C,D,S)
    M = trungdiem3(S,A)
    N = trungdiem3(S,B)
    P = trungdiem3(S,C)
    td = thietdien(K, M, N, P)
  `);
  ok('script 3D không lỗi', r.errors.length === 0, JSON.stringify(r.errors));
  const K = d.byName('K').val;
  ok('chóp tứ giác: 5 đỉnh, 5 mặt, 8 cạnh', K.v.length === 5 && K.faces.length === 5 && K.edges.length === 8,
    `${K.v.length}/${K.faces.length}/${K.edges.length}`);
  const td = d.byName('td').val;
  ok('thiết diện qua 3 trung điểm là tứ giác', td && td.pts.length === 4, td ? 'n=' + td.pts.length : 'null');
  if (td) {
    const zs = td.pts.map((p) => p.z);
    ok('thiết diện nằm ở độ cao z = 3', zs.every((z) => near(z, 3, 1e-6)), JSON.stringify(zs));
  }
});

T('Hình hộp: thiết diện tam giác', () => {
  const d = new GeoDoc();
  runScript(d, `
    A = (0,0,0)
    H = hop(A, 4, 4, 4)
    P = (4,0,0)
    Q = (0,4,0)
    R = (0,0,4)
    s = thietdien(H, P, Q, R)
  `);
  const s = d.byName('s').val;
  ok('thiết diện là tam giác (3 đỉnh)', s && s.pts.length === 3, s ? 'n=' + s.pts.length : 'null');
  const H = d.byName('H').val;
  ok('hình hộp: 8 đỉnh, 6 mặt, 12 cạnh', H.v.length === 8 && H.faces.length === 6 && H.edges.length === 12);
});

T('Lăng trụ & giao đường thẳng với mặt phẳng', () => {
  const d = new GeoDoc();
  const r = runScript(d, `
    A = (0,0,0)
    B = (5,0,0)
    C = (2,4,0)
    L = langtru(A,B,C,6)
    A1 = (0,0,6)
    mp1 = mp(A,B,C)
    X = (1,1,-3)
    Y = (1,1,5)
    I = giao3(X,Y,mp1)
  `);
  ok('không lỗi', r.errors.length === 0, JSON.stringify(r.errors));
  const L = d.byName('L').val;
  ok('lăng trụ tam giác: 6 đỉnh, 5 mặt, 9 cạnh', L.v.length === 6 && L.faces.length === 5 && L.edges.length === 9,
    `${L.v.length}/${L.faces.length}/${L.edges.length}`);
  const I = d.byName('I').val;
  ok('giao XY với mp(ABC) tại z=0', I && near(I.z, 0) && near(I.x, 1) && near(I.y, 1), JSON.stringify(I));
});

// ---------------------------------------------------------------- Miền nghiệm
T('Đọc bất phương trình bậc nhất hai ẩn', () => {
  const h = docBPT('2x + 3y <= 6');
  ok('2x+3y≤6 → giữ 2x+3y−6 ≤ 0', near(h.a, 2) && near(h.b, 3) && near(h.c, -6) && !h.chat);
  // y > 2x−1  ⟺  2x − y − 1 < 0
  const g = docBPT('y > 2x - 1');
  ok('y>2x−1 → chuẩn hoá thành 2x−y−1 ≤ 0, biên ngặt', near(g.a, 2) && near(g.b, -1) && near(g.c, -1) && g.chat,
    JSON.stringify(g));
  const mg = mienNghiem(['y > 2x - 1']);
  ok('gốc toạ độ thoả y>2x−1', thuocMien(mg, 0, 0));
  ok('(3,0) không thoả y>2x−1', !thuocMien(mg, 3, 0));
  ok('hệ số phân số 3/2 đọc được', near(docBPT('3/2 x + y <= 5').a, 1.5));
  ok('dấu ≤ ≥ kiểu toán học đọc được', near(docBPT('x ≥ 2').a, -1));
  let loi = false;
  try { docBPT('x + y'); } catch (_) { loi = true; }
  ok('thiếu dấu bất đẳng thức thì báo lỗi', loi);
});

T('Miền nghiệm của hệ', () => {
  const m = mienNghiem(['x>=0', 'y>=0', 'x+y<=4']);
  const d = dinhHuuHan(m);
  ok('tam giác OAB có đúng 3 đỉnh', d.length === 3, 'có ' + d.length);
  const co = (x, y) => d.some((p) => near(p.x, x, 1e-6) && near(p.y, y, 1e-6));
  ok('ba đỉnh là (0,0), (4,0), (0,4)', co(0, 0) && co(4, 0) && co(0, 4));
  ok('(1,1) nằm trong miền', thuocMien(m, 1, 1));
  ok('(5,0) nằm ngoài miền', !thuocMien(m, 5, 0));
  ok('(0,0) trên biên vẫn tính là thuộc', thuocMien(m, 0, 0));

  const rong = mienNghiem(['x>=2', 'x<=1']);
  ok('hệ vô nghiệm cho miền rỗng', rong.rong === true);

  const nua = mienNghiem(['2x+3y<=6']);
  ok('một bất phương trình cho nửa mặt phẳng', !nua.rong && nua.pts.length >= 3);
  ok('gốc toạ độ thuộc 2x+3y≤6', thuocMien(nua, 0, 0));
  ok('(3,3) không thuộc 2x+3y≤6', !thuocMien(nua, 3, 3));
});

T('Khoảng trên trục số', () => {
  const a = docKhoang('[-1;3]');
  ok('[-1;3] là đoạn đóng hai đầu', a.a === -1 && a.b === 3 && a.dongA && a.dongB);
  const b = docKhoang('(2;5]');
  ok('(2;5] mở trái đóng phải', b.a === 2 && b.b === 5 && !b.dongA && b.dongB);
});

T('Miền nghiệm qua DSL và lưu/mở lại', () => {
  const d = new GeoDoc();
  const r = runScript(d, 'M = mien 2x+3y<=6\nH = hemien x>=0, y>=0, x+y<=4\nA = khoang [-1;3]');
  ok('ba lệnh chạy không lỗi', r.errors.length === 0, JSON.stringify(r.errors));
  ok('M là miền nghiệm', d.byName('M').val.t === 'mien');
  ok('H là tam giác 3 đỉnh', dinhHuuHan(d.byName('H').val).length === 3);
  ok('A là đoạn [-1;3]', d.byName('A').val.a === -1 && d.byName('A').val.b === 3);
  const d2 = GeoDoc.fromJSON(JSON.parse(JSON.stringify(d.toJSON())));
  ok('mở lại vẫn đúng miền', dinhHuuHan(d2.byName('H').val).length === 3);
  ok('mở lại vẫn đúng đoạn', d2.byName('A').val.b === 3);
});

T('Phương trình đường thẳng và đường tròn phẳng', () => {
  ok('qua gốc, hệ số 1', ptDuongThang({ x: 0, y: 0 }, { x: 1, y: 1 }).tq === 'x - y = 0');
  ok('dạng y = mx + n', ptDuongThang({ x: 0, y: 0 }, { x: 1, y: 1 }).hs === 'y = x');
  ok('hệ số nguyên hoá', ptDuongThang({ x: -2, y: 0 }, { x: 2, y: 3 }).tq === '3x - 2y + 6 = 0');
  ok('đường thẳng đứng', ptDuongThang({ x: 2, y: 5 }, { x: 0, y: 1 }).hs === 'x = 2');
  ok('hệ số đầu luôn dương', lamDep([-4, 6, -2]).join(',') === '2,-3,1', lamDep([-4, 6, -2]).join(','));
  ok('bỏ đuôi 0 thừa', soGon(3.10000) === '3.1' && soGon(-0.0000001) === '0');

  const d = new GeoDoc();
  runScript(d, 'A = (2,-3)\nO = (2,-1)\nc = duongtron(O,3)\nB = (5,1)\ns = doan(A,B)');
  ok('điểm viết đúng', phuongTrinh(d.byName('A')).pt === 'A(2; -3)');
  const c = phuongTrinh(d.byName('c'));
  ok('đường tròn dạng chuẩn', c.pt === '(x - 2)² + (y + 1)² = 9', c.pt);
  ok('kèm tâm và bán kính', /Tâm \(2; -1\)/.test(c.phu), c.phu);
  ok('đoạn thẳng có độ dài', /s = 5$/.test(phuongTrinh(d.byName('s')).phu), phuongTrinh(d.byName('s')).phu);
  runScript(d, 'u = vecto(A,B)');
  const u = phuongTrinh(d.byName('u'));
  ok('vectơ viết theo toạ độ chứ không phải phương trình', u.loai === 'Vectơ' && u.pt === 'u = (3; 4)', u.loai + ' | ' + u.pt);
  ok('vectơ kèm độ dài', u.phu === '|u| = 5', u.phu);
});

T('Phương trình trong không gian, thể tích và diện tích', () => {
  ok('tham số bỏ hạng tử 0', ptThamSo3({ x: 1, y: 2, z: 3 }, { x: 2, y: -1, z: 0 }) === 'x = 1 + 2t\ny = 2 - t\nz = 3');
  const hop = {
    v: [{x:0,y:0,z:0},{x:2,y:0,z:0},{x:2,y:3,z:0},{x:0,y:3,z:0},{x:0,y:0,z:4},{x:2,y:0,z:4},{x:2,y:3,z:4},{x:0,y:3,z:4}],
    faces: [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]],
  };
  ok('thể tích hộp 2x3x4 = 24', Math.abs(theTich(hop) - 24) < 1e-9, theTich(hop));
  ok('diện tích tam giác trong không gian', Math.abs(dienTich3([{x:0,y:0,z:0},{x:3,y:0,z:0},{x:0,y:4,z:0}]) - 6) < 1e-9);

  const d = new GeoDoc();
  runScript(d, 'A=(0,0,0)\nB=(6,0,0)\nC=(6,5,0)\nD=(0,5,0)\nS=(3,2.5,7)\nK=chop(A,B,C,D,S)\nmp1=mp(A,B,S)');
  const k = phuongTrinh(d.byName('K'));
  ok('khối chóp có thể tích', /V = 70$/.test(k.phu), k.phu);
  const m = phuongTrinh(d.byName('mp1'));
  ok('mặt phẳng dạng ax+by+cz+d=0', /= 0$/.test(m.pt) && m.pt.indexOf('y') >= 0, m.pt);
  ok('điểm không gian viết đủ ba toạ độ', phuongTrinh(d.byName('S')).pt === 'S(3; 2.5; 7)');
});

T('Đọc phương trình người gõ', () => {
  const d = (s, kg) => docPT(s, kg);
  ok('tổng quát', JSON.stringify(d('2x+3y=6')) === JSON.stringify({ loai: 'duong', a: 2, b: 3, c: -6 }));
  ok('dạng y = mx + n', d('y = 2x - 1').a === -2 && d('y = 2x - 1').b === 1);
  ok('đường thẳng đứng', d('x = 3').a === 1 && d('x = 3').c === -3);
  ok('nhân ngầm có ngoặc', JSON.stringify(d('3(x-1) + 2(y+2) = 0')) === JSON.stringify({ loai: 'duong', a: 3, b: 2, c: 1 }));
  const c1 = d('(x-2)^2 + (y+1)^2 = 9'), c2 = d('x^2+y^2-4x+2y-4=0');
  ok('đường tròn chính tắc', c1.loai === 'tron' && c1.x === 2 && c1.y === -1 && Math.abs(c1.r - 3) < 1e-9);
  ok('đường tròn khai triển ra cùng kết quả', Math.abs(c2.x - c1.x) < 1e-9 && Math.abs(c2.r - c1.r) < 1e-9);
  ok('ký hiệu ² cũng đọc được', d('(x−2)² + (y+1)² = 9').loai === 'tron');
  ok('điểm', d('A(2;3)').ten === 'A' && d('A = (2,3)').x === 2);
  ok('mặt phẳng', JSON.stringify(d('2x - y + 3z - 5 = 0')) === JSON.stringify({ loai: 'mp', a: 2, b: -1, c: 3, d: -5 }));
  ok('mặt cầu', d('(x-1)^2+(y-2)^2+(z-3)^2=16').r === 4);
  ok('bất phương trình chuyển sang miền nghiệm', d('x>=0, y>=0, x+y<=4').ds.length === 3);
  ok('nhận ra elip', d('x^2/4 + y^2/9 = 1').kind === 'elip');
  ok('nhận ra parabol', d('y = x^2').kind === 'parabol');
  ok('nhận ra hypebol', d('x^2/9 - y^2/4 = 1').kind === 'hypebol');
  ok('xy = 1 cũng là hypebol (bị xoay 45°)', d('xy = 1').kind === 'hypebol');
  ok('từ chối bậc ba', !!d('x^3 + y = 1').loi);
  ok('không gian: từ chối elipxôit', !!d('x^2+2y^2+3z^2=1', true).loi);
  ok('từ chối bán kính âm', !!d('x^2+y^2=-1').loi);
  ok('từ chối chữ lạ', !!d('2a + 3b = 6').loi);
});

T('Gõ phương trình thì hình đổi theo', () => {
  const d = new GeoDoc();
  const them = (s) => d.add(specTuPT(docPT(s)));

  const L = them('2x+3y=6');
  ok('dựng được đường thẳng từ phương trình', phuongTrinh(L).pt === '2x + 3y - 6 = 0', phuongTrinh(L).pt);
  ok('sửa phương trình thì đổi', apDungPT(d, L, 'x - y + 1 = 0').ok);
  d.recompute();
  ok('đường thẳng đúng phương trình mới', phuongTrinh(L).pt === 'x - y + 1 = 0', phuongTrinh(L).pt);

  const C = them('(x-2)^2+(y+1)^2=9');
  apDungPT(d, C, 'x^2+y^2=25'); d.recompute();
  ok('đường tròn đổi theo', phuongTrinh(C).pt === 'x² + y² = 25', phuongTrinh(C).pt);

  // đoạn dựng từ hai điểm tự do: chiếu hai đầu xuống đường mới
  runScript(d, 'A=(0,0)\nB=(4,0)\ns=doan(A,B)');
  const r = apDungPT(d, d.byName('s'), 'y = x');
  d.recompute();
  ok('chiếu được hai đầu lên đường thẳng mới', r.ok && phuongTrinh(d.byName('s')).pt === 'x - y = 0', phuongTrinh(d.byName('s')).pt);
  ok('hai đầu vẫn nằm trên đường', Math.abs(d.byName('B').val.x - d.byName('B').val.y) < 1e-9);

  // hình là hệ quả thì từ chối, kèm lời giải thích
  runScript(d, 'C=(1,4)\nha=duongcao(A,B,C)');
  const t = apDungPT(d, d.byName('ha'), 'y = 3');
  ok('từ chối sửa hình dẫn xuất', !t.ok && /hệ quả/.test(t.msg), t.msg);
  ok('nói rõ nên kéo cái gì', /A, B, C/.test(t.msg), t.msg);

  // qua DSL
  const e = new GeoDoc();
  const rs = runScript(e, 'd1 = pt 2x+3y=6\nc1 = pt x^2+y^2=25\nP = pt A(1;2)');
  ok('lệnh pt chạy trong DSL', rs.errors.length === 0, JSON.stringify(rs.errors));
  ok('đặt được tên qua DSL', !!e.byName('d1') && !!e.byName('c1'));
  ok('lệnh pt báo lỗi tử tế', /bậc|hỗ trợ|đọc được/i.test(JSON.stringify(runScript(e, 'pt x^3 + y = 1').errors)), JSON.stringify(runScript(e, 'pt x^3+y=1').errors));

  // lưu rồi mở lại vẫn còn
  const e2 = GeoDoc.fromJSON(JSON.parse(JSON.stringify(e.toJSON())));
  ok('mở lại vẫn đúng phương trình', phuongTrinh(e2.byName('d1')).pt === '2x + 3y - 6 = 0');
});

T('Elip, parabol, hypebol', () => {
  const F = (hs, p) => hs.a * p.x * p.x + hs.b * p.x * p.y + hs.c * p.y * p.y + hs.d * p.x + hs.e * p.y + hs.f;
  const thu = (ten, hs, kind) => {
    const K = chuanHoaConic(hs);
    ok(ten + ': nhận đúng loại', K.kind === kind, K.kind || K.loi);
    const ds = diemConic(K, 30).flat();
    const sai = Math.max(...ds.map((p) => Math.abs(F(hs, p))));
    ok(ten + ': mọi điểm vẽ ra đều thoả phương trình', sai < 1e-9, 'sai số ' + sai);
  };
  thu('elip', { a: 1 / 9, b: 0, c: 1 / 4, d: 0, e: 0, f: -1 }, 'elip');
  thu('elip bị xoay 45°', { a: 5, b: 4, c: 5, d: 0, e: 0, f: -9 }, 'elip');
  thu('elip lệch tâm', { a: 1, b: 0, c: 4, d: -4, e: 16, f: 4 }, 'elip');
  thu('parabol nằm ngang', { a: 0, b: 0, c: 1, d: -4, e: 0, f: 0 }, 'parabol');
  thu('parabol thẳng đứng', { a: 1, b: 0, c: 0, d: 0, e: -1, f: 0 }, 'parabol');
  thu('hypebol', { a: 1 / 9, b: 0, c: -1 / 4, d: 0, e: 0, f: -1 }, 'hypebol');
  thu('hypebol xoay (xy = 1)', { a: 0, b: 1, c: 0, d: 0, e: 0, f: -1 }, 'hypebol');

  const E = chuanHoaConic({ a: 1 / 9, b: 0, c: 1 / 4, d: 0, e: 0, f: -1 });
  const sE = soLieuConic(E);
  ok('elip: a = 3, b = 2', E.A === 3 && E.B === 2);
  ok('elip: c = √5', Math.abs(sE.c - Math.sqrt(5)) < 1e-9, sE.c);
  ok('elip: tâm sai c/a', Math.abs(sE.e - Math.sqrt(5) / 3) < 1e-9);
  const H = chuanHoaConic({ a: 1 / 9, b: 0, c: -1 / 4, d: 0, e: 0, f: -1 });
  ok('hypebol: c = √13', Math.abs(soLieuConic(H).c - Math.sqrt(13)) < 1e-9);
  ok('hypebol: tiệm cận b/a', Math.abs(soLieuConic(H).hsTiemCan - 2 / 3) < 1e-9);
  ok('hypebol vẽ đủ hai nhánh', diemConic(H, 20).length === 2);
  const P = chuanHoaConic({ a: 0, b: 0, c: 1, d: -4, e: 0, f: 0 });
  ok('parabol y² = 4x: p = 1, tiêu điểm (1;0)', Math.abs(soLieuConic(P).p - 1) < 1e-9 && Math.abs(soLieuConic(P).F[0].x - 1) < 1e-9);

  ok('biệt thức tách tròn khỏi elip', loaiConic({ a: 1, b: 0, c: 1, d: 0, e: 0, f: -4 }) === 'tron');
  ok('suy biến thì báo lỗi chứ không vẽ bừa', !!chuanHoaConic({ a: 1, b: 0, c: 1, d: 0, e: 0, f: 1 }).loi);

  // qua DSL và bảng phương trình
  const d = new GeoDoc();
  const r = runScript(d, 'e = elip(3,2)\nh = hypebol(3,2)\np = parabol(2)');
  ok('DSL dựng được cả ba', r.errors.length === 0 && d.list().length === 3, JSON.stringify(r.errors));
  const pe = phuongTrinh(d.byName('e'));
  ok('elip: phương trình hệ số nguyên', pe.pt === '4x² + 9y² - 36 = 0', pe.pt);
  ok('elip: kèm dạng chính tắc', pe.phu.split('\n')[0] === 'x²/9 + y²/4 = 1', pe.phu.split('\n')[0]);
  ok('parabol: dạng chính tắc đúng dấu', phuongTrinh(d.byName('p')).phu.split('\n')[0] === 'y² = 4x', phuongTrinh(d.byName('p')).phu.split('\n')[0]);
  ok('hypebol: dạng chính tắc có dấu trừ', /−/.test(phuongTrinh(d.byName('h')).phu.split('\n')[0]));

  // sửa phương trình conic
  ok('sửa được conic', apDungPT(d, d.byName('e'), 'x^2/16 + y^2/4 = 1').ok);
  d.recompute();
  ok('elip đổi trục lớn thành 4', Math.abs(d.byName('e').val.A - 4) < 1e-9, d.byName('e').val.A);

  // lưu / mở lại
  const d2 = GeoDoc.fromJSON(JSON.parse(JSON.stringify(d.toJSON())));
  ok('mở lại vẫn còn hypebol', d2.byName('h').val.kind === 'hypebol');
});

T('Tìm giao điểm, kể cả giao với hai trục', () => {
  const d = new GeoDoc();
  runScript(d, 'A=(-3,0)\nB=(3,4)\ns=doan(A,B)\nO=(0,0)\nc=duongtron(O,3)\nk = pt y = 2');
  const ds = timGiao(d, 40);
  const ten = (x) => (typeof x === 'string' ? x : x.name);
  const co = (a, b, x, y) => ds.some((g) => ((ten(g.a) === a && ten(g.b) === b) || (ten(g.a) === b && ten(g.b) === a))
    && Math.abs(g.p.x - x) < 1e-6 && Math.abs(g.p.y - y) < 1e-6);
  ok('đoạn cắt trục hoành', co('s', 'Ox', -3, 0));
  ok('đoạn cắt trục tung', co('s', 'Oy', 0, 2));
  ok('đường tròn cắt Ox ở hai chỗ', ds.filter((g) => ten(g.a) === 'c' && g.b === 'Ox').length === 2);
  ok('đường thẳng cắt đường tròn', co('c', 'k', Math.sqrt(5), 2) && co('c', 'k', -Math.sqrt(5), 2));

  // đoạn thẳng: giao nằm ngoài hai mút thì KHÔNG tính
  const e = new GeoDoc();
  runScript(e, 'A=(0,0)\nB=(1,0)\ns=doan(A,B)\nC=(5,-1)\nD=(5,1)\nt=doan(C,D)');
  ok('bỏ giao nằm ngoài đoạn', timGiao(e, 40, false).length === 0);
  ok('namTren nhận đúng trong/ngoài đoạn',
    namTren(e.byName('s').val, { x: 0.5, y: 0 }) && !namTren(e.byName('s').val, { x: 5, y: 0 }));

  // conic cắt đường thẳng
  const f = new GeoDoc();
  runScript(f, 'e1 = elip(3,2)\nk = pt y = 1');
  const gc = timGiao(f, 40, false);
  ok('elip cắt đường thẳng ở hai chỗ', gc.length === 2, String(gc.length));
  ok('toạ độ giao elip đúng', gc.every((g) => Math.abs(g.p.x * g.p.x / 9 + 1 / 4 - 1) < 1e-3), JSON.stringify(gc.map((g) => g.p)));
});

T('Dựng điểm tại giao điểm, kéo hình thì điểm đi theo', () => {
  const d = new GeoDoc();
  const r = runScript(d, 'd1 = pt 2x + 3y = 12\nP = giaoOx(d1)\nQ = giaoOy(d1)');
  ok('lệnh giao với trục chạy được', r.errors.length === 0, JSON.stringify(r.errors));
  ok('cắt trục hoành tại (6; 0)', d.byName('P').val.x === 6 && d.byName('P').val.y === 0);
  ok('cắt trục tung tại (0; 4)', d.byName('Q').val.x === 0 && d.byName('Q').val.y === 4);

  // đổi đường thẳng → giao điểm phải tự cập nhật
  d.byName('d1').params.c = -6;
  d.recompute();
  ok('đổi phương trình thì giao điểm đi theo', d.byName('P').val.x === 3 && d.byName('Q').val.y === 2);

  // giao hai đường qua phép dựng intersect, có cả conic
  const e = new GeoDoc();
  runScript(e, 'e1 = elip(3,2)\nk = pt y = 1\nR = giao(e1, k, 1)');
  const R = e.byName('R');
  ok('giao điểm với conic dựng được', !!R.val && Math.abs(R.val.y - 1) < 1e-3, JSON.stringify(R.val));

  // lưu / mở lại
  const d2 = GeoDoc.fromJSON(JSON.parse(JSON.stringify(d.toJSON())));
  ok('mở lại vẫn còn giao điểm với trục', d2.byName('P').val.x === 3);
});

T('Miền nghiệm cho biết biên cắt trục ở đâu', () => {
  const d = new GeoDoc();
  runScript(d, 'M = hemien x>=0, y>=0, 2x+3y<=12');
  const gt = giaoBienVoiTruc(d.byName('M').val);
  const co = (x, y) => gt.some((g) => Math.abs(g.p.x - x) < 1e-9 && Math.abs(g.p.y - y) < 1e-9);
  ok('biên 2x+3y=12 cắt Ox tại (6; 0)', co(6, 0));
  ok('biên 2x+3y=12 cắt Oy tại (0; 4)', co(0, 4));
  const e = phuongTrinh(d.byName('M'));
  ok('bảng phương trình liệt kê giao với trục', /Biên cắt trục tại/.test(e.phu) && /\(6; 0\)/.test(e.phu), e.phu);
});

T('Lưới không gian bám khung nhìn, trục bám hình vẽ', () => {
  const cam = () => { const c = new Cam3(); c.w = 900; c.h = 620; c.scale = 34; return c; };
  const ve = (lenh) => {
    const d = new GeoDoc();
    if (lenh) runScript(d, lenh);
    return render3(d, cam(), { grid: true, axes: true, selected: new Set(), nhan: 'du' });
  };
  const demNet = (svg) => ((svg.match(/class="grid"/) ? svg : '').match(/M-?[\d.]+ -?[\d.]+L/g) || []).length;
  // đầu mút trục: lấy từ ba đoạn thẳng có màu riêng của Ox, Oy, Oz
  const dauTruc = (svg, mau) => {
    const m = svg.match(new RegExp('<line x1="[\\d.-]+" y1="[\\d.-]+" x2="([\\d.-]+)" y2="([\\d.-]+)" stroke="' + mau + '"'));
    return m ? { x: +m[1], y: +m[2] } : null;
  };
  const XANH = '#22468f', DO = '#c0271c';

  const trong = ve('');
  ok('bảng trống vẫn có lưới rộng', demNet(trong) >= 60, String(demNet(trong)));

  // trục KHÔNG dài theo lưới: bảng trống thì đúng bằng mức tối thiểu
  const c = cam();
  const mongDoi = c.s({ t: 'p3', x: 8, y: 0, z: 0 });
  const thuc = dauTruc(trong, DO);
  ok('bảng trống: trục Ox dài đúng 8', thuc && Math.abs(thuc.x - mongDoi.x) < 0.6 && Math.abs(thuc.y - mongDoi.y) < 0.6,
    JSON.stringify({ thuc, mongDoi }));

  // hình vẽ xa hơn thì trục tự vươn theo
  const xa = ve('A=(0,0,0)\nB=(25,0,0)\ns=doan3(A,B)');
  const xaOx = dauTruc(xa, DO);
  ok('hình xa thì trục Ox dài ra', xaOx.x > thuc.x + 100, JSON.stringify({ xaOx, thuc }));
  ok('nhưng trục Oz vẫn ngắn', Math.abs(dauTruc(xa, XANH).y - dauTruc(trong, XANH).y) < 0.6);

  const cao = ve('A=(0,0,0)\nB=(0,0,20)\ns=doan3(A,B)');
  ok('hình cao thì trục Oz dài ra', dauTruc(cao, XANH).y < dauTruc(trong, XANH).y - 100);
  ok('còn trục Ox giữ nguyên', Math.abs(dauTruc(cao, DO).x - thuc.x) < 0.6);

  // lưới không đổi theo hình, chỉ theo khung nhìn
  ok('lưới không phình theo hình vẽ', demNet(xa) === demNet(trong), demNet(xa) + ' vs ' + demNet(trong));

  // thu nhỏ: bước chia giãn ra, số nét vẫn trong tầm kiểm soát
  const cNho = cam(); cNho.scale = 6;
  const d0 = new GeoDoc();
  const nho = render3(d0, cNho, { grid: true, axes: true, selected: new Set(), nhan: 'du' });
  ok('thu nhỏ vẫn còn lưới', demNet(nho) >= 40, String(demNet(nho)));
  ok('số nét lưới có chặn trên', demNet(nho) <= 300, String(demNet(nho)));
});

console.log(`\n===== ${pass} đạt / ${fail} lỗi =====`);
process.exit(fail ? 1 : 0);
