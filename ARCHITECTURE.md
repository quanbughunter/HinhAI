# HìnhAI — Khảo sát, kiến trúc và lộ trình

Tài liệu này trả lời câu hỏi: *làm bảng vẽ hình học có AI theo cách nào là nhẹ nhất và hiệu quả nhất?*

---

## 1. Khảo sát các hướng đã có

| Dự án | Cách làm | Rút ra được gì |
|---|---|---|
| **GeoGebra** (mã nguồn mở, GPL) | Java biên dịch sang JS qua GWT, ~10 MB tải về, hàng nghìn lệnh | Mạnh nhưng nặng và rối — đúng điều bạn muốn tránh. Không nên fork. |
| **JSXGraph** (MIT/LGPL, ~180 KB) | Thư viện JS thuần, mô hình *"đối tượng phụ thuộc đối tượng"*, vẽ bằng SVG | Đây là mô hình lõi đáng học: **đồ thị phụ thuộc + tính lại theo thứ tự tô-pô**. Nhưng JSXGraph là *thư viện*, không có giao diện công cụ, không có AI. |
| **PyGeoX** (Huawei AI4Math) | DSL hình học → giải ra toạ độ → vẽ | Xác nhận hướng "AI sinh DSL" là hướng đúng: AI không vẽ pixel, AI **viết lệnh dựng hình**. |
| **GeoBuildBench** (benchmark 2026) | LLM dịch đề bài tiếng tự nhiên thành lệnh dựng hình chạy được, có trình thông dịch phản hồi lỗi | Cho thấy mẫu thiết kế chuẩn: **DSL gọn + trình thông dịch trả lỗi + agent tự sửa**. Đã áp dụng nguyên vẹn ở đây. |
| protractr, solvespace, geosolver | Giải hệ ràng buộc bằng Newton/phân rã đồ thị | Mạnh cho CAD, nhưng **quá nặng và không cần** cho hình học phổ thông: bài toán SGK luôn dựng được tuần tự (dựng đến đâu chắc đến đó), không cần giải hệ. |

### Kết luận kiến trúc

> **Không dùng bộ giải ràng buộc. Dùng đồ thị phụ thuộc dựng hình tuần tự.**

Mỗi đối tượng chỉ lưu *cách nó được dựng ra* (phép dựng + các đối tượng cha). Vì đối tượng cha luôn được tạo trước con, **thứ tự tạo đã chính là thứ tự tô-pô** — chỉ cần duyệt một vòng theo thứ tự tạo là tính lại được toàn hình. Không cần sắp xếp tô-pô, không cần lặp Newton, không cần thư viện ngoài.

Chi phí: `O(n)` mỗi khung hình. Kéo một điểm trong hình 100 đối tượng mất **dưới 1 ms**.

---

## 2. Kiến trúc phần mềm

```
                 ┌───────────────── giao diện ─────────────────┐
   chuột/chạm ──▶│ tools.js  →  main.js  →  render.js (SVG)    │
   chat AI    ──▶│ agent.js  →  dsl.js                          │
   thanh lệnh ──▶│              dsl.js                          │
                 └──────────────────┬───────────────────────────┘
                                    ▼
                        model.js  (đồ thị phụ thuộc)
                                    ▼
                      ops2d.js  /  ops3d.js  (phép dựng)
                                    ▼
                             vec.js (toán vector)
```

**Điểm mấu chốt: cả ba đường vào đều đổ về một chỗ.** Chuột, thanh lệnh và AI đều tạo ra cùng một thứ — lời gọi `doc.add({op, args, params})`. Nhờ vậy:

- AI không cần API riêng: nó chỉ viết script DSL, y hệt người dùng gõ tay.
- Hoàn tác/làm lại, lưu/mở, xuất script đều dùng chung một cơ chế.
- Thêm một phép dựng mới = thêm **một dòng** vào `ops2d.js` và **một dòng** vào `dsl.js`.

