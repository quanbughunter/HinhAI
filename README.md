# HìnhAI

Bảng vẽ hình học phẳng và hình không gian cho học sinh cấp 2 – cấp 3, có trợ lý AI nhận lệnh bằng tiếng Việt.

Không thư viện ngoài · một tệp HTML 244 KB · mở bằng trình duyệt là chạy.

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
npm test             # 157 bài kiểm thử toán học
node tests/dom-smoke.mjs   # 120 bài kiểm thử giao diện
node tests/snapshot.mjs    # xuất dist/shot-*.svg để xem lại
npm run www          # gộp vào www/ để đóng gói APK
```

---

## Bật trợ lý AI

Bản đang chạy tại <https://quanbughunter.github.io/HinhAI/> đã nối sẵn vào máy chủ trung gian
Cloudflare của bạn, nên **học sinh không cần khoá, không cần tài khoản** — mở link là chat được.

Muốn dùng khoá riêng: lấy miễn phí ở <https://aistudio.google.com/apikey>, rồi bấm **⚙ Cài đặt**
dán vào. Khoá chỉ nằm trong `localStorage` của trình duyệt bạn.

> Google chặn gọi thẳng Gemini từ Việt Nam ("User location is not supported"), nên phải đi qua
> máy chủ trung gian. Cách dựng: [proxy/HUONG-DAN.md](proxy/HUONG-DAN.md).

**Mất mạng vẫn dùng được:** bộ luật tiếng Việt cài sẵn hiểu ngay các câu như *"vẽ tam giác ABC vuông tại A, kẻ đường cao AH"*, *"hình chóp S.ABCD"*, *"đường tròn tâm O bán kính 5"*, *"lăng trụ ABC"*.

---

## Ba cách dựng hình

**1. Chuột / cảm ứng** — chọn công cụ ở dải bên trái rồi bấm lên bảng. Bấm vào chỗ trống là tạo điểm mới; bấm lên một đường là tạo *điểm thuộc* đường đó (kéo chỉ trượt dọc đường).

**2. Thanh lệnh dưới đáy** — gõ `M = trungdiem(A,B)` rồi Enter. Phím ↑ lấy lại lệnh cũ.

**3. Chat với trợ lý** — mô tả bằng tiếng Việt, AI viết script và thi hành ngay; script hiện ngay dưới câu trả lời để bạn kiểm tra hoặc sửa.

### Bảng phương trình

Thẻ **Phương trình** ở cột phải viết ra phương trình của mọi thứ đang có trên bảng, và
**tự đổi theo ngay khi bạn kéo hình**. Bấm vào một phương trình là hình tương ứng sáng lên.

| Đối tượng | Hiện ra |
|---|---|
| Điểm | `A(2; -3)` — trong không gian thì đủ ba toạ độ |
| Đường thẳng, đoạn, tia | `3x - 2y + 6 = 0`, kèm `y = 1.5x + 3` và độ dài |
| Vectơ | `u = (5; 6)` và `\|u\| = 7.81` |
| Đường tròn | `(x - 2)² + (y + 1)² = 9`, kèm tâm và bán kính |
| Đa giác | toạ độ các đỉnh, diện tích, chu vi |
| Mặt phẳng | `2x - y + 3z - 5 = 0` và vectơ pháp tuyến |
| Mặt cầu | `(x - 1)² + (y - 2)² + (z - 3)² = 16` |
| Đường trong không gian | phương trình tham số `x = 1 + 2t · y = 2 - t · z = 3` |
| Khối chóp, lăng trụ, hộp | số đỉnh/mặt/cạnh và **thể tích** |
| Thiết diện | toạ độ các đỉnh và **diện tích** |

Trên điện thoại bảng này nằm trong tấm trượt kéo lên từ dưới — bấm bong bóng **ƒ** là mở,
bấm ✕ hoặc ra ngoài là thu lại.

### Gõ phương trình → ra hình

Chiều ngược lại cũng chạy. Ô trên cùng của thẻ **Phương trình**: gõ rồi Enter.

```
2x + 3y = 6                     đường thẳng
y = 2x - 1                      dạng y = mx + n
x = 3                           đường thẳng đứng
(x-2)^2 + (y+1)^2 = 9           đường tròn, viết ² cũng được
x^2/9 + y^2/4 = 1               elip
y^2 = 4x                        parabol
x^2/9 - y^2/4 = 1               hypebol
x^2 + y^2 - 4x + 2y - 4 = 0     đường tròn dạng khai triển
A(2; 3)                         điểm, có luôn tên
2x + 3y <= 6                    miền nghiệm
2x - y + 3z - 5 = 0             mặt phẳng (ở chế độ Không gian)
(x-1)^2+(y-2)^2+(z-3)^2 = 16    mặt cầu
d: 2x + 3y = 6                  đặt tên bằng dấu hai chấm
```

Gõ lại một cái tên đã có thì hiểu là **sửa** hình đó chứ không thêm hình mới.

**Bấm vào một phương trình trong danh sách để sửa tại chỗ**, Enter là hình nhảy theo,
Esc là bỏ. Sửa được:

- điểm tự do → dời điểm
- hình vốn dựng từ phương trình → đổi thẳng hệ số
- đoạn / đường / tia / vectơ qua hai điểm tự do → **chiếu vuông góc hai đầu xuống đường mới**
- đường tròn tâm O bán kính r → dời O và đổi r

Hình là *hệ quả* của hình khác (đường cao, trung tuyến, giao điểm…) thì không sửa thẳng
được — app nói rõ nó dựng từ đâu và nên kéo cái gì. Đây là chủ ý: sửa con mà không sửa
cha thì lần tính lại sau là mất.

Trong thanh lệnh và với trợ lý AI thì dùng `pt`:

```
d = pt 2x + 3y = 6
c = pt x^2 + y^2 = 25
```

Trong mặt phẳng nhận **bậc nhất và mọi đường bậc hai** — đường tròn, elip, parabol, hypebol,
kể cả khi bị xoay (`xy = 1` ra hypebol nghiêng 45°). Trong không gian mới nhận mặt phẳng và
mặt cầu. Bậc ba trở lên thì app báo rõ chứ không vẽ bừa.

### Bắt dính giao điểm

Chọn công cụ **Điểm** rồi đưa con trỏ lại gần chỗ hai đường cắt nhau — một vòng tròn cam
hiện ra ngay tại giao điểm, bấm một cái là có điểm. Bắt được cả chỗ đường cắt **trục Ox,
Oy**, và cả chỗ đường thẳng cắt elip / parabol / hypebol.

Điểm tạo ra là **điểm phụ thuộc**: kéo hình hay sửa phương trình thì nó tự chạy theo, chứ
không đứng ì một chỗ như điểm chấm tay. Giao nằm ngoài hai đầu mút của đoạn thẳng thì
không bắt, vì trên hình không có chỗ đó.

Miền nghiệm còn được **chấm sẵn** chỗ mỗi biên cắt hai trục, kèm toạ độ — đúng các số cần
để chép hình vào vở. Bảng Phương trình cũng liệt kê lại.

### Cụm nút luôn trong tầm tay

Bốn nút **↶ ↷ · Chọn/Kéo · Xoá** nằm riêng thành một cụm nổi trên bảng vẽ, không trộn vào
dải công cụ — nên vẽ xong không phải vuốt ngang đi tìm.

**Cụm này kéo đi đâu cũng được:** giữ tay nắm **⠿** bên trái rồi kéo tới chỗ trống, app nhớ
vị trí đó cho lần sau. Bấm đúp tay nắm để trả về chỗ mặc định (góc trên phải trên máy tính,
góc trái dưới trên điện thoại).

Mặc định **vẽ xong là con trỏ tự về Chọn/Kéo**. Muốn vẽ liên tiếp nhiều hình cùng loại thì
tắt trong ⚙ Cài đặt.

### Đặt tên và đổi màu

Đề cho *"hình bình hành MNPQ"* thì hình phải mang đúng tên đó. Mở hộp sửa bằng một trong
bốn cách:

- **bấm đúp** lên hình hoặc lên chữ trên bảng vẽ (chạm hai lần trên điện thoại)
- bấm vào **tên** hoặc **ô màu** trong tab **Đối tượng**
- bấm vào **tên** trong tab **Phương trình**
- chọn hình rồi bấm **F2**

Với đa giác, hình chóp, lăng trụ thì hộp thoại có thêm ô **đặt tên cả loạt đỉnh**: gõ
`MNPQ` là bốn đỉnh đổi một lượt. Tên dài hơn một chữ thì ngăn bằng dấu cách: `A₁ A₂ A₃`.
Có sẵn mấy phím phụ cho dấu phẩy trên `′`, chỉ số dưới `₁₂₃₄` và chữ Hy Lạp `α β Δ ω`.

Trùng tên hoặc cho thiếu tên đỉnh thì app báo lỗi và **không đổi gì cả** — không có chuyện
đổi được nửa chừng rồi bỏ dở.

Cùng hộp thoại đó còn đổi được **màu** (12 màu vở học trò, hoặc chọn màu bất kỳ),
**độ dày nét** và **kiểu nét**:

| Kiểu | Dùng cho |
|---|---|
| Liền | hình chính |
| Đứt | đường phụ, đường khuất |
| Chấm | đường dựng hình, đường bỏ đi |
| Đứt chấm | trục đối xứng |
| Đứt dài · Đứt ngắn | phân biệt nhiều đường phụ trong cùng một hình |

Trong thanh lệnh: `doiten A M` · `mau d #b3261e` · `to d 3` ·
`net d lien|dut|cham|dutcham|dutdai|dutngan`.

