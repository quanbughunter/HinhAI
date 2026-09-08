// ============================================================================
// model.js — Mô hình đối tượng + đồ thị phụ thuộc.
// Nguyên tắc: mỗi đối tượng chỉ là một "công thức dựng hình" trỏ tới cha của nó.
// Kéo 1 điểm tự do -> tính lại toàn bộ theo thứ tự tạo (đã là thứ tự tô-pô).
// ============================================================================

import { OPS } from './ops2d.js';
import { OPS3 } from './ops3d.js';

export const ALL_OPS = { ...OPS, ...OPS3 };

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';

export class GeoDoc {
  constructor() {
    this.objs = new Map();   // id -> obj
    this.order = [];         // id theo thứ tự tạo = thứ tự tính toán
    this.seq = 0;
    this.onChange = null;
    this.reserved = null;   // tên sẽ được gán ở các dòng sau của script -> không tự đặt trùng
  }

  // --- tiện ích ---
  get(id) { return this.objs.get(id); }
  byName(name) {
    if (name == null) return null;
    for (const id of this.order) {
      const o = this.objs.get(id);
      if (o.name === name) return o;
    }
    return null;
  }
  list() { return this.order.map((id) => this.objs.get(id)); }
  points() { return this.list().filter((o) => o.type === 'point'); }

  nextName(type) {
    const used = new Set(this.list().map((o) => o.name));
    if (this.reserved) for (const r of this.reserved) used.add(r);
    const pool = type === 'point' || type === 'p3' ? UPPER : LOWER;
    for (let k = 0; k < 40; k++) {
      for (const ch of pool) {
        const n = k === 0 ? ch : ch + k;
        if (!used.has(n)) return n;
      }
    }
    return 'o' + ++this.seq;
  }

  /** Tạo đối tượng mới. spec: {op, args:[obj|id|name], params, name, style, visible} */
  add(spec) {
    const def = ALL_OPS[spec.op];
    if (!def) throw new Error('Phép dựng không tồn tại: ' + spec.op);
    const args = (spec.args || []).map((a) => {
      if (a == null) return null;
      if (typeof a === 'object') return a.id;
      if (this.objs.has(a)) return a;
      const o = this.byName(a);
      if (!o) throw new Error('Không tìm thấy đối tượng: ' + a);
      return o.id;
    });
    const id = 'o' + ++this.seq;
    const type = typeof def.type === 'function'
      ? def.type(args.map((a) => this.get(a)), spec.params || {})
      : def.type;
    const obj = {
      id,
      name: spec.name || this.nextName(type),
      type,
      op: spec.op,
      args,
      params: { ...(spec.params || {}) },
      val: null,
      visible: spec.visible !== false,
      showLabel: spec.showLabel !== false,
      style: { ...(def.style || {}), ...(spec.style || {}) },
      fixed: !!spec.fixed,
    };
    this.objs.set(id, obj);
    this.order.push(id);
    this.evalOne(obj);
    this.touch();
    return obj;
  }

  evalOne(obj) {
    const def = ALL_OPS[obj.op];
    try {
      const vals = obj.args.map((a) => {
        const p = this.objs.get(a);
        return p ? p.val : null;
      });
      obj.val = def.fn(vals, obj.params, obj, this);
    } catch (e) {
      obj.val = null;
    }
    return obj.val;
  }

  recompute() {
    for (const id of this.order) this.evalOne(this.objs.get(id));
  }

  /** Tập id phụ thuộc (con cháu) của id đã cho, kể cả chính nó. */
  descendants(id) {
    const out = new Set([id]);
    for (const oid of this.order) {
      const o = this.objs.get(oid);
      if (o.args.some((a) => out.has(a))) out.add(oid);
    }
    return out;
  }

  remove(id) {
    const kill = this.descendants(id);
    for (const k of kill) this.objs.delete(k);
    this.order = this.order.filter((x) => !kill.has(x));
    this.touch();
    return kill.size;
  }

  clear() {
    this.objs.clear();
    this.order = [];
    this.seq = 0;
    this.touch();
  }

  /** Di chuyển 1 đối tượng "tự do" tới vị trí mới (kéo chuột). */
  moveTo(obj, pos) {
    if (!obj || obj.fixed) return false;
    const def = ALL_OPS[obj.op];
    if (!def.drag) return false;
    def.drag(obj, pos, this);
    this.recompute();
    this.touch();
    return true;
  }

  isDraggable(obj) {
    const def = ALL_OPS[obj.op];
    return !!(def && def.drag) && !obj.fixed;
  }

  touch() { if (this.onChange) this.onChange(); }

  // --- lưu / mở ---
  toJSON() {
    return {
      v: 1,
      seq: this.seq,
      objs: this.order.map((id) => {
        const o = this.objs.get(id);
        return {
          id: o.id, name: o.name, op: o.op, args: o.args, params: o.params,
          visible: o.visible, showLabel: o.showLabel, style: o.style, fixed: o.fixed, lab: o.lab || null,
        };
      }),
    };
  }
  static fromJSON(data) {
    const d = new GeoDoc();
    d.seq = data.seq || 0;
    for (const s of data.objs) {
      const def = ALL_OPS[s.op];
      if (!def) continue;
      const type = typeof def.type === 'function'
        ? def.type(s.args.map((a) => d.objs.get(a)), s.params || {})
        : def.type;
      const o = { ...s, type, val: null, style: { ...(def.style || {}), ...(s.style || {}) } };
      d.objs.set(o.id, o);
      d.order.push(o.id);
    }
    d.recompute();
    return d;
  }
}
