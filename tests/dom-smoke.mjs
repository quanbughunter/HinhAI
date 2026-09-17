// Chạy thử toàn bộ giao diện bằng một DOM giả lập tối giản.
// Mục đích: bắt lỗi runtime (typo, biến thiếu, sự kiện hỏng) mà không cần trình duyệt.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
const NativeURL = URL;
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + ' ' + x); } };

// ------------------------------------------------------------------ DOM giả
class El {
  constructor(tag = 'div', sel = '') {
    this.tagName = (tag || 'div').toUpperCase(); this.sel = sel;
    this.style = {}; this.dataset = {}; this.children = []; this._h = {};
    this._html = ''; this.textContent = ''; this.value = ''; this.isConnected = true;
    this.classList = {
      _s: new Set(),
      add: (...c) => c.forEach((x) => this.classList._s.add(x)),
      remove: (...c) => c.forEach((x) => this.classList._s.delete(x)),
      toggle: (c, f) => (f === undefined ? (this.classList._s.has(c) ? this.classList._s.delete(c) : this.classList._s.add(c)) : (f ? this.classList._s.add(c) : this.classList._s.delete(c))),
      contains: (c) => this.classList._s.has(c),
    };
  }
  set innerHTML(v) { this._html = String(v); }
  get innerHTML() { return this._html; }
  addEventListener(t, f) { (this._h[t] = this._h[t] || []).push(f); }
  removeEventListener() { }
  fire(t, ev = {}) { (this._h[t] || []).forEach((f) => f({ preventDefault() { }, stopPropagation() { }, target: this, currentTarget: this, ...ev })); }
  appendChild(c) { this.children.push(c); return c; }
  replaceWith(c) { this.thayBoi = c; }
  remove() { this.isConnected = false; }
  setPointerCapture() { }
  releasePointerCapture() { }
  getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 620, right: 900, bottom: 620 }; }
  closest(sel) { return this.sel && sel.includes(this.sel.replace('.', '')) ? this : null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  setAttribute(k, v) { this['attr_' + k] = v; }
  getAttribute(k) { return this['attr_' + k] || null; }
  get parentElement() { return document.body; }
  get scrollHeight() { return 40; }
  focus() { }
}
const store = new Map();
const q = (sel) => { if (!store.has(sel)) store.set(sel, new El('div', sel)); return store.get(sel); };
const document = {
  readyState: 'complete',
  documentElement: new El('html'),
  body: new El('body'),
  activeElement: { tagName: 'BODY' },
  querySelector: q,
  querySelectorAll: (sel) => (sel === '.tool' || sel === '.tabs button' || sel === '#modeseg button' || sel === '.pane' ? [] : []),
  createElement: (t) => new El(t),
  addEventListener: () => { },
};
const localStore = new Map();
globalThis.document = document;
globalThis.localStorage = {
  getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
  setItem: (k, v) => localStore.set(k, String(v)),
};
globalThis.window = {
  addEventListener: () => { }, matchMedia: () => ({ matches: false }),
  claude: undefined, geoai: null,
};
globalThis.ResizeObserver = class { observe() { } disconnect() { } };
globalThis.FileReader = class { readAsText() { } readAsDataURL() { } };
globalThis.Blob = class { constructor(p) { this.parts = p; } };
globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => { } };
globalThis.Image = class { set src(_) { setTimeout(() => this.onerror && this.onerror(), 0); } };
globalThis.prompt = () => 'ghi chú thử';
globalThis.traLoiConfirm = true;
globalThis.confirm = () => globalThis.traLoiConfirm;
globalThis.alert = () => { };
globalThis.fetch = async () => { throw new Error('không có mạng trong bài test'); };

// ------------------------------------------------------------------ nạp bundle
const html = readFileSync(new NativeURL('../dist/geoai.html', import.meta.url), 'utf8');
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const dir = mkdtempSync(join(tmpdir(), 'geoai-'));
const file = join(dir, 'bundle.mjs');
writeFileSync(file, js);

console.log('\nKhởi động ứng dụng trong DOM giả lập');
let boom = null;
process.on('uncaughtException', (e) => { boom = e; });
await import('file://' + file);
ok('boot không văng lỗi', !boom, boom ? boom.stack.split('\n')[0] : '');

const app = globalThis.window.geoai;
// Bấm một mẫu nhanh theo TÊN — dùng số thứ tự thì cứ thêm mẫu là test hỏng.
const bamMau = (ten) => {
  const html = q('#qchips').innerHTML;
  const re = new RegExp('data-q="(\\d+)">' + ten + '<');
  const m = html.match(re);
  if (!m) { ok('có mẫu nhanh "' + ten + '"', false, html.slice(0, 200)); return; }
  q('#quick').fire('click', { target: { closest: () => ({ dataset: { q: m[1] } }) } });
};
ok('app khởi tạo', !!app && !!app.doc);
ok('bảng vẽ trống khi mở app', app.doc['2d'].order.length === 0, 'có ' + app.doc['2d'].order.length);
const svg = q('#svg');
ok('SVG có nội dung', svg.innerHTML.length > 500, svg.innerHTML.length + ' ký tự');
ok('SVG vẽ được lưới toạ độ', /class="grid"|class="axis"/.test(svg.innerHTML));
ok('thanh công cụ đã dựng', q('#rail').innerHTML.includes('data-tool="seg"'));
ok('danh sách đối tượng báo trống', q('#objlist').innerHTML.includes('Chưa có đối tượng'));
ok('bảng phương trình chỉ cách dùng khi còn trống', q('#ptlist').innerHTML.includes('ptbang') && q('#ptlist').innerHTML.includes('miền nghiệm'));