### Lưới và trục toạ độ

Lưới **chỉ kẻ đúng ở những vạch có số** trên hai trục — không có lưới phụ chia nhỏ hơn nữa,
vì nó làm hình rối mà không giúp đọc toạ độ dễ hơn.

Hai nút riêng trên thanh trên (trong menu **⋯** khi dùng điện thoại): **▦ Lưới** và
**✛ Trục toạ độ**. Nút sáng lên là đang bật. Tắt trục dùng được cho cả hình phẳng lẫn hình
không gian — nhiều bài hình học thuần tuý (tam giác, đường tròn, hình chóp) không cần hệ
trục, bỏ đi thì hình sạch hẳn. Lựa chọn được nhớ cho lần mở sau.

### Ẩn tên cho đỡ rối

Nút **Tên** trên thanh trên bấm lần lượt qua ba nấc: **đủ → chỉ điểm → tắt**. Nấc *chỉ điểm*
hay dùng nhất — giữ A, B, C trên đỉnh nhưng bỏ tên của đoạn, đa giác, đường tròn.

Muốn ẩn tên đúng một hình thì vào tab **Đối tượng**, bấm chữ **A** ở dòng của nó.

Ẩn tên trên bảng vẽ **không ảnh hưởng bảng Phương trình** — ở đó tên vẫn đầy đủ.

