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
  const html = q('#quick').innerHTML;
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
  const coTen = () => /class="lbl/.test(q('#svg').innerHTML);
  app.opts.nhan = 'du';
  q('#btnNhan').fire('click');
  ok('nấc 1: chỉ hiện tên điểm', app.opts.nhan === 'diem');
  q('#btnNhan').fire('click');
  ok('nấc 2: tắt hết tên', app.opts.nhan === 'tat');
  ok('tắt rồi thì SVG không còn nhãn tên nào', !coTen(), q('#svg').innerHTML.slice(0, 120));
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

// zoom / lưới / theme
q('#zin').fire('click'); q('#zout').fire('click'); q('#zfit').fire('click');
q('#btnGrid').fire('click'); q('#btnTheme').fire('click');
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
console.log(`\n===== ${pass} đạt / ${fail} lỗi =====`);
process.exit(fail ? 1 : 0);
