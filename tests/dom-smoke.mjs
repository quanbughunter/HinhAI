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
ok('app khởi tạo', !!app && !!app.doc);
ok('bảng vẽ trống khi mở app', app.doc['2d'].order.length === 0, 'có ' + app.doc['2d'].order.length);
const svg = q('#svg');
ok('SVG có nội dung', svg.innerHTML.length > 500, svg.innerHTML.length + ' ký tự');
ok('SVG vẽ được lưới toạ độ', /class="grid"|class="axis"/.test(svg.innerHTML));
ok('thanh công cụ đã dựng', q('#rail').innerHTML.includes('data-tool="seg"'));
ok('danh sách đối tượng báo trống', q('#objlist').innerHTML.includes('Chưa có đối tượng'));

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
q('#quick').fire('click', { target: { closest: () => ({ dataset: { q: '0' } }) } });   // vẽ tam giác mẫu
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
ok('chạy lệnh từ thanh lệnh', !!app.doc['2d'].byName('M'), q('#status').textContent);

// hoàn tác / làm lại
const nBefore = app.doc['2d'].order.length;
q('#undo').fire('click');
ok('hoàn tác', app.doc['2d'].order.length < nBefore, `${nBefore} → ${app.doc['2d'].order.length}`);
q('#redo').fire('click');
ok('làm lại', app.doc['2d'].order.length === nBefore);

// mẫu nhanh
q('#quick').fire('click', { target: { closest: () => ({ dataset: { q: '5' } }) } });
ok('mẫu "3 đường cao" chạy được', !!app.doc['2d'].byName('ha') && !!app.doc['2d'].byName('H'));

// chuyển sang 3D
q('#modeseg').fire('click', { target: { closest: () => ({ dataset: { mode: '3d' } }) } });
ok('chuyển chế độ 3D', app.mode === '3d');
ok('thanh công cụ 3D', q('#rail').innerHTML.includes('data-tool="pyr"'));
q('#quick').fire('click', { target: { closest: () => ({ dataset: { q: '5' } }) } });
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
