const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { Borrow, Book, User, Fine, BookCopy } = require('../models');
const { exportBorrows } = require('../utils/excelExport');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const BORROW_DAYS = parseInt(process.env.DEFAULT_BORROW_DAYS) || 14;
const MAX_BOOKS   = parseInt(process.env.MAX_BORROW_BOOKS)    || 5;
const FINE_PER_DAY = parseInt(process.env.FINE_PER_DAY)       || 2000;

exports.borrowBook = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { book_id, copy_code, user_id, note, borrow_type } = req.body;
    const targetUserId = user_id || req.user.id;

    const user = await User.findByPk(targetUserId, { transaction: t });
    if (!user) { await t.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' }); }
    if (user.unpaid_fines > 0) { await t.rollback(); return res.status(400).json({ success: false, message: 'Người dùng có phí phạt chưa thanh toán' }); }

    const activeBorrows = await Borrow.count({
      where: { user_id: targetUserId, status: { [Op.in]: ['borrowed','renewed','overdue'] } },
      transaction: t,
    });
    if (activeBorrows >= MAX_BOOKS) { await t.rollback(); return res.status(400).json({ success: false, message: `Đã mượn tối đa ${MAX_BOOKS} cuốn` }); }

    let book = null;
    let copy = null;
    let borrowData = { user_id: targetUserId, due_date: null, note, borrow_type: borrow_type || 'home', processed_by: req.user.id };

    if (copy_code) {
      copy = await BookCopy.findOne({
        where: { copy_code: copy_code.toUpperCase().trim() },
        include: [{ model: Book, as: 'book' }],
        transaction: t,
      });
      if (copy) {
        if (copy.status !== 'available') { await t.rollback(); return res.status(400).json({ success: false, message: 'Cuốn sách này không sẵn sàng để mượn' }); }
        book = copy.book;
        if (!book || !book.is_active) { await t.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy sách' }); }
        if (book.available_copies < 1) { await t.rollback(); return res.status(400).json({ success: false, message: 'Sách hiện không có sẵn' }); }
        borrowData.book_id = book.id;
        borrowData.copy_id = copy.id;
      } else if (book_id) {
        book = await Book.findByPk(book_id, { transaction: t });
        if (!book || !book.is_active) { await t.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy sách' }); }
        if (book.available_copies < 1) { await t.rollback(); return res.status(400).json({ success: false, message: 'Sách hiện không có sẵn' }); }
        borrowData.book_id = book_id;
      } else {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Không tìm thấy mã sách' });
      }
    } else {
      book = await Book.findByPk(book_id, { transaction: t });
      if (!book || !book.is_active) { await t.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy sách' }); }
      if (book.available_copies < 1) { await t.rollback(); return res.status(400).json({ success: false, message: 'Sách hiện không có sẵn' }); }
      borrowData.book_id = book_id;
    }

    const alreadyBorrowed = await Borrow.findOne({
      where: { user_id: targetUserId, book_id: borrowData.book_id, status: { [Op.in]: ['borrowed','renewed','overdue'] } },
      transaction: t,
    });
    if (alreadyBorrowed) { await t.rollback(); return res.status(400).json({ success: false, message: 'Người dùng đang mượn cuốn sách này' }); }

    const due_date = new Date();
    due_date.setDate(due_date.getDate() + BORROW_DAYS);
    borrowData.due_date = due_date;

    const borrow = await Borrow.create(borrowData, { transaction: t });

    // Thu tiền thế chân nếu có
    let depositFine = null;
    if (book.deposit > 0) {
      depositFine = await Fine.create(
        { user_id: targetUserId, borrow_id: borrow.id, amount: book.deposit, reason: 'deposit', is_paid: true, paid_date: new Date(), paid_by: req.user.id },
        { transaction: t }
      );
      await user.increment('total_fines', { by: book.deposit, transaction: t });
      // Không tăng unpaid_fines vì đã thu ngay
    }

    await book.decrement('available_copies', { by: 1, transaction: t });
    await book.increment('borrow_count',     { by: 1, transaction: t });
    await user.increment('borrow_count',     { by: 1, transaction: t });
    if (copy) {
      await copy.update({ status: 'borrowed' }, { transaction: t });
    }

    await t.commit();

    const populated = await Borrow.findByPk(borrow.id, {
      include: [
        { model: Book, as: 'book', attributes: ['id','title','author','deposit'] },
        { model: User, as: 'user', attributes: ['id','name','email','student_id'] },
        { model: BookCopy, as: 'copy', attributes: ['id','copy_code'] },
      ],
    });
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.returnBook = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        { model: Book, as: 'book' },
        { model: User, as: 'user' },
      ],
      transaction: t,
    });
    if (!borrow) { await t.rollback(); return res.status(404).json({ success: false, message: 'Không tìm thấy mượn/trả sách' }); }
    if (borrow.status === 'returned') { await t.rollback(); return res.status(400).json({ success: false, message: 'Sách đã được trả' }); }

    const now = new Date();
    let fine = null;

    if (now > borrow.due_date) {
      const overdue_days = Math.ceil((now - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24));
      const amount = overdue_days * FINE_PER_DAY;
      fine = await Fine.create(
        { user_id: borrow.user_id, borrow_id: borrow.id, amount, reason: 'overdue', overdue_days },
        { transaction: t }
      );
      await User.increment(
        { total_fines: amount, unpaid_fines: amount },
        { where: { id: borrow.user_id }, transaction: t }
      );
    }

    await borrow.update(
      { status: 'returned', return_date: now, processed_by: req.user.id },
      { transaction: t }
    );
    await borrow.book.increment('available_copies', { by: 1, transaction: t });
    if (borrow.copy_id) {
      await BookCopy.update(
        { status: 'available' },
        { where: { id: borrow.copy_id }, transaction: t }
      );
    }

    // Hoàn tiền thế chân nếu không có phí phạt
    if (!fine && borrow.book.deposit > 0) {
      // Tìm fine deposit và đánh dấu hoàn tiền
      const depositFine = await Fine.findOne({
        where: { borrow_id: borrow.id, reason: 'deposit' },
        transaction: t,
      });
      if (depositFine) {
        await depositFine.update({ is_paid: false, paid_date: null, note: 'Hoàn tiền thế chân' }, { transaction: t });
        // Giảm total_fines
        await User.decrement('total_fines', { by: borrow.book.deposit, where: { id: borrow.user_id }, transaction: t });
      }
    }

    await t.commit();
    res.json({ success: true, data: borrow, fine });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.renewBorrow = async (req, res) => {
  try {
    const borrow = await Borrow.findByPk(req.params.id);
    if (!borrow) return res.status(404).json({ success: false, message: 'Không tìm thấy mượn/trả sách' });
    if (!['borrowed','renewed'].includes(borrow.status)) return res.status(400).json({ success: false, message: 'Không thể gia hạn' });
    if (borrow.renew_count >= borrow.max_renewals) return res.status(400).json({ success: false, message: `Đã gia hạn tối đa ${borrow.max_renewals} lần` });
    if (new Date() > new Date(borrow.due_date)) return res.status(400).json({ success: false, message: 'Sách đã quá hạn' });

    const newDue = new Date(borrow.due_date);
    newDue.setDate(newDue.getDate() + BORROW_DAYS);
    await borrow.update({ due_date: newDue, renew_count: borrow.renew_count + 1, status: 'renewed' });

    res.json({ success: true, data: borrow, message: `Gia hạn đến ${newDue.toLocaleDateString('vi-VN')}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBorrows = async (req, res) => {
  try {
    const { status, user_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status)  where.status  = status;
    if (user_id) where.user_id = user_id;
    if (req.user.role === 'user') where.user_id = req.user.id;

    const { count, rows } = await Borrow.findAndCountAll({
      where,
      include: [
        { model: Book, as: 'book', attributes: ['id','title','author','cover','deposit'] },
        { model: User, as: 'user', attributes: ['id','name','email','student_id'] },
        { model: User, as: 'processor', attributes: ['id','name'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyBorrows = async (req, res) => {
  try {
    const { status } = req.query;
    const where = { user_id: req.user.id };
    if (status) where.status = status;
    const { Book, Fine, BookCopy } = require('../models');
    const borrows = await Borrow.findAll({
      where,
      include: [
        { model: Book, as: 'book', attributes: ['id','title','author','cover','isbn'] },
        { model: Fine, as: 'fine', where: { reason: { [Op.ne]: 'deposit' } }, required: false, attributes: ['id','amount','is_paid','overdue_days','reason'] },
        { model: BookCopy, as: 'copy', attributes: ['id','copy_code','condition','status'] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: borrows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Generate Bill PDF ───────────────────────────────────────────────────────
exports.generateBill = async (req, res) => {
  try {
    const borrow = await Borrow.findByPk(req.params.id, {
      include: [
        { model: Book, as: 'book', attributes: ['id','title','author','deposit'] },
        { model: User, as: 'user', attributes: ['id','name','email','student_id'] },
        { model: BookCopy, as: 'copy', attributes: ['id','copy_code'] },
        { model: Fine, as: 'fine', attributes: ['id','amount','reason','is_paid'] },
      ],
    });
    if (!borrow) return res.status(404).json({ success: false, message: 'Không tìm thấy mươn/trả sách' });

    // Create bill for 80mm thermal printer (width ~227pt / 80mm)
    const doc = new PDFDocument({
      size: [227, 400],
      margin: 10,
    });

    const fileName = `bill_${borrow.id}_${Date.now()}.pdf`;
    const billsDir = path.join(__dirname, '..', 'uploads', 'bills');
    if (!fs.existsSync(billsDir)) fs.mkdirSync(billsDir, { recursive: true });
    const filePath = path.join(billsDir, fileName);

    const stream = fs.createWriteStream(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(stream);
    stream.on('error', (streamErr) => {
      console.error('PDF stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Lỗi khi tạo bill' });
      }
    });

    // ─── Header ─────────────────────────────────────────────────────────────────
    doc.fillColor('black').fontSize(11).font('Courier').text('THƯ VIỆN DIGITAL LIBRARY', { align: 'center', width: 207 });
    doc.fontSize(8).text('────────────────────────────────', { align: 'center', width: 207 });
    doc.moveDown(4);

    // ─── Loại biên lai ────────────────────────────────────────
    const docType = borrow.status === 'returned' ? 'BIÊN LAI TRẢ SÁCH' : 'BIÊN LAI MƯỢN SÁCH';
    doc.fontSize(10).font('Courier-Bold').text(docType, { align: 'center', width: 207 });
    doc.moveDown(3);

    // ─── Thông tin sinh viên ──────────────────────────────────
    doc.fontSize(8).font('Courier').text('SINH VIÊN', { underline: true });
    doc.text(`Mã SV: ${borrow.user.student_id || 'N/A'}`, { width: 207 });
    doc.text(`Tên: ${borrow.user.name}`, { width: 207 });
    doc.moveDown(3);

    // ─── Thông tin sách ──────────────────────────────────────
    doc.fontSize(8).text('SÁCH', { underline: true });
    doc.fontSize(7).text(borrow.book.title, { width: 207 });
    doc.text(`Tác giả: ${borrow.book.author}`, { width: 207 });
    if (borrow.copy) {
      doc.text(`Mã ĐKCB: ${borrow.copy.copy_code}`, { width: 207 });
    }
    doc.moveDown(3);

    // ─── Thế chân ─────────────────────────────────────────────
    if (borrow.book.deposit > 0) {
      doc.fontSize(8).font('Courier-Bold').text('THẾ CHÂN', { underline: true });
      doc.font('Courier');
      const depositFine = await Fine.findOne({
        where: { borrow_id: borrow.id, reason: 'deposit' }
      });
      
      if (borrow.status === 'returned') {
        // Nếu trả sách - hiện tình trạng hoàn tiền
        if (!depositFine) {
          doc.text('Trạng thái: Không có thế chân', { width: 207 });
        } else if (!depositFine.is_paid && depositFine.note === 'Hoàn tiền thế chân') {
          doc.fillColor('#22c55e').fontSize(9).font('Courier-Bold').text('✓ ĐÃ HOÀN LẠI', { width: 207 });
          doc.fillColor('black').fontSize(8).font('Courier').text(
            `Số tiền: ${borrow.book.deposit.toLocaleString('vi-VN')}đ`,
            { width: 207 }
          );
        } else if (depositFine.is_paid) {
          doc.text(`Đã thu: ${borrow.book.deposit.toLocaleString('vi-VN')}đ`, { width: 207 });
        }
      } else {
        // Nếu đang mượn - hiện tiền thế chân cần thu
        doc.fillColor('#dc2626').fontSize(9).font('Courier-Bold').text(
          borrow.book.deposit.toLocaleString('vi-VN') + 'đ',
          { width: 207 }
        );
        doc.fillColor('black').fontSize(7).font('Courier').text('(Cần thu)', { width: 207 });
      }
      doc.moveDown(3);
    }

    // ─── Thông tin mượn/trả ────────────────────────────────────
    doc.fontSize(8).text('CHI TIẾT', { underline: true });
    doc.fontSize(7).text(
      `Mượn: ${new Date(borrow.created_at).toLocaleDateString('vi-VN')}`,
      { width: 207 }
    );
    doc.text(
      `Hạn: ${new Date(borrow.due_date).toLocaleDateString('vi-VN')}`,
      { width: 207 }
    );
    if (borrow.return_date) {
      doc.text(
        `Trả: ${new Date(borrow.return_date).toLocaleDateString('vi-VN')}`,
        { width: 207 }
      );
    }
    doc.moveDown(2);

    // ─── Phí phạt (nếu có) ────────────────────────────────────
    if (borrow.fine) {
      doc.fontSize(8).font('Courier-Bold').text('PHẠT QUÁHẠN', { underline: true });
      doc.font('Courier');
      doc.text(`Quá ${borrow.fine.overdue_days} ngày`, { width: 207 });
      doc.fillColor('#dc2626').fontSize(9).font('Courier-Bold').text(
        borrow.fine.amount.toLocaleString('vi-VN') + 'đ',
        { width: 207 }
      );
      doc.fillColor('black');
      doc.moveDown(2);
    }

    // ─── Footer ────────────────────────────────────────────────
    doc.fontSize(7).font('Courier').text('────────────────────────────────', { align: 'center', width: 207 });
    doc.text(`Ngày in: ${new Date().toLocaleString('vi-VN')}`, { 
      align: 'center', 
      width: 207 
    });
    doc.text('Cảm ơn bạn!', { align: 'center', width: 207 });
    doc.moveDown(2);
    doc.text('(Giữ lại biên lai này)', { align: 'center', width: 207, fontSize: 6 });

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, fileName, (err) => {
        if (err) console.error('Download error:', err);
        setTimeout(() => { try { fs.unlinkSync(filePath); } catch (e) {} }, 60000);
      });
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Export Borrows ────────────────────────────────────────────────────────────
exports.exportBorrowsExcel = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    const borrows = await Borrow.findAll({
      where,
      include: [
        { model: Book, as: 'book', attributes: ['id', 'title', 'author'] },
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'student_id'] },
        { model: BookCopy, as: 'copy', attributes: ['id', 'copy_code'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const { filename, filepath } = await exportBorrows(borrows);
    res.download(filepath, filename, err => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      try { fs.unlinkSync(filepath); } catch (e) { console.warn('Không xóa được file tạm:', e.message); }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
