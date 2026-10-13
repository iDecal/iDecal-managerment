# iDecal – Quản lý kinh doanh

Web app tĩnh, deploy lên Vercel không cần build. Gồm 3 file:

| File | Việc |
|---|---|
| `index.html` | Toàn bộ app |
| `config.js` | Cấu hình đăng nhập (điền theo hướng dẫn bên dưới) |
| `firestore.rules` | Quy tắc bảo mật dán vào Firebase |

## Tính năng
- Tổng quan, Đơn hàng, Báo giá (xuất PDF, khách chấp nhận → tự tạo đơn), Khách hàng, Sản phẩm & kho, Mua hàng (nhập kho, công nợ NCC), Chi phí
- **Đăng nhập/đăng ký bằng Gmail**, chủ duyệt và phân 3 cấp cho thành viên

## Ảnh sản phẩm
Trong **Sản phẩm → + Sản phẩm / Sửa** có hai cách thêm ảnh:
- **📷 Tải ảnh lên:** chọn ảnh từ máy hoặc chụp bằng điện thoại. App tự thu nhỏ (cạnh dài tối đa 480px) và nén còn khoảng 20–60 KB rồi lưu cùng sản phẩm, không cần dịch vụ lưu trữ riêng.
- **Dán link ảnh:** link `https://…` trỏ thẳng tới ảnh. Link Google Drive (file đã chia sẻ "Bất kỳ ai có đường liên kết") được tự đổi sang dạng hiển thị được. Link Facebook/Instagram thường không dùng được vì họ chặn nhúng ảnh.

Bấm vào ảnh trong danh sách để xem lớn. Ảnh tải lên chiếm bộ nhớ chung nên nếu có hàng trăm sản phẩm, hãy dùng link cho bớt nặng (khoảng 200 ảnh tải lên là vừa).

## Hai chế độ
- **Một máy** (để trống `apiKey` trong `config.js`): không đăng nhập, dữ liệu lưu trong trình duyệt. Dùng được ngay, nhớ xuất sao lưu.
- **Nhiều người** (điền `config.js`): đăng nhập Gmail, dữ liệu lưu trên Firebase và dùng chung theo thời gian thực.

## Phân quyền
| | Chủ | Quản lý | Nhân viên |
|---|:-:|:-:|:-:|
| Đơn hàng, báo giá, khách hàng: xem/tạo/sửa | ✅ | ✅ | ✅ |
| Xoá đơn, báo giá, khách | ✅ | ✅ | ❌ |
| Sản phẩm: xem giá bán, tồn kho | ✅ | ✅ | ✅ |
| Sản phẩm: thêm/sửa/xoá, xem giá vốn & lãi | ✅ | ✅ | ❌ |
| Mua hàng, chi phí, lợi nhuận, công nợ NCC | ✅ | ✅ | ❌ |
| Xuất sao lưu, sửa thông tin cửa hàng | ✅ | ✅ | ❌ |
| Duyệt/phân cấp/khoá thành viên, nhập sao lưu | ✅ | ❌ | ❌ |

Thành viên mới đăng nhập Gmail lần đầu sẽ ở trạng thái **Chờ duyệt** cho tới khi Chủ chọn cấp (tab **Thành viên**).

## Bật đăng nhập Gmail (làm một lần, miễn phí)

1. Vào https://console.firebase.google.com → **Add project** → đặt tên → tắt Google Analytics cho gọn → tạo.
2. Trang tổng quan project → biểu tượng **`</>` (Web)** → đặt tên app → **Register app**. Copy 4 giá trị `apiKey`, `authDomain`, `projectId`, `appId` dán vào `config.js`. Điền luôn `ownerEmail` = Gmail của bạn (viết thường).
3. **Build → Authentication → Get started → Sign-in method → Google → Enable** (chọn email hỗ trợ) → Save.
4. **Build → Firestore Database → Create database** → chọn **Production mode** → vị trí `asia-southeast1` (Singapore).
5. Tab **Rules** của Firestore: mở file `firestore.rules`, **sửa dòng `ownerEmail()` thành Gmail của bạn** (cùng giá trị ở bước 2), dán toàn bộ vào ô Rules → **Publish**.
6. Deploy lên Vercel (thư mục chứa 3 file trên). Sau khi có link (ví dụ `ten-app.vercel.app`): **Authentication → Settings → Authorized domains → Add domain** → thêm tên miền đó (không có `https://`).
7. Mở app, bấm **Đăng nhập bằng Google** bằng đúng Gmail chủ → bạn tự thành **Chủ**.
8. Có dữ liệu cũ trong chế độ một máy? Mở app trên đúng máy/trình duyệt đó, vào **Khác → Đưa dữ liệu cũ trên máy lên đám mây**.
9. Gửi link cho nhân viên → họ đăng nhập Gmail → bạn vào **Thành viên** chọn cấp.

## Lưu ý quan trọng
- `apiKey` trong `config.js` **không phải mật khẩu**, ai xem mã nguồn cũng thấy. Bảo mật nằm ở **Firestore Rules** (bước 5), nên không được bỏ qua bước này.
- Việc ẩn giá vốn/lợi nhuận với Nhân viên được **áp dụng ở giao diện**. Về kỹ thuật, bản ghi sản phẩm và đơn hàng vẫn chứa giá vốn nên một nhân viên rành kỹ thuật có thể xem được qua công cụ lập trình của trình duyệt. Mua hàng, chi phí và quản lý thành viên thì được khoá thật bằng Rules. Nếu cần giấu giá vốn tuyệt đối, hãy chỉ cấp quyền Quản lý cho người tin cậy.
- Hai người cùng tạo đơn đúng một lúc có thể trùng mã đơn hoặc ghi chồng tồn kho; hiếm gặp với cửa hàng nhỏ, nhưng nên kiểm kho định kỳ.
- Zalo/Facebook mở link bằng trình duyệt riêng, Google chặn đăng nhập ở đó. Hãy mở link bằng Chrome hoặc Safari.
- Gói miễn phí Firebase (Spark) đủ cho cửa hàng nhỏ. Nếu vượt hạn mức, Firebase sẽ báo.
- Không đăng xuất được hay quên đăng nhập: bấm **Thoát** ở góc phải trên cùng.
