// ─────────────────────────────────────────────────────────────────────────────
// SỬA DÒNG ĐẦU server/controllers/otherControllers.js
// Tìm dòng:
//   const { Category, User, Fine, Reservation, Book, Borrow } = require('../models');
// Thay bằng:
// ─────────────────────────────────────────────────────────────────────────────

const { Category, User, Fine, Reservation, Book, Borrow, BookCopy } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// LÝ DO: Các controller mới (getStockReport, exportFullReport) cần BookCopy
// ─────────────────────────────────────────────────────────────────────────────
