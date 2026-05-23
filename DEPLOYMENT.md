# 🚀 Hướng dẫn Deploy — Chạy trên cả Localhost lẫn Production

## Nguyên lý hoạt động

Source code này được thiết kế để **chạy trên cả localhost lẫn production** mà **KHÔNG cần thay đổi gì**:

| Môi trường | Cách hoạt động |
|---|---|
| **Localhost (dev)** | React dev server proxy `/api` → Express backend (qua `"proxy"` trong package.json) |
| **Production (host)** | Express serve cả API `/api` lẫn file tĩnh React → cùng 1 origin |

**Client luôn gọi API bằng đường dẫn tương đối `/api`** — nên hoạt động ở cả 2 môi trường mà không cần sửa code.

---

## 🖥️ Chạy Localhost (Development)

```bash
# Cài đặt tất cả dependencies
npm run install:all

# Chạy cả 3 services cùng lúc
npm run dev
```

Truy cập:
- Admin: http://localhost:3001
- Student: http://localhost:3002
- API: http://localhost:5001/api

---

## ☁️ Deploy lên Host (Production)

### Cách 1: Deploy All-in-One (khuyến nghị cho VPS/Render/Railway)

Chỉ cần 1 server chạy cả API + Frontend:

```bash
# 1. Build cả 2 client
npm run build

# 2. Chạy server ở production mode
NODE_ENV=production npm start
```

Hoặc dùng lệnh tắt:
```bash
npm run production
```

Kết quả:
- `https://your-domain.com/` → Admin client
- `https://your-domain.com/student/` → Student client
- `https://your-domain.com/api/` → API

### Cách 2: Deploy trên Render.com

1. Tạo **Web Service** trên Render
2. Cấu hình:
   - **Build Command:** `npm run render-build`
   - **Start Command:** `NODE_ENV=production node server/index.js`
3. Thêm Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = URL của PostgreSQL (Render cung cấp)
   - `JWT_SECRET` = chuỗi bí mật bất kỳ
   - `PORT` = `5001` (hoặc để Render tự set)

### Cách 3: Deploy trên Railway/Heroku

Railway/Heroku tự nhận diện `package.json`:
- **Build:** tự chạy `heroku-postbuild` → build cả 2 client
- **Start:** `npm start` → chạy server production

Environment Variables cần set:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret
```

### Cách 4: Deploy Client tách biệt (Vercel/Netlify + API riêng)

Nếu muốn deploy client và server riêng:

**Server (Render/Railway/VPS):**
- Deploy folder `server/` như bình thường
- Không cần build client

**Client (Vercel/Netlify):**
- Deploy folder `client/`
- Set env: `REACT_APP_API_URL=https://your-api-server.com/api`
- Build command: `npm run build`

**Student-Client (Vercel/Netlify):**
- Deploy folder `student-client/`
- Set env: `REACT_APP_API_URL=https://your-api-server.com/api`
- Xóa `PUBLIC_URL` trong `.env.production` (không cần `/student` prefix khi deploy riêng)
- Build command: `npm run build`

---

## 📋 Tóm tắt Environment Variables

### Server (`server/.env`)

| Variable | Localhost | Production |
|---|---|---|
| `NODE_ENV` | (không set) | `production` |
| `PORT` | `5001` | `5001` (hoặc do host set) |
| `DB_HOST` | `localhost` | (không cần nếu dùng DATABASE_URL) |
| `DATABASE_URL` | (không set) | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | bất kỳ | chuỗi dài, bảo mật |

### Client (`client/.env.production`)

| Variable | Deploy chung server | Deploy riêng |
|---|---|---|
| `REACT_APP_API_URL` | `/api` (mặc định) | `https://api-server.com/api` |

### Student-Client (`student-client/.env.production`)

| Variable | Deploy chung server | Deploy riêng |
|---|---|---|
| `REACT_APP_API_URL` | `/api` (mặc định) | `https://api-server.com/api` |
| `PUBLIC_URL` | `/student` | (xóa hoặc để trống) |

---

## 🔄 Tóm lại

**Không cần thay đổi code khi chuyển giữa localhost và production!**

- Localhost: `npm run dev` → xong
- Production: `npm run build` + `NODE_ENV=production npm start` → xong

Sự khác biệt duy nhất là **environment variables** (`NODE_ENV`, `DATABASE_URL`), được set riêng cho từng môi trường mà không ảnh hưởng source code.
