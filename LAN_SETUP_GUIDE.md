# 🔧 Hướng dẫn Cấu hình LAN Detection

## 📌 Giới thiệu

Hệ thống phần mềm mượn trả sách cần **phát hiện IP LAN** để kiểm soát truy cập file bản quyền. Tài liệu này giải thích cách cấu hình.

---

## 🌐 Các bước Cấu hình

### Bước 1: Xác định Dải IP LAN của Trường

**Hỏi IT department hoặc kiểm tra:**

```bash
# Từ Windows Terminal
ipconfig

# Tìm dòng "IPv4 Address" dưới mục "Wireless LAN adapter"
# Ví dụ: 192.168.1.100
#   → Dải LAN: 192.168.1.x

# Từ Linux/Mac Terminal
ifconfig
```

**Ví dụ các dải phổ biến:**
- `192.168.x.x` - Dùng cho SOHO (Small Office, Home Office)
- `10.x.x.x` - Dùng cho doanh nghiệp lớn
- `172.16.x.x - 172.31.x.x` - Dùng cho VPN/Docker
- `203.162.100.x` - Tùy theo ISP/cấu hình cụ thể

---

### Bước 2: Cập nhật File `.env` (Server)

**Vị trí:** `server/.env`

```env
# ─── Cấu hình mạng LAN ────────────────────────────────────────────────────────
# Danh sách prefix IP của mạng nội bộ, ngăn cách bằng dấu phẩy

# 🔹 Mặc định (không cần set - hệ thống sẽ dùng):
# LAN_SUBNETS=192.168.,10.,172.16.,172.17.,172.18.,172.19.,172.20.,172.21.,172.22.,172.23.,172.24.,172.25.,172.26.,172.27.,172.28.,172.29.,172.30.,172.31.,127.,::1,::ffff:127.

# 🔹 CUSTOM - Nếu trường dùng dải IP đặc biệt:
LAN_SUBNETS=192.168.,10.,203.162.100.
```

**Ghi chú:**
- Mặc định đã bao gồm localhost (`127.`), Class A (`10.`), Class B (`172.16-31.`), Class C (`192.168.`)
- Nếu trường có dải IP riêng khác (vd `203.162.100.x`), **thêm vào danh sách**
- Luôn giữ `127.` để cho phép localhost

---

### Bước 3: Khởi động lại Server

```bash
# Nếu dùng Node.js trực tiếp
cd server
npm start

# Nếu dùng Docker
docker-compose down
docker-compose up -d
```

---

## 🧪 Test LAN Detection

### Test từ Command Line

```bash
# Test nếu IP 192.168.1.100 được coi là LAN
curl -H "X-Forwarded-For: 192.168.1.100" \
  http://localhost:5001/api/books/1/pdf

# Test nếu IP 8.8.8.8 (Internet) không phải LAN
curl -H "X-Forwarded-For: 8.8.8.8" \
  http://localhost:5001/api/books/1/pdf
```

### Test từ Client (Frontend)

1. **Setup sách test:**
   - Tạo sách → access_level = "lan"
   - Upload PDF

2. **Test từ LAN:**
   - Mở browser trên máy trong mạng trường (wifi trường hoặc cáp mạng)
   - Truy cập app: `http://192.168.1.10:3001` (hoặc IP server của bạn)
   - Đăng nhập → Xem PDF sách → ✅ Thành công

3. **Test từ Internet (4G/Internet khác):**
   - Mở browser trên điện thoại dùng 4G hoặc internet khác
   - Truy cập app: `http://your-domain.com`
   - Đăng nhập → Xem PDF sách → ❌ Lỗi "Chỉ xem được trên LAN"

---

## 🚀 Deployment Thực tế

### Trường hợp 1: Localhost (Phát triển)

```env
# server/.env
CLIENT_URL=http://localhost:3001,http://localhost:3002

# Mặc định LAN_SUBNETS đã hỗ trợ 127.x (localhost)
# Không cần custom
```

---

### Trường hợp 2: LAN Với IP Cố Định

