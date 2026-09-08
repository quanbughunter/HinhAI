// ============================================================================
// dsl.js — Ngôn ngữ lệnh dựng hình (tiếng Việt không dấu + alias tiếng Anh).
// Đây vừa là "command line" cho người dùng, vừa là API mà AI agent sinh ra.
// ============================================================================

// ---- Tokenizer -------------------------------------------------------------
function lex(src) {
  const ts = [];
  let i = 0;
  const isId = (c) => /[A-Za-z0-9_'À-ỹ]/.test(c);
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { s += src[j]; j++; }
      ts.push({ k: 'str', v: s }); i = j + 1; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i, s = '';
      while (j < src.length && /[0-9.eE]/.test(src[j])) { s += src[j]; j++; }
      ts.push({ k: 'num', v: parseFloat(s) }); i = j; continue;
    }
    if (isId(c) && !/[0-9]/.test(c)) {
      let j = i, s = '';
      while (j < src.length && isId(src[j])) { s += src[j]; j++; }
      ts.push({ k: 'id', v: s }); i = j; continue;
    }
    if ('(),=;+-*/'.includes(c)) { ts.push({ k: c }); i++; continue; }
    i++; // bỏ ký tự lạ
  }
  return ts;
}

const norm = (s) => String(s).toLowerCase()
  .replace(/đ/g, 'd')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[_\s]/g, '');

// ---- Bảng hàm --------------------------------------------------------------
// mỗi hàm: (A = danh sách đối số đã eval, ctx) -> spec {op,args,params} | obj
const F = {};
const def = (names, fn) => names.forEach((n) => { F[norm(n)] = fn; });

const isObj = (x) => x && typeof x === 'object' && x.id;
const isN = (x) => typeof x === 'number';
const need = (x, what) => { if (!isObj(x)) throw new Error('Cần ' + what); return x; };

// --- điểm 2D
def(['diem', 'point', 'd'], (A) => ({ op: 'point', args: [], params: { x: A[0] || 0, y: A[1] || 0 } }));
def(['trungdiem', 'midpoint', 'td'], (A) => ({ op: 'midpoint', args: A.filter(isObj) }));
def(['giao', 'giaodiem', 'intersect'], (A) => ({ op: 'intersect', args: [A[0], A[1]], params: { i: isN(A[2]) ? A[2] : 0 } }));
def(['diemtren', 'pointon', 'thuoc'], (A) => ({ op: 'pointOn', args: [A[0]], params: { t: isN(A[1]) ? A[1] : 0.5 } }));
def(['chia', 'ratio', 'diemchia'], (A) => ({ op: 'ratioPoint', args: [A[0], A[1]], params: { t: isN(A[2]) ? A[2] : 0.5 } }));
def(['trongtam', 'centroid', 'g'], (A) => ({ op: 'centroid', args: A.slice(0, 3) }));
def(['tamngoaitiep', 'circumcenter'], (A) => ({ op: 'circumcenter', args: A.slice(0, 3) }));
def(['tamnoitiep', 'incenter'], (A) => ({ op: 'incenter', args: A.slice(0, 3) }));
def(['tructam', 'orthocenter'], (A) => ({ op: 'orthocenter', args: A.slice(0, 3) }));
def(['chan', 'hinhchieu', 'foot', 'projection'], (A) => ({ op: 'foot', args: [A[0], A[1]] }));
def(['chanduongcao', 'footaltitude'], (A) => ({ op: 'footBC', args: A.slice(0, 3) }));
def(['doixung', 'reflect', 'dx'], (A) => ({ op: 'reflectPt', args: [A[0], A[1]] }));
def(['quay', 'rotate'], (A) => ({ op: 'rotatePt', args: [A[0], A[1]], params: { ang: isN(A[2]) ? A[2] : 90 } }));
def(['tinhtien', 'translate'], (A) => (isObj(A[1])
  ? { op: 'translatePt', args: [A[0], A[1]] }
  : { op: 'translatePt', args: [A[0]], params: { dx: A[1] || 0, dy: A[2] || 0 } }));
def(['vitu', 'dilate'], (A) => ({ op: 'dilatePt', args: [A[0], A[1]], params: { k: isN(A[2]) ? A[2] : 2 } }));

