# HìnhAI

Bảng vẽ hình học phẳng và hình không gian cho học sinh cấp 2 – cấp 3, có trợ lý AI nhận lệnh bằng tiếng Việt.

Không thư viện ngoài · một tệp HTML 127 KB · mở bằng trình duyệt là chạy.

---

## Chạy thử

**Cách 1 — nhanh nhất:** bấm đúp vào `dist/geoai.html`. Xong. Không cần cài gì, không cần mạng.

**Cách 2 — vừa sửa vừa xem:**

```bash
npm install
npm run dev          # mở http://localhost:5173
```

**Cách 3 — gộp lại thành một tệp sau khi sửa mã:**

```bash
npm run bundle       # sinh dist/geoai.html
npm test             # 36 bài kiểm thử toán học
node tests/dom-smoke.mjs   # 25 bài kiểm thử giao diện
node tests/snapshot.mjs    # xuất dist/shot-2d.svg và shot-3d.svg để xem lại
```

---

## Bật trợ lý AI

1. Lấy khoá miễn phí ở <https://aistudio.google.com/apikey>
2. Trong ứng dụng bấm **⚙ Cài đặt**, dán khoá, chọn model (`gemini-2.5-flash` là đủ nhanh và miễn phí).

Khoá chỉ nằm trong `localStorage` của trình duyệt bạn và gửi thẳng tới Google.

**Chưa có khoá vẫn dùng được:** bộ luật tiếng Việt cài sẵn hiểu ngay các câu như *"vẽ tam giác ABC vuông tại A, kẻ đường cao AH"*, *"hình chóp S.ABCD"*, *"đường tròn tâm O bán kính 5"*, *"lăng trụ ABC"*.

---

## Ba cách dựng hình

**1. Chuột / cảm ứng** — chọn công cụ ở dải bên trái rồi bấm lên bảng. Bấm vào chỗ trống là tạo điểm mới; bấm lên một đường là tạo *điểm thuộc* đường đó (kéo chỉ trượt dọc đường).

**2. Thanh lệnh dưới đáy** — gõ `M = trungdiem(A,B)` rồi Enter. Phím ↑ lấy lại lệnh cũ.

**3. Chat với trợ lý** — mô tả bằng tiếng Việt, AI viết script và thi hành ngay; script hiện ngay dưới câu trả lời để bạn kiểm tra hoặc sửa.

### Phím tắt

| Phím | Việc |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Hoàn tác / làm lại |
| `Enter` | Kết thúc đa giác, hình chóp, lăng trụ |
| `Esc` | Bỏ lựa chọn đang dở |
| `Delete` | Xoá đối tượng đang chọn |
| `Shift` khi kéo | Bám vào lưới |
| Lăn chuột | Phóng to / thu nhỏ |

---

## Bảng lệnh

### Điểm
```
A = (2,3)                 điểm tự do            A = (2,3,5)   điểm trong không gian
M = trungdiem(A,B)        I = giao(d1,d2)       I = giao(d,c,0) / giao(d,c,1)
P = diemtren(c)           N = chia(A,B,0.25)    F = chan(P,d)
G = trongtam(A,B,C)       O = tamngoaitiep(A,B,C)
I = tamnoitiep(A,B,C)     H = tructam(A,B,C)    H = chanduongcao(A,B,C)
A' = doixung(A,m)   B' = quay(A,O,90)   C' = vitu(A,O,2)   D' = tinhtien(A,3,1)
```

### Đường
```
doan(A,B)   duongthang(A,B)   tia(A,B)   vecto(A,B)
vuonggoc(d,P)   songsong(d,P)   trungtruc(A,B)   phangiac(A,B,C)
duongcao(A,B,C)   trungtuyen(A,B,C)   tieptuyen(c,P,0)
```

### Đường tròn & đa giác
```
duongtron(O,A)        duongtron(O,5)
duongtronqua(A,B,C)   noitiep(A,B,C)
tamgiac(A,B,C)   tugiac(A,B,C,D)   dagiac(A,B,C,D,E)
```

### Đo đạc
```
khoangcach(A,B)   goc(A,B,C)   dientich(t)   chu("ghi chú", 2, 3)
```

### Hình không gian
```
chop(A,B,C,D,S)        các đỉnh đáy trước, đỉnh chóp sau cùng
langtru(A,B,C, 6)      lăng trụ đứng cao 6
hop(A, 6,4,4)          hình hộp chữ nhật
matcau(O, 3)           mp(A,B,C)         mat(A,B,C,D)
thietdien(K, M,N,P)    thiết diện của khối K cắt bởi mặt phẳng (MNP)
giao3(A,B, mp1)        giao của đường thẳng AB với mặt phẳng
trungdiem3(A,B)        chia3(A,B,t)      doan3(A,B)      kc3(A,B)
```

### Lệnh chỉnh sửa
```
an A        hien A       xoa A        xoahet
mau d #b3261e            net d dut    to d 3       doiten A M
```

Các hàm lồng nhau được: `I = giao(duongthang(A,B), duongtron(O,3))`.

---

## Ví dụ

**Ba đường cao đồng quy**
```
A=(-4,-2)  B=(5,-2)  C=(1,4)
t=tamgiac(A,B,C)
ha=duongcao(A,B,C)   hb=duongcao(B,C,A)   hc=duongcao(C,A,B)
H=tructam(A,B,C)
```

**Thiết diện chóp qua ba trung điểm**
```
A=(0,0,0)  B=(6,0,0)  C=(6,5,0)  D=(0,5,0)  S=(3,2.5,7)
K=chop(A,B,C,D,S)
M=trungdiem3(S,A)  N=trungdiem3(S,B)  P=trungdiem3(S,C)
td=thietdien(K,M,N,P)
```

---

## Cấu trúc mã

```
src/core/   vec.js  model.js  ops2d.js  ops3d.js  dsl.js   ← lõi toán, chạy được trong Node
src/ui/     render.js  tools.js                            ← camera, vẽ SVG, công cụ
src/ai/     agent.js                                       ← prompt + Gemini + luật offline
src/main.js                                                ← điều phối
```

Thêm một phép dựng mới cần đúng hai dòng: một dòng trong `ops2d.js` (công thức) và một dòng trong `dsl.js` (tên lệnh tiếng Việt).

Chi tiết kiến trúc, so sánh với GeoGebra/JSXGraph và lộ trình lên Android: xem [ARCHITECTURE.md](ARCHITECTURE.md).

Giấy phép: MIT.