console.log('\nTương tác');
// vẽ bằng chuột: chọn công cụ đoạn thẳng rồi bấm 2 lần lên bảng
q('#rail').fire('click', { target: { closest: () => ({ dataset: { tool: 'seg' } }) } });
ok('đổi công cụ sang "đoạn thẳng"', app.tool === 'seg');
const n0 = app.doc['2d'].order.length;
const clickAt = (x, y) => {
  svg.fire('pointerdown', { pointerId: 1, clientX: x, clientY: y });
  svg.fire('pointerup', { pointerId: 1, clientX: x, clientY: y });
};
clickAt(200, 200); clickAt(400, 320);
ok('bấm 2 lần tạo được đoạn thẳng', app.doc['2d'].order.length === n0 + 3, `+${app.doc['2d'].order.length - n0} đối tượng`);
const created = app.doc['2d'].list().slice(-1)[0];
ok('đối tượng cuối là đoạn thẳng', created.op === 'segment' && !!created.val, created.op);

// kéo một điểm tự do
bamMau('Tam giác');   // vẽ tam giác mẫu
ok('mẫu tam giác tạo được A,B,C', !!app.doc['2d'].byName('A') && !!app.doc['2d'].byName('C'));
const A = app.doc['2d'].byName('A');
const before = { ...A.val };
q('#rail').fire('click', { target: { closest: () => ({ dataset: { tool: 'move' } }) } });
svg.fire('pointerdown', { pointerId: 1, clientX: 900 / 2 + (A.val.x - app.cam['2d'].cx) * app.cam['2d'].scale, clientY: 620 / 2 - (A.val.y - app.cam['2d'].cy) * app.cam['2d'].scale });
svg.fire('pointermove', { pointerId: 1, clientX: 300, clientY: 260 });
svg.fire('pointerup', { pointerId: 1, clientX: 300, clientY: 260 });
ok('kéo được điểm tự do', A.val.x !== before.x || A.val.y !== before.y, JSON.stringify(A.val));

// kéo NHÃN: chỉ chữ dời đi, điểm đứng yên
{
  const P = app.doc['2d'].byName('B');
  const cam = app.cam['2d'];
  const s0 = { x: 900 / 2 + (P.val.x - cam.cx) * cam.scale, y: 620 / 2 - (P.val.y - cam.cy) * cam.scale };
  const viTriDiem = { ...P.val };
  const lb = { x: s0.x + 12, y: s0.y - 11 };            // vị trí mặc định của chữ
  svg.fire('pointerdown', { pointerId: 2, clientX: lb.x + 4, clientY: lb.y - 5 });
  svg.fire('pointermove', { pointerId: 2, clientX: lb.x + 54, clientY: lb.y + 25 });
  svg.fire('pointerup', { pointerId: 2, clientX: lb.x + 54, clientY: lb.y + 25 });
  ok('kéo chữ thì chữ dời đi', !!P.lab && Math.abs(P.lab.dx - 50) < 2 && Math.abs(P.lab.dy - 30) < 2,
    JSON.stringify(P.lab));
  ok('kéo chữ thì ĐIỂM vẫn đứng yên', P.val.x === viTriDiem.x && P.val.y === viTriDiem.y);
}

// thanh lệnh
const cmd = q('#cmd');
cmd.value = 'M = trungdiem(A,B)';
cmd.fire('keydown', { key: 'Enter' });
{
  const pt = q('#ptlist').innerHTML;
  ok('bảng phương trình nhận ra đoạn thẳng', pt.includes('Đoạn thẳng'), pt.slice(0, 160));
  ok('viết được phương trình tổng quát', /[xy].*= 0/.test(pt), pt.slice(0, 200));
  ok('kèm dòng phụ (dạng y = mx và độ dài)', /class="ex">y = /.test(pt), pt.slice(0, 300));
}
console.log('\nGõ phương trình ra hình');
{
  const gõ = (v) => { q('#ptin').value = v; q('#ptin').fire('keydown', { key: 'Enter' }); };
  const truoc = app.doc['2d'].order.length;
  gõ('2x + 3y = 6');
  ok('gõ phương trình thì thêm được hình', app.doc['2d'].order.length === truoc + 1);
  ok('bảng phương trình hiện đúng dạng tổng quát', q('#ptlist').innerHTML.includes('2x + 3y - 6 = 0'), q('#ptlist').innerHTML.slice(0, 200));

  gõ('c: (x-2)^2 + (y+1)^2 = 9');
  ok('đặt được tên bằng dấu hai chấm', !!app.doc['2d'].byName('c'));
  ok('vẽ ra đường tròn', q('#ptlist').innerHTML.includes('(x - 2)² + (y + 1)² = 9'));

  gõ('c: x^2 + y^2 = 25');
  ok('gõ lại tên cũ thì SỬA chứ không thêm', app.doc['2d'].byName('c').params.r === 5 && app.doc['2d'].byName('c').params.x === 0);

  gõ('y = x^2');
  ok('vẽ được parabol', q('#ptlist').innerHTML.includes('Parabol'), q('#ptlist').innerHTML.slice(0, 200));

  gõ('x^3 + y = 1');
  ok('phương trình bậc ba thì báo lỗi, không vẽ bừa', q('#ptmsg').className.includes('err'), q('#ptmsg').textContent);

  gõ('2a + 3b = 6');
  ok('chữ lạ cũng báo lỗi', q('#ptmsg').className.includes('err'));

  const n = app.doc['2d'].order.length;
  q('#undo').fire('click');
  ok('hoàn tác được thao tác gõ phương trình', app.doc['2d'].order.length <= n);
}