// --- đường 2D
def(['doan', 'doanthang', 'segment', 'seg'], (A) => ({ op: 'segment', args: [A[0], A[1]] }));
def(['duongthang', 'dt', 'line'], (A) => ({ op: 'line', args: [A[0], A[1]] }));
def(['tia', 'ray'], (A) => ({ op: 'ray', args: [A[0], A[1]] }));
def(['vecto', 'vector'], (A) => ({ op: 'vector', args: [A[0], A[1]] }));
def(['vuonggoc', 'perp', 'perpendicular'], (A) => ({ op: 'perpLine', args: orderLP(A) }));
def(['songsong', 'para', 'parallel'], (A) => ({ op: 'paraLine', args: orderLP(A) }));
def(['trungtruc', 'perpbisector', 'tt'], (A) => ({ op: 'perpBisector', args: [A[0], A[1]] }));
def(['phangiac', 'bisector', 'pg'], (A) => ({ op: 'bisector', args: A.slice(0, 3) }));
def(['duongcao', 'altitude', 'dc'], (A) => ({ op: 'altitude', args: A.slice(0, 3) }));
def(['trungtuyen', 'median'], (A) => ({ op: 'median', args: A.slice(0, 3) }));
def(['tieptuyen', 'tangent'], (A) => ({ op: 'tangent', args: [A[0], A[1]], params: { i: isN(A[2]) ? A[2] : 0 } }));

// đối số có thể viết (P, d) hoặc (d, P) — tự sắp lại thành (đường, điểm)
function orderLP(A) {
  const a = A[0], b = A[1];
  if (isObj(a) && a.type === 'point') return [b, a];
  return [a, b];
}

// --- đường tròn
def(['duongtron', 'circle', 'dtr'], (A) => (isN(A[1])
  ? { op: 'circleR', args: [A[0]], params: { r: A[1] } }
  : (isObj(A[1]) && A[1].type === 'number'
    ? { op: 'circleR', args: [A[0], A[1]] }
    : { op: 'circleCP', args: [A[0], A[1]] })));
def(['duongtronqua', 'ngoaitiep', 'circle3', 'circumcircle'], (A) => ({ op: 'circle3', args: A.slice(0, 3) }));
def(['duongtronnoitiep', 'noitiep', 'incircle'], (A) => ({ op: 'incircle', args: A.slice(0, 3) }));

// --- đa giác
def(['dagiac', 'polygon'], (A) => ({ op: 'polygon', args: A.filter(isObj) }));
def(['tamgiac', 'triangle'], (A) => ({ op: 'polygon', args: A.slice(0, 3) }));
def(['tugiac', 'quad'], (A) => ({ op: 'polygon', args: A.slice(0, 4) }));

// --- đo đạc
def(['khoangcach', 'dist', 'distance', 'kc'], (A) => ({ op: 'distance', args: [A[0], A[1]].filter((x) => x != null) }));
def(['goc', 'angle'], (A) => ({ op: 'angleM', args: A.slice(0, 3) }));
def(['dientich', 'area'], (A) => ({ op: 'areaM', args: [A[0]] }));
def(['so', 'number'], (A) => ({ op: 'numberFree', args: [], params: { v: A[0] || 0 } }));
def(['chu', 'text', 'nhan'], (A) => ({ op: 'text', args: [], params: { s: String(A[0] == null ? '' : A[0]), x: A[1] || 0, y: A[2] || 0 } }));

