// ============================================================================
// agent.js — AI agent: đổi câu tiếng Việt thành script DSL rồi thi hành ngay.
// 3 tầng: (1) luật offline cho câu quen thuộc → (2) Gemini → (3) Claude runtime.
// ============================================================================

export const DSL_REFERENCE = `
TOẠ ĐỘ & ĐIỂM (2D)
  A = (x,y)                     điểm tự do
  M = trungdiem(A,B)            trung điểm
  I = giao(d1,d2)  |  giao(d,c,0) / giao(d,c,1)   giao điểm (số 0/1 chọn nghiệm)
  P = diemtren(c)  |  diemtren(d,0.3)             điểm thuộc đối tượng
  N = chia(A,B,0.25)            điểm chia AB theo tỉ lệ (0→A, 1→B)
  G = trongtam(A,B,C)   O = tamngoaitiep(A,B,C)
  I = tamnoitiep(A,B,C) H = tructam(A,B,C)
  F = chan(P, d)                hình chiếu vuông góc của P lên đường d
  H = chanduongcao(A,B,C)       chân đường cao hạ từ A xuống BC
  A' = doixung(A, m)            m là điểm hoặc đường thẳng
  B' = quay(A,O,90)   C' = vitu(A,O,2)   D' = tinhtien(A, u) | tinhtien(A, dx, dy)

ĐƯỜNG (2D)
  doan(A,B)  duongthang(A,B)  tia(A,B)  vecto(A,B)
  vuonggoc(d,P)   songsong(d,P)   trungtruc(A,B)
  phangiac(A,B,C)  (phân giác góc đỉnh B)
  duongcao(A,B,C)  (đường cao từ A)      trungtuyen(A,B,C)
  tieptuyen(c,P,0) / tieptuyen(c,P,1)

ĐƯỜNG TRÒN
  duongtron(O,A)     tâm O qua A
  duongtron(O, 5)    tâm O bán kính 5
  duongtronqua(A,B,C) = ngoaitiep(A,B,C)      noitiep(A,B,C)

ĐA GIÁC & ĐO ĐẠC
  tamgiac(A,B,C)   tugiac(A,B,C,D)   dagiac(A,B,C,D,E)
  khoangcach(A,B)   goc(A,B,C)   dientich(t)   chu("nội dung", x, y)

HÌNH KHÔNG GIAN (3D)
  A = (x,y,z)                    điểm 3D (3 số)
  doan3(A,B)   duongthang3(A,B)  mat(A,B,C,D)
  chop(A,B,C,D,S)                hình chóp: các đỉnh đáy rồi ĐỈNH CHÓP ở cuối
  langtru(A,B,C, 6)              lăng trụ đứng đáy ABC, chiều cao 6
  hop(A, 4,3,3)                  hình hộp chữ nhật từ đỉnh A
  matcau(O, 3)                   mặt cầu
  mp(A,B,C)                      mặt phẳng qua 3 điểm
  thietdien(K, M,N,P)            THIẾT DIỆN của khối K cắt bởi mp(MNP)
  giao3(A,B, mp1)                giao của đường AB với mặt phẳng
  trungdiem3(A,B)   chia3(A,B,t)   kc3(A,B)

LỆNH KHÁC
  an X | hien X | xoa X | mau X #ff0000 | net X dut | doiten X Y | xoahet
`.trim();