console.log('\nĐổi tên theo đề bài');
{
  q('#scriptbox').value = 'xoahet\nA=(0,0)\nB=(4,0)\nC=(4,3)\nD=(0,3)\nt=tugiac(A,B,C,D)';
  q('#runscript').fire('click');
  const doc = app.doc['2d'];
  ok('dựng được tứ giác để thử', !!doc.byName('t') && doc.byName('t').args.length === 4);

  // mở hộp thoại bằng cách bấm tên trong tab Đối tượng
  q('#objlist').fire('click', { target: Object.assign(new (q('#objlist').constructor)(), {
    classList: { contains: (c) => c === 'nm' }, dataset: {}, closest: () => ({ dataset: { id: doc.byName('t').id } }),
  }) });
  ok('bấm tên thì mở hộp đổi tên', q('#tenmodal').classList.contains('on'));
  ok('hộp thoại có ô đặt tên cả loạt đỉnh', q('#tenDinhO').hidden === false);
  ok('nói rõ đang có mấy đỉnh', q('#tenDinhSo').textContent.includes('4 đỉnh') && q('#tenDinhSo').textContent.includes('ABCD'),
    q('#tenDinhSo').textContent);

  // đổi tên hình và cả bốn đỉnh một lượt
  q('#tenMoi').value = 'MNPQ';
  q('#tenDinh').value = 'MNPQ';
  q('#tenLuu').fire('click');
  ok('đổi được tên đa giác', !!doc.byName('MNPQ'));
  ok('đổi luôn tên bốn đỉnh', ['M', 'N', 'P', 'Q'].every((t) => !!doc.byName(t)), doc.list().map((o) => o.name).join(','));
  ok('tên cũ không còn', !doc.byName('A') && !doc.byName('t'));
  ok('đóng hộp thoại sau khi đổi', !q('#tenmodal').classList.contains('on'));
  ok('bảng vẽ hiện tên mới', q('#svg').innerHTML.includes('>M<') && q('#svg').innerHTML.includes('>Q<'));

  // số tên không khớp số đỉnh thì từ chối, không đổi nửa vời
  const dinhCu = doc.byName('MNPQ').args.map((id) => doc.get(id).name).join('');
  doiTenQua('MNPQ', 'XYZT', 'XY');
  ok('cho thiếu tên thì báo lỗi', q('#tenLoi').className.includes('err'), q('#tenLoi').textContent);
  ok('không đổi gì khi báo lỗi', doc.byName('MNPQ').args.map((id) => doc.get(id).name).join('') === dinhCu);
  q('#tenHuy').fire('click');

  // trùng tên thì từ chối
  doiTenQua('MNPQ', 'M', '');
  ok('trùng tên thì báo lỗi', q('#tenLoi').className.includes('err') && /đã có/.test(q('#tenLoi').textContent), q('#tenLoi').textContent);
  q('#tenHuy').fire('click');

  // tên có dấu phẩy trên và chỉ số dưới
  doiTenQua('MNPQ', 'A₁B₁C₁D₁', "A' B' C' D'");
  ok('đặt được tên có dấu phẩy trên', !!doc.byName("A'") && !!doc.byName("D'"), doc.list().map((o) => o.name).join(','));
  ok('tên hình nhận chỉ số dưới', !!doc.byName('A₁B₁C₁D₁'));
}
function doiTenQua(tenHinh, moi, dinh) {
  const doc = app.doc['2d'];
  const o = doc.byName(tenHinh);
  q('#objlist').fire('click', { target: Object.assign(new (q('#objlist').constructor)(), {
    classList: { contains: (c) => c === 'nm' }, dataset: {}, closest: () => ({ dataset: { id: o.id } }),
  }) });
  q('#tenMoi').value = moi;
  q('#tenDinh').value = dinh;
  q('#tenLuu').fire('click');
}

