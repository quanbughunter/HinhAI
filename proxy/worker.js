// ============================================================================
// worker.js — Cầu nối giữa HìnhAI và Google Gemini.
//
// Vì sao cần: học sinh không có khoá API, cũng không nên đưa khoá của bạn vào
// mã nguồn (ai xem trang cũng thấy). Worker này giữ khoá ở phía máy chủ, trang
// web chỉ gọi tới đây, khoá không bao giờ lộ ra trình duyệt.
//
// Chạy trên Cloudflare Workers, gói miễn phí 100.000 lượt gọi mỗi ngày.
// Cách cài: xem HUONG-DAN.md cùng thư mục.
// ============================================================================

const MODEL_MAC_DINH = 'gemini-3.6-flash';
const GIOI_HAN_DO_DAI = 60000;   // ký tự, chặn người gửi đề dài bất thường

const traLoi = (obj, status, headers) =>
  new Response(JSON.stringify(obj), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const dsCho = (env.ALLOWED_ORIGINS || '')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const duocPhep = dsCho.length === 0 || dsCho.includes(origin);

    const cors = {
      'Access-Control-Allow-Origin': duocPhep && origin ? origin : (dsCho[0] || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'GET') return traLoi({ ok: true, note: 'HìnhAI proxy đang chạy' }, 200, cors);
    if (req.method !== 'POST') return traLoi({ error: { message: 'Chỉ nhận POST' } }, 405, cors);

    if (!duocPhep) {
      return traLoi({ error: { message: 'Tên miền này không được phép dùng proxy' } }, 403, cors);
    }
    // Chấp nhận cả hai cách đặt tên cho quen tay
    const khoa = env.GEMINI_KEY || env.GEMINI_API_KEY;
    if (!khoa) {
      return traLoi({ error: { message: 'Máy chủ chưa được cài khoá. Hãy thêm biến GEMINI_KEY (hoặc GEMINI_API_KEY) dạng Secret.' } }, 500, cors);
    }

    const raw = await req.text();
    if (raw.length > GIOI_HAN_DO_DAI) {
      return traLoi({ error: { message: 'Yêu cầu quá dài' } }, 413, cors);
    }
    let body;
    try { body = JSON.parse(raw); } catch (_) {
      return traLoi({ error: { message: 'Nội dung gửi lên không phải JSON' } }, 400, cors);
    }

    // Chỉ chuyển tiếp đúng ba trường cần thiết — không cho phép trang web
    // tự đổi model hay chèn tham số lạ.
    const goi = {
      contents: body.contents,
      systemInstruction: body.systemInstruction,
      generationConfig: body.generationConfig,
    };
    const model = env.GEMINI_MODEL || MODEL_MAC_DINH;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(khoa)}`;

    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goi),
      });
      const text = await r.text();
      return new Response(text, { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch (e) {
      return traLoi({ error: { message: 'Không gọi được Gemini: ' + e.message } }, 502, cors);
    }
  },
};