export const SYSTEM_PROMPT = `Bạn là trợ lý dựng hình cho học sinh Việt Nam cấp 2 - cấp 3.
Nhiệm vụ: đọc yêu cầu bằng tiếng Việt và trả về SCRIPT theo đúng ngôn ngữ lệnh dưới đây để ứng dụng vẽ hình.

${DSL_REFERENCE}

QUY TẮC BẮT BUỘC
1. Chỉ dùng đúng các lệnh trong danh sách. Không bịa lệnh mới, không dùng cú pháp GeoGebra.
2. Mỗi dòng một lệnh, dạng "TÊN = biểu_thức". Tên điểm viết HOA, tên đường/đường tròn viết thường.
3. Điểm tự do phải có toạ độ cụ thể, chọn số đẹp, hình cân đối, nằm gọn trong khoảng -10..10 (3D: 0..8).
4. Nếu bài cho quan hệ (vuông, cân, đều, trung điểm, tiếp xúc...) hãy chọn toạ độ THOẢ MÃN chính xác quan hệ đó,
   ví dụ tam giác đều cạnh 6: A=(0,0) B=(6,0) C=(3,5.196).
5. Vẽ luôn cả hình phụ mà đề bài nhắc tới (đường cao, trung tuyến, đường tròn ngoại tiếp...).
6. Chỉ tạo thêm đối tượng mới; đối tượng đã có trong danh sách hiện tại thì dùng lại tên, đừng định nghĩa lại.
7. Với hình không gian: dùng toạ độ 3 thành phần và lệnh nhóm 3D. Đáy thường nằm ở z = 0.
8. Không giải thích trong script. Giải thích ngắn (1-2 câu tiếng Việt) đặt ở trường "giai_thich".

Trả lời DUY NHẤT một đối tượng JSON: {"giai_thich": "...", "script": "..."}`;

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { giai_thich: { type: 'STRING' }, script: { type: 'STRING' } },
  required: ['script'],
};

/** Mô tả ngắn tình trạng bảng vẽ để AI biết đang có gì */
export function describeDoc(doc, mode) {
  const items = doc.list().filter((o) => o.visible).map((o) => {
    let v = '';
    if (o.val && o.type === 'point') v = `(${rr2(o.val.x)}, ${rr2(o.val.y)})`;
    else if (o.val && o.val.t === 'p3') v = `(${rr2(o.val.x)}, ${rr2(o.val.y)}, ${rr2(o.val.z)})`;
    else if (o.val && o.val.t === 'circle') v = `tâm (${rr2(o.val.c.x)}, ${rr2(o.val.c.y)}) R=${rr2(o.val.r)}`;
    return `${o.name}: ${o.op}${v ? ' ' + v : ''}`;
  });
  return `Chế độ: ${mode === '3d' ? 'hình không gian 3D' : 'hình phẳng 2D'}.\n`
    + (items.length ? `Đang có ${items.length} đối tượng:\n` + items.join('\n') : 'Bảng vẽ đang trống.');
}
const rr2 = (v) => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- Gemini
/**
 * Địa chỉ proxy giữ khoá Gemini dùng chung cho mọi người mở trang.
 * Điền địa chỉ Worker của bạn vào đây rồi chạy `npm run bundle` là học sinh
 * dùng được ngay mà không cần khoá riêng. Để trống nếu không dùng proxy.
 * Ví dụ: 'https://hinhai-proxy.ten-cua-ban.workers.dev'
 */
export const DEFAULT_PROXY = 'https://hinhai-proxy.nguyendinhquan7788266.workers.dev';

/** Dựng phần thân yêu cầu gửi cho Gemini (dùng chung cho cả hai đường đi) */
function geminiBody(history, context) {
  // Gemini yêu cầu hội thoại bắt đầu và kết thúc bằng lượt của người dùng
  const h = history.filter((m) => m && m.text);
  while (h.length && h[h.length - 1].role !== 'user') h.pop();
  while (h.length && h[0].role !== 'user') h.shift();
  const contents = h.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
  if (contents.length) contents[contents.length - 1].parts[0].text = `[TÌNH TRẠNG BẢNG VẼ]\n${context}\n\n[YÊU CẦU]\n${contents[contents.length - 1].parts[0].text}`;
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.15, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
  };
}

/** Lỗi tạm thời phía Google: đáng thử lại sau vài giây */
const QUA_TAI = /high demand|overload|unavailable|try again later|rate limit|resource_exhausted|too many requests/i;

