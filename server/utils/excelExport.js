const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Đảm bảo folder tmp tồn tại
const tmpDir = path.join(__dirname, '../../tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

// ─── Style helpers ────────────────────────────────────────────────────────────
const headerStyle = {
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563eb' } },
  font: { bold: true, color: { argb: 'FFFFFF' }, size: 11 },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
};

const cellStyle = {
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
};

const centerStyle = {
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
};

// ─── Helper format ngày thành string dd/mm/yyyy (tránh Excel auto-convert) ───
const formatDate = (val) => {
  if (!val) return '';
  // Nếu là Date object (từ Sequelize)
  if (val instanceof Date) {
    const day   = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year  = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  // Nếu là số nguyên (Excel serial date), convert sang Date
  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const day   = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year  = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  // Nếu là string dạng YYYY-MM-DD
  const s = val.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
};

// Parse ngày từ Excel: chấp nhận dd/mm/yyyy, yyyy-mm-dd, hoặc Excel serial
const parseDateCell = (cellValue) => {
  if (!cellValue) return null;
  // Excel serial number
  if (typeof cellValue === 'number') {
    const d = new Date(Math.round((cellValue - 25569) * 86400 * 1000));
    return d.toISOString().split('T')[0]; // yyyy-mm-dd cho DB
  }
  const s = cellValue.toString().trim();
  // dd/mm/yyyy
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
};

// ─── Báo cáo sách mất ────────────────────────────────────────────────────────
exports.exportLostBooks = async (lostBooks) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sách Mất');

  // Header
  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã Sách', key: 'copy_code', width: 20 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Tác Giả', key: 'author', width: 20 },
    { header: 'Danh Mục', key: 'category', width: 15 },
    { header: 'Ngày Thêm', key: 'acquired_at', width: 15 },
    { header: 'Tình Trạng Cuối', key: 'condition', width: 15 },
    { header: 'Ghi Chú', key: 'note', width: 30 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  // Data
  let stt = 1;
  lostBooks.forEach(item => {
    worksheet.addRow({
      stt: stt++,
      copy_code: item.copy_code,
      book_title: item.book?.title,
      author: item.book?.author,
      category: item.book?.category?.name,
      acquired_at: item.acquired_at ? item.acquired_at.toISOString().split('T')[0] : '',
      condition: item.condition,
      note: item.note || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.style = cellStyle;
      });
    }
  });

  const filename = `lost-books-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

// ─── Báo cáo sách quá hạn ────────────────────────────────────────────────────
exports.exportOverdueBooks = async (overdueBooks) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sách Quá Hạn');

  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã SV', key: 'student_id', width: 15 },
    { header: 'Tên Sinh Viên', key: 'student_name', width: 20 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Mã Sách', key: 'copy_code', width: 20 },
    { header: 'Ngày Mượn', key: 'borrow_date', width: 12 },
    { header: 'Hạn Trả', key: 'due_date', width: 12 },
    { header: 'Quá Hạn (Ngày)', key: 'overdue_days', width: 12 },
    { header: 'Tiền Phạt (VNĐ)', key: 'fine_amount', width: 15 },
    { header: 'Trạng Thái', key: 'status', width: 15 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  let stt = 1;
  overdueBooks.forEach(item => {
    const today = new Date();
    const overdaysDays = Math.floor((today - new Date(item.due_date)) / (1000 * 60 * 60 * 24));
    const fineAmount = overdaysDays * 5000; // 5000 VNĐ/ngày

    worksheet.addRow({
      stt: stt++,
      student_id: item.user?.student_id,
      student_name: item.user?.name,
      book_title: item.book?.title,
      copy_code: item.copy?.copy_code || 'N/A',
      borrow_date: new Date(item.borrow_date).toISOString().split('T')[0],
      due_date: new Date(item.due_date).toISOString().split('T')[0],
      overdue_days: overdaysDays,
      fine_amount: fineAmount,
      status: item.status,
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell, colNumber) => {
        if ([8, 9].includes(colNumber)) {
          cell.style = { ...centerStyle };
        } else {
          cell.style = cellStyle;
        }
      });
    }
  });

  const filename = `overdue-books-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

// ─── Báo cáo tổng hợp ────────────────────────────────────────────────────────
exports.exportComprehensiveReport = async (stats) => {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Tổng hợp
  const summaryWs = workbook.addWorksheet('Tổng Hợp');
  summaryWs.columns = [
    { header: 'Chỉ Số', key: 'metric', width: 30 },
    { header: 'Giá Trị', key: 'value', width: 20 },
  ];

  summaryWs.getRow(1).style = headerStyle;
  summaryWs.addRows([
    { metric: 'Tổng số nhan đề sách', value: stats.totalBooks },
    { metric: 'Tổng số bản đăng ký', value: stats.totalCopies },
    { metric: 'Sách có sẵn', value: stats.availableCopies },
    { metric: 'Sách đang mượn', value: stats.borrowedCopies },
    { metric: 'Sách bị mất', value: stats.lostCopies },
    { metric: 'Sách quá hạn', value: stats.overdueBorrows },
    { metric: 'Tổng tiền phạt chưa trả (VNĐ)', value: stats.totalUnpaidFines },
  ]);

  // Sheet 2: Thống kê theo danh mục
  if (stats.categoryStats && stats.categoryStats.length > 0) {
    const catWs = workbook.addWorksheet('Thống Kê Danh Mục');
    catWs.columns = [
      { header: 'Danh Mục', key: 'category', width: 25 },
      { header: 'Nhan Đề', key: 'titleCount', width: 12 },
      { header: 'Bản Đăng Ký', key: 'copyCount', width: 15 },
      { header: 'Có Sẵn', key: 'available', width: 12 },
      { header: 'Đang Mượn', key: 'borrowed', width: 12 },
    ];

    catWs.getRow(1).style = headerStyle;
    stats.categoryStats.forEach(row => {
      catWs.addRow({
        category: row.category,
        titleCount: row.titleCount,
        copyCount: row.copyCount,
        available: row.available,
        borrowed: row.borrowed,
      });
    });
  }

  const filename = `report-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

const normalizeValue = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value.text !== undefined) return value.text.toString().trim();
  return value.toString().trim();
};

exports.exportBooks = async (books) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Books');

  worksheet.columns = [
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Author', key: 'author', width: 25 },
    { header: 'ISBN', key: 'isbn', width: 16 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Department', key: 'department', width: 18 },
    { header: 'Publisher', key: 'publisher', width: 20 },
    { header: 'Publish Year', key: 'publish_year', width: 14 },
    { header: 'Edition', key: 'edition', width: 12 },
    { header: 'Total Copies', key: 'total_copies', width: 12 },
    { header: 'Available Copies', key: 'available_copies', width: 14 },
    { header: 'Location', key: 'location', width: 18 },
    { header: 'Language', key: 'language', width: 14 },
    { header: 'Pages', key: 'pages', width: 10 },
    { header: 'Tags', key: 'tags', width: 20 },
    { header: 'Deposit', key: 'deposit', width: 12 },
    { header: 'PDF URL', key: 'pdf_url', width: 40 },
    { header: 'Public PDF', key: 'is_public_pdf', width: 12 },
    { header: 'Access Level', key: 'access_level', width: 12 },
    { header: 'Active', key: 'is_active', width: 10 },
    { header: 'Description', key: 'description', width: 40 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  books.forEach(book => {
    worksheet.addRow({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category?.name || '',
      department: book.department?.name || '',
      publisher: book.publisher || '',
      publish_year: book.publish_year || '',
      edition: book.edition || '',
      total_copies: book.total_copies || 0,
      available_copies: book.available_copies || 0,
      location: book.location || '',
      language: book.language || '',
      pages: book.pages || '',
      tags: Array.isArray(book.tags) ? book.tags.join(', ') : book.tags || '',
      deposit: book.deposit || 0,
      pdf_url: book.pdf_url || '',
      is_public_pdf: book.is_public_pdf ? 'TRUE' : 'FALSE',
      access_level: book.access_level || 'public',
      is_active: book.is_active ? 'TRUE' : 'FALSE',
      description: book.description || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => { cell.style = cellStyle; });
    }
  });

  const filename = `books-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

exports.exportUsers = async (users) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  worksheet.columns = [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Student ID', key: 'student_id', width: 18 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Active', key: 'is_active', width: 10 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  users.forEach(user => {
    worksheet.addRow({
      name: user.name,
      email: user.email,
      student_id: user.student_id || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role || 'user',
      is_active: user.is_active ? 'TRUE' : 'FALSE',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.eachCell(cell => { cell.style = cellStyle; });
  });

  const filename = `users-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

// ─── Export Borrows ────────────────────────────────────────────────────────────
exports.exportBorrows = async (borrows) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Lịch sử mượn trả');

  worksheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã SV', key: 'student_id', width: 15 },
    { header: 'Tên Sinh Viên', key: 'student_name', width: 22 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Tác Giả', key: 'author', width: 20 },
    { header: 'Mã ĐKCB', key: 'copy_code', width: 18 },
    { header: 'Ngày Mượn', key: 'borrow_date', width: 14 },
    { header: 'Hạn Trả', key: 'due_date', width: 14 },
    { header: 'Ngày Trả', key: 'return_date', width: 14 },
    { header: 'Trạng Thái', key: 'status', width: 14 },
    { header: 'Loại Mượn', key: 'borrow_type', width: 12 },
    { header: 'Số Lần Gia Hạn', key: 'renew_count', width: 14 },
    { header: 'Ghi Chú', key: 'note', width: 25 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  const statusVi = { borrowed: 'Đang mượn', returned: 'Đã trả', overdue: 'Quá hạn', renewed: 'Đã gia hạn', lost: 'Mất sách' };
  const typeVi = { home: 'Mượn về', onsite: 'Đọc tại chỗ' };

  let stt = 1;
  borrows.forEach(b => {
    worksheet.addRow({
      stt: stt++,
      student_id: b.user?.student_id || '',
      student_name: b.user?.name || '',
      email: b.user?.email || '',
      book_title: b.book?.title || '',
      author: b.book?.author || '',
      copy_code: b.copy?.copy_code || '',
      borrow_date: b.borrow_date ? formatDate(b.borrow_date) : '',
      due_date: b.due_date ? formatDate(b.due_date) : '',
      return_date: b.return_date ? formatDate(b.return_date) : '',
      status: statusVi[b.status] || b.status,
      borrow_type: typeVi[b.borrow_type] || b.borrow_type || '',
      renew_count: b.renew_count || 0,
      note: b.note || '',
    });
  });

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.eachCell(cell => { cell.style = cellStyle; });
  });

  const filename = `borrows-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};

exports.parseBooksFile = async (filepath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const worksheet = workbook.getWorksheet(1);
  const data = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const rowData = {
      title: normalizeValue(row.getCell(1).value),
      author: normalizeValue(row.getCell(2).value),
      isbn: normalizeValue(row.getCell(3).value),
      category: normalizeValue(row.getCell(4).value),
      department: normalizeValue(row.getCell(5).value),
      publisher: normalizeValue(row.getCell(6).value),
      publish_year: parseInt(normalizeValue(row.getCell(7).value)) || null,
      edition: normalizeValue(row.getCell(8).value),
      total_copies: parseInt(normalizeValue(row.getCell(9).value)) || 1,
      available_copies: parseInt(normalizeValue(row.getCell(10).value)) || null,
      location: normalizeValue(row.getCell(11).value),
      language: normalizeValue(row.getCell(12).value),
      pages: parseInt(normalizeValue(row.getCell(13).value)) || null,
      tags: normalizeValue(row.getCell(14).value).split(',').map(v => v.trim()).filter(Boolean),
      deposit: parseInt(normalizeValue(row.getCell(15).value)) || 0,
      pdf_url: normalizeValue(row.getCell(16).value),
      is_public_pdf: normalizeValue(row.getCell(17).value).toLowerCase() === 'true',
      access_level: normalizeValue(row.getCell(18).value) || 'public',
      is_active: normalizeValue(row.getCell(19).value).toLowerCase() !== 'false',
      description: normalizeValue(row.getCell(20).value),
    };

    if (rowData.title && rowData.author) data.push(rowData);
  });

  return data;
};

exports.parseUsersFile = async (filepath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const worksheet = workbook.getWorksheet(1);
  const data = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const email = normalizeValue(row.getCell(2).value).toLowerCase();
    if (!email) return;

    data.push({
      name: normalizeValue(row.getCell(1).value) || 'Unknown',
      email,
      password: normalizeValue(row.getCell(3).value) || '123456',
      student_id: normalizeValue(row.getCell(4).value),
      phone: normalizeValue(row.getCell(5).value),
      address: normalizeValue(row.getCell(6).value),
      role: normalizeValue(row.getCell(7).value) || 'user',
      is_active: normalizeValue(row.getCell(8).value).toLowerCase() !== 'false',
    });
  });

  return data;
};

