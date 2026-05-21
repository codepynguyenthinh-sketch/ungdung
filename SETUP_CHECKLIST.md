# ✅ Checklist: Cấu hình Phân quyền File & Bản quyền

## 📋 Summary Nhanh

Hệ thống đã được cập nhật để kiểm soát truy cập file PDF dựa trên:
- ✅ **Bản quyền**: File có bản quyền hay không
- ✅ **Vị trí mạng**: Từ LAN (mạng trường) hay WAN (Internet)
- ✅ **Trạng thái user**: Đã đăng nhập hay chưa

---

## 🎯 2 Scenario Chính

### 1️⃣ **File KHÔNG Bản Quyền** (Mở để công khai)

```
✓ access_level = "private"
✓ is_public_pdf = "🌐 Online"
✓ Yêu cầu: Đăng nhập (từ bất kỳ đâu)

Ví dụ: Tài liệu học tập, ebook open-source
```

**Quy trình setup:**
1. Tạo/Edit sách
2. Chọn: 🔐 Phải đăng nhập
3. Upload PDF → Chọn 🌐 Đọc Online
4. Lưu

---

### 2️⃣ **File CÓ Bản Quyền** (Bảo vệ tác quyền)

```
✓ access_level = "lan"
✓ is_public_pdf = "🏛 Offline" (tuỳ)
✓ Yêu cầu: Đăng nhập + LAN ONLY

Ví dụ: Sách bản quyền, tài liệu bí mật
```

**Quy trình setup:**
1. Tạo/Edit sách
2. Chọn: 🏫 Chỉ nội bộ (LAN)
3. Upload PDF → Chọn 🏛 Chỉ tại thư viện
4. Lưu

---

## 🛠️ Bước Cấu hình Toàn Bộ

### Phase 1: Setup Backend (Server)

- [ ] Xác định dải IP LAN của trường (hỏi IT dept)
- [ ] Cập nhật `server/.env` - `LAN_SUBNETS`
- [ ] Khởi động lại server: `npm start`
- [ ] Test LAN detection từ terminal

**File liên quan:**
- `server/.env` - Cấu hình LAN subnets
- `server/utils/fileAccessControl.js` - Logic kiểm tra quyền
- `server/controllers/bookController.js` - Route lấy PDF

---

### Phase 2: Setup Admin UI (Frontend)

- [ ] Kiểm tra AdminBooks.js có form access_level ✅ (đã update)
- [ ] Mô tả access_level rõ ràng ✅ (đã update)
- [ ] Biểu tượng icon hiển thị ✅ (đã có)

**File liên quan:**
- `client/src/pages/admin/AdminBooks.js` - Form tạo/sửa sách

---

### Phase 3: Test & Verify

#### Test 1: File không bản quyền

```bash
# Setup
1. Tạo sách "Test 1"
2. access_level = "private", is_public_pdf = true
3. Upload PDF

# Test
4. Từ Internet (chưa đăng nhập) → ❌ Lỗi "Vui lòng đăng nhập"
5. Từ Internet (đăng nhập) → ✅ Xem được PDF
6. Từ LAN (đăng nhập) → ✅ Xem được PDF
```

#### Test 2: File có bản quyền

```bash
# Setup
1. Tạo sách "Test 2"
2. access_level = "lan", is_public_pdf = false
3. Upload PDF

# Test
4. Từ Internet (đăng nhập) → ❌ Lỗi "Chỉ xem được trên LAN"
5. Từ LAN (đăng nhập) → ✅ Xem được PDF
6. Admin từ Internet → ✅ Xem được (admin luôn được quyền)
```

#### Test 3: File công khai

```bash
# Setup
1. Tạo sách "Test 3"
2. access_level = "public", is_public_pdf = true
3. Upload PDF

# Test
4. Chưa đăng nhập → ✅ Xem được PDF
5. Từ bất kỳ đâu → ✅ Xem được PDF
```

---

## 📁 Files Đã Cập nhật

### Backend
```
server/
├── utils/
│   └── fileAccessControl.js ✅ (NEW)
│       └── canAccessBookPdf() - Kiểm tra quyền truy cập
│
├── controllers/
│   └── bookController.js ✅ (UPDATED)
│       └── getBookPdf() - Logic download PDF
│
├── middleware/
│   └── lanAccess.js ✅ (EXISTING)
│       └── attachNetworkInfo() - Detect LAN IP
│
└── .env
    └── LAN_SUBNETS=... ✅ (UPDATED)
```