// --- 3D
def(['diem3', 'point3', 'd3'], (A) => ({ op: 'point3', args: [], params: { x: A[0] || 0, y: A[1] || 0, z: A[2] || 0 } }));
def(['trungdiem3', 'mid3'], (A) => ({ op: 'mid3', args: [A[0], A[1]] }));
def(['chia3', 'ratio3'], (A) => ({ op: 'ratio3', args: [A[0], A[1]], params: { t: isN(A[2]) ? A[2] : 0.5 } }));
def(['doan3', 'segment3', 'canh'], (A) => ({ op: 'segment3', args: [A[0], A[1]] }));
def(['duongthang3', 'line3'], (A) => ({ op: 'line3', args: [A[0], A[1]] }));
def(['mat', 'face'], (A) => ({ op: 'face', args: A.filter(isObj) }));
def(['chop', 'hinhchop', 'pyramid'], (A) => ({ op: 'pyramid', args: A.filter(isObj) }));
def(['langtru', 'prism'], (A) => {
  const objs = A.filter(isObj); const nums = A.filter(isN);
  return { op: 'prism', args: objs, params: { h: nums[0] == null ? 4 : nums[0] } };
});
def(['hop', 'hinhhop', 'box'], (A) => ({ op: 'box', args: [A[0]].filter(isObj), params: { a: A[1] == null ? 4 : A[1], b: A[2] == null ? 3 : A[2], c: A[3] == null ? 3 : A[3] } }));
def(['matcau', 'sphere', 'mc'], (A) => (isN(A[1])
  ? { op: 'sphere', args: [A[0]], params: { r: A[1] } }
  : { op: 'sphere', args: [A[0], A[1]] }));
def(['mp', 'matphang', 'plane'], (A) => ({ op: 'plane3', args: A.slice(0, 3) }));
def(['thietdien', 'section'], (A) => ({ op: 'section', args: A.filter(isObj).slice(0, 4) }));
def(['giao3', 'meet3'], (A) => ({ op: 'meet3', args: A.slice(0, 3) }));
def(['kc3', 'dist3'], (A) => ({ op: 'dist3', args: [A[0], A[1]].filter((x) => x != null) }));

export const FUNC_NAMES = Object.keys(F);

// ---- Parser / Interpreter --------------------------------------------------
class Parser {
  constructor(ts, doc, ctx) { this.ts = ts; this.i = 0; this.doc = doc; this.ctx = ctx; }
  peek(k = 0) { return this.ts[this.i + k]; }
  eat(k) { const t = this.ts[this.i]; if (t && t.k === k) { this.i++; return t; } return null; }

  expr() {
    // số có dấu / phép toán đơn giản trên số
    let v = this.atom();
    while (this.peek() && '+-*/'.includes(this.peek().k)) {
      const op = this.ts[this.i].k; this.i++;
      const r = this.atom();
      if (isN(v) && isN(r)) v = op === '+' ? v + r : op === '-' ? v - r : op === '*' ? v * r : v / r;
      else throw new Error('Phép toán chỉ áp dụng cho số');
    }
    return v;
  }

  atom() {
    const t = this.peek();
    if (!t) throw new Error('Thiếu đối số');
    if (t.k === '-') { this.i++; const v = this.atom(); if (!isN(v)) throw new Error('Dấu trừ cần số'); return -v; }
    if (t.k === 'num') { this.i++; return t.v; }
    if (t.k === 'str') { this.i++; return t.v; }
    if (t.k === '(') { // bộ (x,y) hoặc (x,y,z)
      this.i++;
      const xs = [];
      while (!this.eat(')')) {
        xs.push(this.expr());
        this.eat(',');
        if (!this.peek()) throw new Error('Thiếu )');
      }
      if (xs.length === 2) return this.mk({ op: 'point', args: [], params: { x: xs[0], y: xs[1] } });
      if (xs.length === 3) return this.mk({ op: 'point3', args: [], params: { x: xs[0], y: xs[1], z: xs[2] } });
      throw new Error('Toạ độ phải có 2 hoặc 3 số');
    }
    if (t.k === 'id') {
      this.i++;
      const name = t.v;
      if (this.peek() && this.peek().k === '(') {
        this.i++;
        const args = [];
        while (!this.eat(')')) {
          args.push(this.expr());
          this.eat(',');
          if (!this.peek()) throw new Error('Thiếu ) sau ' + name);
        }
        const f = F[norm(name)];
        if (!f) throw new Error('Không có lệnh "' + name + '"');
        return this.mk(f(args, this.ctx));
      }
      // tên đối tượng đã có
      const o = this.doc.byName(name);
      if (o) return o;
      throw new Error('Chưa có đối tượng "' + name + '"');
    }
    throw new Error('Cú pháp sai');
  }

  mk(spec) {
    if (isObj(spec)) return spec;
    const args = (spec.args || []).filter((a) => a != null).map((a) => {
      if (isObj(a)) return a;
      throw new Error('Đối số không hợp lệ trong ' + spec.op);
    });
    return this.doc.add({ ...spec, args, style: this.ctx.style });
  }
}