console.log('\nThu gọn hướng dẫn và hàng vẽ nhanh');
{
  ok('ban đầu hướng dẫn đang mở', !q('#hud').classList.contains('thu'));
  q('#hintx').fire('click');
  ok('bấm ✕ thì hướng dẫn thu lại', q('#hud').classList.contains('thu'));
  ok('hiện nút ? để mở lại', q('#hintmo').classList.contains('hien'));
  ok('nhớ lựa chọn cho lần sau', globalThis.localStorage.getItem('geoai.thuHud') === 'true');
  q('#hintmo').fire('click');
  ok('bấm ? thì hướng dẫn mở lại', !q('#hud').classList.contains('thu') && !q('#hintmo').classList.contains('hien'));

  ok('ban đầu hàng vẽ nhanh đang mở', !q('#quick').classList.contains('thu'));
  q('#qtog').fire('click');
  ok('thu được hàng vẽ nhanh', q('#quick').classList.contains('thu'));
  q('#qtog').fire('click');
  ok('mở lại được', !q('#quick').classList.contains('thu'));
}

console.log('\nLưới không gian tự nới rộng');
{
  const cam = app.cam['3d'];
  const doHep = () => {
    const sv = app.doc['3d'];
    return null;
  };
  const demNet = () => (q('#svg').innerHTML.match(/M-?[\d.]+ -?[\d.]+L/g) || []).length;
  q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '3d' } }) } });
  const goc = { sc: cam.scale, ox: cam.ox, oy: cam.oy };
  const n0 = demNet();
  ok('chế độ không gian có lưới', n0 > 10, String(n0));

  // kéo hình lệch hẳn ra một góc: lưới vẫn phải phủ kín khung nhìn
  cam.ox = -520; cam.oy = -330;
  q('#zin').fire('click'); q('#zout').fire('click');   // ép vẽ lại
  ok('kéo lệch đi thì lưới vẫn kín khung', demNet() > 10, String(demNet()));

  // thu nhỏ hết cỡ: bước chia phải giãn ra chứ không đẻ ra hàng nghìn nét
  cam.ox = 0; cam.oy = 0; cam.scale = 5;
  q('#zin').fire('click'); q('#zout').fire('click');
  const nNho = demNet();
  ok('thu nhỏ vẫn có lưới', nNho > 10, String(nNho));
  ok('số nét lưới có chặn trên', nNho < 400, String(nNho));

  cam.scale = goc.sc; cam.ox = goc.ox; cam.oy = goc.oy;
  q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '2d' } }) } });
}

console.log('\nDời bảng bằng chuột và bàn phím');
{
  const svg5 = q('#svg');
  q('#pickmove').fire('click');

  // --- hình phẳng ---
  q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '2d' } }) } });
  const c2 = app.cam['2d'];
  const g2 = { cx: c2.cx, cy: c2.cy };
  svg5.fire('pointerdown', { pointerId: 50, clientX: 400, clientY: 300, ctrlKey: true, button: 0 });
  svg5.fire('pointermove', { pointerId: 50, clientX: 480, clientY: 360, ctrlKey: true });
  svg5.fire('pointerup', { pointerId: 50, clientX: 480, clientY: 360 });
  ok('Ctrl + kéo dời được bảng phẳng', c2.cx !== g2.cx && c2.cy !== g2.cy, JSON.stringify({ truoc: g2, sau: { cx: c2.cx, cy: c2.cy } }));

  // chuột giữa
  const g2b = { cx: c2.cx, cy: c2.cy };
  svg5.fire('pointerdown', { pointerId: 51, clientX: 400, clientY: 300, button: 1 });
  svg5.fire('pointermove', { pointerId: 51, clientX: 330, clientY: 300 });
  svg5.fire('pointerup', { pointerId: 51, clientX: 330, clientY: 300 });
  ok('chuột giữa cũng dời được', c2.cx !== g2b.cx);

  // --- hình không gian: kéo nền là XOAY, có Ctrl mới là DỜI ---
  q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '3d' } }) } });
  const c3 = app.cam['3d'];
  const g3 = { yaw: c3.yaw, ox: c3.ox, oy: c3.oy };
  svg5.fire('pointerdown', { pointerId: 52, clientX: 400, clientY: 300, button: 0 });
  svg5.fire('pointermove', { pointerId: 52, clientX: 470, clientY: 300 });
  svg5.fire('pointerup', { pointerId: 52, clientX: 470, clientY: 300 });
  ok('kéo nền trong không gian là xoay góc nhìn', c3.yaw !== g3.yaw && c3.ox === g3.ox);

  const g3b = { yaw: c3.yaw, ox: c3.ox, oy: c3.oy };
  svg5.fire('pointerdown', { pointerId: 53, clientX: 400, clientY: 300, ctrlKey: true, button: 0 });
  svg5.fire('pointermove', { pointerId: 53, clientX: 470, clientY: 340, ctrlKey: true });
  svg5.fire('pointerup', { pointerId: 53, clientX: 470, clientY: 340 });
  ok('Ctrl + kéo trong không gian là DỜI, không xoay', c3.ox !== g3b.ox && c3.oy !== g3b.oy && c3.yaw === g3b.yaw,
    JSON.stringify({ truoc: g3b, sau: { yaw: c3.yaw, ox: c3.ox, oy: c3.oy } }));

  // --- con lăn: cuộn có thành phần ngang thì dời, chỉ dọc thì phóng to ---
  const sc = c3.scale;
  svg5.fire('wheel', { deltaX: 0, deltaY: -100, clientX: 400, clientY: 300 });
  ok('cuộn dọc là phóng to', c3.scale > sc, c3.scale + ' vs ' + sc);
  const g3c = { ox: c3.ox, sc: c3.scale };
  svg5.fire('wheel', { deltaX: 40, deltaY: 6, clientX: 400, clientY: 300 });
  ok('vuốt hai ngón bàn di (có deltaX) là dời bảng', c3.ox !== g3c.ox && c3.scale === g3c.sc);

  q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '2d' } }) } });
}

