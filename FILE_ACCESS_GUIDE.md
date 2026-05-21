# 📚 Hướng dẫn Quản lý Bản quyền & Truy cập File PDF

## 🎯 Mục đích
Kiểm soát truy cập file PDF dựa trên:
- **Bản quyền**: File có bản quyền hay không
- **Vị trí mạng**: Truy cập từ LAN (mạng trường) hay WAN (Internet)
- **Trạng thái người dùng**: Đã đăng nhập hay chưa

---

## 📋 4 Cấp độ Truy cập

### 1️⃣ **PUBLIC** 🌐 (Công khai)
**Không bản quyền - Ai cũng xem được**

| Thuộc tính | Giá trị |
|-----------|--------|
| `access_level` | `public` |
| `is_public_pdf` | `true` |
| Yêu cầu đăng nhập | ❌ Không |
| Chỉ LAN | ❌ Không |
| Xem được từ | 🌍 Internet + 🏫 LAN |

**Hợp lệ cho:**
- Preview/tóm tắt sách
- Tài liệu open-source
- Nội dung công khai

**Ví dụ:** Ebook miễn phí, hướng dẫn sử dụng công khai

---

### 2️⃣ **PRIVATE (Phải đăng nhập)** 🔐 (Không bản quyền)
**Chỉ cần đăng nhập - Xem từ bất kỳ đâu**

| Thuộc tính | Giá trị |
|-----------|--------|
| `access_level` | `private` |
| `is_public_pdf` | `true` |
| Yêu cầu đăng nhập | ✅ **Có** |
| Chỉ LAN | ❌ Không |
| Xem được từ | 🌍 Internet + 🏫 LAN |

**Hợp lệ cho:**
- Tài liệu học tập chỉ cho sinh viên
- Ebook không có bản quyền
- Nội dung nội bộ (không bí mật)

**Ví dụ:** Ghi chú giảng viên, tài liệu bổ trợ, ebook từ nguồn mở

**Cách setup:**
1. Chọn access level → **🔐 Phải đăng nhập**
2. Upload PDF → **🌐 Đọc Online** (is_public_pdf = true)

---

### 3️⃣ **LAN (Chỉ nội bộ)** 🏫 (Có bản quyền)
**Bắt buộc LAN + đăng nhập - Tránh sao lưu ngoài**

| Thuộc tính | Giá trị |
|-----------|--------|
| `access_level` | `lan` |
| `is_public_pdf` | `false` (tuỳ) |
| Yêu cầu đăng nhập | ✅ **Có** (user) |
| Chỉ LAN | ✅ **Có** |
| Xem được từ | 🏫 LAN ONLY |
| Admin/Thủ thư | 🌍 Từ bất kỳ đâu |

**Hợp lệ cho:**
- **Sách có bản quyền giới hạn**
- **Tài liệu bí mật, luật pháp**
- **Tài nguyên đắt tiền cần bảo vệ**

**Ví dụ:** 
- E-book từ nhà xuất bản (chỉ cho trường)
- Báo cáo luật pháp, tài chính
- Database học liệu có giá trị cao

**Cách setup:**
1. Chọn access level → **🏫 Chỉ nội bộ (LAN)**
2. Upload PDF → **🏛 Chỉ tại thư viện** (is_public_pdf = false)

---

### 4️⃣ **PRIVATE (Phải mượn sách)** 🔐 (Bị hạn chế)
**Yêu cầu mượn sách + đăng nhập - Cho tài liệu quý**

| Thuộc tính | Giá trị |
|-----------|--------|
| `access_level` | `private` |
| `is_public_pdf` | `false` |
| Yêu cầu đăng nhập | ✅ **Có** |
| Chỉ LAN | ❌ Không |
| Phải mượn sách | ✅ **Có** |
| Xem được từ | 🌍 Internet + 🏫 LAN |

**Hợp lệ cho:**
- Những ebook cần kiểm soát truy cập chặt
- Tài liệu quý hiếm (cần theo dõi)
- Nội dung độc quyền

**Ví dụ:** Luận văn, tài liệu nghiên cứu cấp cao

**Cách setup:**
1. Chọn access level → **🔐 Phải đăng nhập**
2. Upload PDF → **🏛 Chỉ tại thư viện** (is_public_pdf = false)

---

