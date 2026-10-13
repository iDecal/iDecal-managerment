// Cấu hình đăng nhập Gmail + lưu dữ liệu chung (Firebase).
// Để TRỐNG apiKey thì app chạy ở "chế độ một máy" (không đăng nhập, dữ liệu lưu trong trình duyệt).
// Cách điền: xem README.md (mục "Bật đăng nhập Gmail").
window.IDECAL_CONFIG = {
  // Gmail của CHỦ cửa hàng (viết thường). Người này đăng nhập đầu tiên sẽ tự thành "Chủ".
  ownerEmail: "",

  // Dán các giá trị từ Firebase Console → Project settings → Your apps → Web app
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  }
};
