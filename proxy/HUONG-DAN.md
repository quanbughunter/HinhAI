# Cho cả lớp dùng chung một khoá Gemini

Mục tiêu: học sinh mở link là chat được ngay — **không cần tài khoản, không cần khoá, không giới hạn tuổi**.

Cách làm: đặt khoá Gemini của bạn lên một máy chủ nhỏ (Cloudflare Worker). Trang web gọi tới máy chủ đó, máy chủ mới gọi Google. Khoá nằm ở phía máy chủ nên không ai xem trang mà thấy được.

```
Học sinh → quanbughunter.github.io/HinhAI → hinhai-proxy.workers.dev → Google Gemini
                     (không có khoá)              (giữ khoá của bạn)
```

Miễn phí: Cloudflare cho 100.000 lượt gọi mỗi ngày, Gemini cho hạn mức miễn phí riêng. Một lớp 40 học sinh dùng thoải mái.

Tổng thời gian: khoảng 15 phút, làm một lần.

---

## Bước 1 — Lấy khoá Gemini

1. Vào <https://aistudio.google.com/apikey>, đăng nhập Google
2. **Create API key** → chọn project bất kỳ
3. Copy chuỗi bắt đầu bằng `AIza...`, để tạm ở đâu đó

> Khoá này là của bạn. Đừng dán nó vào mã nguồn, đừng đưa cho ai — chỉ dán vào đúng ô ở Bước 3.

---

## Bước 2 — Tạo Worker trên Cloudflare

1. Đăng ký tài khoản miễn phí tại <https://dash.cloudflare.com/sign-up>
2. Menu trái → **Compute (Workers)** → **Create** → chọn **Start with Hello World!** → **Get started**
3. Đặt tên: `hinhai-proxy` → **Deploy**
4. Deploy xong, bấm **Edit code** (hoặc **Continue to project → Edit code**)
5. Xoá sạch nội dung trong khung soạn thảo, mở tệp `worker.js` cùng thư mục này, **copy toàn bộ** rồi dán vào
6. Bấm **Deploy** ở góc trên bên phải

Ghi lại địa chỉ Worker hiện ra, dạng:

```
https://hinhai-proxy.TEN-CUA-BAN.workers.dev
```

---

## Bước 3 — Cài khoá và khoá cửa

Vẫn ở trang Worker → tab **Settings** → mục **Variables and Secrets** → **Add**:

| Tên biến | Loại | Giá trị |
|---|---|---|
| `GEMINI_KEY` | **Secret** (mã hoá) | khoá `AIza...` ở Bước 1 |
| `ALLOWED_ORIGINS` | Text | `https://quanbughunter.github.io` |
| `GEMINI_MODEL` | Text | `gemini-2.5-flash` |

Bấm **Deploy** để lưu.

**`ALLOWED_ORIGINS` là cái khoá cửa.** Chỉ trang web ở đúng địa chỉ đó mới gọi được proxy. Người khác copy code của bạn về máy họ cũng không xài ké khoá được. Muốn cho phép nhiều nơi thì viết cách nhau bằng dấu phẩy:

```
https://quanbughunter.github.io,https://hinhai.vn
```

> Trong lúc thử trên máy (mở file `geoai.html` bằng đường dẫn `file://`), trình duyệt gửi `Origin: null` nên sẽ bị chặn. Muốn thử thì tạm để `ALLOWED_ORIGINS` trống — nhưng **nhớ điền lại trước khi phát link cho học sinh**.

Kiểm tra nhanh: mở địa chỉ Worker bằng trình duyệt, thấy `{"ok":true,...}` là chạy được.

---

## Bước 4 — Nối app vào proxy

Mở `src/ai/agent.js`, tìm dòng gần đầu phần Gemini:

```js
export const DEFAULT_PROXY = '';
```

Điền địa chỉ Worker vào:

```js
export const DEFAULT_PROXY = 'https://hinhai-proxy.TEN-CUA-BAN.workers.dev';
```

Lưu file lại. **Chỉ vậy thôi** — mở GitHub Desktop: Summary → **Commit to main** → **Push origin**.

