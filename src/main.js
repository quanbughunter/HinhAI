// ============================================================================
// main.js — Bộ điều khiển ứng dụng: công cụ, tương tác chuột/chạm, chat AI.
// ============================================================================

import { GeoDoc } from './core/model.js';
import { runScript } from './core/dsl.js';
import { Cam2, Cam3, render2, render3, pick, esc } from './ui/render.js';
import { TOOLS_2D, TOOLS_3D, QUICK_2D, QUICK_3D, CHIPS } from './ui/tools.js';
import { askGemini, askClaudeRuntime, getClaudeCapability, localParse, describeDoc, DSL_REFERENCE } from './ai/agent.js';

const $ = (s) => document.querySelector(s);
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem('geoai.' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set: (k, v) => { try { localStorage.setItem('geoai.' + k, JSON.stringify(v)); } catch (_) { } },
};

const app = {
  mode: '2d',
  doc: { '2d': new GeoDoc(), '3d': new GeoDoc() },
  cam: { '2d': new Cam2(), '3d': new Cam3() },
  tool: 'move',
  picks: [],
  sel: new Set(),
  hover: null,
  opts: { grid: LS.get('grid', true), axes: true },
  hist: { '2d': [], '3d': [] },
  future: { '2d': [], '3d': [] },
  chat: [],
  busy: false,
  cmdHist: [], cmdIdx: -1,
  sampler: null, downloads: null,
};
window.geoai = app;

const D = () => app.doc[app.mode];
const C = () => app.cam[app.mode];
const is3 = () => app.mode === '3d';