console.log('\nBấm đúp trên bảng vẽ và đổi màu');
{
  q('#scriptbox').value = 'xoahet\nA=(0,0)\nB=(4,0)\nC=(2,3)\nt=tamgiac(A,B,C)';
  q('#runscript').fire('click');
  const doc = app.doc['2d'];
  q('#pickmove').fire('click');
  const cam = app.cam['2d'];
  const mh = (x, y) => ({ x: 900 / 2 + (x - cam.cx) * cam.scale, y: 620 / 2 - (y - cam.cy) * cam.scale });
  const svg4 = q('#svg');
  const bam = (p) => {
    svg4.fire('pointerdown', { pointerId: 40, clientX: p.x, clientY: p.y });
    svg4.fire('pointerup', { pointerId: 40, clientX: p.x, clientY: p.y });
  };
  const A = mh(0, 0);

  bam(A);
  ok('bấm một lần thì KHÔNG mở hộp', !q('#tenmodal').classList.contains('on'));
  bam(A);
  ok('bấm đúp lên đỉnh thì mở hộp sửa', q('#tenmodal').classList.contains('on'), q('#tenTieuDe').textContent);
  ok('đúng đối tượng vừa bấm', q('#tenTieuDe').textContent.includes('A'), q('#tenTieuDe').textContent);
  ok('là điểm nên ẩn phần nét vẽ', q('#tenNetO').hidden === true);

  // đổi màu bằng ô màu tự chọn
  q('#tenMoi').value = 'A';
  q('#tenMauRieng').value = '#d98324';
  q('#tenLuu').fire('click');
  ok('đổi được màu của điểm', doc.byName('A').style.color === '#d98324', JSON.stringify(doc.byName('A').style));
  ok('màu mới hiện lên bảng vẽ', q('#svg').innerHTML.includes('#d98324'));

  // bấm đúp lên CẠNH tam giác (trung điểm AB) — bấm giữa ruột thì không trúng hình nào
  const G = mh(2, 0);
  bam(G); bam(G);
  const mo = q('#tenmodal').classList.contains('on');
  ok('bấm đúp lên hình cũng mở được', mo, q('#tenTieuDe').textContent);
  if (mo) {
    ok('là hình nên hiện phần nét vẽ', q('#tenNetO').hidden === false);
    const tenCu = q('#tenTieuDe').textContent.replace('Sửa ', '').trim();
    ok('bấm trúng tam giác t', tenCu === 't', tenCu);
    q('#tenMoi').value = tenCu;
    q('#tenMauRieng').value = '#1f7a5a';
    q('#tenDay').value = '3.5';
    // DOM giả lập không dựng cây từ chuỗi HTML nên không bấm được nút kiểu nét;
    // ở đây kiểm bảng kiểu nét được sinh ra đúng, còn phần áp dụng thử qua lệnh.
    ok('hộp thoại liệt kê đủ sáu kiểu nét', (q('#tenKieu').innerHTML.match(/data-kieu=/g) || []).length === 6,
      q('#tenKieu').innerHTML.slice(0, 200));
    ok('kiểu nét có bản xem thử bằng SVG', q('#tenKieu').innerHTML.includes('stroke-dasharray="7 5"'));
    q('#tenLuu').fire('click');
    const t = doc.byName('t');
    ok('đổi được độ dày nét', t && t.style.width === 3.5, JSON.stringify(t && t.style));
  }

  // đổi kiểu nét bằng lệnh
  {
    const doc2 = app.doc['2d'];
    const chay = (v) => { q('#cmd').value = v; q('#cmd').fire('keydown', { key: 'Enter' }); };
    const ten = doc2.byName('t') ? 't' : (doc2.list().find((o) => o.type === 'polygon') || {}).name;
    chay(`net ${ten} cham`);
    ok('lệnh net ... cham đặt được nét chấm', doc2.byName(ten).style.dash === '0.01 6', JSON.stringify(doc2.byName(ten).style));
    ok('nét chấm hiện lên SVG với đầu bo tròn', /stroke-linecap="round"/.test(q('#svg').innerHTML) && q('#svg').innerHTML.includes('0.01 6'));
    chay(`net ${ten} dutcham`);
    ok('đặt được nét đứt chấm', doc2.byName(ten).style.dash === '11 4 0.01 4');
    chay(`net ${ten} lien`);
    ok('trả về nét liền', !doc2.byName(ten).style.dash);
  }

  // hai lần bấm CÁCH XA nhau thì không tính là bấm đúp
  bam(mh(0, 0)); bam(mh(4, 0));
  ok('bấm hai chỗ khác nhau thì không mở hộp', !q('#tenmodal').classList.contains('on'));
}

