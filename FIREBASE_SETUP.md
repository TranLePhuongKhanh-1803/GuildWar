# Hướng Dẫn Kết Nối & Bảo Mật Firebase (Dùng Lâu Dài, Không Hết Hạn 30 Ngày)

Website hỗ trợ 2 chế độ:
- **Chế độ Cloud (Firebase):** Khi có cấu hình `.env.local` (hoặc Environment Variables trên Vercel/Netlify), toàn bộ 40 thành viên gửi điểm & ảnh từ nhiều máy khác nhau sẽ đồng bộ thời gian thực về máy Admin.
- **Chế độ LocalStorage (dự phòng):** Lưu cục bộ trên 1 trình duyệt khi chưa cấu hình Firebase.

---

## Bước 1: Tạo Project & Bật Dịch Vụ
1. Truy cập https://console.firebase.google.com/ → **Create a project**.
2. Bật **Build → Firestore Database** → **Create database** (chọn `asia-southeast1` Singapore).
3. Bật **Build → Storage** → **Get started**.
4. Bật **Build → Authentication** → **Get started** → tab **Sign-in method** → bật **Email/Password**.

---

## Bước 2: Tạo Tài Khoản Admin & Cấp Quyền (Không Thể Tự Cấp Quyền)
1. Vào **Authentication → Users → Add user** → nhập Email & Mật khẩu cho Admin (VD: `admin@guild.com`).
2. Copy **User UID** vừa tạo (cột *User UID*).
3. Vào **Firestore Database → Data → Start collection**:
   - **Collection ID:** `admins`
   - **Document ID:** dán đúng **User UID** vừa copy ở trên.
   - Thêm field bất kỳ (VD: `role` = `"admin"`, `email` = `"admin@guild.com"`) → **Save**.

> **Tại sao an toàn?** Trong `firestore.rules`, collection `admins` có `allow write: if false;`. Không một ai (kể cả hacker dùng DevTools) có thể tự ghi vào `admins` để tự phong làm Admin — chỉ chủ sở hữu Firebase Console mới thêm được Admin.

---

## Bước 3: Publish Security Rules (Không Hết Hạn Sau 30 Ngày)

### 3.1. Publish Firestore Rules
1. Vào **Firestore Database → tab Rules**.
2. Xóa toàn bộ rule mặc định (có dòng `timestamp.date(...)` hết hạn sau 30 ngày).
3. Copy toàn bộ nội dung file `firestore.rules` trong thư mục gốc dự án và dán vào.
4. Bấm **Publish**.

### 3.2. Publish Storage Rules
1. Vào **Storage → tab Rules**.
2. Copy toàn bộ nội dung file `storage.rules` trong thư mục gốc dự án và dán vào.
3. Bấm **Publish**.

---

## Bước 4: Cấu Hình `.env.local` & Khởi Tạo Tuần 1
1. Tạo file `.env.local` ở thư mục gốc với 6 biến `VITE_FIREBASE_*` (xem `.env.example`).
2. Chạy `npm run dev` (hoặc deploy lên Vercel/Netlify kèm 6 biến môi trường này).
3. Mở tab **Admin** → đăng nhập bằng Email + Mật khẩu đã tạo ở Bước 2 → bấm **Khởi Tạo Tuần 1**.
