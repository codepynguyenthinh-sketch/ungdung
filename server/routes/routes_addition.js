// ─────────────────────────────────────────────────────────────────────────────
// THÊM VÀO server/routes/index.js
// Tìm dòng:
//   const { getDashboardStats, getBorrowStats, getDailyReport, exportDailyReport } = require('../controllers/otherControllers');
// Thay bằng:
// ─────────────────────────────────────────────────────────────────────────────

const {
  getDashboardStats, getBorrowStats, getDailyReport, exportDailyReport,
  getPopularBooks, getFineDebtors, getStockReport, exportFullReport,
} = require('../controllers/otherControllers');

// Và thêm các route mới vào r8 (sau dòng r8.get('/export/daily', ...)):
r8.get('/popular-books',   p8, a8('admin','librarian'), getPopularBooks);
r8.get('/fine-debtors',    p8, a8('admin','librarian'), getFineDebtors);
r8.get('/stock',           p8, a8('admin','librarian'), getStockReport);
r8.get('/export/full',     p8, a8('admin','librarian'), exportFullReport);