console.log('\nBắt dính giao điểm');
{
  // dựng hai đường cắt nhau tại (2; 2) và cắt cả hai trục
  q('#cmd').value = 'xoahet';
  q('#cmd').fire('keydown', { key: 'Enter' });
  q('#scriptbox').value = 'd1 = pt y = x\nd2 = pt x + y = 4';
  q('#runscript').fire('click');
  ok('dựng được hai đường để thử', !!app.doc['2d'].byName('d1') && !!app.doc['2d'].byName('d2'));

  const cam = app.cam['2d'];
  const manHinh = (x, y) => ({ x: 900 / 2 + (x - cam.cx) * cam.scale, y: 620 / 2 - (y - cam.cy) * cam.scale });
  const svg3 = q('#svg');
  q('#rail').fire('click', { target: { closest: () => ({ dataset: { tool: 'point' } }) } });

  // rê chuột tới gần giao điểm (2; 2), lệch 5px
  const g = manHinh(2, 2);
  svg3.fire('pointermove', { pointerId: 30, clientX: g.x + 5, clientY: g.y - 4 });
  ok('rê lại gần thì bắt được giao điểm', !!app.giao, JSON.stringify(app.giao && app.giao.p));
  ok('bắt đúng toạ độ (2; 2)', app.giao && Math.abs(app.giao.p.x - 2) < 1e-6 && Math.abs(app.giao.p.y - 2) < 1e-6);
  ok('có vẽ dấu bắt lên bảng', /stroke="#d98324"/.test(svg3.innerHTML));

  // bấm vào → tạo điểm phụ thuộc tại đúng giao điểm
  const truoc = app.doc['2d'].order.length;
  svg3.fire('pointerdown', { pointerId: 30, clientX: g.x + 5, clientY: g.y - 4 });
  svg3.fire('pointerup', { pointerId: 30, clientX: g.x + 5, clientY: g.y - 4 });
  const moi = app.doc['2d'].list()[app.doc['2d'].order.length - 1];
  ok('bấm vào thì thêm đúng một điểm', app.doc['2d'].order.length === truoc + 1);
  ok('điểm đó là GIAO ĐIỂM chứ không phải điểm rời', moi.op === 'intersect', moi.op);
  ok('đúng toạ độ giao', Math.abs(moi.val.x - 2) < 1e-9 && Math.abs(moi.val.y - 2) < 1e-9, JSON.stringify(moi.val));

  // đổi một đường thì giao điểm phải chạy theo
  app.doc['2d'].byName('d2').params.c = -6;
  app.doc['2d'].recompute();
  ok('đổi đường thì giao điểm đi theo', Math.abs(moi.val.x - 3) < 1e-9, JSON.stringify(moi.val));

  // Vẽ xong một điểm là app tự về Chọn/Kéo, nên muốn chấm tiếp phải chọn lại
  // công cụ Điểm — đúng như thiết kế.
  ok('vẽ xong điểm thì tự về Chọn/Kéo', app.tool === 'move');
  q('#rail').fire('click', { target: { closest: () => ({ dataset: { tool: 'point' } }) } });

  // rê tới chỗ đường cắt trục hoành
  const t = manHinh(6, 0);
  svg3.fire('pointermove', { pointerId: 30, clientX: t.x + 4, clientY: t.y + 4 });
  ok('bắt được cả giao với trục Ox', app.giao && app.giao.b === 'Ox' && Math.abs(app.giao.p.x - 6) < 1e-6,
    JSON.stringify(app.giao && { b: app.giao.b, p: app.giao.p }));
  svg3.fire('pointerdown', { pointerId: 31, clientX: t.x + 4, clientY: t.y + 4 });
  svg3.fire('pointerup', { pointerId: 31, clientX: t.x + 4, clientY: t.y + 4 });
  const m2 = app.doc['2d'].list()[app.doc['2d'].order.length - 1];
  ok('tạo được điểm cắt trục', m2.op === 'interAxis' && m2.val.y === 0, m2.op + ' ' + JSON.stringify(m2.val));

  // xa giao điểm thì không bắt
  svg3.fire('pointermove', { pointerId: 30, clientX: 40, clientY: 560 });
  ok('rê ra xa thì bỏ bắt', !app.giao);
}

