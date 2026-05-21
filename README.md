# 📚 Library Management System — PostgreSQL Edition
**Stack:** Node.js + Express + Sequelize + PostgreSQL + React

---

## Điểm khác biệt so với phiên bản MongoDB

| | MongoDB | PostgreSQL |
|--|--|--|
| ORM | Mongoose | **Sequelize** |
| Relations | manual refs | **Foreign keys thực sự** |
| Transactions | manual | **ACID transactions** |
| Search | `$text` index | **`Op.iLike`** (case-insensitive) |
| Schema | Flexible | **Strict, typed** |
| Stats query | aggregate pipeline | **SQL với fn/literal** |
| Array field | native | `ARRAY(DataTypes.STRING)` |

---

## ⚙️ Yêu cầu hệ thống

- **Node.js** >= 16
- **PostgreSQL** >= 13
- **npm** >= 8

---

## 🚀 Cài đặt

### Bảng hướng dẫn cài

| Bước | Thư mục | Lệnh |
|--|--|--|
| 1 | root | `npm run install:all` |
| 2 | `server` | `cp .env.example .env` |
| 3 | root | `npm run seed` |
| 4 | root | `npm run dev` |

### 1. Tạo database PostgreSQL

```sql
CREATE DATABASE library_db;
```

Hoặc dùng lệnh terminal:
```bash
createdb library_db
# Hoặc:
psql -U postgres -c "CREATE DATABASE library_db;"
```

### 2. Cài dependencies

```bash
cd library-pg
npm run install:all
```

### 3. Cấu hình server

```bash
cd server
cp .env.example .env
```

Chỉnh `server/.env`:
```env
PORT=5001
CLIENT_URL=http://<YOUR_MACHINE_IP>:3001,http://<YOUR_MACHINE_IP>:3002
DB_HOST=localhost
DB_PORT=5432
DB_NAME=library_db
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=change_this_to_a_long_random_string
```

### 4. Cấu hình dev client để dùng IP

Tạo hoặc sửa file `client/.env.development`:
```env
HOST=0.0.0.0
PORT=3001
REACT_APP_API_URL=
```

Tạo hoặc sửa file `student-client/.env.development`:
```env
HOST=0.0.0.0
PORT=3002
REACT_APP_API_URL=
```

### 5. Chạy ứng dụng

```bash
cd library-pg
npm run dev
```

Mở trình duyệt theo IP máy chủ (không dùng `localhost`):
- Admin: `http://<YOUR_MACHINE_IP>:3001`
- User: `http://<YOUR_MACHINE_IP>:3002`
- API: `http://<YOUR_MACHINE_IP>:5001/api`

---

## 👤 Tài khoản demo

| Vai trò | Email | Mật khẩu |
|--|--|--|
| Admin | admin@library.com | 123456 |
| Thủ thư | librarian@library.com | 123456 |
| Sinh viên | user@library.com | 123456 |

---

## 🗄️ Schema PostgreSQL

Sequelize tự động tạo các bảng với `sync({ alter: true })`.  
Nếu muốn xem SQL thuần, kết nối psql và chạy `\d+ table_name`.

### Bảng chính

```
users          — id, name, email, password, student_id, role, unpaid_fines ...
categories     — id, name, description, is_active
books          — id, title, author, isbn, category_id (FK), available_copies ...
borrows        — id, user_id (FK), book_id (FK), due_date, status, renew_count ...
fines          — id, user_id (FK), borrow_id (FK), amount, is_paid ...
reservations   — id, user_id (FK), book_id (FK), status ...
```

### Xem data trong psql

```sql
\c library_db
SELECT * FROM users;
SELECT b.title, c.name FROM books b JOIN categories c ON b.category_id = c.id;
SELECT u.name, bk.title, br.due_date, br.status
  FROM borrows br
  JOIN users u ON br.user_id = u.id
  JOIN books bk ON br.book_id = bk.id
  WHERE br.status = 'overdue';
```

---

## 🔧 Tùy chỉnh

Sửa `server/.env`:
```env
MAX_BORROW_BOOKS=5      # Số sách mượn tối đa
DEFAULT_BORROW_DAYS=14  # Ngày mượn mặc định
FINE_PER_DAY=2000       # Phí phạt mỗi ngày (VNĐ)
```

---

## 📁 Cấu trúc server (thay đổi so với MongoDB)

```
server/
├── config/db.js          # Sequelize instance + connectDB()
├── models/index.js       # Tất cả models + associations trong 1 file
├── controllers/
│   ├── authController.js
│   ├── bookController.js   # Op.iLike thay $regex
│   ├── borrowController.js # sequelize.transaction() thay manual
│   └── otherControllers.js # categories, users, fines, reservations, stats
├── middleware/auth.js
├── routes/index.js       # Tất cả routers export từ 1 file
├── utils/scheduler.js
├── index.js
└── seed.js
```

---

## 🔌 Sử dụng với cloud PostgreSQL

### Supabase (free tier)
```env
DB_HOST=db.xxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
```

### Railway
```env
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=6543
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=xxx
```

### Neon (serverless PostgreSQL)
```env
DB_HOST=ep-xxx.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=xxx
```
