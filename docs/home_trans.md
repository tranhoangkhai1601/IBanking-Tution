
## 1. Các file

`homepage.html`
`css/homepage.css`
`js/homepage.js`      | Hiển thị số tài khoản, số dư, lịch sử giao dịch
`transaction.html`
`css/transaction.css`
`js/transaction.js`   | Tra cứu học phí và kiểm tra điều kiện thanh toán

## 2. Homepage

- **homepage.html**
- **homepage.css**
- **homepage.js**
  - xài mock data để tạo giao dịch (mẫu để show)
  - `renderHomePageAuth(isLoggedIn, user)`:
    - Đã đăng nhập hiện số tài khoản, số dư và bảng lịch sử.
    - Chưa đăng nhập: ẩn dữ liệu đi

## 3. Trang Pay Tuition

- **transaction.html**
- **transaction.css**
- **transaction.js**
  - Chưa làm được: `submitTransaction()` (gắn vô button Confirm)

## 4. Notes

- Mới xài mock data thoi do chưa có API
- Thiếu button confirm + OTP

## 5.Pics
![Login Homepage](./Home_trans%20pics/Login_Hpage.png)
![Logout Homepage](./Home_trans%20pics/Logout_Hpage.png)

![Login_Paytuition](./Home_trans%20pics/Login_Paytuition.png)
![Logout_Paytuition](./Home_trans%20pics/Logout_Paytuition.png)