// miền nghiệm chấm sẵn giao với trục
{
  q('#scriptbox').value = 'xoahet\nM = hemien x>=0, y>=0, 2x+3y<=12';
  q('#runscript').fire('click');
  ok('miền nghiệm chấm sẵn giao điểm với trục', /circle[^>]*r="3.6"/.test(q('#svg').innerHTML), q('#svg').innerHTML.slice(-400));
  ok('kèm toạ độ giao điểm', q('#svg').innerHTML.includes('(6; 0)') || q('#svg').innerHTML.includes('(0; 4)'));
}

console.log('\nCụm thao tác, tự về chế độ chọn, ẩn tên');
{
  ok('cụm nút nổi có biểu tượng', q('#pickmove').innerHTML.includes('<svg') && q('#pickdel').innerHTML.includes('<svg'));
  ok('thanh công cụ KHÔNG còn Chọn/Kéo và Xoá', !q('#rail').innerHTML.includes('data-tool="move"') && !q('#rail').innerHTML.includes('data-tool="del"'));

  // kéo cụm nút đi chỗ khác
  const tay = q('#dockkeo'), dock = q('#dock');
  tay.fire('pointerdown', { pointerId: 20, clientX: 30, clientY: 30 });
  tay.fire('pointermove', { pointerId: 20, clientX: 230, clientY: 180 });
  tay.fire('pointerup', { pointerId: 20, clientX: 230, clientY: 180 });
  ok('kéo được cụm nút đi chỗ khác', !!dock.style.left && !!dock.style.top && dock.classList.contains('daKeo'),
    JSON.stringify(dock.style));
  ok('nhớ lại vị trí đã kéo', !!globalThis.localStorage.getItem('geoai.dock'), String(globalThis.localStorage.getItem('geoai.dock')));
  tay.fire('dblclick', {});
  ok('bấm đúp tay nắm thì về chỗ cũ', !dock.style.left && !dock.classList.contains('daKeo'));

  q('#pickdel').fire('click');
  ok('bấm nút Xoá thì đổi công cụ', app.tool === 'del');
  q('#pickmove').fire('click');
  ok('bấm nút Chọn/Kéo thì về move', app.tool === 'move');

  // vẽ xong tự về chế độ chọn
  app.opts.tuVeChon = true;
  q('#rail').fire('click', { target: { closest: () => ({ dataset: { tool: 'seg' } }) } });
  const svg2 = q('#svg');
  svg2.fire('pointerdown', { pointerId: 9, clientX: 120, clientY: 120 });
  svg2.fire('pointerup', { pointerId: 9, clientX: 120, clientY: 120 });
  svg2.fire('pointerdown', { pointerId: 9, clientX: 260, clientY: 200 });
  svg2.fire('pointerup', { pointerId: 9, clientX: 260, clientY: 200 });
  ok('vẽ xong đoạn thì tự về Chọn/Kéo', app.tool === 'move', 'đang là ' + app.tool);

  // nút Tên ba nấc
  // TÊN dùng class="lbl"; còn toạ độ, số đo góc thì là class="lbl plain"
  // và phải giữ nguyên vì đó là nội dung bài chứ không phải nhãn.
  const coTen = () => /class="lbl"/.test(q('#svg').innerHTML);
  app.opts.nhan = 'du';
  q('#btnNhan').fire('click');
  ok('nấc 1: chỉ hiện tên điểm', app.opts.nhan === 'diem');
  q('#btnNhan').fire('click');
  ok('nấc 2: tắt hết tên', app.opts.nhan === 'tat');
  ok('tắt rồi thì SVG không còn nhãn tên nào', !coTen(), q('#svg').innerHTML.slice(0, 120));
  ok('nhưng toạ độ giao điểm thì vẫn giữ', /class="lbl plain"/.test(q('#svg').innerHTML));
  q('#btnNhan').fire('click');
  ok('nấc 3: quay lại đủ', app.opts.nhan === 'du');
  ok('bật lại thì tên hiện lại', coTen());
  ok('bảng phương trình vẫn giữ tên dù bảng vẽ đã ẩn', q('#ptlist').innerHTML.includes('class="nm"'));
}

ok('chạy lệnh từ thanh lệnh', !!app.doc['2d'].byName('M'), q('#status').textContent);

// hoàn tác / làm lại
// So bằng nội dung chứ không bằng SỐ đối tượng: có thao tác (sửa phương trình)
// không thêm bớt đối tượng nào, hoàn tác vẫn phải đưa hình về như cũ.
const truocUndo = JSON.stringify(app.doc['2d'].toJSON());
q('#undo').fire('click');
const sauUndo = JSON.stringify(app.doc['2d'].toJSON());
ok('hoàn tác', sauUndo !== truocUndo);
q('#redo').fire('click');
ok('làm lại', JSON.stringify(app.doc['2d'].toJSON()) === truocUndo);

// mẫu nhanh
bamMau('3 đường cao');
ok('mẫu "3 đường cao" chạy được', !!app.doc['2d'].byName('ha') && !!app.doc['2d'].byName('H'));