/** Dịch mấy thông báo hay gặp sang tiếng Việt cho dễ hiểu */
function dichLoi(msg) {
  const m = String(msg);
  if (QUA_TAI.test(m)) return 'Model đang quá tải, mình đã thử lại vài lần vẫn chưa được. Đợi khoảng nửa phút rồi gửi lại nhé.';
  if (/user location is not supported/i.test(m)) return 'Google chặn gọi trực tiếp từ vị trí này. Hãy dùng máy chủ trung gian (xem ⚙ Cài đặt).';
  if (/api key not valid|api_key_invalid/i.test(m)) return 'Khoá API không hợp lệ hoặc đã bị xoá.';
  if (/quota|billing/i.test(m)) return 'Đã hết hạn mức miễn phí của Gemini cho hôm nay.';
  if (/no longer available/i.test(m)) return 'Tên model đã cũ, cần đổi sang model mới hơn. ' + m;
  if (/failed to fetch|load failed|networkerror/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  return m;
}

/** Gọi lại tối đa 3 lần khi gặp lỗi quá tải, giãn dần 1,2s rồi 2,4s */
async function thuLai(fn, soLan = 3) {
  let loiCuoi;
  for (let i = 0; i < soLan; i++) {
    try { return await fn(); } catch (e) {
      loiCuoi = e;
      if (!QUA_TAI.test(e.message || '')) break;
      if (i < soLan - 1) await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw new Error(dichLoi(loiCuoi && loiCuoi.message));
}

async function docKetQua(res) {
  if (!res.ok) {
    let msg = `Lỗi ${res.status}`;
    try { const e = await res.json(); msg = e.error?.message || msg; } catch (_) { }
    throw new Error(msg);
  }
  const data = await res.json();
  const txt = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  return parseJSONLoose(txt);
}

/** Gọi thẳng Gemini bằng khoá riêng của người dùng */
export async function askGemini({ key, model, history, context }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const goi = JSON.stringify(geminiBody(history, context));
  return thuLai(async () => docKetQua(await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: goi,
  })));
}

/** Gọi qua proxy — người dùng không cần khoá, khoá nằm ở phía máy chủ */
export async function askViaProxy({ url, history, context }) {
  const goi = JSON.stringify(geminiBody(history, context));
  return thuLai(async () => docKetQua(await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: goi,
  })));
}

// ------------------------------------------------- Claude runtime (bản Artifact)
/** Lấy khả năng "hỏi Claude" nếu trang đang chạy trên claude.ai; ngược lại trả null */
export async function getClaudeCapability(name) {
  try {
    if (typeof window === 'undefined' || !window.claude || typeof window.claude.use !== 'function') return null;
    return await window.claude.use(name);
  } catch (_) { return null; }
}

/** Dùng runtime của Artifact — không cần API key */
export async function askClaudeRuntime({ sample, history, context }) {
  const last = history[history.length - 1]?.text || '';
  const turns = [{ role: 'user', content: `${SYSTEM_PROMPT}\n\n[TÌNH TRẠNG BẢNG VẼ]\n${context}\n\n[YÊU CẦU]\n${last}\n\nChỉ in ra JSON.` }];
  const out = await sample.json(turns, { modelTier: 'default' });
  return typeof out === 'string' ? parseJSONLoose(out) : out;
}

export function parseJSONLoose(txt) {
  const t = String(txt).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (_) { }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) { } }
  return { giai_thich: '', script: t };
}

// ---------------------------------------------------------------- Luật offline
const strip = (s) => s.toLowerCase().replace(/đ/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '');
const UP = (n) => n.toUpperCase();

/**
 * Bộ luật xử lý các câu quen thuộc, chạy ngay không cần mạng.
 * @returns {{script:string, note:string}|null}
 */
