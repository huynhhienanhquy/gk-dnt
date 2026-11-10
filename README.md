# Quản lý người dùng đa nền tảng

Bài giữa kỳ môn Lập trình đa nền tảng. Dự án gồm Web Admin dùng React/Vite và ứng dụng Android dùng React Native/Expo. Hai ứng dụng sẽ kết nối cùng một dự án Firebase.

## Giai đoạn 1 · Chuẩn bị môi trường

Trên Windows, mở PowerShell tại thư mục gốc của dự án và chạy `node --version`, `npm.cmd --version` và `code --version`. Máy phát triển dùng Node.js 22.14.0, npm 10.9.2 và VS Code. Mobile dùng Expo SDK 57. Cài bản Expo Go tương ứng trên Android từ [trang tải của Expo](https://expo.dev/go?sdkVersion=57&platform=android&device=true).

Hai ứng dụng dùng Firebase JavaScript SDK 12.19.0 để tương thích với Node.js 22. Khi chuyển mã nguồn sang máy khác, chạy `npm.cmd ci` trong từng thư mục ứng dụng. Lệnh này cài đúng phiên bản được lưu trong `package-lock.json`.

### 1. Chạy thử Web Admin

```powershell
Set-Location .\web-admin
npm.cmd run dev
```

Mở địa chỉ `Local` mà Vite in trong terminal, thường là `http://localhost:5173`. Phiên bản hiện tại hiển thị **Cấu hình Firebase** nếu chưa có `.env.local`, hoặc chuyển đến **Đăng nhập** nếu đã điền cấu hình.

- `index.html` là trang HTML mà Vite phục vụ.
- `src/main.jsx` gắn ứng dụng React vào trang.
- `src/App.jsx` khai báo các tuyến trang và điều kiện vào trang quản trị.
- `package.json` khai báo thư viện và các lệnh chạy dự án.

### 2. Chạy thử Mobile App

Mở một terminal khác tại thư mục gốc. Cho máy tính và điện thoại dùng cùng mạng Wi-Fi.

```powershell
Set-Location .\mobile-app
npm.cmd start
```

Mở Expo Go trên Android, chọn **Scan QR code** và quét mã trong terminal. Phiên bản hiện tại hiển thị **Cấu hình Firebase** nếu thiếu `.env.local`, hoặc mở danh bạ nếu đã điền cấu hình.

- `index.js` đăng ký thành phần gốc với Expo.
- `App.js` chứa màn hình danh sách, chi tiết và xử lý nút quay lại.
- `app.json` cấu hình tên, biểu tượng và tùy chọn của ứng dụng Expo.
- `package.json` khai báo Expo SDK, React Native và các lệnh chạy.

Nếu thiết bị báo sai phiên bản, chọn lại bản Expo Go cho SDK 57. Nếu đúng phiên bản nhưng điện thoại không kết nối qua Wi-Fi, dừng server bằng `Ctrl+C` rồi chạy `npm.cmd start -- --tunnel` và quét mã mới. [Hướng dẫn kết nối của Expo](https://docs.expo.dev/get-started/start-developing/)

Xác nhận trang web và ứng dụng Android mở được. Ghi lại lỗi nếu một thiết bị chưa chạy được.

## Giai đoạn 2 · Cấu hình Firebase

### 1. Đăng ký Web App và điền cấu hình

1. Mở [Firebase Console](https://console.firebase.google.com/). Chọn project dành cho bài giữa kỳ hoặc tạo project mới trên gói Spark.
2. Mở **Project settings → General → Your apps**. Chọn biểu tượng Web `</>` để đăng ký ứng dụng. Nếu project đã có Web App cho bài giữa kỳ, mở phần **SDK setup and configuration** của ứng dụng đó.
3. Sao chép hai tệp mẫu từ thư mục gốc dự án.

   ```powershell
   Copy-Item .\web-admin\.env.example .\web-admin\.env.local
   Copy-Item .\mobile-app\.env.example .\mobile-app\.env.local
   ```

4. Điền `apiKey`, `authDomain`, `projectId` và `appId` từ cấu hình Web App vào các biến tương ứng. Điền cùng bốn giá trị cho cả hai ứng dụng. Vite đọc tiền tố `VITE_`, còn Expo đọc tiền tố `EXPO_PUBLIC_`. Hai tệp `.env.local` được Git bỏ qua.

**Kiểm tra:** Giá trị `PROJECT_ID` trong cả hai tệp khớp **Project ID** trong Firebase Console. [Đăng ký ứng dụng Firebase](https://firebase.google.com/docs/web/setup) · [Firebase JS SDK trên Expo](https://docs.expo.dev/guides/using-firebase/)

### 2. Tạo tài khoản quản trị

1. Vào **Authentication → Sign-in method** và bật **Email/Password**.
2. Trong **Authentication → Users**, chọn **Add user**, điền email quản trị và tự đặt mật khẩu. Sao chép **User UID** của tài khoản vừa tạo.

**Kiểm tra:** Tài khoản quản trị xuất hiện trong **Authentication → Users** và có UID. Mật khẩu này chỉ nhập trong Firebase Console và form đăng nhập Web Admin. [Quản lý tài khoản Firebase Authentication](https://firebase.google.com/docs/auth/web/manage-users)

### 3. Tạo Firestore và áp dụng Rules

1. Trong **Firestore Database**, tạo cơ sở dữ liệu **Standard edition** với ID mặc định `(default)` và chọn **Production mode**.
2. Mở tab **Rules**, dán toàn bộ nội dung [`firestore.rules`](./firestore.rules), rồi chọn **Publish**. Tệp [`firebase.json`](./firebase.json) trỏ Firebase CLI đến cùng bộ Rules nếu dùng CLI.
3. Trong tab **Data**, tạo collection `admins`. Tạo một document có **Document ID** đúng bằng UID đã sao chép. Thêm `active` kiểu boolean với giá trị `true` để lưu document. Quyền quản trị dựa trên sự tồn tại của document này. Muốn thu hồi quyền thì xóa document.
4. Tạo collection `users`. Dùng **Auto-ID** và thêm từng mẫu trong [`database/users-demo.json`](./database/users-demo.json) với đúng bốn trường kiểu string `email`, `matkhau`, `hoten` và `hinhanh`.

**Kiểm tra:** Trong **Rules Playground**, mô phỏng `get` một document `/users/<ID>` với **Authenticated** tắt và xác nhận **Allowed**. Mô phỏng `delete` cùng đường dẫn khi chưa đăng nhập và khi dùng UID bất kỳ ngoài `admins`, cả hai phải **Denied**. Thay UID bằng UID quản trị, kết quả `delete` phải **Allowed**. Playground chỉ mô phỏng nên dữ liệu mẫu vẫn còn. [Kiểm tra Firestore Rules](https://firebase.google.com/docs/firestore/security/get-started)

Mobile đọc được `users` khi chưa đăng nhập. Firestore cấp quyền theo toàn bộ document, vì vậy người gọi Firebase trực tiếp có thể đọc cả `matkhau` dù giao diện mobile chỉ hiển thị ảnh, họ tên và email. Chỉ dùng email hư cấu và chuỗi minh họa như `demo-001`. Rules chỉ cấp quyền ghi cho UID có document trong `admins` và kiểm tra đủ bốn trường khi tạo hoặc sửa. [Quyền đọc theo document](https://firebase.google.com/docs/firestore/security/rules-fields#allowing_read_access_only_for_specific_fields)

## Giai đoạn 3 · Web Admin

- `src/firebase/client.js` kết nối Firebase Auth và Firestore từ cấu hình Vite.
- `src/contexts/useAdminSession.js` theo dõi phiên Auth và kiểm tra UID với Firestore.
- `src/pages/LoginPage.jsx` xử lý đăng nhập email và mật khẩu. `src/pages/UsersPage.jsx` hiển thị danh sách, mở form và xác nhận xóa.
- `src/components/UserForm.jsx` dùng chung cho thêm và sửa. `src/services/users.js` kiểm tra bốn trường, ghi dữ liệu và đồng bộ danh sách qua `onSnapshot()`.
- `src/index.css` định kiểu form, bảng và bố cục trên màn hình nhỏ.

Sau khi cấu hình Firebase, khởi động lại Vite bằng `npm.cmd run dev` trong `web-admin` và kiểm tra theo thứ tự.

1. Truy cập trực tiếp `/users` khi đã đăng xuất. Trình duyệt phải chuyển về `/login`.
2. Bấm **Đăng nhập** khi bỏ trống form, rồi thử email quản trị với mật khẩu sai. Cả hai lần phải có thông báo phù hợp.
3. Đăng nhập đúng. Kiểm tra danh sách và ảnh mẫu. Nhấn tải lại trang để xác nhận phiên vẫn còn. Nếu tài khoản vào được Auth nhưng thiếu UID trong `admins`, ứng dụng phải báo thiếu quyền.
4. Chọn **Thêm người dùng** và thử lưu với trường trống hoặc email sai. Sau đó dùng dữ liệu hư cấu và URL HTTPS hợp lệ. Kiểm tra hàng mới tự hiện trên web và document trong Console có đúng bốn trường.
5. Chọn **Sửa**, đổi họ tên rồi lưu. Hàng tương ứng phải tự cập nhật.
6. Chọn **Xóa** và hủy xác nhận để kiểm tra hàng còn nguyên. Thử lại, lần này xác nhận xóa. Hàng phải biến mất mà không cần tải lại trang.
7. Chọn **Đăng xuất**. Kiểm tra ứng dụng quay về trang đăng nhập.

Chạy `npm.cmd run lint` để kiểm tra mã và `npm.cmd run build` để tạo bản phát hành. Khi triển khai lên máy chủ tĩnh, cấu hình chuyển các đường dẫn của React Router về `index.html` để tải lại trực tiếp tại `/users` hoặc `/login`.

## Giai đoạn 4 · Mobile App

- `mobile-app/firebase/client.js` kết nối Firestore bằng cấu hình Expo. Dùng cùng Project ID với web.
- `mobile-app/services/users.js` đăng ký `onSnapshot()`, chuyển ảnh, họ tên và email sang giao diện, rồi sắp xếp theo họ tên.
- `mobile-app/App.js` mở chi tiết theo ID của document. Khi document thay đổi trong Firestore, chi tiết đang mở dùng dữ liệu mới. Nếu document bị xóa, màn hình hướng dẫn quay lại.
- `mobile-app/components/UserAvatar.js` hiển thị ảnh tròn và thay bằng chữ cái đầu nếu URL ảnh lỗi.

URL trong `hinhanh` phải truy cập được từ cả trình duyệt lẫn điện thoại, ví dụ URL HTTPS trong dữ liệu mẫu. Đường dẫn `file://` hoặc `content://` chỉ trỏ tới tệp trên thiết bị đã chọn ảnh. Bài này nhập URL ảnh từ Web Admin, còn mobile hiển thị ảnh.

1. Điền `mobile-app/.env.local` theo Giai đoạn 2, rồi khởi động lại Expo bằng `npm.cmd start` trong thư mục `mobile-app`.
2. Dùng Expo Go trên Android quét mã QR. Kiểm tra danh sách có ảnh tròn, họ tên và email. Bấm một hàng để xem ảnh lớn và thử nút **Danh sách** hoặc nút quay lại của Android.
3. Mở đồng thời Web Admin và Mobile App. Trên web, thêm một người dùng rồi kiểm tra hàng mới xuất hiện trên mobile. Mở chi tiết của hàng đó và sửa họ tên trên web. Chi tiết phải đổi theo. Xóa người dùng thử nghiệm trên web và xác nhận người đó biến mất khỏi danh sách mobile.
4. Giữ ứng dụng đang mở, ngắt mạng trên điện thoại rồi kết nối lại. Khi Firestore chuyển sang dữ liệu tạm, mobile hiện thông báo kết nối. Sau khi mạng phục hồi, danh sách tiếp tục cập nhật.

Chạy `npx.cmd expo export --platform android` để kiểm tra đóng gói JavaScript Android. Kiểm tra Expo Go trên điện thoại để xác nhận ảnh và đồng bộ trong điều kiện chạy thật.

## Giai đoạn 5 · Kiểm thử

### Kiểm thử tự động trên máy

Từ thư mục gốc, dùng Node.js và Java 21 để chạy Firebase Local Emulator Suite. Lệnh tạo một project demo cục bộ, nạp `firestore.rules` và thực thi kịch bản trong `web-admin/scripts/check-emulators.mjs`.

```powershell
npx.cmd --yes --package firebase-tools firebase emulators:exec --only auth,firestore --project demo-gk-dnt "node web-admin/scripts/check-emulators.mjs"
```

Kịch bản thử đăng nhập đúng và sai, đọc danh sách khi chưa đăng nhập, từ chối thao tác ghi từ client thường, kiểm tra bốn trường và nhận sự kiện thêm, sửa, xóa từ cùng một listener. [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure)

### Kiểm thử giao diện và thiết bị thật

Chạy Web Admin và Expo Go cùng lúc với cấu hình Firebase của bài giữa kỳ. Ghi kết quả thực tế và chụp màn hình các bước cần đưa vào báo cáo.

| # | Thao tác | Kết quả mong đợi |
| --- | --- | --- |
| 1 | Đăng nhập bằng tài khoản admin đã có UID trong `admins` | Chuyển đến `/users` và thấy danh sách |
| 2 | Dùng mật khẩu sai | Có thông báo thông tin đăng nhập không đúng |
| 3 | Mở trực tiếp `/users` khi đã đăng xuất | Chuyển về `/login` |
| 4 | Thêm một người dùng demo đủ bốn trường | Hàng mới xuất hiện trên web |
| 5 | Tìm người vừa thêm trong Firestore Console | Có document ID tự tạo, đúng bốn trường kiểu string |
| 6 | Sửa họ tên rồi lưu | Hàng tương ứng tự cập nhật |
| 7 | Bấm Xóa, hủy lần đầu và xác nhận lần sau | Hàng chỉ biến mất sau khi xác nhận |
| 8 | Kiểm tra ảnh của các hàng mẫu trên web | Hiện ảnh từ URL `hinhanh` |
| 9 | Mở ứng dụng trên Android bằng Expo Go | Danh sách khớp dữ liệu Firestore |
| 10 | Mở chi tiết một người dùng trên điện thoại | Hiện ảnh lớn, họ tên và email |
| 11 | Thêm, sửa và xóa trên web khi Expo Go đang mở | Danh sách và chi tiết nhận thay đổi mà không tải lại |
| 12 | Mô phỏng ghi từ client chưa được cấp quyền trong Rules Playground hoặc chạy test emulator | Thao tác ghi bị từ chối |

## Giai đoạn 6 · Nộp bài

### Đưa mã nguồn lên GitHub

1. Tạo một repository riêng cho bài giữa kỳ trên GitHub. Nếu dùng repository rỗng, bỏ qua tùy chọn khởi tạo README trên GitHub.
2. Tại thư mục gốc, chạy `git rev-parse --show-toplevel`. Đường dẫn trả về phải là thư mục bài giữa kỳ. Nếu Git trả về một thư mục cha hoặc báo chưa có repository, chạy `git init -b main` trong thư mục bài giữa kỳ và kiểm tra lại đường dẫn.
3. Chạy `git add .` và `git diff --cached --name-only`. Danh sách nên có mã nguồn, lockfile, README, Firebase Rules và dữ liệu mẫu. Hai tệp `.env.example` được đưa lên GitHub, còn `.env.local`, `node_modules` và bản build được Git bỏ qua.
4. Chạy `git commit -m "Xây dựng ứng dụng quản lý người dùng đa nền tảng"`. Thay URL trong lệnh dưới bằng URL repository của bài giữa kỳ.

   ```powershell
   git remote add origin https://github.com/TAI-KHOAN/TEN-REPOSITORY.git
   git push -u origin main
   ```

5. Mở repository trên GitHub và xác nhận có cả `web-admin` và `mobile-app`. Sao chép link vào báo cáo.

### Kịch bản quay video

| Thời gian | Hình cần quay | Nội dung trình bày |
| --- | --- | --- |
| 0:00–0:20 | Web Admin và Expo Go | Giới thiệu hai ứng dụng dùng chung một Firestore |
| 0:20–0:45 | Web Admin | Đăng nhập bằng tài khoản quản trị, sau đó mở danh sách |
| 0:45–1:10 | Web và điện thoại | Thêm người dùng demo và mở mục vừa xuất hiện trên điện thoại |
| 1:10–1:35 | Web và chi tiết mobile | Sửa họ tên trên web và giữ màn hình chi tiết đang mở để thấy cập nhật |
| 1:35–2:00 | Hai ứng dụng | Xóa bản ghi thử, đối chiếu danh sách, rồi đăng xuất |

Điền thông tin sinh viên và giảng viên trong báo cáo Word, bổ sung kết quả kiểm thử đã thực hiện và dán link GitHub cùng link video. Dùng dữ liệu hư cấu khi quay và tránh quay lúc nhập mật khẩu quản trị.