// ---------------------------------------------------------------- Vẽ lại
function render() {
  const svg = $('#svg');
  const r = svg.getBoundingClientRect();
  const cam = C();
  cam.w = Math.max(1, r.width); cam.h = Math.max(1, r.height);
  const mk = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`;
  const defs = `<defs>${mk('arw', '#16233d')}${mk('arwr', '#b3261e')}${mk('arwg', '#1f7a5a')}${mk('arwb', '#22468f')}</defs>`;
  const opt = { ...app.opts, selected: app.sel, hover: app.hover };
  svg.innerHTML = defs + (is3() ? render3(D(), cam, opt) : render2(D(), cam, opt));
  renderObjList();
  updateHint();
}

function updateHint() {
  const t = curTool();
  let s = t ? `<b>${esc(t.name)}</b> — ${esc(t.hint || '')}` : '';
  if (t && t.n && app.picks.length) {
    s += ` <b>(${app.picks.length}${t.n > 0 ? '/' + t.n : ''} đã chọn${t.n < 0 ? ' — Enter để xong' : ''})</b>`;
  }
  $('#hint').innerHTML = s;
}

function renderObjList() {
  const box = $('#objlist');
  const items = D().list();
  if (!items.length) { box.innerHTML = `<div style="padding:18px;color:var(--muted);font-size:13px">Chưa có đối tượng nào.</div>`; return; }
  box.innerHTML = items.map((o) => {
    const col = (o.style && o.style.color) || '#64748b';
    return `<div class="obj" data-id="${o.id}">
      <span class="sw" style="background:${col};${o.visible ? '' : 'opacity:.25'}"></span>
      <span class="nm">${esc(o.name)}</span>
      <span class="de">${esc(describe(o))}</span>
      <button class="x" data-act="vis" title="Ẩn/hiện">${o.visible ? '👁' : '⌀'}</button>
      <button class="x" data-act="del" title="Xoá">✕</button>
    </div>`;
  }).join('');
}
function describe(o) {
  const A = o.args.map((a) => { const p = D().get(a); return p ? p.name : '?'; }).join(', ');
  const v = o.val;
  let extra = '';
  if (v && o.type === 'point') extra = ` (${r2(v.x)}; ${r2(v.y)})`;
  else if (v && v.t === 'p3') extra = ` (${r2(v.x)}; ${r2(v.y)}; ${r2(v.z)})`;
  else if (v && v.t === 'circle') extra = ` R=${r2(v.r)}`;
  else if (v && v.t === 'num') extra = ` = ${r2(v.v)}`;
  else if (v && v.t === 'angle') extra = ` = ${r2(v.v)}°`;
  else if (v && v.t === 'solid') extra = ` ${v.v.length} đỉnh`;
  return `${VN[o.op] || o.op}${A ? '(' + A + ')' : ''}${extra}`;
}
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : '?');
const VN = {
  point: 'điểm', point3: 'điểm', pointOn: 'điểm thuộc', intersect: 'giao điểm', midpoint: 'trung điểm',
  mid3: 'trung điểm', segment: 'đoạn', segment3: 'đoạn', line: 'đường thẳng', line3: 'đường thẳng',
  ray: 'tia', vector: 'vectơ', polygon: 'đa giác', circleCP: 'đường tròn', circleR: 'đường tròn',
  circle3: 'đường tròn qua', incircle: 'đtr nội tiếp', perpLine: 'đường ⟂', paraLine: 'đường //',
  perpBisector: 'trung trực', bisector: 'phân giác', altitude: 'đường cao', median: 'trung tuyến',
  tangent: 'tiếp tuyến', distance: 'khoảng cách', dist3: 'độ dài', angleM: 'góc', areaM: 'diện tích',
  centroid: 'trọng tâm', circumcenter: 'tâm ngoại tiếp', incenter: 'tâm nội tiếp', orthocenter: 'trực tâm',
  foot: 'hình chiếu', footBC: 'chân đ.cao', reflectPt: 'đối xứng', rotatePt: 'quay', dilatePt: 'vị tự',
  translatePt: 'tịnh tiến', pyramid: 'hình chóp', prism: 'lăng trụ', box: 'hình hộp', sphere: 'mặt cầu',
  face: 'mặt', plane3: 'mặt phẳng', section: 'thiết diện', meet3: 'giao với mp', text: 'ghi chú', numberFree: 'số',
};

// ---------------------------------------------------------------- Undo
function snap() {
  const m = app.mode;
  app.hist[m].push(JSON.stringify(D().toJSON()));
  if (app.hist[m].length > 80) app.hist[m].shift();
  app.future[m] = [];
}
function undo() {
  const m = app.mode;
  if (!app.hist[m].length) return;
  app.future[m].push(JSON.stringify(D().toJSON()));
  loadDoc(JSON.parse(app.hist[m].pop()));
}
function redo() {
  const m = app.mode;
  if (!app.future[m].length) return;
  app.hist[m].push(JSON.stringify(D().toJSON()));
  loadDoc(JSON.parse(app.future[m].pop()));
}
function loadDoc(json) {
  const d = GeoDoc.fromJSON(json);
  d.onChange = render;
  app.doc[app.mode] = d;
  app.sel.clear(); app.picks = [];
  render();
}

// ---------------------------------------------------------------- Công cụ
function toolSets() { return is3() ? TOOLS_3D : TOOLS_2D; }
function curTool() {
  for (const g of toolSets()) for (const t of g.t) if (t.id === app.tool) return t;
  return null;
}
function buildRail() {
  $('#rail').innerHTML = toolSets().map((g) => `<div class="grp"><div class="glabel">${esc(g.g)}</div>` +
    g.t.map((t) => `<button class="tool${t.id === app.tool ? ' on' : ''}" data-tool="${t.id}" data-tip="${esc(t.name)}">${t.icon}</button>`).join('') +
    `</div>`).join('');
  const q = is3() ? QUICK_3D : QUICK_2D;
  $('#quick').innerHTML = q.map((x, i) => `<button data-q="${i}">${esc(x[0])}</button>`).join('');
}
function setTool(id) {
  app.tool = id; app.picks = []; app.sel.clear();
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === id));
  $('#svg').style.cursor = id === 'move' ? 'default' : 'crosshair';
  render();
}

/** Snap toạ độ về lưới con gần nhất */
function snapWorld(p) {
  const cam = C();
  const raw = 70 / cam.scale;
  const pw = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 5, 10].map((m) => m * pw).find((s) => s >= raw) || pw * 10) / 5;
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step, z: p.z };
}

/** Lấy đối tượng cần thiết cho bước chọn hiện tại; tự tạo điểm nếu cần */
function acquire(px, kind) {
  const doc = D(), cam = C();
  const hit = pick(doc, cam, px, app.mode);
  const wantPt = kind === 'point' || kind === 'p3';
  if (hit) {
    const hitIsPt = is3() ? (hit.val && hit.val.t === 'p3') : hit.type === 'point';
    if (!wantPt || hitIsPt) {
      if (kind === 'curve' && (hit.type === 'point' || (hit.val && hit.val.t === 'p3'))) return null;
      if (kind === 'solid' && !(hit.val && hit.val.t === 'solid')) return null;
      return hit;
    }
    // muốn điểm nhưng bấm trúng đường -> tạo điểm thuộc đường
    if (!is3() && (hit.type === 'line' || hit.type === 'circle' || hit.type === 'polygon')) {
      const w = cam.u(px);
      return doc.add({ op: 'pointOn', args: [hit], params: { t: paramFor(hit.val, w) } });
    }
  }
  if (!wantPt) return null;
  if (is3()) {
    const w = snapWorld(cam.u(px, 0));
    return doc.add({ op: 'point3', args: [], params: { x: w.x, y: w.y, z: 0 } });
  }
  const w = snapWorld(cam.u(px));
  return doc.add({ op: 'point', args: [], params: { x: w.x, y: w.y } });
}
function paramFor(val, w) {
  if (!val) return 0;
  if (val.t === 'circle') return Math.atan2(w.y - val.c.y, w.x - val.c.x);
  if (val.t === 'line') {
    if (val.kind === 'seg') {
      const dx = val.b.x - val.a.x, dy = val.b.y - val.a.y;
      const l2 = dx * dx + dy * dy || 1;
      return Math.max(0, Math.min(1, ((w.x - val.a.x) * dx + (w.y - val.a.y) * dy) / l2));
    }
    return (w.x - val.p.x) * val.d.x + (w.y - val.p.y) * val.d.y;
  }
  return 0.5;
}

function clickTool(px) {
  const t = curTool();
  if (!t) return;
  if (t.id === 'del') {
    const hit = pick(D(), C(), px, app.mode);
    if (hit) { snap(); D().remove(hit.id); render(); }
    return;
  }
  if (t.id === 'text') {
    const s = prompt('Nội dung ghi chú:');
    if (s) { const w = C().u(px); snap(); D().add({ op: 'text', args: [], params: { s, x: w.x, y: w.y } }); render(); }
    return;
  }
  if (!t.n) return;
  const kind = (t.kinds && t.kinds[Math.min(app.picks.length, t.kinds.length - 1)]) || 'any';
  if (app.picks.length === 0) snap();
  const got = acquire(px, kind);
  if (!got) { flash('Hãy chọn đúng loại đối tượng: ' + KINDVN[kind]); return; }
  // đa giác: bấm lại đỉnh đầu để đóng hình
  if (t.n < 0 && app.picks.length >= 3 && got.id === app.picks[0].id) { finishTool(); return; }
  if (!app.picks.some((p) => p.id === got.id)) app.picks.push(got);
  app.sel = new Set(app.picks.map((p) => p.id));
  if (t.n > 0 && app.picks.length >= t.n) finishTool();
  render();
}
const KINDVN = { point: 'một điểm', p3: 'một điểm', curve: 'một đường thẳng / đường tròn', solid: 'một khối', any: 'một đối tượng' };

function finishTool() {
  const t = curTool();
  const picks = app.picks;
  app.picks = []; app.sel.clear();
  if (!t || !picks.length) { render(); return; }
  try {
    if (t.make) t.make(picks, api);
    else if (t.op) D().add({ op: t.op, args: picks, params: t.params || {} });
  } catch (e) { flash('Không dựng được: ' + e.message); }
  render();
}

const api = {
  add: (op, args, params) => D().add({ op, args, params: params || {} }),
  addAll: (a, b) => {
    // giao điểm: tạo tất cả nghiệm
    const n = countInter(a.val, b.val);
    for (let i = 0; i < Math.max(1, n); i++) D().add({ op: 'intersect', args: [a, b], params: { i } });
  },
};
function countInter(x, y) {
  if (!x || !y) return 1;
  if (x.t === 'line' && y.t === 'line') return 1;
  return 2;
}

// ---------------------------------------------------------------- Chuột / chạm
let drag = null;
function pxOf(e) {
  const r = $('#svg').getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function onDown(e) {
  const svg = $('#svg');
  svg.setPointerCapture(e.pointerId);
  const px = pxOf(e);
  const t = curTool();
  if (t && (t.id === 'move' || t.id === 'rot')) {
    const hit = t.id === 'rot' ? null : pick(D(), C(), px, app.mode);
    if (hit && D().isDraggable(hit)) {
      drag = { kind: 'obj', obj: hit, moved: false };
      app.sel = new Set([hit.id]);
      snap();
    } else {
      drag = { kind: 'view', last: px };
    }
    render();
    return;
  }
  drag = { kind: 'tool', px, moved: false };
}
function onMove(e) {
  const px = pxOf(e);
  if (!drag) {
    const hit = pick(D(), C(), px, app.mode);
    const id = hit ? hit.id : null;
    if (id !== app.hover) { app.hover = id; $('#svg').style.cursor = hit ? 'pointer' : (app.tool === 'move' ? 'default' : 'crosshair'); render(); }
    return;
  }
  if (drag.kind === 'obj') {
    drag.moved = true;
    const cam = C();
    const target = is3() ? cam.u(px, drag.obj.params.z || 0) : cam.u(px);
    D().moveTo(drag.obj, e.shiftKey ? snapWorld(target) : target);
    render();
  } else if (drag.kind === 'view') {
    const dx = px.x - drag.last.x, dy = px.y - drag.last.y;
    drag.last = px;
    if (is3()) C().orbit(dx, dy); else C().panPx(dx, dy);
    render();
  } else if (drag.kind === 'tool') {
    if (Math.hypot(px.x - drag.px.x, px.y - drag.px.y) > 4) drag.moved = true;
  }
}
function onUp(e) {
  const px = pxOf(e);
  if (drag && drag.kind === 'tool' && !drag.moved) clickTool(px);
  if (drag && drag.kind === 'view' && !is3()) { /* pan xong */ }
  drag = null;
  render();
}

// ---------------------------------------------------------------- Chạy lệnh
function exec(script, opts) {
  if (!script || !script.trim()) return { errors: [], ok: 0, created: [] };
  const wasEmpty = D().order.length === 0;
  snap();
  const res = runScript(D(), script, opts || {});
  if (wasEmpty && res.created.length) fit();
  render();
  return res;
}
function fit() {
  const doc = D(), cam = C();
  const pts = [];
  for (const o of doc.list()) {
    if (!o.val) continue;
    if (is3()) {
      if (o.val.t === 'p3') pts.push(o.val);
      else if (o.val.t === 'solid') pts.push(...o.val.v);
      else if (o.val.t === 'f3') pts.push(...o.val.pts);
      else if (o.val.t === 'sph') pts.push({ x: o.val.c.x - o.val.r, y: o.val.c.y - o.val.r, z: o.val.c.z - o.val.r }, { x: o.val.c.x + o.val.r, y: o.val.c.y + o.val.r, z: o.val.c.z + o.val.r });
    } else {
      if (o.type === 'point') pts.push(o.val);
      else if (o.val.t === 'circle') pts.push({ x: o.val.c.x - o.val.r, y: o.val.c.y - o.val.r }, { x: o.val.c.x + o.val.r, y: o.val.c.y + o.val.r });
      else if (o.val.t === 'poly') pts.push(...o.val.pts);
    }
  }
  if (!pts.length) return;
  if (is3()) {
    const s = pts.map((p) => cam.s(p));
    const minx = Math.min(...s.map((p) => p.x)), maxx = Math.max(...s.map((p) => p.x));
    const miny = Math.min(...s.map((p) => p.y)), maxy = Math.max(...s.map((p) => p.y));
    const k = Math.min((cam.w - 120) / Math.max(40, maxx - minx), (cam.h - 120) / Math.max(40, maxy - miny));
    cam.zoom(Math.max(0.2, Math.min(4, k)));
    const s2 = pts.map((p) => cam.s(p));
    cam.ox += cam.w / 2 - (Math.min(...s2.map((p) => p.x)) + Math.max(...s2.map((p) => p.x))) / 2;
    cam.oy += cam.h / 2 - (Math.min(...s2.map((p) => p.y)) + Math.max(...s2.map((p) => p.y))) / 2;
  } else {
    const minx = Math.min(...pts.map((p) => p.x)), maxx = Math.max(...pts.map((p) => p.x));
    const miny = Math.min(...pts.map((p) => p.y)), maxy = Math.max(...pts.map((p) => p.y));
    cam.cx = (minx + maxx) / 2; cam.cy = (miny + maxy) / 2;
    const k = Math.min((cam.w - 110) / Math.max(1e-6, maxx - minx || 6), (cam.h - 110) / Math.max(1e-6, maxy - miny || 6));
    cam.scale = Math.max(6, Math.min(220, k));
  }
}

function flash(msg, ms = 2600) {
  const el = $('#status');
  el.textContent = msg;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => { el.textContent = ''; }, ms);
}

// ---------------------------------------------------------------- Chat AI
function addMsg(role, text, code, cls) {
  app.chat.push({ role, text });
  const el = document.createElement('div');
  el.className = 'msg ' + (cls || (role === 'user' ? 'me' : 'ai'));
  el.innerHTML = esc(text) + (code ? `<span class="code">${esc(code)}</span>` : '');
  $('#chatlog').appendChild(el);
  $('#chatlog').scrollTop = 1e9;
  return el;
}
function sysMsg(t) { return addMsg('sys', t, null, 'sys'); }

async function sendChat() {
  const inp = $('#chatin');
  const text = inp.value.trim();
  if (!text || app.busy) return;
  inp.value = ''; inp.style.height = 'auto';
  addMsg('user', text);
  app.busy = true; $('#chatsend').disabled = true;
  const thinking = addMsg('assistant', 'Đang dựng hình…');
  try {
    const key = LS.get('key', '');
    const hist = app.chat.filter((m) => m.role !== 'sys').slice(-8);
    let out = null, via = '';
    if (key) {
      try {
        out = await askGemini({ key, model: LS.get('model', 'gemini-2.5-flash'), history: hist, context: describeDoc(D(), app.mode) });
        via = 'Gemini';
      } catch (e) { addMsg('assistant', 'Gemini báo lỗi: ' + e.message + '\nĐang thử cách khác…', null, 'err'); }
    }
    if (!out && app.sampler) {
      try {
        out = await askClaudeRuntime({ sample: app.sampler, history: hist, context: describeDoc(D(), app.mode) });
        via = 'Claude';
      } catch (e) { addMsg('assistant', 'Trợ lý Claude lỗi: ' + (e.message || e.code || e), null, 'err'); }
    }
    if (!out) {
      const loc = localParse(text, D());
      if (loc) out = { giai_thich: loc.note + ' (bộ luật cài sẵn)', script: loc.script };
    }
    if (thinking.isConnected) thinking.remove();
    if (!out || !out.script) {
      addMsg('assistant', 'Mình chưa hiểu câu này. Bạn thêm khoá Gemini trong ⚙ Cài đặt để dùng đầy đủ, hoặc thử câu quen thuộc như “vẽ tam giác ABC vuông tại A”.');
      return;
    }
    // đổi chế độ nếu script là hình không gian
    const looks3d = /\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)|chop\(|langtru\(|hop\(|matcau\(|thietdien\(|doan3\(|mp\(/.test(out.script);
    if (looks3d && !is3()) setMode('3d');
    if (!looks3d && is3() && /tamgiac\(|duongtron\(|trungtruc\(/.test(out.script)) setMode('2d');

    let res = exec(out.script);
    // Agent tự sửa lỗi 1 lần
    if (res.errors.length && LS.get('key', '')) {
      const fix = await askGemini({
        key: LS.get('key', ''), model: LS.get('model', 'gemini-2.5-flash'),
        history: [{ role: 'user', text: `Script trước bị lỗi:\n${out.script}\n\nLỗi:\n${res.errors.join('\n')}\n\nHãy viết lại script đúng cho yêu cầu: ${text}` }],
        context: describeDoc(D(), app.mode),
      }).catch(() => null);
      if (fix && fix.script) { const r2_ = exec(fix.script); if (r2_.ok) { out = fix; res = r2_; } }
    }
    const okCount = res.created.length;
    addMsg('assistant', (out.giai_thich || 'Đã dựng hình.') + (via ? ` · ${via}` : '') + (okCount ? `\nĐã tạo ${okCount} đối tượng.` : ''), out.script);
    if (res.errors.length) addMsg('assistant', 'Một số dòng chưa chạy được:\n' + res.errors.join('\n'), null, 'err');
  } catch (e) {
    if (thinking.isConnected) thinking.remove();
    addMsg('assistant', 'Lỗi: ' + (e.message || e), null, 'err');
  } finally {
    app.busy = false; $('#chatsend').disabled = false;
  }
}

// ---------------------------------------------------------------- Lưu / mở / xuất
function saveFile() {
  const data = { app: 'geoai', v: 1, mode: app.mode, doc2: app.doc['2d'].toJSON(), doc3: app.doc['3d'].toJSON() };
  dl(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), 'hinh-' + stamp() + '.geo.json');
}
function openFile(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (d.doc2) { app.doc['2d'] = GeoDoc.fromJSON(d.doc2); app.doc['2d'].onChange = render; }
      if (d.doc3) { app.doc['3d'] = GeoDoc.fromJSON(d.doc3); app.doc['3d'].onChange = render; }
      setMode(d.mode || '2d'); fit(); render(); flash('Đã mở tệp');
    } catch (e) { flash('Tệp không hợp lệ'); }
  };
  fr.readAsText(file);
}
function svgString() {
  const cam = C();
  const css = `<style>
    .grid{stroke:#e2e8f0;stroke-width:1;fill:none}.grid2{stroke:#eef2f7;stroke-width:.6;fill:none}
    .axis{stroke:#94a3b8;stroke-width:1.2;fill:none}.tick{font-size:10.5px;fill:#64748b;text-anchor:middle;font-family:sans-serif}
    .lbl{font-size:14px;font-weight:600;font-family:'Times New Roman',serif;font-style:italic;paint-order:stroke;stroke:#fff;stroke-width:3.5px;stroke-linejoin:round}
    .lbl.plain{font-style:normal;font-family:sans-serif;font-size:13px}
  </style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(cam.w)}" height="${Math.round(cam.h)}" viewBox="0 0 ${Math.round(cam.w)} ${Math.round(cam.h)}">${css}<rect width="100%" height="100%" fill="#fff"/>${$('#svg').innerHTML}</svg>`;
}
function exportPng() {
  const s = svgString();
  const img = new Image();
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  img.onload = () => {
    const cam = C(), k = 2;
    const cv = document.createElement('canvas');
    cv.width = cam.w * k; cv.height = cam.h * k;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    cv.toBlob((b) => dl(b, 'hinh-' + stamp() + '.png'));
  };
  img.onerror = () => { dl(new Blob([s], { type: 'image/svg+xml' }), 'hinh-' + stamp() + '.svg'); };
  img.src = url;
}
async function dl(blob, name) {
  if (app.downloads) {
    try { await app.downloads.save({ filename: name, data: blob }); return; } catch (_) { }
    try {
      const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      await app.downloads.save({ filename: name, data: b64 }); return;
    } catch (_) { }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

function dumpScript() {
  const doc = D();
  const lines = doc.list().map((o) => {
    const A = o.args.map((a) => (doc.get(a) ? doc.get(a).name : '?'));
    if (o.op === 'point') return `${o.name} = (${r2(o.params.x)}, ${r2(o.params.y)})`;
    if (o.op === 'point3') return `${o.name} = (${r2(o.params.x)}, ${r2(o.params.y)}, ${r2(o.params.z || 0)})`;
    const ps = Object.entries(o.params || {}).filter(([k]) => ['i', 't', 'r', 'k', 'ang', 'h', 'a', 'b', 'c'].includes(k)).map(([, v]) => r2(v));
    return `${o.name} = ${ROP[o.op] || o.op}(${[...A, ...ps].join(', ')})`;
  });
  return lines.join('\n');
}
const ROP = {
  midpoint: 'trungdiem', intersect: 'giao', pointOn: 'diemtren', segment: 'doan', line: 'duongthang',
  ray: 'tia', vector: 'vecto', polygon: 'dagiac', circleCP: 'duongtron', circleR: 'duongtron',
  circle3: 'duongtronqua', incircle: 'noitiep', perpLine: 'vuonggoc', paraLine: 'songsong',
  perpBisector: 'trungtruc', bisector: 'phangiac', altitude: 'duongcao', median: 'trungtuyen',
  tangent: 'tieptuyen', distance: 'khoangcach', angleM: 'goc', areaM: 'dientich', centroid: 'trongtam',
  circumcenter: 'tamngoaitiep', incenter: 'tamnoitiep', orthocenter: 'tructam', foot: 'chan',
  footBC: 'chanduongcao', reflectPt: 'doixung', rotatePt: 'quay', dilatePt: 'vitu', translatePt: 'tinhtien',
  mid3: 'trungdiem3', ratio3: 'chia3', segment3: 'doan3', line3: 'duongthang3', face: 'mat',
  pyramid: 'chop', prism: 'langtru', box: 'hop', sphere: 'matcau', plane3: 'mp', section: 'thietdien',
  meet3: 'giao3', dist3: 'kc3', ratioPoint: 'chia',
};

// ---------------------------------------------------------------- Khởi tạo
function setMode(m) {
  app.mode = m;
  app.picks = []; app.sel.clear();
  document.querySelectorAll('#modeseg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
  app.tool = 'move';
  buildRail();
  render();
}

function bind() {
  const svg = $('#svg');
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', () => { drag = null; });
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    if (is3()) C().zoom(k); else C().zoomAt(pxOf(e), k);
    render();
  }, { passive: false });
  svg.addEventListener('dblclick', () => { if (app.picks.length >= 3) finishTool(); });

  $('#rail').addEventListener('click', (e) => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
  $('#quick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const q = (is3() ? QUICK_3D : QUICK_2D)[+b.dataset.q];
    const r = exec(q[1]);
    flash(r.errors.length ? r.errors[0] : 'Đã vẽ ' + q[0].toLowerCase());
  });
  $('#modeseg').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pane]'); if (!b) return;
    document.querySelectorAll('.tabs button').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('on', p.id === 'pane-' + b.dataset.pane));
  });
  $('#objlist').addEventListener('click', (e) => {
    const row = e.target.closest('.obj'); if (!row) return;
    const o = D().get(row.dataset.id); if (!o) return;
    const act = e.target.dataset.act;
    if (act === 'del') { snap(); D().remove(o.id); }
    else if (act === 'vis') { snap(); o.visible = !o.visible; }
    else { app.sel = new Set([o.id]); }
    render();
  });

  $('#chatsend').addEventListener('click', sendChat);
  $('#chatin').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  $('#chatin').addEventListener('input', (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px'; });
  $('#chips').innerHTML = CHIPS.map((c, i) => `<button data-c="${i}">${esc(c.length > 34 ? c.slice(0, 33) + '…' : c)}</button>`).join('');
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    $('#chatin').value = CHIPS[+b.dataset.c]; sendChat();
  });

  const cmd = $('#cmd');
  cmd.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = cmd.value.trim(); if (!v) return;
      app.cmdHist.push(v); app.cmdIdx = app.cmdHist.length;
      const r = exec(v);
      flash(r.errors.length ? r.errors[0] : 'OK');
      if (!r.errors.length) cmd.value = '';
    } else if (e.key === 'ArrowUp') {
      if (app.cmdIdx > 0) { app.cmdIdx--; cmd.value = app.cmdHist[app.cmdIdx]; e.preventDefault(); }
    } else if (e.key === 'ArrowDown') {
      if (app.cmdIdx < app.cmdHist.length - 1) { app.cmdIdx++; cmd.value = app.cmdHist[app.cmdIdx]; } else { cmd.value = ''; app.cmdIdx = app.cmdHist.length; }
    }
  });

  $('#runscript').addEventListener('click', () => {
    const r = exec($('#scriptbox').value);
    flash(r.errors.length ? r.errors.length + ' dòng lỗi' : 'Đã chạy script');
    if (r.errors.length) alert('Các dòng lỗi:\n\n' + r.errors.join('\n'));
  });
  $('#dumpscript').addEventListener('click', () => { $('#scriptbox').value = dumpScript(); });
  $('#dslhelp').textContent = DSL_REFERENCE;

  $('#undo').addEventListener('click', undo);
  $('#redo').addEventListener('click', redo);
  $('#zin').addEventListener('click', () => { const c = C(); is3() ? c.zoom(1.2) : c.zoomAt({ x: c.w / 2, y: c.h / 2 }, 1.2); render(); });
  $('#zout').addEventListener('click', () => { const c = C(); is3() ? c.zoom(1 / 1.2) : c.zoomAt({ x: c.w / 2, y: c.h / 2 }, 1 / 1.2); render(); });
  $('#zfit').addEventListener('click', () => { fit(); render(); });
  $('#btnGrid').addEventListener('click', () => { app.opts.grid = !app.opts.grid; LS.set('grid', app.opts.grid); render(); });
  $('#btnSave').addEventListener('click', saveFile);
  $('#btnOpen').addEventListener('click', () => $('#fileopen').click());
  $('#fileopen').addEventListener('change', (e) => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; });
  $('#btnPng').addEventListener('click', exportPng);
  $('#btnSide').addEventListener('click', () => $('#side').classList.toggle('hide'));
  $('#btnTheme').addEventListener('click', () => {
    const sysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const now = document.documentElement.getAttribute('data-theme') || (sysDark ? 'dark' : 'light');
    const next = now === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); LS.set('theme', next); render();
  });
  $('#btnSet').addEventListener('click', () => {
    $('#apikey').value = LS.get('key', '');
    $('#model').value = LS.get('model', 'gemini-2.5-flash');
    $('#setmodal').classList.add('on');
  });
  $('#setcancel').addEventListener('click', () => $('#setmodal').classList.remove('on'));
  $('#setsave').addEventListener('click', () => {
    LS.set('key', $('#apikey').value.trim()); LS.set('model', $('#model').value);
    $('#setmodal').classList.remove('on');
    flash($('#apikey').value.trim() ? 'Đã lưu khoá — trợ lý AI sẵn sàng' : 'Đã xoá khoá');
  });
  $('#setmodal').addEventListener('click', (e) => { if (e.target.id === 'setmodal') e.currentTarget.classList.remove('on'); });

  window.addEventListener('keydown', (e) => {
    const inField = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (inField) return;
    if (e.key === 'Enter' && app.picks.length) { finishTool(); return; }
    if (e.key === 'Escape') { app.picks = []; app.sel.clear(); render(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (app.sel.size) { snap(); for (const id of app.sel) D().remove(id); app.sel.clear(); render(); }
    }
  });
  window.addEventListener('resize', render);
  new ResizeObserver(render).observe($('#svg').parentElement);
}

function boot() {
  const savedTheme = LS.get('theme', '');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  for (const m of ['2d', '3d']) app.doc[m].onChange = () => { };
  buildRail(); bind();
  sysMsg('Chào bạn! Mô tả hình cần vẽ bằng tiếng Việt, mình dựng ngay trên bảng.');
  const noKeyNote = !LS.get('key', '')
    ? sysMsg('Chưa có khoá Gemini — vẫn dùng được bộ luật cài sẵn. Thêm khoá ở ⚙ Cài đặt để vẽ được mọi bài.') : null;
  exec('A=(-4,-2)\nB=(5,-2)\nC=(1,4)\nt=tamgiac(A,B,C)\nH=chanduongcao(A,B,C)\nh=doan(A,H)\ng=goc(B,H,A)');
  fit(); render();
  // Bản chạy trên claude.ai: dùng luôn trợ lý Claude, không cần khoá
  getClaudeCapability('sample').then((s) => {
    if (!s) return;
    app.sampler = s;
    if (noKeyNote) noKeyNote.textContent = 'Trợ lý Claude đã sẵn sàng — bạn có thể hỏi ngay, không cần khoá API.';
  });
  getClaudeCapability('downloads').then((d) => { if (d) app.downloads = d; });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