Khoảng một phút sau, `https://quanbughunter.github.io/HinhAI/` đã chat được mà không cần khoá.

> **Vì sao không cần chạy lệnh gì?** Trang trên GitHub Pages nạp thẳng các tệp trong `src/`,
> nên sửa `agent.js` là trang đổi theo ngay.
>
> Riêng tệp `dist/geoai.html` (bản một tệp chạy offline khi bấm đúp) là bản đã gộp sẵn từ trước,
> nó **không** tự cập nhật. Muốn bản offline cũng dùng proxy thì mới cần gộp lại:
>
> 1. Mở thư mục `D:\C1.CODING\myAPP\HinhAI` trong File Explorer
> 2. Bấm vào thanh địa chỉ, gõ `powershell` rồi Enter — cửa sổ lệnh mở đúng tại thư mục đó
> 3. Gõ `npm run bundle` rồi Enter
>
> Cần cài Node.js trước (tải ở <https://nodejs.org>, bản LTS). Kiểm tra đã có chưa bằng lệnh `node -v`.

> Muốn thử trước khi sửa mã: mở app → ⚙ Cài đặt → dán địa chỉ Worker vào ô **Máy chủ trung gian** → Lưu. Cách này chỉ có tác dụng trên máy bạn, dùng để kiểm tra thôi.

---

## Thứ tự app chọn nguồn AI

App tự tìm nguồn theo thứ tự này, cái nào có thì dùng:

1. **Trợ lý Claude** — chỉ có khi mở bản trên claude.ai
2. **Máy chủ trung gian** — `DEFAULT_PROXY` hoặc địa chỉ trong ⚙ Cài đặt
3. **Khoá Gemini riêng** — nếu người dùng tự dán khoá của họ
4. **Bộ luật cài sẵn** — chạy ngoại tuyến, hiểu vài mẫu câu quen thuộc

Nghĩa là sau khi cài proxy, học sinh không phải làm gì cả; còn bạn muốn dùng khoá riêng thì vẫn dán vào ⚙ Cài đặt được.

---

## Cách khác nếu quen dòng lệnh

```bash
cd proxy
npx wrangler login
npx wrangler secret put GEMINI_KEY     # dán khoá khi được hỏi
npx wrangler deploy
```

Sửa `ALLOWED_ORIGINS` trong `wrangler.toml` trước khi deploy. Đừng bao giờ để `GEMINI_KEY` trong tệp này — nó sẽ bị đẩy lên GitHub.

---

## Theo dõi và xử lý sự cố

**Xem có ai đang dùng nhiều bất thường không:** trang Worker → tab **Metrics**, xem số request theo giờ.

**Đổi khoá:** Settings → Variables → sửa `GEMINI_KEY` → Deploy. App không cần sửa gì.

**Tắt khẩn cấp:** Settings → xoá `GEMINI_KEY` → Deploy. Proxy sẽ ngừng phục vụ ngay.

| Lỗi hiện trong app | Nguyên nhân | Cách sửa |
|---|---|---|
| `Tên miền này không được phép dùng proxy` | `ALLOWED_ORIGINS` không khớp | Copy đúng địa chỉ trang, không có dấu `/` ở cuối |
| `Máy chủ chưa được cài GEMINI_KEY` | quên Bước 3 | Thêm secret rồi Deploy |
| `API key not valid` | khoá sai hoặc đã bị xoá | Tạo khoá mới ở AI Studio |
| `429` hoặc `quota` | vượt hạn mức miễn phí của Gemini | Đợi sang ngày, hoặc bật thanh toán cho project Google |
| Không thấy lỗi mà cũng không vẽ | app đang dùng bộ luật offline | Kiểm tra `DEFAULT_PROXY` đã điền và đã chạy `npm run bundle` chưa |

Nhớ rằng khoá này gắn với tài khoản Google của bạn, mọi lượt gọi đều tính vào hạn mức của bạn. Giữ `ALLOWED_ORIGINS` đúng là đủ an toàn cho việc dạy học.