### Các tệp

| Tệp | Dòng | Việc |
|---|---|---|
| `src/core/vec.js` | ~180 | Vector 2D, giao đường/đường tròn, tâm tam giác |
| `src/core/model.js` | ~150 | `GeoDoc`: thêm/xoá/tính lại/lưu/mở, xoá dây chuyền |
| `src/core/ops2d.js` | ~280 | 45 phép dựng hình phẳng |
| `src/core/ops3d.js` | ~200 | Khối đa diện, mặt phẳng, **thiết diện**, giao đường–mặt |
| `src/core/bpt.js` | ~140 | Bất phương trình bậc nhất hai ẩn, cắt nửa mặt phẳng, **miền nghiệm** |
| `src/core/dsl.js` | ~250 | Tách từ, phân tích cú pháp lồng nhau, alias tiếng Việt |
| `src/ui/render.js` | ~330 | Camera 2D/3D, sinh chuỗi SVG, dò trúng đối tượng |
| `src/ui/tools.js` | ~140 | Khai báo công cụ + biểu tượng |
| `src/ai/agent.js` | ~230 | Prompt, gọi Gemini, bộ luật tiếng Việt offline |
| `src/main.js` | ~470 | Điều phối: sự kiện, hoàn tác, lưu/mở, chat |

**Tổng: ~2 200 dòng, 0 thư viện phụ thuộc, 1 tệp HTML 127 KB.** (GeoGebra: hơn 10 MB.)

### Vì sao vẽ lại toàn bộ SVG mỗi khung?

Cách "chuẩn" là giữ tham chiếu tới từng phần tử DOM rồi cập nhật thuộc tính. Cách đó nhanh hơn nhưng sinh ra cả một tầng đồng bộ dễ lỗi. Ở quy mô hình học phổ thông (< 200 đối tượng), việc dựng lại chuỗi SVG rồi gán `innerHTML` mất khoảng **0,3 ms** — vẫn dư sức 60 fps khi kéo. Đổi 0,3 ms lấy vài trăm dòng code và một lớp bug: đáng.

### Hình không gian: chiếu trực giao + nét khuất

- Chiếu trực giao (không phối cảnh) — đúng quy ước hình vẽ SGK.
- Cơ sở nhìn `(right, up, fwd)` sinh từ hai góc yaw/pitch, kéo chuột là xoay.
- **Nét khuất tự động**: mỗi cạnh thuộc các mặt nào đã biết; nếu *mọi* mặt kề cạnh đó đều quay lưng lại người xem thì cạnh bị khuất → vẽ nét đứt. Với khối lồi (chóp, lăng trụ, hộp — tức toàn bộ chương trình phổ thông) quy tắc này **chính xác tuyệt đối**, mà chỉ tốn 6 dòng.
- **Thiết diện**: cắt từng mặt bằng mặt phẳng để lấy các đoạn giao, rồi nối các đoạn thành vòng kín. Chạy đúng cho mọi khối lồi. Đây là tính năng học sinh cần nhất mà lại hay bị thiếu.

---

## 3. AI agent: ba tầng, tầng nào hỏng vẫn còn tầng dưới

```
1. Bộ luật offline  (agent.js › localParse)   — tức thì, không mạng, không tiền
      ↓ không khớp
2. Gemini           (khoá của bạn, lưu trong máy)
      ↓ script bị lỗi
3. Agent tự sửa     (gửi lại đúng thông báo lỗi, yêu cầu viết lại)
```

Prompt hệ thống nhét trọn bảng lệnh DSL vào (khoảng 900 token) và ép Gemini trả về JSON theo `responseSchema`:

```json
{ "giai_thich": "...", "script": "A = (0,0)\nB = (6,0)\n..." }
```

Bốn quy tắc quan trọng nhất trong prompt:

