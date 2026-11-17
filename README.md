# iBanking Tuition
## Public Domain : [ibanking.meomeo.baby](https://ibanking.meomeo.baby)

Hướng dẫn chạy project thanh toán học phí trên máy local bằng Docker Compose.

## 1. Chuẩn bị

- Cài Docker Desktop và mở ứng dụng trước khi chạy lệnh. Trên Linux có thể dùng Docker Engine kèm Docker Compose.
- Dùng Linux containers khi chạy Docker Desktop trên Windows.
- Mở terminal tại thư mục `IBanking-Tution`, nơi chứa `docker-compose.yaml` và `.env.example`.

Kiểm tra Docker:

```sh
docker --version
docker compose version
docker info
```

Các service Python được cài thư viện trong container; frontend được Nginx phục vụ trực tiếp, không cần chạy `npm install`. Có thể tạo `.venv` theo bước dưới để dùng Python và thư viện khi phát triển trên máy local.

## 2. Tạo và kích hoạt môi trường ảo `.venv`

Bước này dành cho việc phát triển Python trên máy local; Docker vẫn sử dụng thư viện riêng trong container. Cần cài Python trước khi thực hiện.

**Windows — Command Prompt (CMD):**

Tại thư mục `IBanking-Tution`, tạo `.venv` nếu chưa có, kích hoạt và cài các thư viện chung:

```bat
cd IBanking-Tuition
python -m venv .venv
.venv\Scripts\activate.bat
pip install -r requirements.txt
```

Nếu làm việc với một service cụ thể, cài thêm thư viện từ `requirements.txt` của service đó. Ví dụ với Notification Service:

```bat
python -m pip install -r src\services\notification-service\requirements.txt
```

Khi kích hoạt thành công, terminal thường hiển thị `(.venv)` ở đầu dòng. Mỗi lần mở CMD mới, chạy lại `.venv\Scripts\activate.bat` tại thư mục project; không cần tạo lại môi trường ảo.

Để thoát môi trường ảo:

```bat
deactivate
```

## 3. Tạo file cấu hình

Nếu chưa có `.env`, sao chép từ `.env.example`.

**Windows — Command Prompt (CMD):**

```bat
if not exist .env copy .env.example .env
```

**Linux / macOS:**

```sh
test -f .env || cp .env.example .env
```

Mở `.env` và thay giá trị của `JWT_TOKEN`, `JWT_REFRESH_TOKEN` bằng hai chuỗi bí mật khác nhau. Giữ `SERVER_ENV=development` để mở Swagger UI.

Điền thông tin SMTP để gửi email OTP và biên lai. Ví dụ khi dùng Gmail:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

`SMTP_USERNAME` là tài khoản gửi email, `SMTP_PASSWORD` là mật khẩu ứng dụng của tài khoản đó, `SMTP_FROM` là địa chỉ người gửi. Thay các giá trị mẫu bằng thông tin của bạn. Không commit `.env` lên Git.

Giữ các hostname nội bộ theo `.env.example` khi chạy Docker:

```dotenv
DB_HOST=postgres
DB_PORT=5432
DB_PORT_HOST=5433
REDIS_HOST=ibanking_redis
RABBITMQ_HOST=ibanking_rabbitmq

AUTH_SERVICE_URL=http://auth_service:8080
CUSTOMER_SERVICE_URL=http://customer_service:8080
TUITION_SERVICE_URL=http://tuition_service:8080
PAYMENT_SERVICE_URL=http://payment_service:8080
```

Giữ các biến UUID, số tài khoản và `POSTGRES_MULTIPLE_DATABASES` có sẵn trong file mẫu để tạo dữ liệu thử nghiệm. Payment và Tuition mặc định gọi Notification tại `http://notification_service:8080`.

## 4. Khởi động project

Kiểm tra cấu hình rồi build và chạy toàn bộ hệ thống:

