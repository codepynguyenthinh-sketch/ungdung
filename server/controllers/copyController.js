// server/controllers/copyController.js
const { Op } = require('sequelize');
const { BookCopy, Book, Borrow, User } = require('../models');

// ─── Tạo mã tự động: LIB-YYYY-XXXXX ─────────────────────────────────────────
const generateCopyCode = async () => {
  const year = new Date().getFullYear();
  const last = await BookCopy.findOne({ order: [['id', 'DESC']] });
  const nextNum = last ? last.id + 1 : 1;
  return `LIB-${year}-${String(nextNum).padStart(5, '0')}`;
};

// GET /api/copies/book/:bookId — Lấy tất cả bản sao của 1 đầu sách
exports.getCopiesByBook = async (req, res) => {
  try {
    const copies = await BookCopy.findAll({
      where: { book_id: req.params.bookId },
      include: [{
        model: Borrow, as: 'borrows',
        where: { status: { [Op.in]: ['borrowed', 'renewed', 'overdue'] } },
        required: false,
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'student_id', 'email'] }],
      }],
      order: [['copy_code', 'ASC']],
    });
    res.json({ success: true, data: copies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/copies/find/:code — Tìm bản sao theo mã (dùng khi cho mượn)
exports.findByCopyCode = async (req, res) => {
  try {
    const copy = await BookCopy.findOne({
      where: { copy_code: req.params.code.toUpperCase() },
      include: [{
        model: Book, as: 'book',
        attributes: ['id', 'title', 'author', 'isbn', 'cover', 'deposit', 'available_copies', 'total_copies'],
      }],
    });
    if (!copy) return res.status(404).json({ success: false, message: `Không tìm thấy mã sách: ${req.params.code}` });
    res.json({ success: true, data: copy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/copies/generate-code — Preview mã sẽ được tạo tiếp theo
exports.previewNextCode = async (req, res) => {
  try {
    const qty = parseInt(req.query.qty) || 1;
    const last = await BookCopy.findOne({ order: [['id', 'DESC']] });
    const year = new Date().getFullYear();
    const startNum = last ? last.id + 1 : 1;
    const codes = Array.from({ length: qty }, (_, i) =>
      `LIB-${year}-${String(startNum + i).padStart(5, '0')}`
    );
    res.json({ success: true, data: codes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/copies — Tạo bản sao hàng loạt
// Body: { book_id, quantity, condition, acquired_at, custom_codes?: string[] }
exports.createCopies = async (req, res) => {
  try {
    const { book_id, quantity = 1, condition = 'good', acquired_at, custom_codes } = req.body;

    // Kiểm tra sách tồn tại
    const book = await Book.findByPk(book_id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });

    const qty = parseInt(quantity);
    if (qty < 1 || qty > 100) return res.status(400).json({ success: false, message: 'Số lượng từ 1–100' });

    // Nếu nhập mã tay thì kiểm tra trùng
    if (custom_codes && custom_codes.length > 0) {
      if (custom_codes.length !== qty)
        return res.status(400).json({ success: false, message: `Cần đúng ${qty} mã` });
      const upperCodes = custom_codes.map(c => c.trim().toUpperCase());
      const existing = await BookCopy.findAll({ where: { copy_code: { [Op.in]: upperCodes } } });
      if (existing.length > 0) {
        const dup = existing.map(e => e.copy_code).join(', ');
        return res.status(400).json({ success: false, message: `Mã đã tồn tại: ${dup}` });
      }
    }

    // Tạo từng bản sao
    const created = [];
    for (let i = 0; i < qty; i++) {
      const code = custom_codes?.[i]?.trim().toUpperCase() || await generateCopyCode();
      const copy = await BookCopy.create({ book_id, copy_code: code, condition, acquired_at });
      created.push(copy);
    }

    // Đồng bộ total_copies & available_copies trên Book
    await book.increment({ total_copies: qty, available_copies: qty });

    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/copies/:id — Cập nhật tình trạng / ghi chú 1 bản sao
exports.updateCopy = async (req, res) => {
  try {
    const copy = await BookCopy.findByPk(req.params.id);
    if (!copy) return res.status(404).json({ success: false, message: 'Không tìm thấy bản sao' });

    // Không cho phép đổi status thủ công khi đang borrowed
    if (copy.status === 'borrowed' && req.body.status && req.body.status !== 'borrowed') {
      return res.status(400).json({ success: false, message: 'Không thể đổi trạng thái sách đang được mượn. Hãy xử lý qua mượn/trả sách.' });
    }

    await copy.update(req.body);
    res.json({ success: true, data: copy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/copies/:id — Xóa bản sao (chỉ khi available)
exports.deleteCopy = async (req, res) => {
  try {
    const copy = await BookCopy.findByPk(req.params.id);
    if (!copy) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    if (copy.status !== 'available')
      return res.status(400).json({ success: false, message: 'Chỉ xóa được bản sao đang ở trạng thái có sẵn' });

    const book = await Book.findByPk(copy.book_id);
    await copy.destroy();
    await book.decrement({ total_copies: 1, available_copies: 1 });

    res.json({ success: true, message: 'Đã xóa bản sao' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