1. Chỉ dùng lệnh có trong danh sách — **không** cú pháp GeoGebra.
2. Toạ độ phải **thoả mãn đúng quan hệ** đề bài cho (vuông, đều, cân...), chứ không vẽ đại rồi ràng buộc sau.
3. Tình trạng bảng vẽ hiện tại được gửi kèm mỗi lượt → AI biết A, B, C đã tồn tại và dùng lại, không định nghĩa chồng.
4. Nếu script lỗi, trình thông dịch trả về **đúng dòng lỗi và lý do**, agent gửi lại cho model sửa một lần. Đây chính là vòng lặp mà GeoBuildBench chứng minh là hiệu quả.

Bản chạy trên claude.ai dùng khả năng `sample` của Artifact nên **không cần khoá API nào cả**.

---

## 4. Lộ trình

### Đã xong
Lõi dựng hình 2D/3D · 26 công cụ · DSL tiếng Việt · chat AI qua proxy dùng chung ·
thiết diện · **miền nghiệm bất phương trình** · kéo nhãn tự do · giao diện điện thoại
với chat dạng bong bóng · hoàn tác · lưu/mở/xuất PNG · 90 bài kiểm thử tự động ·
đóng gói APK tự động bằng GitHub Actions.

### Nên làm tiếp (theo thứ tự đáng giá / công sức)

| Ưu tiên | Việc | Ghi chú |
|---|---|---|
| ★★★ | **Quỹ tích** (`quytich(P, M)`) | Kéo M chạy trên đường, vẽ vết của P. Khoảng 40 dòng, giá trị sư phạm rất lớn. |
| ★★★ | **Thanh trượt tham số** | `a = truot(0, 10)` để khảo sát hình động. |
| ★★☆ | **Đường conic** (parabol, elip, hypebol) | Thêm kiểu `conic` vào `ops2d.js` + giao đường thẳng–conic. |
| ★★☆ | **Đồ thị hàm số** `f(x) = x^2 - 3x` | Cần thêm bộ tính biểu thức (~80 dòng). Bộ đọc biểu thức tuyến tính trong `bpt.js` là điểm khởi đầu. |
| ★★☆ | **Xuất TikZ / LaTeX** | Giáo viên soạn đề rất cần. Từ `doc` sinh thẳng mã TikZ. |
| ★☆☆ | Đánh dấu cạnh bằng nhau, góc bằng nhau | Ký hiệu \|, \|\|, ///  trên cạnh. |
| ★☆☆ | Kiểm tra tính chất | "AB có bằng AC không?" — kiểm bằng số rồi báo. |
| ★☆☆ | Chia sẻ hình bằng đường dẫn | Nén `doc.toJSON()` vào hash URL. |

### Bản Android

**Dùng Capacitor** — không viết lại gì cả:

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init HinhAI vn.hinhai.app --web-dir=dist-vite
npm run build && npx cap add android && npx cap open android
```

Vì sao Capacitor chứ không phải React Native / Flutter:

- Toàn bộ mã hiện tại chạy nguyên vẹn trong WebView, **không sửa một dòng**.
- Đã dùng `pointer events` nên cảm ứng, kéo, đa điểm hoạt động sẵn trên điện thoại.
- Giao diện đã có breakpoint 820 px: thanh công cụ chuyển thành dải ngang, panel chat trượt từ dưới lên.
- APK khoảng 4–5 MB.

Ba việc cần làm thêm cho bản Android:
1. **Bảo vệ khoá API** — trên di động nên gọi Gemini qua một hàm serverless nhỏ thay vì nhúng khoá.
2. **Cử chỉ hai ngón** để phóng to / xoay (hiện mới có con lăn chuột).
3. **Lưu ngay trong máy** bằng `@capacitor/filesystem` thay cho tải tệp về.

Trước khi đóng gói, nếu muốn trang chạy được cả khi mất mạng: thêm `vite-plugin-pwa` (một dòng cấu hình) là đã có PWA cài được lên màn hình chính.