```sh
docker compose config --quiet
docker compose up -d --build
docker compose ps -a
```

Lần đầu cần chờ Docker tải image, cài thư viện và khởi tạo database. Các container cần ở trạng thái `Up`; PostgreSQL, Redis, RabbitMQ và Notification có thêm trạng thái `healthy` sau khi kiểm tra thành công.

Compose sẽ chạy Nginx, API Gateway, Auth, Customer, Tuition, Payment, Notification, PostgreSQL, Redis và RabbitMQ. PostgreSQL chứa bốn database `auth_db`, `customer_db`, `tuition_db`, `payment_db` trong cùng một container. Notification không cần database riêng.

Các service tự tạo bảng khi khởi động; Auth, Customer và Tuition tự tạo dữ liệu mẫu. Không cần chạy lệnh seed thủ công. Tuition hiện sinh dữ liệu mẫu mới mỗi lần service khởi động.

## 5. Truy cập ứng dụng

| Nội dung | Địa chỉ |
| --- | --- |
| Web app | <http://localhost> |
| Đăng nhập | <http://localhost/login> |
| Swagger UI qua Nginx | <http://localhost/docs> |
| Swagger UI trực tiếp của API Gateway | <http://localhost:8080/docs> |
| PostgreSQL từ máy local | `localhost:5433` |

Tài khoản khách hàng mẫu trên database mới:

```text
Số điện thoại: 0987654321
Mật khẩu: 123456
```

Mật khẩu trên áp dụng khi giữ giá trị `PASSWORD` mặc định của Auth Service. Thông tin kết nối PostgreSQL lấy từ `DB_USER`, `DB_PASS` và tên database cần truy cập trong `.env`.

Redis và RabbitMQ hiện chỉ mở cổng trong mạng Docker. Compose hiện chưa cấu hình giao diện quản trị RabbitMQ tại `localhost:15672`.

## 6. Xem log, cập nhật và dừng project

Xem log toàn bộ hệ thống; nhấn `Ctrl+C` để thoát xem log:

```sh
docker compose logs -f --tail=100
```

Xem riêng các service xử lý thanh toán và email:

```sh
docker compose logs -f --tail=100 payment_service tuition_service notification_service
```

Sau khi cập nhật code, thư viện hoặc `.env`, chạy lại:

```sh
docker compose up -d --build --force-recreate
```

Nếu chỉ sửa code Notification, có thể khởi động lại riêng service này:

```sh
docker compose restart notification_service
```

Dừng và xóa container, giữ dữ liệu trong volume để dùng cho lần chạy sau:

```sh
docker compose down
```

## 7. Lỗi thường gặp

- **Không kết nối được Docker:** mở Docker Desktop, chờ engine sẵn sàng rồi kiểm tra bằng `docker info`.
- **Container `Exited`, `Restarting` hoặc `unhealthy`:** dùng `docker compose ps -a` và `docker compose logs --tail=100 <service_name>` để xem lỗi của service đó.
- **Thiếu biến cấu hình:** kiểm tra `.env` nằm cùng thư mục với `docker-compose.yaml`, có đủ biến từ `.env.example`, rồi chạy lại `docker compose up -d --build`.
- **Email không gửi được:** kiểm tra các biến SMTP và log của `notification_service`. Trạng thái `healthy` chỉ xác nhận API hoạt động, chưa xác nhận gửi được email.
- **Cổng đang được sử dụng:** kiểm tra các cổng `80`, `443`, `8080`, `5433`. Có thể đổi `DB_PORT_HOST` trong `.env` nếu cổng PostgreSQL bị trùng; các cổng khác được khai báo trong `docker-compose.yaml`.
- **PostgreSQL thiếu database sau khi sửa `.env`:** script tạo database chỉ chạy khi volume PostgreSQL còn trống. Thay `POSTGRES_MULTIPLE_DATABASES` không tự tạo thêm database trong volume đã có dữ liệu.
