// Kết xuất hình ra tệp .svg để xem lại bằng mắt (không cần trình duyệt).
import { writeFileSync } from 'node:fs';
import { GeoDoc } from '../src/core/model.js';
import { runScript } from '../src/core/dsl.js';
import { Cam2, Cam3, render2, render3 } from '../src/ui/render.js';

const CSS = `<style>
.grid{stroke:#e3e7f4;stroke-width:1;fill:none}.grid2{stroke:#eef0f8;stroke-width:.7;fill:none}
.axis{stroke:#8c96b2;stroke-width:1.2;fill:none}
.tick{font-size:10.5px;fill:#6b7794;text-anchor:middle;font-family:sans-serif}
.lbl{font-size:15px;font-weight:600;font-family:serif;font-style:italic;paint-order:stroke;stroke:#fff;stroke-width:3.5px;stroke-linejoin:round}
.lbl.plain{font-style:normal;font-family:sans-serif;font-size:12.5px}
</style>`;
const HATCH = [[0,45,'#b3261e'],[1,-45,'#22468f'],[2,0,'#1f7a5a']]
  .map(([i,g,c]) => `<pattern id="hatch${i}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(${g})"><line x1="0" y1="0" x2="0" y2="9" stroke="${c}" stroke-width="1.15" opacity=".75"/></pattern>`).join('');
const DEFS0 = ['arw|#16233d', 'arwr|#b3261e', 'arwg|#1f7a5a', 'arwb|#22468f']
  .map((s) => s.split('|')).map(([id, c]) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('');
const DEFS = DEFS0 + HATCH;

function fitCam2(doc, cam) {
  const pts = [];
  for (const o of doc.list()) {
    if (!o.val) continue;
    if (o.type === 'point') pts.push(o.val);
    else if (o.val.t === 'circle') pts.push({ x: o.val.c.x - o.val.r, y: o.val.c.y - o.val.r }, { x: o.val.c.x + o.val.r, y: o.val.c.y + o.val.r });
    else if (o.val.t === 'poly') pts.push(...o.val.pts);
  }
  if (!pts.length) return;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  cam.cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  cam.cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  cam.scale = Math.max(6, Math.min(200, Math.min(
    (cam.w - 120) / Math.max(1, Math.max(...xs) - Math.min(...xs)),
    (cam.h - 120) / Math.max(1, Math.max(...ys) - Math.min(...ys)))));
}

function shot(name, script, mode) {
  const doc = new GeoDoc();
  const r = runScript(doc, script);
  if (r.errors.length) console.log('  ! lỗi:', r.errors.join(' | '));
  const cam = mode === '3d' ? new Cam3() : new Cam2();
  cam.w = 820; cam.h = 560;
  if (mode === '3d') { cam.scale = 48; cam.oy = 40; }
  else if (doc.list().some((o) => o.val && (o.val.t === 'mien' || o.val.t === 'khoang'))) { cam.cx = 2; cam.cy = 1.5; cam.scale = 52; }
  else fitCam2(doc, cam);
  const body = mode === '3d'
    ? render3(doc, cam, { grid: true, axes: true, selected: new Set() })
    : render2(doc, cam, { grid: true, axes: true, selected: new Set() });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="560" viewBox="0 0 820 560">${CSS}<defs>${DEFS}</defs><rect width="820" height="560" fill="#fff"/>${body}</svg>`;
  writeFileSync(new URL(`../dist/${name}.svg`, import.meta.url), svg);
  console.log(`  ${name}.svg — ${doc.order.length} đối tượng`);
}

console.log('Kết xuất ảnh mẫu:');
shot('shot-2d', `
A=(-4,-2)
B=(5,-2)
C=(1,4)
t=tamgiac(A,B,C)
H=chanduongcao(A,B,C)
h=doan(A,H)
g=goc(B,H,A)
O=tamngoaitiep(A,B,C)
c=duongtronqua(A,B,C)
M=trungdiem(B,C)
m=trungtruc(A,B)
d=khoangcach(A,B)
`, '2d');

shot('shot-mien', `
mien 2x+3y<=6
`, '2d');

shot('shot-hemien', `
H = hemien x>=0, y>=0, x+y<=4, 2x+y<=6
A = khoang [-1;3]
`, '2d');

shot('shot-3d', `
A=(0,0,0)
B=(6,0,0)
C=(6,5,0)
D=(0,5,0)
S=(3,2.5,7)
K=chop(A,B,C,D,S)
M=trungdiem3(S,A)
N=trungdiem3(S,B)
P=trungdiem3(S,C)
td=thietdien(K,M,N,P)
`, '3d');
