// Kiểm thử lõi toán học — chạy: node tests/core.test.js
import { GeoDoc } from '../src/core/model.js';
import { runScript } from '../src/core/dsl.js';
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

console.log(`\n===== ${pass} đạt / ${fail} lỗi =====`);
process.exit(fail ? 1 : 0);
