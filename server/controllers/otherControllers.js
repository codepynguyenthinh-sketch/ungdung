const fs = require('fs');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { Category, Department, User, Fine, Reservation, Book, Borrow, BookCopy } = require('../models');
const { parseUsersFile, exportUsers } = require('../utils/excelExport');
const sequelize = require('../config/db');

// ─── Category ───────────────────────────────────────────────────────────────
exports.getCategories = async (req, res) => {
  try {
    const cats = await Category.findAll({ where: { is_active: true }, order: [['name','ASC']] });
    res.json({ success: true, data: cats });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createCategory = async (req, res) => {
  try {
    const c = await Category.create(req.body);
    res.status(201).json({ success: true, data: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateCategory = async (req, res) => {
  try {
    const c = await Category.findByPk(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    await c.update(req.body);
    res.json({ success: true, data: c });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteCategory = async (req, res) => {
  try {
    const c = await Category.findByPk(req.params.id);
    if (!c) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    
    // Kiểm tra xem có sách nào thuộc danh mục này không
    const bookCount = await Book.count({ where: { category_id: c.id, is_active: true } });
    if (bookCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể xóa danh mục này vì còn ${bookCount} cuốn sách. Vui lòng chuyển hoặc xóa sách trước.` 
      });
    }
    
    await c.update({ is_active: false });
    res.json({ success: true, message: 'Đã xóa' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.uploadCategoryPdf = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Không có file PDF' });

    const pdf_url = `/uploads/pdfs/${req.file.filename}`;
    const is_public_pdf = req.body.is_public_pdf === 'true';
    await cat.update({ pdf_url, is_public_pdf });
    res.json({ success: true, data: cat });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCategoryPdf = async (req, res) => {
  const fs   = require('fs');
  const path = require('path');
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
    if (cat.pdf_url) {
      const filePath = path.join(__dirname, '..', cat.pdf_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await cat.update({ pdf_url: null, is_public_pdf: false });
    res.json({ success: true, message: 'Đã xóa PDF danh mục' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// ─── Department (Khoa viện) ──────────────────────────────────────────────
exports.getDepartments = async (req, res) => {
  try {
    const deps = await Department.findAll({ where: { is_active: true }, order: [['name','ASC']] });
    res.json({ success: true, data: deps });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.createDepartment = async (req, res) => {
  try {
    const d = await Department.create(req.body);
    res.status(201).json({ success: true, data: d });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateDepartment = async (req, res) => {
  try {
    const d = await Department.findByPk(req.params.id);
    if (!d) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    await d.update(req.body);
    res.json({ success: true, data: d });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.deleteDepartment = async (req, res) => {
  try {
    const d = await Department.findByPk(req.params.id);
    if (!d) return res.status(404).json({ success: false, message: 'Không tìm thấy' });

    // Kiểm tra xem có sách nào thuộc khoa/viện này không
    const bookCount = await Book.count({ where: { department_id: d.id, is_active: true } });
    if (bookCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa khoa/viện này vì còn ${bookCount} cuốn sách liên quan. Vui lòng chuyển hoặc xóa sách trước.`
      });
    }

    await d.update({ is_active: false });
    res.json({ success: true, message: 'Đã xoá' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
// ─── User ────────────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 20 } = req.query;
    const where = {};
    if (role) where.role = role;
    if (search) where[Op.or] = [
      { name:       { [Op.iLike]: `%${search}%` } },
      { email:      { [Op.iLike]: `%${search}%` } },
      { student_id: { [Op.iLike]: `%${search}%` } },
    ];
    const { count, rows } = await User.findAndCountAll({
      where, order: [['created_at','DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    res.json({ success: true, data: u });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    const { name, phone, address, student_id, role, is_active, permissions } = req.body;
    await u.update({ name, phone, address, student_id, role, is_active,
      permissions: Array.isArray(permissions) ? permissions : [] });
    res.json({ success: true, data: u });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await req.user.update({ name, phone, address });
    res.json({ success: true, data: req.user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const u = await User.findByPk(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    
    // Kiểm tra xem người dùng có các mượn sách đang hoạt động không
    const activeBorrows = await Borrow.count({ 
      where: { user_id: u.id, status: { [Op.in]: ['borrowed', 'renewed', 'overdue'] } } 
    });
    
    if (activeBorrows > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Không thể xóa sinh viên này vì còn ${activeBorrows} sách đang mượn. Vui lòng thu hồi sách trước.` 
      });
    }
    
    // Xóa dữ liệu liên quan
    // Xóa các đơn đặt trước
    await Reservation.destroy({ where: { user_id: u.id } });
    
    // Xóa các tin nhắn
    await require('../models').Message.destroy({ where: { [Op.or]: [{ sender_id: u.id }, { receiver_id: u.id }] } });
    
    // Xóa lịch sử mượn (soft delete hoặc hard delete tùy policy)
    await Borrow.update({ is_deleted: true }, { where: { user_id: u.id } });
    
    // Xóa phiếu phạt chưa thanh toán (hoặc cập nhật trạng thái)
    await Fine.update({ is_deleted: true }, { where: { user_id: u.id } });
    
    // Xóa người dùng
    await u.destroy();
    
    res.json({ success: true, message: `Đã xóa sinh viên ${u.name}` });
  } catch (err) { 
    console.error('Delete user error:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

exports.exportUsers = async (req, res) => {
  try {
    const users = await User.findAll({ order: [['created_at', 'DESC']] });
    const { filename, filepath } = await exportUsers(users);
    res.download(filepath, filename, err => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      try { fs.unlinkSync(filepath); } catch (e) { console.warn('Không xóa được file tạm:', e.message); }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ĐÃ FIX - Loại bỏ hoàn toàn merge conflict
exports.importUsers = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng tải lên file Excel' });
    const rows = await parseUsersFile(req.file.path);
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ success: false, message: 'File Excel không có dữ liệu hoặc định dạng sai' });
    const results = [];

    for (const row of rows) {
      let [user, created] = await User.findOrCreate({
        where: { email: row.email },
        defaults: {
          name: row.name || 'Unknown',
          email: row.email,
          password: row.password || 'defaultPassword123',
          student_id: row.student_id || null,
          phone: row.phone || null,
          address: row.address || null,
          role: row.role || 'student',
          is_active: row.is_active !== undefined ? row.is_active : true,
          date_of_birth: row.date_of_birth || null,
          department_id: row.department_id || null,
        },
      });

      if (!created) {
        const updateData = {
          name: row.name || user.name,
          student_id: row.student_id || user.student_id,
          phone: row.phone || user.phone,
          address: row.address || user.address,
          role: row.role || user.role,
          is_active: row.is_active !== undefined ? row.is_active : user.is_active,
          date_of_birth: row.date_of_birth || user.date_of_birth,
          department_id: row.department_id || user.department_id,
        };
        if (row.password) updateData.password = row.password;
        await user.update(updateData);
        results.push({ status: 'updated', id: user.id, email: user.email });
      } else {
        results.push({ status: 'created', id: user.id, email: user.email });
      }
    }

    res.json({ success: true, message: 'Đã import người dùng', total: rows.length, results });
  } catch (err) {
    console.error('Import users error:', err);
    res.status(500).json({ success: false, message: err.message || 'Lỗi khi import người dùng' });
  } finally {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) { console.warn('Không xóa được file tạm import:', e.message); }
    }
  }
};

// ─── Fine ────────────────────────────────────────────────────────────────────
exports.getFines = async (req, res) => {
  try {
    const { isPaid, user_id, page = 1, limit = 20 } = req.query;
    const where = {};
    if (isPaid !== undefined) where.is_paid = isPaid === 'true';
    if (user_id) where.user_id = user_id;
    if (req.user.role === 'user') where.user_id = req.user.id;

    const { count, rows } = await Fine.findAndCountAll({
      where,
      include: [
        { model: User,   as: 'user',   attributes: ['id','name','email','student_id'] },
        { model: Borrow, as: 'borrow', include: [{ model: Book, as: 'book', attributes: ['id','title','author'] }] },
      ],
      order: [['created_at','DESC']],
      limit: parseInt(limit), offset: (parseInt(page)-1)*parseInt(limit),
    });
    res.json({ success: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count/limit) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.payFine = async (req, res) => {
  try {
    const fine = await Fine.findByPk(req.params.id);
    if (!fine) return res.status(404).json({ success: false, message: 'Không tìm thấy phiếu phạt' });
    if (fine.is_paid) return res.status(400).json({ success: false, message: 'Đã thanh toán rồi' });
    await fine.update({ is_paid: true, paid_date: new Date(), paid_by: req.user.id });
    await User.decrement({ unpaid_fines: fine.amount }, { where: { id: fine.user_id } });
    res.json({ success: true, data: fine, message: 'Thanh toán thành công' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getMyFines = async (req, res) => {
  try {
    const fines = await Fine.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Borrow, as: 'borrow', include: [{ model: Book, as: 'book', attributes: ['id','title','author'] }] }],
      order: [['created_at','DESC']],
    });
    res.json({ success: true, data: fines });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Get student's overdue borrows (for displaying in "My Fines" page) ───────
exports.getMyOverdueBorrows = async (req, res) => {
  try {
    const { fineCalculator } = require('../utils/fineCalculator');
    const { getUserOverdueBorrows } = require('../utils/fineCalculator');
    
    const overdueBorrows = await getUserOverdueBorrows(req.user.id);
    const totalFineOwed = overdueBorrows.reduce((sum, b) => sum + b.fineAmount, 0);

    res.json({ success: true, data: {
      borrows: overdueBorrows,
      totalFineOwed,
      count: overdueBorrows.length,
    }});
  } catch (err) { 
    console.error('Error fetching overdue borrows:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// ─── Admin: Generate fines for all overdue borrows ──────────────────────────
exports.generateFines = async (req, res) => {
  try {
    const { generateOverdueFines } = require('../utils/fineCalculator');
    const result = await generateOverdueFines();
    res.json({ success: true, message: `Đã tạo ${result.finesCreated} phiếu phạt mới, cập nhật ${result.finesUpdated} phiếu`, data: result });
  } catch (err) { 
    console.error('Error generating fines:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// ─── Reservation ─────────────────────────────────────────────────────────────
exports.reserve = async (req, res) => {
  try {
    const { book_id } = req.body;
    const book = await Book.findByPk(book_id);
    if (!book) return res.status(404).json({ success: false, message: 'Không tìm thấy sách' });
    const existing = await Reservation.findOne({ where: { user_id: req.user.id, book_id, status: 'pending' } });
    if (existing) return res.status(400).json({ success: false, message: 'Đã đặt trước cuốn sách này' });
    const r = await Reservation.create({ user_id: req.user.id, book_id });
    res.status(201).json({ success: true, data: r });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.getMyReservations = async (req, res) => {
  try {
    const rs = await Reservation.findAll({
      where: { user_id: req.user.id },
      include: [{ model: Book, as: 'book', attributes: ['id','title','author','cover'] }],
      order: [['created_at','DESC']],
    });
    res.json({ success: true, data: rs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
exports.cancelReservation = async (req, res) => {
  try {
    const r = await Reservation.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!r) return res.status(404).json({ success: false, message: 'Không tìm thấy' });
    await r.update({ status: 'cancelled' });
    res.json({ success: true, data: r });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Admin: Get all reservations ─────────────────────────────────────────────
exports.getReservations = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const where = {};
    if (status) where.status = status;
    
    let reservations = await Reservation.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id','name','email','student_id'] },
        { model: Book, as: 'book', attributes: ['id','title','author','cover'] },
      ],
      order: [['created_at','DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
    });

    // If search provided, filter by student name, email, or ID
    if (search) {
      const searchLower = search.toLowerCase();
      reservations = reservations.filter(r => 
        r.user?.name?.toLowerCase().includes(searchLower) ||
        r.user?.email?.toLowerCase().includes(searchLower) ||
        r.user?.student_id?.toLowerCase().includes(searchLower)
      );
    }

    const total = await Reservation.count({ where });
    res.json({ 
      success: true, 
      data: reservations,
      total,
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) { 
    console.error('Error fetching reservations:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// ─── Admin: Update reservation status ────────────────────────────────────────
exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending','ready','fulfilled','cancelled','expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
    }

    const r = await Reservation.findByPk(req.params.id);
    if (!r) return res.status(404).json({ success: false, message: 'Không tìm thấy đặt trước' });
    
    await r.update({ status });
    
    // If status changed to 'ready', send notification (if system has it)
    if (status === 'ready') {
      // TODO: Send notification to user that book is ready
    }

    res.json({ success: true, data: r, message: `Đã cập nhật trạng thái thành "${status}"` });
  } catch (err) { 
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    
    const [
      totalBooks, totalUsers, activeBorrows, overdueBorrows, fineStats, unpaidStats, 
      recentBorrows, popularBooks, totalEBooks, booksAddedThisYear, totalCopies,
      categoryStats, reservationCount, lostBooks, statusBreakdown
    ] = await Promise.all([
      // Basic stats
      Book.count({ where: { is_active: true } }),
      User.count({ where: { role: 'user' } }),
      Borrow.count({ where: { status: { [Op.in]: ['borrowed','renewed'] } } }),
      Borrow.count({ where: { status: 'overdue' } }),
      Fine.sum('amount'),
      Fine.sum('amount', { where: { is_paid: false } }),
      
      // Recent borrows
      Borrow.findAll({
        limit: 10, order: [['created_at','DESC']],
        include: [
          { model: Book, as: 'book', attributes: ['id','title'] },
          { model: User, as: 'user', attributes: ['id','name','student_id'] },
        ],
      }),
      
      // Popular books
      Book.findAll({ 
        order: [['borrow_count','DESC']], limit: 5, 
        attributes: ['id','title','author','borrow_count','cover'] 
      }),
      
      // E-books (PDF) count
      Book.count({ where: { is_active: true, pdf_url: { [Op.not]: null } } }),
      
      // Books added this year
      Book.count({ where: { is_active: true, created_at: { [Op.gte]: yearStart } } }),
      
      // Total copies (all book copies)
      BookCopy.count(),
      
      // Category stats (most borrowed by category)
      Book.findAll({
        attributes: [
          'category_id',
          [fn('COUNT', col('Book.id')), 'bookCount'],
          [fn('SUM', col('Book.borrow_count')), 'totalBorrows'],
        ],
        where: { is_active: true },
        include: [{ model: Category, as: 'category', attributes: ['id','name'] }],
        group: ['category_id', 'category.id', 'category.name'],
        order: [[fn('SUM', col('Book.borrow_count')), 'DESC']],
        limit: 10,
        raw: false,
      }),
      
      // Pending reservations
      Reservation.count({ where: { status: 'pending' } }),
      
      // Lost books
      BookCopy.count({ where: { status: 'lost' } }),
      
      // Book copies by status
      BookCopy.findAll({
        attributes: [
          'status',
          [fn('COUNT', col('BookCopy.id')), 'count'],
        ],
        group: ['status'],
        raw: true,
      }),
    ]);

    res.json({ success: true, data: {
      // Basic metrics
      totalBooks,
      totalUsers,
      activeBorrows,
      overdueBorrows,
      totalFines: fineStats || 0,
      unpaidFines: unpaidStats || 0,
      
      // E-books metrics
      totalEBooks,
      eBookPercentage: totalBooks > 0 ? Math.round((totalEBooks / totalBooks) * 100) : 0,
      
      // Inventory metrics
      totalCopies,
      
      // Yearly metrics
      booksAddedThisYear,
      
      // Reservation & Inventory
      pendingReservations: reservationCount,
      lostBooks,
      
      // Status breakdown
      copyStatusBreakdown: statusBreakdown?.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      
      // Category performance
      categoryStats: categoryStats.map(cat => ({
        categoryId: cat.category_id,
        categoryName: cat.category?.name,
        bookCount: parseInt(cat.dataValues.bookCount),
        totalBorrows: parseInt(cat.dataValues.totalBorrows) || 0,
      })),
      
      // Recent activity
      recentBorrows,
      popularBooks,
    }});
  } catch (err) { 
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, message: err.message }); 
  }
};

// ─── Inventory Stats (Kiểm kê hàng năm) ─────────────────────────────────────────
exports.getInventoryStats = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const yearStart = new Date(targetYear, 0, 1);
    const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59);

    const [
      totalCopies,
      availableCopies,
      borrowedCopies,
      lostCopies,
      damagedCopies,
      maintenanceCopies,
      copiesAddedThisYear,
      copiesLostThisYear,
      departmentInventory,
    ] = await Promise.all([
      BookCopy.count(),
      BookCopy.count({ where: { status: 'available' } }),
      BookCopy.count({ where: { status: 'borrowed' } }),
      BookCopy.count({ where: { status: 'lost' } }),
      BookCopy.count({ where: { condition: 'damaged' } }),
      BookCopy.count({ where: { status: 'maintenance' } }),
      BookCopy.count({ where: { acquired_at: { [Op.gte]: yearStart } } }),
      BookCopy.count({ where: { status: 'lost', created_at: { [Op.between]: [yearStart, yearEnd] } } }),
      
      // Inventory by department
      BookCopy.findAll({
        attributes: [
          [col('book->department.id'), 'departmentId'],
          [col('book->department.name'), 'departmentName'],
          ['status', 'status'],
          [fn('COUNT', col('BookCopy.id')), 'count'],
        ],
        include: [{
          model: Book,
          as: 'book',
          attributes: [],
          include: [{
            model: Department,
            as: 'department',
            attributes: [],
          }],
        }],
        group: ['book->department.id', 'book->department.name', 'status'],
        order: [[col('book->department.name'), 'ASC']],
        raw: true,
      }),
    ]);

    // Organize department inventory
    const deptMap = {};
    departmentInventory.forEach(item => {
      if (!deptMap[item.departmentId]) {
        deptMap[item.departmentId] = {
          departmentId: item.departmentId,
          departmentName: item.departmentName,
          statuses: {},
          total: 0,
        };
      }
      deptMap[item.departmentId].statuses[item.status] = parseInt(item.count);
      deptMap[item.departmentId].total += parseInt(item.count);
    });

    res.json({ success: true, data: {
      year: targetYear,
      
      // Overall inventory status
      totalCopies,
      availableCopies,
      borrowedCopies,
      lostCopies,
      damagedCopies,
      maintenanceCopies,
      
      // Yearly changes
      copiesAddedThisYear,
      copiesLostThisYear,
      
      // Department breakdown
      departmentInventory: Object.values(deptMap),
      
      // Summary percentages
      availabilityRate: totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0,
      lossRate: totalCopies > 0 ? Math.round((lostCopies / totalCopies) * 100) : 0,
    }});
  } catch (err) {
    console.error('Inventory stats error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getBorrowStats = async (req, res) => {
  try {
    const monthly = await Borrow.findAll({
      attributes: [
        [fn('EXTRACT', literal('YEAR FROM created_at')),  'year'],
        [fn('EXTRACT', literal('MONTH FROM created_at')), 'month'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: new Date(new Date().getFullYear(), 0, 1) } },
      group: ['year', 'month'],
      order: [['year','ASC'], ['month','ASC']],
      raw: true,
    });
    res.json({ success: true, data: monthly });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── Thống kê mượn sách hàng ngày ────────────────────────────────────────────
exports.getDailyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(new Date() - 30 * 86400000);
    const end   = to   ? new Date(to + 'T23:59:59') : new Date();

    const [borrows, returns_, newBorrows, overdue, finesCollected, librarianStats] = await Promise.all([
      Borrow.findAll({
        attributes: [
          [fn('DATE', col('borrow_date')), 'date'],
          [fn('COUNT', col('Borrow.id')), 'count'],
        ],
        where: { borrow_date: { [Op.between]: [start, end] } },
        group: [fn('DATE', col('borrow_date'))],
        order: [[fn('DATE', col('borrow_date')), 'ASC']],
        raw: true,
      }),
      Borrow.findAll({
        attributes: [
          [fn('DATE', col('return_date')), 'date'],
          [fn('COUNT', col('Borrow.id')), 'count'],
        ],
        where: { return_date: { [Op.between]: [start, end] }, status: 'returned' },
        group: [fn('DATE', col('return_date'))],
        order: [[fn('DATE', col('return_date')), 'ASC']],
        raw: true,
      }),
      Borrow.findAll({
        where: { borrow_date: { [Op.between]: [start, end] } },
        include: [
          { model: Book, as: 'book', attributes: ['id','title','author'] },
          { model: User, as: 'user', attributes: ['id','name','student_id','email'] },
        ],
        order: [['borrow_date','DESC']],
        limit: 500,
      }),
      Borrow.count({ where: { status: 'overdue' } }),
      Fine.sum('amount', {
        where: { is_paid: true, paid_date: { [Op.between]: [start, end] } },
      }),
      Borrow.findAll({
        attributes: [
          'processed_by',
          [fn('COUNT', col('Borrow.id')), 'borrow_count'],
        ],
        where: { borrow_date: { [Op.between]: [start, end] } },
        include: [
          { model: User, as: 'processor', attributes: ['id','name'] },
        ],
        group: ['processed_by', 'processor.id', 'processor.name'],
        order: [[fn('COUNT', col('Borrow.id')), 'DESC']],
        raw: false,
      }),
    ]);

    const dateMap = {};
    borrows.forEach(r => {
      if (!r.date) return;
      dateMap[r.date] = { date: r.date, borrowed: Number(r.count), returned: 0 };
    });
    returns_.forEach(r => {
      if (!r.date) return;
      if (!dateMap[r.date]) dateMap[r.date] = { date: r.date, borrowed: 0, returned: 0 };
      dateMap[r.date].returned = Number(r.count);
    });
    const dailyData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

    const processedLibrarianStats = librarianStats.map(s => ({
      processed_by: s.processed_by,
      borrow_count: Number(s.get('borrow_count') || 0),
      'processor.name': s.processor?.name || 'N/A',
    }));

    res.json({
      success: true,
      data: {
        dailyData,
        borrows: newBorrows,
        overdue,
        finesCollected: finesCollected || 0,
        totalBorrowed: borrows.reduce((sum, r) => sum + Number(r.count || 0), 0),
        totalReturned: returns_.reduce((sum, r) => sum + Number(r.count || 0), 0),
        librarianStats: processedLibrarianStats,
        from: start, to: end,
      },
    });
  } catch (err) {
    console.error('getDailyReport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Xuất Excel báo cáo hàng ngày ───────────────────────────────────────────
exports.exportDailyReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(new Date() - 30 * 86400000);
    const end   = to   ? new Date(to + 'T23:59:59') : new Date();

    const borrows = await Borrow.findAll({
      where: { borrow_date: { [Op.between]: [start, end] } },
      include: [
        { model: Book, as: 'book', attributes: ['id','title','author','isbn'] },
        { model: User, as: 'user', attributes: ['id','name','student_id','email','phone'] },
      ],
      order: [['borrow_date','ASC']],
    });

    const ExcelJS = require('exceljs');
    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'Library Management System';
    workbook.created = new Date();

    // ── Sheet 1: Chi tiết phiếu mượn ──
    const ws1 = workbook.addWorksheet('Chi tiết mượn trả');
    ws1.columns = [
      { header: 'STT',           key: 'stt',         width: 6  },
      { header: 'Ngày mượn',     key: 'borrow_date', width: 14 },
      { header: 'Hạn trả',       key: 'due_date',    width: 14 },
      { header: 'Ngày trả',      key: 'return_date', width: 14 },
      { header: 'Tên sách',      key: 'book',        width: 36 },
      { header: 'Tác giả',       key: 'author',      width: 22 },
      { header: 'ISBN',          key: 'isbn',        width: 16 },
      { header: 'Người mượn',    key: 'user',        width: 22 },
      { header: 'Mã SV',         key: 'student_id',  width: 14 },
      { header: 'Email',         key: 'email',       width: 26 },
      { header: 'Trạng thái',    key: 'status',      width: 14 },
    ];

    const hStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} },
    };
    ws1.getRow(1).eachCell(c => Object.assign(c, hStyle));
    ws1.getRow(1).height = 28;

    const statusLabel = { borrowed:'Đang mượn', returned:'Đã trả', overdue:'Quá hạn', renewed:'Gia hạn', lost:'Mất sách' };
    const statusColor = { borrowed:'FF16A34A', returned:'FF2563EB', overdue:'FFDC2626', renewed:'FF0891B2', lost:'FF6B7280' };

    borrows.forEach((b, idx) => {
      const row = ws1.addRow({
        stt:         idx + 1,
        borrow_date: b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('vi-VN') : '',
        due_date:    b.due_date    ? new Date(b.due_date).toLocaleDateString('vi-VN')    : '',
        return_date: b.return_date ? new Date(b.return_date).toLocaleDateString('vi-VN') : '—',
        book:        b.book?.title  || '',
        author:      b.book?.author || '',
        isbn:        b.book?.isbn   || '',
        user:        b.user?.name   || '',
        student_id:  b.user?.student_id || '',
        email:       b.user?.email  || '',
        status:      statusLabel[b.status] || b.status,
      });
      row.height = 22;
      const fill = { type:'pattern', pattern:'solid', fgColor:{ argb: idx%2===0?'FFF8FAFC':'FFFFFFFF' } };
      const border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      row.eachCell(c => { c.fill = fill; c.border = border; c.alignment = { vertical:'middle', wrapText:true }; });
      // Màu trạng thái
      const statusCell = row.getCell('status');
      statusCell.font = { bold:true, color:{ argb: statusColor[b.status] || 'FF374151' } };
    });

    // ── Sheet 2: Tổng hợp theo ngày ──
    const ws2 = workbook.addWorksheet('Tổng hợp theo ngày');
    ws2.columns = [
      { header: 'Ngày',       key: 'date',     width: 14 },
      { header: 'Số mượn',    key: 'borrowed', width: 12 },
      { header: 'Số trả',     key: 'returned', width: 12 },
    ];
    ws2.getRow(1).eachCell(c => Object.assign(c, hStyle));

    // Gộp theo ngày
    const dayMap = {};
    borrows.forEach(b => {
      const d = b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('vi-VN') : '';
      if (!dayMap[d]) dayMap[d] = { date: d, borrowed: 0, returned: 0 };
      dayMap[d].borrowed++;
    });
    borrows.filter(b => b.status === 'returned' && b.return_date).forEach(b => {
      const d = new Date(b.return_date).toLocaleDateString('vi-VN');
      if (!dayMap[d]) dayMap[d] = { date: d, borrowed: 0, returned: 0 };
      dayMap[d].returned++;
    });
    Object.values(dayMap).forEach((row, i) => {
      const r = ws2.addRow(row);
      r.height = 22;
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.alignment = { horizontal:'center', vertical:'middle' };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
    });
    // ── Sheet 3: Thống kê theo thủ thư ──
    const ws3 = workbook.addWorksheet('Thống kê thủ thư');
    ws3.columns = [
      { header: 'Tên thủ thư', key: 'librarian', width: 22 },
      { header: 'Số lượt cho mượn', key: 'borrow_count', width: 18 },
    ];
    ws3.getRow(1).eachCell(c => Object.assign(c, hStyle));

    // Lấy thống kê thủ thư
    const librarianStats = await Borrow.findAll({
      attributes: [
        'processed_by',
        [fn('COUNT', col('Borrow.id')), 'borrow_count'],
      ],
      where: { borrow_date: { [Op.between]: [start, end] } },
      include: [
        { model: User, as: 'processor', attributes: ['id','name'] },
      ],
      group: ['processed_by', 'processor.id', 'processor.name'],
      order: [[fn('COUNT', col('Borrow.id')), 'DESC']],
      raw: false,
    });

    const processedStats = librarianStats.map(s => ({
      processed_by: s.processed_by,
      borrow_count: s.dataValues.borrow_count,
      'processor.name': s.processor?.name || 'N/A'
    }));

    processedStats.forEach((l, i) => {
      const r = ws3.addRow({
        librarian: l['processor.name'] || 'N/A',
        borrow_count: Number(l.borrow_count),
      });
      r.height = 22;
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.alignment = { horizontal:'left', vertical:'middle' };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
    });
    const fname = `baocao-muon-sach-${from||'30ngay'}-den-${to||'homay'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { console.error('exportDailyReport error:', err); res.status(500).json({ success: false, message: err.message }); }
};

// ─── Comprehensive 5-Sheet Export (Xuất khẩu 5 sheets) ────────────────────────────────────
exports.exportComprehensiveReport = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const startYear = new Date(`${year}-01-01`);
    const endYear = new Date(`${year}-12-31T23:59:59`);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Library Management System';
    workbook.created = new Date();

    // ── Header Style ──
    const hStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} },
    };

    // ── Sheet 1: Thống kê tổng hợp ──
    const ws1 = workbook.addWorksheet('Tổng Hợp');
    ws1.columns = [
      { header: 'Chỉ Số', key: 'metric', width: 30 },
      { header: 'Giá Trị', key: 'value', width: 20 },
    ];
    ws1.getRow(1).eachCell(c => Object.assign(c, hStyle));

    const stats = {
      totalBooks: await Book.count(),
      totalCopies: await BookCopy.count(),
      availableCopies: await BookCopy.count({ where: { status: 'available' } }),
      borrowedCopies: await BookCopy.count({ where: { status: 'borrowed' } }),
      reservedCopies: await BookCopy.count({ where: { status: 'reserved' } }),
      lostCopies: await BookCopy.count({ where: { status: 'lost' } }),
      maintenanceCopies: await BookCopy.count({ where: { status: 'maintenance' } }),
      totalUsers: await User.count(),
      activeBorrows: await Borrow.count({ where: { status: { [Op.in]: ['borrowed','renewed'] } } }),
      overdueBorrows: await Borrow.count({ where: { status: 'overdue', due_date: { [Op.lt]: new Date() } } }),
      totalEBooks: await Book.count({ where: { pdf_url: { [Op.ne]: null } } }),
      booksAddedThisYear: await Book.count({ where: { created_at: { [Op.between]: [startYear, endYear] } } }),
      copiesAddedThisYear: await BookCopy.count({ where: { created_at: { [Op.between]: [startYear, endYear] } } }),
    };

    const statsData = [
      { metric: 'Tổng nhan đề sách', value: stats.totalBooks },
      { metric: 'Tổng bản đăng ký', value: stats.totalCopies },
      { metric: 'Sách có sẵn', value: stats.availableCopies },
      { metric: 'Sách đang mượn', value: stats.borrowedCopies },
      { metric: 'Sách đặt trước', value: stats.reservedCopies },
      { metric: 'Sách bị mất', value: stats.lostCopies },
      { metric: 'Sách bảo trì', value: stats.maintenanceCopies },
      { metric: 'Tổng người dùng', value: stats.totalUsers },
      { metric: 'Sách đang cho mượn', value: stats.activeBorrows },
      { metric: 'Sách quá hạn', value: stats.overdueBorrows },
      { metric: 'E-Book', value: stats.totalEBooks },
      { metric: `Sách thêm năm ${year}`, value: stats.booksAddedThisYear },
      { metric: `Bản đăng ký thêm năm ${year}`, value: stats.copiesAddedThisYear },
    ];

    statsData.forEach((s, i) => {
      const r = ws1.addRow(s);
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
      r.getCell('value').alignment = { horizontal: 'center' };
    });

    // ── Sheet 2: Sách theo danh mục ──
    const ws2 = workbook.addWorksheet('Thống Kê Danh Mục');
    ws2.columns = [
      { header: 'Danh Mục', key: 'category', width: 25 },
      { header: 'Nhan Đề', key: 'titleCount', width: 12 },
      { header: 'Bản Đăng Ký', key: 'copyCount', width: 15 },
      { header: 'Có Sẵn', key: 'available', width: 12 },
      { header: 'Đang Mượn', key: 'borrowed', width: 12 },
      { header: 'Mất Sách', key: 'lost', width: 12 },
    ];
    ws2.getRow(1).eachCell(c => Object.assign(c, hStyle));

    const catStats = await sequelize.query(`
      SELECT c.name, COUNT(DISTINCT b.id) as titleCount,
             COUNT(bc.id) as copyCount,
             SUM(CASE WHEN bc.status='available' THEN 1 ELSE 0 END) as available,
             SUM(CASE WHEN bc.status='borrowed' THEN 1 ELSE 0 END) as borrowed,
             SUM(CASE WHEN bc.status='lost' THEN 1 ELSE 0 END) as lost
      FROM categories c
      LEFT JOIN books b ON c.id = b.category_id
      LEFT JOIN book_copies bc ON b.id = bc.book_id
      GROUP BY c.id, c.name
      ORDER BY COUNT(bc.id) DESC
    `, { type: QueryTypes.SELECT });

    catStats.forEach((s, i) => {
      const r = ws2.addRow({
        category: s.name,
        titleCount: s.titleCount || 0,
        copyCount: s.copyCount || 0,
        available: s.available || 0,
        borrowed: s.borrowed || 0,
        lost: s.lost || 0,
      });
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
      Object.keys(r.values).slice(1).forEach(k => r.getCell(k).alignment = { horizontal: 'center' });
    });

    // ── Sheet 3: Sách quá hạn ──
    const ws3 = workbook.addWorksheet('Sách Quá Hạn');
    ws3.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã SV', key: 'student_id', width: 14 },
      { header: 'Tên SV', key: 'student', width: 22 },
      { header: 'Tên Sách', key: 'book', width: 30 },
      { header: 'Mã Sách', key: 'copy_code', width: 16 },
      { header: 'Hạn Trả', key: 'due_date', width: 14 },
      { header: 'Trễ (Ngày)', key: 'overdue_days', width: 12 },
      { header: 'Phí (VNĐ)', key: 'fine_amount', width: 15 },
    ];
    ws3.getRow(1).eachCell(c => Object.assign(c, hStyle));

    const overdues = await Borrow.findAll({
      where: { status: { [Op.in]: ['borrowed','overdue'] }, due_date: { [Op.lt]: new Date() } },
      include: [
        { model: Book, as: 'book', attributes: ['title'] },
        { model: BookCopy, as: 'copy', attributes: ['copy_code'] },
        { model: User, as: 'user', attributes: ['name','student_id'] },
      ],
    });

    overdues.forEach((b, i) => {
      const days = Math.floor((new Date() - new Date(b.due_date)) / 86400000);
      const fine = Math.min(days * 5000, 100000);
      const r = ws3.addRow({
        stt: i + 1,
        student_id: b.user?.student_id,
        student: b.user?.name,
        book: b.book?.title,
        copy_code: b.copy?.copy_code,
        due_date: new Date(b.due_date).toLocaleDateString('vi-VN'),
        overdue_days: days,
        fine_amount: fine,
      });
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
      r.getCell('fine_amount').font = { bold: true, color: { argb: 'FFDC2626' } };
    });

    // ── Sheet 4: Sách mất ──
    const ws4 = workbook.addWorksheet('Sách Mất');
    ws4.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã Sách', key: 'copy_code', width: 16 },
      { header: 'Tên Sách', key: 'book', width: 30 },
      { header: 'Tác Giả', key: 'author', width: 22 },
      { header: 'Danh Mục', key: 'category', width: 18 },
      { header: 'Ngày Thêm', key: 'acquired', width: 14 },
      { header: 'Tình Trạng', key: 'condition', width: 15 },
    ];
    ws4.getRow(1).eachCell(c => Object.assign(c, hStyle));

    const lost = await BookCopy.findAll({
      where: { status: 'lost' },
      include: [{ model: Book, as: 'book', attributes: ['title','author','category_id'], include: [{ model: Category, as: 'category' }] }],
    });

    lost.forEach((b, i) => {
      const r = ws4.addRow({
        stt: i + 1,
        copy_code: b.copy_code,
        book: b.book?.title,
        author: b.book?.author,
        category: b.book?.category?.name,
        acquired: b.acquired_at ? new Date(b.acquired_at).toLocaleDateString('vi-VN') : '',
        condition: b.condition,
      });
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
    });

    // ── Sheet 5: Theo khoa / Bộ phận ──
    const ws5 = workbook.addWorksheet('Thống Kê Khoa');
    ws5.columns = [
      { header: 'Khoa / Bộ Phận', key: 'department', width: 25 },
      { header: 'Bản Đăng Ký', key: 'copyCount', width: 15 },
      { header: 'Có Sẵn', key: 'available', width: 12 },
      { header: 'Đang Mượn', key: 'borrowed', width: 12 },
      { header: 'Mất', key: 'lost', width: 10 },
    ];
    ws5.getRow(1).eachCell(c => Object.assign(c, hStyle));

    const deptStats = await sequelize.query(`
      SELECT d.name,
             COUNT(bc.id) as copyCount,
             SUM(CASE WHEN bc.status='available' THEN 1 ELSE 0 END) as available,
             SUM(CASE WHEN bc.status='borrowed' THEN 1 ELSE 0 END) as borrowed,
             SUM(CASE WHEN bc.status='lost' THEN 1 ELSE 0 END) as lost
      FROM departments d
      LEFT JOIN books b ON d.id = b.department_id
      LEFT JOIN book_copies bc ON b.id = bc.book_id
      GROUP BY d.id, d.name
      ORDER BY COUNT(bc.id) DESC
    `, { type: QueryTypes.SELECT });

    deptStats.forEach((s, i) => {
      const r = ws5.addRow({
        department: s.name,
        copyCount: s.copyCount || 0,
        available: s.available || 0,
        borrowed: s.borrowed || 0,
        lost: s.lost || 0,
      });
      r.eachCell(c => {
        c.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0?'FFF8FAFC':'FFFFFFFF' } };
        c.border = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
      });
      Object.keys(r.values).slice(1).forEach(k => r.getCell(k).alignment = { horizontal: 'center' });
    });

    const fname = `baocao-5sheets-nam-${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportComprehensiveReport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Check Inventory (Kiểm kê kho) ────────────────────────────────────────────────────────
exports.checkInventory = async (req, res) => {
  try {
    const { codes } = req.body; // Array of scanned book codes
    if (!codes || !Array.isArray(codes)) {
      return res.status(400).json({ success: false, message: 'Cần danh sách mã sách' });
    }

    const found = await BookCopy.findAll({
      where: { copy_code: { [Op.in]: codes } },
      include: [
        { model: Book, as: 'book', attributes: ['title','author','category_id'] },
      ],
    });

    const foundCodes = found.map(c => c.copy_code);
    const missing = codes.filter(c => !foundCodes.includes(c));

    res.json({
      success: true,
      data: {
        found: found.map(f => ({
          copy_code: f.copy_code,
          title: f.book?.title,
          author: f.book?.author,
          status: f.status,
          condition: f.condition,
        })),
        missing: missing,
        stats: {
          total: codes.length,
          foundCount: found.length,
          missingCount: missing.length,
          foundPercent: Math.round((found.length / codes.length) * 100),
        }
      }
    });
  } catch (err) {
    console.error('checkInventory error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
