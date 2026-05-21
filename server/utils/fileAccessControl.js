/**
 * Utility: Kiểm soát truy cập file dựa trên bản quyền và vị trí mạng
 * 
 * ĐỊNH NGHĨA:
 * 1. File "Không bản quyền" (Public Release)
 *    - access_level: 'private'
 *    - is_public_pdf: true
 *    - Quy tắc: BẮT BUỘC ĐĂNG NHẬP, có thể xem từ bất kỳ đâu (LAN hoặc WAN)
 *    - Hữu ích: Tài liệu học tập, ebook không bản quyền
 *
 * 2. File "Có bản quyền" (Copyrighted/Licensed)
 *    - access_level: 'lan'
 *    - is_public_pdf: false (tuỳ chọn)
 *    - Quy tắc: BẮT BUỘC ĐĂNG NHẬP + CHỈ TRONG MẠNG LAN
 *               Admin/Librarian từ bất kỳ đâu cũng được
 *    - Hữu ích: Sách với bản quyền giới hạn, tránh sao lưu/chia sẻ ngoài
 *
 * 3. File "Công khai" (Public)
 *    - access_level: 'public'
 *    - Quy tắc: KHÔNG SỬ DỤNG - TẤT CẢ FILE ĐỀU YÊU CẦU ĐĂNG NHẬP
 *    - Hữu ích: Dự bị (không dùng)
 *
 * 4. Tài liệu riêng tư (Private)
 *    - access_level: 'private'
 *    - is_public_pdf: false
 *    - Quy tắc: BẮT BUỘC ĐĂNG NHẬP + PHẢI MƯỢN SÁCH
 *    - Hữu ích: Tài liệu cấp cao, chỉ có người mượn mới xem
 *
 * ⚠️  QUAN TRỌNG: TẤT CẢ FILE ĐỀU YÊU CẦU ĐĂNG NHẬP
 * Không có file công khai (public) có thể xem được mà không đăng nhập
 */

/**
 * Kiểm tra có thể truy cập file PDF hay không
 *
 * @param {Object} book - Object sách từ DB
 * @param {Object} user - Object user (có thể null nếu chưa đăng nhập)
 * @param {boolean} isLAN - Có phải từ mạng LAN không (req.isLAN)
 * @returns {Object} { allowed: boolean, reason?: string, code?: string }
 */
exports.canAccessBookPdf = (book, user, isLAN) => {
  if (!book) {
    return { allowed: false, reason: 'Sách không tồn tại', code: 'BOOK_NOT_FOUND' };
  }

  if (!book.pdf_url) {
    return { allowed: false, reason: 'Sách không có file PDF', code: 'NO_PDF' };
  }

  const level = book.access_level || 'private';
  const isStaff = user && ['admin', 'librarian'].includes(user.role);

  // ────────────────────────────────────────────────────────────────────────────
  // ⚠️  BƯỚC 1: KIỂM TRA ĐĂNG NHẬP (BẮTBUỘC CHO TẤT CẢ)
  // ────────────────────────────────────────────────────────────────────────────
  if (!user) {
    return {
      allowed: false,
      reason: 'Vui lòng đăng nhập để xem tài liệu này',
      code: 'LOGIN_REQUIRED',
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BƯỚC 2: KIỂM TRA LAN (CHỈ CHO FILE BẢN QUYỀN)
  // ────────────────────────────────────────────────────────────────────────────
  if (level === 'lan') {
    // Admin/Librarian luôn được từ bất kỳ đâu
    if (isStaff) {
      return { allowed: true };
    }

    // Người dùng thường phải từ LAN
    if (!isLAN) {
      return {
        allowed: false,
        reason: 'Tài liệu này chỉ xem được trên mạng nội bộ (LAN)',
        code: 'LAN_ONLY',
        requireLAN: true,
      };
    }

    return { allowed: true };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // BƯỚC 3: KIỂM TRA MƯỢN SÁCH (NẾU CẦN)
  // ────────────────────────────────────────────────────────────────────────────
  if (!book.is_public_pdf) {
    // Admin/Librarian bypass
    if (isStaff) {
      return { allowed: true };
    }

    // Người dùng thường phải mượn sách
    return {
      allowed: false,
      reason: 'Bạn cần mượn sách này để xem PDF',
      code: 'MUST_BORROW',
      requireBorrow: true,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ✅ ĐƯỢC PHÉP (đã đăng nhập + không bị hạn chế thêm)
  // ────────────────────────────────────────────────────────────────────────────
  return { allowed: true };
};

/**
 * Kiểm tra có phải trong tình huống cần mượn sách hay không
 * (dùng cho logic xử lý đặc biệt)
 */
exports.requiresBorrow = (book) => {
  return book.access_level === 'private' && !book.is_public_pdf;
};

/**
 * Kiểm tra có phải file chỉ xem được trong LAN hay không
 */
exports.requiresLAN = (book) => {
  return book.access_level === 'lan';
};

/**
 * Kiểm tra có phải file không bản quyền (công khai) hay không
 * (chỉ cần đăng nhập, có thể xem từ ngoài)
 */
exports.isPublicRelease = (book) => {
  return book.access_level === 'private' && book.is_public_pdf;
};