**Giả sử server ở 192.168.1.50:**

```env
# server/.env
CLIENT_URL=http://192.168.1.50:3001,http://192.168.1.50:3002

# Thêm LAN subnet
LAN_SUBNETS=192.168.
```

**Truy cập từ client:**
```
http://192.168.1.50:3001  ← ✅ LAN (có quyền truy cập file lan-only)
```

---

### Trường hợp 3: VPS + Reverse Proxy (Nginx)

**Nếu sử dụng Nginx làm proxy:**

```nginx
# /etc/nginx/sites-available/default
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header X-Forwarded-For $remote_addr;  # ⭐ QUAN TRỌNG
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

**File `.env`:**
```env
# Nếu VPS ở mạng riêng, thêm dải IP đó
LAN_SUBNETS=192.168.,10.,172.16.,203.162.100.
```

---

### Trường hợp 4: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  server:
    build: ./server
    ports:
      - "5001:5001"
    environment:
      - PORT=5001
      - DB_HOST=postgres
      - LAN_SUBNETS=192.168.,10.,127.
    networks:
      - app-network

  postgres:
    image: postgres:13
    networks:
      - app-network
    # ...

networks:
  app-network:
    driver: bridge
```

---

## ⚠️ Troubleshooting

### ❌ Vấn đề: User trong mạng LAN nhưng vẫn lỗi "Chỉ xem được trên LAN"

**Nguyên nhân:**
1. LAN_SUBNETS không bao gồm dải IP của user
2. Nginx/Proxy không set `X-Forwarded-For` header
3. Server chưa khởi động lại sau đổi .env

**Giải pháp:**
```bash
# 1. Kiểm tra dải IP user
ipconfig  # hoặc ifconfig

# 2. Cập nhật LAN_SUBNETS trong .env
# Ví dụ user có IP 203.162.100.5
LAN_SUBNETS=203.162.100.

# 3. Khởi động lại server
npm start

# 4. Test từ terminal
curl -H "X-Forwarded-For: 203.162.100.5" http://localhost:5001/api/books/1/pdf
```

---

### ❌ Vấn đề: Tất cả user (LAN + Internet) đều được truy cập file "lan-only"

**Nguyên nhân:**
- LAN_SUBNETS có chứa dải quá rộng (vd `0.0.0.0`)
- Logic phát hiện LAN bị disable

**Giải pháp:**
```env
# ❌ Sai
LAN_SUBNETS=0.,1.,2.  # Quá rộng

# ✅ Đúng
LAN_SUBNETS=192.168.,10.,127.,::1
```

---

### ❌ Vấn đề: Localhost (127.x) không được coi là LAN

**Giải pháp:**
Đảm bảo `.env` có:
```env
LAN_SUBNETS=192.168.,10.,127.,::1,::ffff:127.
```

---

## 🔍 Kiểm tra Log

**Xem log server để debug:**

```bash
# Khi có request đến /api/books/:id/pdf
# Server sẽ log:
# [INFO] Client IP: 192.168.1.100
# [INFO] Is LAN: true
# [INFO] Access Level: lan
# [INFO] Access Allowed: true
```

---

## 📋 Checklist Setup

- [ ] Hỏi IT department về dải IP LAN của trường
- [ ] Cập nhật `server/.env` - LAN_SUBNETS
- [ ] Khởi động lại server
- [ ] Test từ LAN (wifi trường)
- [ ] Test từ Internet (4G)
- [ ] Đảm bảo Nginx (nếu dùng) set `X-Forwarded-For`
- [ ] Tạo sách test với `access_level = "lan"`
- [ ] Xác nhận lỗi/thành công phù hợp

---

## 📞 Support

**Nếu vấn đề vẫn không giải quyết:**

1. Kiểm tra log server: `tail -f server.log`
2. Xem network tab trong DevTools (Chrome F12)
3. Liên hệ IT department xác nhận dải IP

---

**Cập nhật:** April 23, 2026  
**Phiên bản:** 1.0
