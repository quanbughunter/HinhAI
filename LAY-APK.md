# Lấy tệp APK cho Android

Bạn **không cần cài Android Studio**. GitHub sẽ build hộ, miễn phí, mất khoảng 5 phút.

Mọi thứ đã dựng sẵn: `capacitor.config.json`, icon, và quy trình `.github/workflows/apk.yml`.

---

## Lần đầu — 3 bước

**1. Đẩy mã lên GitHub**

GitHub Desktop → Summary → **Commit to main** → **Push origin**.

**2. Bấm nút build**

Vào `github.com/quanbughunter/HinhAI` → tab **Actions** → chọn **Đóng gói APK** ở cột trái → nút **Run workflow** bên phải → **Run workflow**.

Lần đầu vào tab Actions, GitHub có thể hỏi bật workflow — bấm **I understand my workflows, go ahead and enable them**.

**3. Tải APK về**

Đợi vòng tròn vàng chuyển thành dấu tích xanh (khoảng 5 phút). Bấm vào lần chạy đó, kéo xuống cuối, mục **Artifacts** có tệp **HinhAI-APK** — bấm để tải.

Giải nén ra được `HinhAI-YYYYMMDD.apk`.

---

## Cài lên điện thoại

1. Chép tệp APK sang máy (qua Zalo, Drive, cáp USB, gì cũng được)
2. Mở tệp → Android hỏi *"Chặn cài ứng dụng không rõ nguồn"* → **Cài đặt** → **Vẫn cài**
3. Xong. App tên **HinhAI**, chạy toàn màn hình, không có thanh địa chỉ trình duyệt

Đây là bản **debug**, chưa ký bằng chứng chỉ phát hành nên Android sẽ cảnh báo một lần. Cài được bình thường, chỉ không đưa lên Google Play được.

---

## Những lần sau

Mỗi lần muốn có bản mới: Push xong → Actions → Run workflow → tải APK.

Muốn tự động: đặt một tag phiên bản, workflow tự chạy và đính APK vào mục Releases.

```
Repository → Create tag (hoặc trên web: Releases → Draft a new release → tag v0.2)
```

---

## Bên trong workflow làm gì

```
npm install                 cài Capacitor
npm run www                 gộp mã thành 1 tệp HTML rồi bỏ vào www/
npx cap add android         sinh dự án Android
npx @capacitor/assets ...   đổ icon từ resources/icon.png thành đủ cỡ
gradlew assembleDebug       build APK
```

Máy chạy của GitHub đã có sẵn Android SDK nên không phải tải gì thêm.

---

## Vài điều cần biết về bản APK

**Kích thước** khoảng 4–5 MB.

**Cần mạng không?** Vẽ hình, công cụ, thanh lệnh, lưu/mở — chạy hoàn toàn offline. Chỉ phần chat AI mới cần mạng (gọi qua máy chủ trung gian của bạn).

**Phông chữ** tải từ Google Fonts, mất mạng thì rơi về phông hệ thống, không ảnh hưởng gì tới hình vẽ.

**Cập nhật app** thì phải build APK mới và cài đè. Nếu muốn tự cập nhật, dùng luôn bản web `quanbughunter.github.io/HinhAI/` — trình duyệt Android cho phép **Thêm vào màn hình chính**, chạy y hệt app mà luôn là bản mới nhất.

---

## Nếu build lỗi

Bấm vào lần chạy bị đỏ trong tab Actions để xem log, tìm bước bị hỏng.

| Lỗi thường gặp | Cách xử lý |
|---|---|
| `npm install` lỗi mạng | Chạy lại workflow, thường do trục trặc tạm thời |
| `SDK location not found` | Máy chạy phải là `ubuntu-latest` — đừng đổi sang `windows` hay `macos` |
| Lỗi Java version | Kiểm tra bước setup-java đang để `java-version: '21'` |
| `@capacitor/assets` lỗi | Bước này đã đặt `continue-on-error`, app vẫn build được, chỉ dùng icon mặc định |

Cần build bản **ký để phát hành** (đưa lên Play Store) thì phải tạo keystore và thêm 4 secret vào repo — lúc nào cần thì bảo tôi.