export function localParse(text, doc) {
  const s = strip(text).trim();
  const has = (n) => !!doc.byName(n);
  const L = [];
  const note = [];

  // --- tam giác ---
  let m = s.match(/tam giac\s+([a-z])\s*([a-z])\s*([a-z])/);
  if (m) {
    const [A, B, C] = [UP(m[1]), UP(m[2]), UP(m[3])];
    let pts;
    if (/\bdeu\b/.test(s)) { pts = [[0, 0], [6, 0], [3, 5.196]]; note.push('tam giác đều cạnh 6'); }
    else if (/vuong can/.test(s)) { pts = [[0, 0], [6, 0], [0, 6]]; note.push('vuông cân tại ' + A); }
    else if (/vuong/.test(s)) {
      const at = (s.match(/vuong tai\s+([a-z])/) || [])[1];
      const k = at ? [m[1], m[2], m[3]].indexOf(at) : 0;
      const base = [[0, 0], [6, 0], [0, 8]];
      pts = [base[(3 - k) % 3], base[(4 - k) % 3], base[(5 - k) % 3]];
      pts = k === 0 ? [[0, 0], [6, 0], [0, 8]] : k === 1 ? [[6, 0], [0, 0], [0, 8]] : [[0, 8], [6, 0], [0, 0]];
      note.push('vuông tại ' + UP(at || m[1]));
    } else if (/\bcan\b/.test(s)) { pts = [[0, 6], [-4, 0], [4, 0]]; note.push('cân tại ' + A); }
    else pts = [[0, 0], [7, 0], [2, 5]];
    [A, B, C].forEach((n, i) => { if (!has(n)) L.push(`${n} = (${pts[i][0]}, ${pts[i][1]})`); });
    L.push(`t${A}${B}${C} = tamgiac(${A},${B},${C})`);
    if (/duong cao/.test(s)) { L.push(`H${A} = chanduongcao(${A},${B},${C})`, `h${A} = doan(${A},H${A})`); note.push('kèm đường cao'); }
    if (/trung tuyen/.test(s)) L.push(`mt = trungtuyen(${A},${B},${C})`);
    if (/ngoai tiep/.test(s)) L.push(`cng = ngoaitiep(${A},${B},${C})`);
    if (/noi tiep/.test(s)) L.push(`cnt = noitiep(${A},${B},${C})`);
    if (/trong tam/.test(s)) L.push(`G = trongtam(${A},${B},${C})`);
    if (/truc tam/.test(s)) L.push(`H = tructam(${A},${B},${C})`);
    return { script: L.join('\n'), note: 'Dựng ' + note.join(', ') };
  }

  // --- hình chóp S.ABCD ---
  m = s.match(/(?:hinh\s+)?chop\s+([a-z])\s*\.?\s*([a-z]{3,4})/);
  if (m) {
    const S = UP(m[1]);
    const base = m[2].toUpperCase().split('');
    const n = base.length;
    const coords = n === 3 ? [[0, 0, 0], [6, 0, 0], [2, 5, 0]] : [[0, 0, 0], [6, 0, 0], [6, 5, 0], [0, 5, 0]];
    base.forEach((b, i) => { if (!has(b)) L.push(`${b} = (${coords[i].join(', ')})`); });
    const cx = coords.reduce((a, c) => a + c[0], 0) / n, cy = coords.reduce((a, c) => a + c[1], 0) / n;
    if (!has(S)) L.push(`${S} = (${Math.round(cx * 10) / 10}, ${Math.round(cy * 10) / 10}, 7)`);
    L.push(`K = chop(${base.join(',')},${S})`);
    return { script: L.join('\n'), note: `Dựng hình chóp ${S}.${base.join('')}` };
  }

  // --- lăng trụ ---
  m = s.match(/lang tru\s+([a-z]{3,4})/);
  if (m) {
    const base = m[1].toUpperCase().split('');
    const coords = base.length === 3 ? [[0, 0, 0], [6, 0, 0], [2, 5, 0]] : [[0, 0, 0], [6, 0, 0], [6, 5, 0], [0, 5, 0]];
    base.forEach((b, i) => { if (!has(b)) L.push(`${b} = (${coords[i].join(', ')})`); });
    L.push(`K = langtru(${base.join(',')}, 6)`);
    return { script: L.join('\n'), note: 'Dựng lăng trụ đứng ' + base.join('') };
  }

  // --- hình hộp ---
  if (/hinh hop|hop chu nhat/.test(s)) {
    if (!has('A')) L.push('A = (0, 0, 0)');
    L.push('K = hop(A, 6, 4, 4)');
    return { script: L.join('\n'), note: 'Dựng hình hộp chữ nhật' };
  }

  // --- đường tròn tâm ... bán kính ... ---
  m = s.match(/duong tron[^a-z]*tam\s+([a-z])(?:[^a-z0-9]*(?:ban kinh|r)\s*=?\s*([0-9.]+))?/);
  if (m) {
    const O = UP(m[1]);
    if (!has(O)) L.push(`${O} = (0, 0)`);
    L.push(`c${O} = duongtron(${O}, ${m[2] || 4})`);
    return { script: L.join('\n'), note: `Đường tròn tâm ${O}` };
  }

  // --- trung điểm ---
  m = s.match(/trung diem\s+(?:cua\s+)?([a-z])\s*([a-z])/);
  if (m && has(UP(m[1])) && has(UP(m[2]))) {
    return { script: `M${UP(m[1])}${UP(m[2])} = trungdiem(${UP(m[1])},${UP(m[2])})`, note: 'Lấy trung điểm' };
  }
  return null;
}