### Phím tắt

| Phím | Việc |
|---|---|
| `Ctrl+Z` / `Ctrl+Y` | Hoàn tác / làm lại |
| `Enter` | Kết thúc đa giác, hình chóp, lăng trụ |
| `Esc` | Bỏ lựa chọn đang dở |
| `F2` | Đổi tên đối tượng đang chọn |
| `Delete` | Xoá đối tượng đang chọn |
| `Shift` khi kéo | Bám vào lưới |
| Lăn chuột | Phóng to / thu nhỏ |

---

## Bảng lệnh

### Điểm
```
A = (2,3)                 điểm tự do            A = (2,3,5)   điểm trong không gian
M = trungdiem(A,B)        I = giao(d1,d2)       I = giao(d,c,0) / giao(d,c,1)
P = giaoOx(d)             Q = giaoOy(d)         giao với trục hoành / trục tung
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

### Elip · Parabol · Hypebol
```
e = elip(3, 2)        x²/9 + y²/4 = 1      (a rồi b)
h = hypebol(3, 2)     x²/9 - y²/4 = 1
p = parabol(2)        y² = 4x              (tham số p, tức y² = 2px)
```
Lệch tâm hay bị xoay thì gõ thẳng phương trình: `e = pt x^2+4y^2-4x+16y+4=0`, `h = pt xy=1`.
Bảng Phương trình tự tính **tâm, a, b, c, tâm sai, tiêu điểm** và **tiệm cận** của hypebol,
kèm dạng chính tắc khi trục song song với Ox/Oy.

### Miền nghiệm bất phương trình bậc nhất hai ẩn
```
mien 2x+3y<=6                       gõ nhanh, không cần ngoặc kép
mien x>=0, y>=0, x+y<=4             hệ nhiều bất phương trình, ngăn bằng dấu phẩy
M = hemien("x>=0","y>=0","x+y<=4")  dạng hàm, dùng khi cần đặt tên
A = khoang [-1;3]                   biểu diễn đoạn / khoảng trên trục số
```
Biên vẽ nét liền khi có dấu bằng (≤, ≥), nét đứt khi ngặt (<, >). Nhiều miền chồng nhau thì
gạch chéo theo ba hướng khác nhau để nhìn ra phần giao. Hệ vô nghiệm thì báo *(rỗng)*.

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
mau d #b3261e            to d 3       doiten A M
net d lien | dut | cham | dutcham | dutdai | dutngan
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
src/core/   vec.js  model.js  ops2d.js  ops3d.js  bpt.js  conic.js  giao.js  net.js  ptr.js  docpt.js  dsl.js
src/ui/     render.js  tools.js                            ← camera, vẽ SVG, công cụ
src/ai/     agent.js                                       ← prompt + Gemini + luật offline
src/main.js                                                ← điều phối
```

Thêm một phép dựng mới cần đúng hai dòng: một dòng trong `ops2d.js` (công thức) và một dòng trong `dsl.js` (tên lệnh tiếng Việt).

Chi tiết kiến trúc và so sánh với GeoGebra/JSXGraph: xem [ARCHITECTURE.md](ARCHITECTURE.md).

Lấy tệp APK cho Android (GitHub build hộ, không cần cài Android Studio): xem [LAY-APK.md](LAY-APK.md).

Cho cả lớp dùng chung một khoá Gemini: xem [proxy/HUONG-DAN.md](proxy/HUONG-DAN.md).

Giấy phép: MIT.