## 🛠️ Hướng dẫn Cấu hình

### Trong Admin Dashboard

#### **Bước 1:** Tạo/Sửa sách

1. Vào **Admin → Quản lý sách → Thêm/Sửa**
2. Điền thông tin sách
3. Đến phần **🔒 Phân quyền truy cập & Bản quyền**

#### **Bước 2:** Chọn loại truy cập

```
┌─────────────────────────────────────────────────────────┐
│ 🔒 Phân quyền truy cập & Bản quyền                     │
├─────────────────────────────────────────────────────────┤
│ ○ 🌐 Công khai                                          │
│   Không bản quyền — Ai cũng xem (Internet & LAN)      │
│                                                         │
│ ● 🏫 Chỉ nội bộ (LAN)                                 │
│   Có bản quyền — Chỉ xem trong mạng trường           │
│                                                         │
│ ○ 🔐 Phải đăng nhập                                   │
│   Không bản quyền — Cần tài khoản (LAN & Internet)   │
└─────────────────────────────────────────────────────────┘
```

#### **Bước 3:** Upload PDF

```
┌─────────────────────────────────────────────────────────┐
│ 📄 File PDF (không bắt buộc)                           │
│ [Chọn file...] ← file.pdf (2.45 MB)                    │
│                                                         │
│ ┌──────────────────┬──────────────────┐               │
│ │ 🌐 Đọc Online    │ 🏛 Chỉ tại thư viện │               │
│ │ Sinh viên đọc tự │ Cần mượn sách mới │               │
│ │ do (is_public=T) │ xem (is_public=F) │               │
│ └──────────────────┴──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Ma trận Kết hợp

| Scenario | access_level | is_public_pdf | Đăng nhập | LAN | Mục đích |
|----------|--------------|---------------|-----------|-----|---------|
| Ebook miễn phí | `public` | `true` | ❌ | ❌ | Preview công khai |
| Tài liệu học tập | `private` | `true` | ✅ | ❌ | Sinh viên đọc tự do |
| **Sách bản quyền** | **`lan`** | **`false`** | **✅** | **✅** | **Bảo vệ tác quyền** |
| Luận văn quý | `private` | `false` | ✅ | ❌ | Cần mượn sách |

---

## 🌐 LAN Detection (Tự động Phát hiện)

Hệ thống **tự động phát hiện** khi user truy cập từ LAN dựa vào **IP address**:

### Mặc định LAN IP Range:
```
✓ 127.x.x.x (localhost - máy chủ)
✓ 192.168.x.x (Class C Private)
✓ 10.x.x.x (Class A Private)
✓ 172.16.x.x - 172.31.x.x (Class B Private)
✓ ::1, ::ffff:127. (IPv6 localhost)
```

### Custom LAN Subnets

**Nếu trường có dải IP khác**, cập nhật trong file `.env` server:

```env
# server/.env
LAN_SUBNETS=192.168.,10.,172.16.,203.162.100.

# Ví dụ: Trường A dùng 203.162.100.x
# Thêm vào danh sách LAN_SUBNETS
```

### Kiểm tra IP:

```bash
# Từ terminal server
curl -H "X-Forwarded-For: 203.162.100.5" http://localhost:3000/api/books/1/pdf

# Server sẽ detect: isLAN = true (vì 203.162.100 có trong LAN_SUBNETS)
```

---

## 📊 Ví dụ Cấu hình Thực tế

### Ví dụ 1: Sách Giáo khoa (Bản quyền)

```
📖 Sách: "Toán Cao Cấp - Tập 1"
Tác giả: Võ Văn An
Nhà xuất bản: NXB Giáo dục (bản quyền)

✓ access_level = "lan"
✓ is_public_pdf = false
✓ Upload PDF

👤 Sinh viên: 
   - Từ Wifi trường (LAN) + Đăng nhập → ✅ Xem được
   - Từ Internet WAN + Đăng nhập → ❌ Lỗi "Chỉ xem được trên LAN"

👨‍💼 Admin/Thủ thư:
   - Từ bất kỳ đâu + Đăng nhập → ✅ Xem được
```

### Ví dụ 2: Tài Liệu Học Tập (Không bản quyền)

```
📄 Tài liệu: "Ghi chú Vật Lý Lớp A1"
Biên soạn: GV Nguyễn Văn Phụ