// ---- Câu lệnh đặc biệt -----------------------------------------------------
const STMT = {
  xoa: (doc, a) => { const o = doc.byName(a[0]); if (o) doc.remove(o.id); },
  an: (doc, a) => { const o = doc.byName(a[0]); if (o) { o.visible = false; doc.touch(); } },
  hien: (doc, a) => { const o = doc.byName(a[0]); if (o) { o.visible = true; doc.touch(); } },
  mau: (doc, a) => { const o = doc.byName(a[0]); if (o) { o.style = { ...o.style, color: a[1] }; doc.touch(); } },
  net: (doc, a) => { const o = doc.byName(a[0]); if (o) { o.style = { ...o.style, dash: a[1] === 'dut' || a[1] === 'dash' ? '6 5' : null }; doc.touch(); } },
  to: (doc, a) => { const o = doc.byName(a[0]); if (o) { o.style = { ...o.style, width: parseFloat(a[1]) || 2 }; doc.touch(); } },
  doiten: (doc, a) => { const o = doc.byName(a[0]); if (o) { o.name = a[1]; doc.touch(); } },
  xoahet: (doc) => doc.clear(),
};
STMT.delete = STMT.xoa; STMT.hide = STMT.an; STMT.show = STMT.hien;
STMT.color = STMT.mau; STMT.clear = STMT.xoahet; STMT.rename = STMT.doiten;

/**
 * Chạy một script DSL.
 * @returns {{created:Array, errors:Array<string>, ok:number}}
 */
export function runScript(doc, src, opts = {}) {
  const created = [];
  const errors = [];
  let ok = 0;
  const lines = String(src || '').split(/[\n;]/);
  // Giữ chỗ trước cho các tên sẽ được gán, tránh đối tượng phụ tự đặt trùng tên
  const prevReserved = doc.reserved;
  doc.reserved = new Set(lines.map((l) => {
    const m = l.replace(/\/\/.*$/, '').match(/^\s*([A-Za-z][A-Za-z0-9_'À-ỹ]*)\s*=/);
    return m ? m[1] : null;
  }).filter(Boolean));
  for (let raw of lines) {
    const line = raw.replace(/\/\/.*$/, '').replace(/^\s*#.*$/, '').trim();
    if (!line) continue;
    try {
      // câu lệnh dạng "xoa A", "mau d #ff0000"
      const w = line.split(/\s+/);
      const head = norm(w[0]);
      if (STMT[head] && !line.includes('(') && !line.includes('=')) {
        STMT[head](doc, w.slice(1).map((s) => s.replace(/^["']|["']$/g, '')));
        ok++; continue;
      }
      const eq = splitAssign(line);
      const ctx = { style: opts.style };
      // Định nghĩa lại tên đã có: nếu cùng là điểm tự do thì chỉ dời điểm (giữ nguyên hình phụ thuộc)
      if (eq.name) {
        const old = doc.byName(eq.name);
        if (old) {
          const m = eq.body.match(/^\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*(?:,\s*(-?[\d.]+)\s*)?\)$/);
          if (m && (old.op === 'point' || old.op === 'point3')) {
            old.params.x = parseFloat(m[1]); old.params.y = parseFloat(m[2]);
            if (m[3] != null) old.params.z = parseFloat(m[3]);
            doc.recompute(); ok++; continue;
          }
          doc.remove(old.id);
        }
      }
      const p = new Parser(lex(eq.body), doc, ctx);
      const before = doc.order.length;
      const res = p.expr();
      if (isObj(res) && eq.name && res.name !== eq.name) { res.name = eq.name; }
      for (let k = before; k < doc.order.length; k++) created.push(doc.get(doc.order[k]));
      ok++;
    } catch (e) {
      errors.push(line + '  →  ' + (e && e.message ? e.message : String(e)));
    }
  }
  doc.reserved = prevReserved;
  doc.recompute();
  doc.touch();
  return { created, errors, ok };
}

function splitAssign(line) {
  const m = line.match(/^\s*([A-Za-z][A-Za-z0-9_'À-ỹ]*)\s*=\s*(.+)$/);
  if (m) return { name: m[1], body: m[2] };
  return { name: null, body: line };
}