### Frontend
```
client/
├── src/pages/admin/
│   └── AdminBooks.js ✅ (UPDATED)
│       └── Form access_level + is_public_pdf
│       └── Mô tả rõ ràng
│       └── Icon hiển thị
│
└── (Hiển thị icon 🏫/🔐/🌐 cho từng sách)
```

### Documentation
```
/
├── FILE_ACCESS_GUIDE.md ✅ (NEW)
│   └── Hướng dẫn chi tiết 4 loại file
│   └── Ma trận kết hợp access_level + is_public_pdf
│   └── Troubleshooting
│
├── LAN_SETUP_GUIDE.md ✅ (NEW)
│   └── Hướng dẫn cấu hình LAN detection
│   └── Test LAN detection
│   └── Deployment examples
│
└── SETUP_CHECKLIST.md (file này)
    └── Checklist setup nhanh
```

---

## 🚀 Quick Start

### Scenario A: Chỉ test trên localhost

```bash
# 1. .env mặc định đã hỗ trợ localhost (127.x)
# Không cần thay đổi

# 2. Tạo sách test
# access_level = "private" hoặc "lan" đều được

# 3. Test
# Frontend: http://localhost:3001
# Toàn bộ file "lan" sẽ được phép vì localhost luôn LAN
```

### Scenario B: Tính năng LAN thực tế (mạng trường)

```bash
# 1. Xác định dải IP (vd 192.168.x.x)
# IT dept → Đây là dải LAN của trường

# 2. Cập nhật server/.env
LAN_SUBNETS=192.168.,10.,127.,::1

# 3. Restart server
npm start

# 4. Test
# Từ Wifi trường: access_level="lan" → ✅ OK
# Từ 4G: access_level="lan" → ❌ Lỗi LAN_ONLY
```

---

## ⚠️ Lỗi Thường Gặp

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-----------|---------|
| `LOGIN_REQUIRED` | User chưa đăng nhập | Đăng nhập tài khoản |
| `LAN_ONLY` | File = `lan`, user từ ngoài LAN | Truy cập từ Wifi trường |
| `MUST_BORROW` | `is_public_pdf=false`, chưa mượn | Mượn sách tại thư viện |
| LAN detection sai | .env LAN_SUBNETS không match | Cập nhật dải IP đúng |

---

## 🔐 Security Best Practices

### DO ✅
- [ ] Đánh dấu rõ file bản quyền = `access_level: "lan"`
- [ ] Kiểm tra bản quyền trước upload
- [ ] Audit định kỳ
- [ ] Ghi chú rõ lý do chọn loại này

### DON'T ❌
- [ ] Set tất cả = `public` (vi phạm bản quyền)
- [ ] Quên cấu hình LAN_SUBNETS
- [ ] Dùng dải IP quá rộng trong LAN_SUBNETS

---

## 📞 Tiếp Theo

1. **Cấu hình LAN:**
   - Xem [LAN_SETUP_GUIDE.md](./LAN_SETUP_GUIDE.md)

2. **Hiểu chi tiết các loại file:**
   - Xem [FILE_ACCESS_GUIDE.md](./FILE_ACCESS_GUIDE.md)

3. **Test đầy đủ:**
   - Làm theo test scenarios ở trên

4. **Deploy production:**
   - Cập nhật LAN_SUBNETS cho IP thực tế
   - Cấu hình Nginx nếu cần `X-Forwarded-For`

---

## 📊 Reference

### Logic Kiểm Soát Truy cập

```javascript
const result = canAccessBookPdf(book, user, isLAN);

// book.access_level = 'public'  → ✅ Ai cũng được
// book.access_level = 'private' + user → ✅ Được (nếu mượn = ok)
// book.access_level = 'private' + !user → ❌ Yêu cầu đăng nhập
// book.access_level = 'lan' + isLAN + user → ✅ Được
// book.access_level = 'lan' + !isLAN + !admin → ❌ LAN ONLY
// admin/librarian → ✅ Luôn được từ bất kỳ đâu
```

---

## 🎓 Tài liệu Chi Tiết

- **Người dùng admin:** [FILE_ACCESS_GUIDE.md](./FILE_ACCESS_GUIDE.md)
- **IT/DevOps:** [LAN_SETUP_GUIDE.md](./LAN_SETUP_GUIDE.md)
- **Developer:** `server/utils/fileAccessControl.js`

---

**Cập nhật:** April 23, 2026  
**Phiên bản:** 1.0  
**Status:** ✅ Ready for Testing