✓ access_level = "private"
✓ is_public_pdf = true
✓ Upload PDF → Chọn "🌐 Đọc Online"

👤 Sinh viên:
   - Từ Wifi trường (LAN) + Đăng nhập → ✅ Xem được
   - Từ Internet (nhà) + Đăng nhập → ✅ Xem được (vì không bản quyền)

❌ Chưa đăng nhập: Không được phép
```

### Ví dụ 3: Ebook Công Khai

```
📚 Ebook: "Lập Trình Python cho Người Mới Bắt Đầu"
Nguồn: OpenStax (open-source)

✓ access_level = "public"
✓ is_public_pdf = true
✓ Upload PDF

👥 Ai cũng được:
   - Chưa đăng nhập + từ Internet → ✅ Xem được
   - Chưa đăng nhập + từ LAN → ✅ Xem được
   - Đã đăng nhập + từ bất kỳ đâu → ✅ Xem được
```

---

## ⚠️ Lỗi Thường Gặp & Giải pháp

### Lỗi: "Chỉ xem được trên LAN"

```json
{
  "success": false,
  "message": "Tài liệu này chỉ xem được trên mạng nội bộ (LAN)",
  "code": "LAN_ONLY"
}
```

**Nguyên nhân:** Sách set `access_level = "lan"` nhưng user truy cập từ ngoài mạng

**Giải pháp:**
- ✅ Truy cập từ Wifi trường
- ✅ Dùng VPN của trường (nếu có)
- ✅ Liên hệ admin để đổi cấp truy cập

---

### Lỗi: "Vui lòng đăng nhập"

```json
{
  "success": false,
  "message": "Vui lòng đăng nhập để xem tài liệu này",
  "code": "LOGIN_REQUIRED"
}
```

**Nguyên nhân:** Sách set `access_level = "private"` nhưng user chưa đăng nhập

**Giải pháp:**
- ✅ Đăng nhập tài khoản sinh viên
- ✅ Liên hệ thủ thư để cấp tài khoản

---

### Lỗi: "Bạn cần mượn sách này để xem PDF"

```json
{
  "success": false,
  "message": "Bạn cần mượn sách này để xem PDF",
  "code": "MUST_BORROW"
}
```

**Nguyên nhân:** Sách set `is_public_pdf = false` nhưng user chưa mượn

**Giải pháp:**
- ✅ Mượn cuốn sách vật lý tại thư viện
- ✅ Sau đó có thể đọc PDF

---

## 🔐 Best Practices

### ✅ DO - Nên làm:

1. **Đánh dấu rõ bản quyền:**
   - Sách có bản quyền → `access_level = "lan"`
   - Không bản quyền → `access_level = "private"` hoặc `"public"`

2. **Kiểm tra trước khi upload:**
   - Tìm hiểu về bản quyền sách
   - Hỏi nhà xuất bản về giới hạn chia sẻ

3. **Audit định kỳ:**
   - Kiểm tra loại PDF đã upload đúng không
   - Đảm bảo bảo vệ tác quyền

4. **Ghi chú thêm:**
   - Để mô tả ghi rõ lý do chọn loại này
   - Vd: "Có bản quyền từ NXB Giáo dục"

### ❌ DON'T - Không nên làm:

1. ❌ Set tất cả sách = `public` (vi phạm bản quyền)
2. ❌ Set tất cả sách = `private` + `is_public_pdf=false` (quá hạn chế)
3. ❌ Quên upload PDF cho sách quan trọng
4. ❌ Không kiểm tra IP LAN người dùng

---

## 📞 Hỗ trợ & Câu hỏi

**Q: Làm sao biết sách có bản quyền hay không?**

A: Thường ghi trên trang bìa/copyright hoặc hỏi nhà xuất bản

**Q: Có thể đổi access_level sau khi upload không?**

A: ✅ Có, click vào sách → Edit → Chọn loại khác → Lưu

**Q: Làm sao user biết sách xem được hay không?**

A: Frontend sẽ hiển thị icon 🔐/🌐/🏫 trên thẻ sách

**Q: Admin được xem tất cả loại file?**

A: ✅ Có, admin/librarian luôn có quyền truy cập từ bất kỳ đâu

---

**Cập nhật:** April 23, 2026  
**Phiên bản:** 1.0