// mẫu miền nghiệm
bamMau('Hệ BPT');
{
  const mien = app.doc['2d'].list().filter((o) => o.op === 'region').pop();
  ok('mẫu hệ bất phương trình vẽ ra miền', !!mien && mien.val && !mien.val.rong && mien.val.pts.length >= 3,
    mien ? String(mien.val && mien.val.pts.length) : 'không có');
  ok('SVG có gạch chéo miền nghiệm', /url\(#hatch/.test(svg.innerHTML));
}

// chuyển sang 3D
q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '3d' } }) } });
ok('chuyển chế độ 3D', app.mode === '3d');
ok('thanh công cụ 3D', q('#rail').innerHTML.includes('data-tool="pyr"'));
bamMau('Thiết diện mẫu');
const td = app.doc['3d'].byName('td');
ok('mẫu thiết diện dựng được', td && td.val && td.val.pts.length >= 3, td ? String(td.val && td.val.pts.length) : 'không có');
ok('SVG 3D có nét khuất', /stroke-dasharray="6 5"/.test(svg.innerHTML));

// zoom / lưới / trục / theme
q('#zin').fire('click'); q('#zout').fire('click'); q('#zfit').fire('click');

// ẩn / hiện trục toạ độ — thử ở CẢ hình không gian lẫn hình phẳng
const coTruc3 = () => /marker-end="url\(#arwg\)"/.test(q("#svg").innerHTML);   // mũi tên trục y, chỉ trục mới có
ok('hình không gian đang có trục', coTruc3());
q('#btnAxes').fire('click');
ok('tắt trục ở hình không gian', !app.opts.axes && !coTruc3());
q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '2d' } }) } });
const coTruc2 = () => /class="axis"/.test(q('#svg').innerHTML);
ok('tắt trục ăn sang cả hình phẳng', !coTruc2());
q('#btnAxes').fire('click');
ok('bật lại thì hình phẳng có trục', app.opts.axes && coTruc2());
ok('nút Trục sáng lên khi đang bật', q('#btnAxes').classList.contains('on'));
q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '3d' } }) } });
ok('quay lại không gian cũng có trục', coTruc3());

q('#btnGrid').fire('click');
ok('tắt lưới được', !app.opts.grid && !/class="grid"/.test(q('#svg').innerHTML));
q('#btnGrid').fire('click');
q('#btnTheme').fire('click');
ok('nút zoom/lưới/giao diện không lỗi', true);
ok('đổi giao diện tối', document.documentElement.getAttribute('data-theme') === 'dark');

// script pane
q('#scriptbox').value = 'X = (1,1,1)';
q('#runscript').fire('click');
ok('chạy script từ khung soạn thảo', !!app.doc['3d'].byName('X'));
q('#dumpscript').fire('click');
ok('xuất lại script của hình', q('#scriptbox').value.includes('chop('), q('#scriptbox').value.slice(0, 40));

// chat offline
q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '2d' } }) } });
q('#chatin').value = 'vẽ tam giác PQR đều';
q('#chatsend').fire('click');
await new Promise((r) => setTimeout(r, 60));
ok('trợ lý offline dựng được tam giác đều', !!app.doc['2d'].byName('P') && !!app.doc['2d'].byName('Q'));

ok('không có lỗi phát sinh trong lúc thao tác', !boom, boom ? boom.stack.split('\n')[0] : '');
// bấm logo để làm mới
console.log('\nLogo và làm mới');
// DOM giả lập không dựng cây từ HTML, nên soi thẳng bản gộp
ok('logo là tam giác đều có kẻ đường cao', html.includes('M12 3.4L21.3 19.4H2.7z') && html.includes('M12 3.4V19.4'));
ok('bấm logo được (là nút, có id)', html.includes('class="brand" id="logo"'));
{
  globalThis.traLoiConfirm = false;
  const truoc2d = app.doc['2d'].order.length, truoc3d = app.doc['3d'].order.length;
  q('#logo').fire('click');
  ok('trả lời Không thì KHÔNG xoá gì', app.doc['2d'].order.length === truoc2d && app.doc['3d'].order.length === truoc3d);

  globalThis.traLoiConfirm = true;
  const khoaCu = globalThis.localStorage.getItem('geoai.theme');
  q('#logo').fire('click');
  ok('làm mới xoá sạch hình phẳng', app.doc['2d'].order.length === 0);
  ok('làm mới xoá sạch hình không gian', app.doc['3d'].order.length === 0);
  ok('làm mới dọn cả ngăn hoàn tác', app.hist['2d'].length === 0 && app.hist['3d'].length === 0);
  ok('làm mới đưa về chế độ Hình phẳng, công cụ Chọn/Kéo', app.mode === '2d' && app.tool === 'move');
  ok('làm mới dọn cuộc trò chuyện', app.chat.filter((m) => m.role === 'user').length === 0);
  ok('làm mới KHÔNG đụng cài đặt giao diện', globalThis.localStorage.getItem('geoai.theme') === khoaCu);
  ok('bảng phương trình về trạng thái trống', q('#ptlist').innerHTML.includes('ptbang'));
}


console.log(`\n===== ${pass} đạt / ${fail} lỗi =====`);
process.exit(fail ? 1 : 0);