// ─── Import kiểm kê từ Excel ────────────────────────────────────────────────
exports.parseInventoryFile = async (filepath) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const worksheet = workbook.getWorksheet(1);

  const data = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const copyCode = row.getCell(1).value;
    const found = row.getCell(2).value === 'Có' || row.getCell(2).value === true;
    const notes = row.getCell(3).value || '';

    if (copyCode) {
      data.push({ copyCode, found, notes });
    }
  });

  return data;
};

// ─── Tạo template kiểm kê ────────────────────────────────────────────────────
exports.createInventoryTemplate = async (copies) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Kiểm Kê');

  worksheet.columns = [
    { header: 'Mã Sách', key: 'copy_code', width: 20 },
    { header: 'Tên Sách', key: 'book_title', width: 30 },
    { header: 'Tác Giả', key: 'author', width: 20 },
    { header: 'Tìm Thấy (Có/Không)', key: 'found', width: 15 },
    { header: 'Ghi Chú', key: 'notes', width: 30 },
  ];

  worksheet.getRow(1).style = headerStyle;
  worksheet.getRow(1).height = 25;

  let stt = 1;
  copies.forEach(copy => {
    worksheet.addRow({
      stt: stt++,
      copy_code: copy.copy_code,
      book_title: copy.book?.title,
      author: copy.book?.author,
      found: '',
      notes: '',
    });
  });

  const filename = `inventory-template-${new Date().toISOString().split('T')[0]}.xlsx`;
  const filepath = path.join(tmpDir, filename);
  await workbook.xlsx.writeFile(filepath);
  return { filename, filepath };
};
