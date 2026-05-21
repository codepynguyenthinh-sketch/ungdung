// ─────────────────────────────────────────────────────────────────────────────
// THÊM VÀO CUỐI server/controllers/otherControllers.js
// (giữ nguyên toàn bộ code cũ, dán phần này xuống dưới)
// ─────────────────────────────────────────────────────────────────────────────

// ─── Sách được mượn nhiều nhất ────────────────────────────────────────────────
exports.getPopularBooks = async (req, res) => {
  try {
    const { limit = 20, from, to } = req.query;
    const whereClause = {};
    if (from || to) {
      whereClause.borrow_date = {};
      if (from) whereClause.borrow_date[Op.gte] = new Date(from);
      if (to)   whereClause.borrow_date[Op.lte] = new Date(to + 'T23:59:59');
    }

    const popular = await Borrow.findAll({
      attributes: [
        'book_id',
        [fn('COUNT', col('Borrow.id')), 'borrow_count'],
      ],
      where: whereClause,
      include: [{
        model: Book, as: 'book',
        attributes: ['id', 'title', 'author', 'isbn', 'borrow_count', 'available_copies', 'total_copies', 'location'],
        include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      }],
      group: ['book_id', 'book.id', 'book.category.id'],
      order: [[fn('COUNT', col('Borrow.id')), 'DESC']],
      limit: parseInt(limit),
      raw: false,
    });

    res.json({ success: true, data: popular.map(p => ({
      book_id: p.book_id,
      borrow_count: parseInt(p.dataValues.borrow_count),
      book: p.book,
    })) });
  } catch (err) {
    console.error('getPopularBooks error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Sinh viên nợ phạt ────────────────────────────────────────────────────────
exports.getFineDebtors = async (req, res) => {
  try {
    const { limit = 50, min_amount = 0 } = req.query;

    const debtors = await User.findAll({
      where: {
        unpaid_fines: { [Op.gt]: parseInt(min_amount) },
        role: 'user',
      },
      attributes: ['id', 'name', 'email', 'student_id', 'phone', 'unpaid_fines', 'total_fines', 'borrow_count'],
      order: [['unpaid_fines', 'DESC']],
      limit: parseInt(limit),
    });

    // Kèm chi tiết phiếu phạt chưa trả
    const result = await Promise.all(debtors.map(async (user) => {
      const fines = await Fine.findAll({
        where: { user_id: user.id, is_paid: false },
        include: [{
          model: Borrow, as: 'borrow',
          include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'author'] }],
        }],
        order: [['created_at', 'DESC']],
      });
      return { ...user.toJSON(), unpaid_fines_detail: fines };
    }));

    res.json({ success: true, data: result, total: result.length });
  } catch (err) {
    console.error('getFineDebtors error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Tồn kho sách (theo bản sao) ─────────────────────────────────────────────
exports.getStockReport = async (req, res) => {
  try {
    const { category_id, status } = req.query; // status: 'low' | 'out' | 'all'

    const where = { is_active: true };
    if (category_id) where.category_id = category_id;
    if (status === 'low') where.available_copies = { [Op.between]: [1, 2] };
    else if (status === 'out') where.available_copies = 0;

    const books = await Book.findAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        {
          model: BookCopy, as: 'copies',
          attributes: ['id', 'copy_code', 'status', 'condition'],
          required: false,
        },
      ],
      order: [['available_copies', 'ASC'], ['title', 'ASC']],
    });

    // Tổng hợp thống kê
    const stats = {
      total_books: books.length,
      total_copies: books.reduce((s, b) => s + b.total_copies, 0),
      available_copies: books.reduce((s, b) => s + b.available_copies, 0),
      borrowed_copies: 0,
      lost_copies: 0,
      out_of_stock: books.filter(b => b.available_copies === 0).length,
      low_stock: books.filter(b => b.available_copies > 0 && b.available_copies <= 2).length,
    };

    books.forEach(b => {
      (b.copies || []).forEach(c => {
        if (c.status === 'borrowed') stats.borrowed_copies++;
        if (c.status === 'lost') stats.lost_copies++;
      });
    });

    res.json({ success: true, data: books, stats });
  } catch (err) {
    console.error('getStockReport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Xuất Excel đầy đủ (5 sheets) ────────────────────────────────────────────
exports.exportFullReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from)              : new Date(Date.now() - 30 * 86400000);
    const end   = to   ? new Date(to + 'T23:59:59')  : new Date();

    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Phần mềm mượn trả sách';
    wb.created = new Date();

    const hStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } },
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} },
    };
    const altFill  = (i) => ({ type:'pattern', pattern:'solid', fgColor:{ argb: i%2===0 ? 'FFF8FAFC' : 'FFFFFFFF' } });
    const thinBorder = { top:{style:'thin',color:{argb:'FFE2E8F0'}}, left:{style:'thin',color:{argb:'FFE2E8F0'}}, bottom:{style:'thin',color:{argb:'FFE2E8F0'}}, right:{style:'thin',color:{argb:'FFE2E8F0'}} };
    const statusLabel = { borrowed:'Đang mượn', returned:'Đã trả', overdue:'Quá hạn', renewed:'Gia hạn', lost:'Mất sách' };
    const statusColor = { borrowed:'FF16A34A', returned:'FF2563EB', overdue:'FFDC2626', renewed:'FF0891B2', lost:'FF6B7280' };

    // ── Sheet 1: Chi tiết mượn trả ──────────────────────────────────────────
    const borrows = await Borrow.findAll({
      where: { borrow_date: { [Op.between]: [start, end] } },
      include: [
        { model: Book, as: 'book', attributes: ['id','title','author','isbn','deposit'] },
        { model: User, as: 'user', attributes: ['id','name','student_id','email','phone'] },
        { model: BookCopy, as: 'copy', attributes: ['id','copy_code','condition'] },
        { model: Fine, as: 'fine', attributes: ['id','amount','is_paid'], required: false },
      ],
      order: [['borrow_date','DESC']],
    });

    const ws1 = wb.addWorksheet('Chi tiết mượn trả');
    ws1.columns = [
      { header:'STT',       key:'stt',         width:6  },
      { header:'Ngày mượn', key:'borrow_date',  width:13 },
      { header:'Hạn trả',   key:'due_date',     width:13 },
      { header:'Ngày trả',  key:'return_date',  width:13 },
      { header:'Mã ĐKCB',   key:'copy_code',    width:16 },
      { header:'Tên sách',  key:'book',         width:36 },
      { header:'Tác giả',   key:'author',       width:22 },
      { header:'ISBN',      key:'isbn',         width:16 },
      { header:'Thế chân',  key:'deposit',      width:13 },
      { header:'Người mượn',key:'user',         width:22 },
      { header:'Mã SV',     key:'student_id',   width:13 },
      { header:'SĐT',       key:'phone',        width:13 },
      { header:'Trạng thái',key:'status',       width:14 },
      { header:'Phí phạt',  key:'fine',         width:13 },
    ];
    ws1.getRow(1).eachCell(c => Object.assign(c, hStyle));
    ws1.getRow(1).height = 30;

    borrows.forEach((b, i) => {
      const row = ws1.addRow({
        stt: i+1,
        borrow_date: b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('vi-VN') : '',
        due_date:    b.due_date    ? new Date(b.due_date).toLocaleDateString('vi-VN')    : '',
        return_date: b.return_date ? new Date(b.return_date).toLocaleDateString('vi-VN') : '—',
        copy_code:   b.copy?.copy_code || '—',
        book:        b.book?.title  || '',
        author:      b.book?.author || '',
        isbn:        b.book?.isbn   || '',
        deposit:     b.book?.deposit > 0 ? b.book.deposit : 0,
        user:        b.user?.name   || '',
        student_id:  b.user?.student_id || '',
        phone:       b.user?.phone  || '',
        status:      statusLabel[b.status] || b.status,
        fine:        b.fine?.amount > 0 ? b.fine.amount : 0,
      });
      row.height = 22;
      row.eachCell(c => { c.fill = altFill(i); c.border = thinBorder; c.alignment = { vertical:'middle' }; });
      row.getCell('status').font = { bold:true, color:{ argb: statusColor[b.status] || 'FF374151' } };
      row.getCell('copy_code').font = { name:'Courier New', bold:true, color:{ argb:'FF2563EB' } };
      if (b.book?.deposit > 0) row.getCell('deposit').numFmt = '#,##0';
      if (b.fine?.amount > 0)  row.getCell('fine').numFmt = '#,##0';
    });

    // ── Sheet 2: Tổng hợp theo ngày ────────────────────────────────────────
    const ws2 = wb.addWorksheet('Tổng hợp theo ngày');
    ws2.columns = [
      { header:'Ngày',          key:'date',     width:14 },
      { header:'Lượt mượn',     key:'borrowed', width:13 },
      { header:'Lượt trả',      key:'returned', width:13 },
      { header:'Tổng thế chân', key:'deposit',  width:16 },
    ];
    ws2.getRow(1).eachCell(c => Object.assign(c, hStyle));
    ws2.getRow(1).height = 28;

    const dayMap = {};
    borrows.forEach(b => {
      const d = b.borrow_date ? new Date(b.borrow_date).toLocaleDateString('vi-VN') : '';
      if (!dayMap[d]) dayMap[d] = { date:d, borrowed:0, returned:0, deposit:0 };
      dayMap[d].borrowed++;
      dayMap[d].deposit += (b.book?.deposit || 0);
    });
    borrows.filter(b => b.status === 'returned' && b.return_date).forEach(b => {
      const d = new Date(b.return_date).toLocaleDateString('vi-VN');
      if (!dayMap[d]) dayMap[d] = { date:d, borrowed:0, returned:0, deposit:0 };
      dayMap[d].returned++;
    });
    Object.values(dayMap).forEach((r, i) => {
      const row = ws2.addRow(r);
      row.height = 22;
      row.eachCell(c => { c.fill = altFill(i); c.border = thinBorder; c.alignment = { horizontal:'center', vertical:'middle' }; });
      row.getCell('deposit').numFmt = '#,##0';
    });

    // ── Sheet 3: Top sách được mượn nhiều ──────────────────────────────────
    const popularBooks = await Borrow.findAll({
      attributes: ['book_id', [fn('COUNT', col('Borrow.id')), 'cnt']],
      where: { borrow_date: { [Op.between]: [start, end] } },
      include: [{ model: Book, as: 'book', attributes: ['id','title','author','isbn','available_copies','total_copies'] }],
      group: ['book_id','book.id'],
      order: [[fn('COUNT', col('Borrow.id')), 'DESC']],
      limit: 50,
      raw: false,
    });

    const ws3 = wb.addWorksheet('Sách mượn nhiều nhất');
    ws3.columns = [
      { header:'Hạng',           key:'rank',      width:7  },
      { header:'Tên sách',       key:'title',     width:38 },
      { header:'Tác giả',        key:'author',    width:22 },
      { header:'ISBN',           key:'isbn',      width:16 },
      { header:'Lượt mượn',      key:'count',     width:13 },
      { header:'Còn lại',        key:'avail',     width:10 },
      { header:'Tổng bản',       key:'total',     width:10 },
    ];
    ws3.getRow(1).eachCell(c => Object.assign(c, hStyle));
    ws3.getRow(1).height = 28;
    popularBooks.forEach((p, i) => {
      const row = ws3.addRow({
        rank:   i+1,
        title:  p.book?.title  || '',
        author: p.book?.author || '',
        isbn:   p.book?.isbn   || '',
        count:  parseInt(p.dataValues.cnt),
        avail:  p.book?.available_copies ?? '',
        total:  p.book?.total_copies ?? '',
      });
      row.height = 22;
      row.eachCell(c => { c.fill = altFill(i); c.border = thinBorder; c.alignment = { vertical:'middle' }; });
      if (i < 3) row.getCell('rank').font = { bold:true, color:{ argb: ['FFCA8A00','FF94A3B8','FFB45309'][i] } };
    });

    // ── Sheet 4: Sinh viên nợ phạt ──────────────────────────────────────────
    const debtors = await User.findAll({
      where: { unpaid_fines: { [Op.gt]: 0 }, role: 'user' },
      attributes: ['id','name','email','student_id','phone','unpaid_fines','total_fines','borrow_count'],
      order: [['unpaid_fines','DESC']],
    });

    const ws4 = wb.addWorksheet('Sinh viên nợ phạt');
    ws4.columns = [
      { header:'STT',            key:'stt',          width:6  },
      { header:'Họ tên',         key:'name',         width:24 },
      { header:'Mã SV',          key:'student_id',   width:14 },
      { header:'Email',          key:'email',        width:28 },
      { header:'SĐT',            key:'phone',        width:14 },
      { header:'Nợ chưa trả',    key:'unpaid',       width:16 },
      { header:'Tổng phí phạt',  key:'total',        width:16 },
      { header:'Tổng lượt mượn', key:'borrows',      width:16 },
    ];
    ws4.getRow(1).eachCell(c => Object.assign(c, hStyle));
    ws4.getRow(1).height = 28;
    debtors.forEach((u, i) => {
      const row = ws4.addRow({
        stt:        i+1,
        name:       u.name,
        student_id: u.student_id || '',
        email:      u.email,
        phone:      u.phone || '',
        unpaid:     u.unpaid_fines,
        total:      u.total_fines,
        borrows:    u.borrow_count,
      });
      row.height = 22;
      row.eachCell(c => { c.fill = altFill(i); c.border = thinBorder; c.alignment = { vertical:'middle' }; });
      row.getCell('unpaid').font = { bold:true, color:{ argb:'FFDC2626' } };
      row.getCell('unpaid').numFmt = '#,##0';
      row.getCell('total').numFmt  = '#,##0';
    });

    // ── Sheet 5: Tồn kho sách ───────────────────────────────────────────────
    const stockBooks = await Book.findAll({
      where: { is_active: true },
      include: [{ model: Category, as: 'category', attributes: ['id','name'] }],
      order: [['available_copies','ASC'],['title','ASC']],
    });

    const ws5 = wb.addWorksheet('Tồn kho sách');
    ws5.columns = [
      { header:'STT',          key:'stt',    width:6  },
      { header:'Tên sách',     key:'title',  width:38 },
      { header:'Tác giả',      key:'author', width:22 },
      { header:'ISBN',         key:'isbn',   width:16 },
      { header:'Thể loại',     key:'cat',    width:18 },
      { header:'Vị trí kệ',   key:'loc',    width:12 },
      { header:'Tổng bản',     key:'total',  width:11 },
      { header:'Đang mượn',    key:'borrow', width:11 },
      { header:'Còn lại',      key:'avail',  width:11 },
      { header:'Tình trạng',   key:'stock',  width:14 },
    ];
    ws5.getRow(1).eachCell(c => Object.assign(c, hStyle));
    ws5.getRow(1).height = 28;
    stockBooks.forEach((b, i) => {
      const borrowed = b.total_copies - b.available_copies;
      const stockStatus = b.available_copies === 0 ? 'Hết sách' : b.available_copies <= 2 ? 'Sắp hết' : 'Còn sách';
      const row = ws5.addRow({
        stt:   i+1,
        title: b.title,
        author:b.author,
        isbn:  b.isbn || '',
        cat:   b.category?.name || '',
        loc:   b.location || '',
        total: b.total_copies,
        borrow:borrowed,
        avail: b.available_copies,
        stock: stockStatus,
      });
      row.height = 22;
      row.eachCell(c => { c.fill = altFill(i); c.border = thinBorder; c.alignment = { vertical:'middle' }; });
      const stockCell = row.getCell('stock');
      if (stockStatus === 'Hết sách') stockCell.font = { bold:true, color:{ argb:'FFDC2626' } };
      else if (stockStatus === 'Sắp hết') stockCell.font = { bold:true, color:{ argb:'FFD97706' } };
      else stockCell.font = { bold:true, color:{ argb:'FF16A34A' } };
    });

    // Ghi response
    const fname = `baocao-day-du-${(from||'').replace(/-/g,'')}-${(to||'').replace(/-/g,'')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fname)}`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('exportFullReport error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
