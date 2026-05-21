// routes/index.js - v3
const { uploadPdf, uploadExcel } = require('../middleware/upload');

// routes/auth.js
const r1 = require('express').Router();
const { register, login, getMe, changePassword, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
r1.post('/register', register);
r1.post('/login', login);
r1.get('/me', protect, getMe);
r1.put('/change-password', protect, changePassword);
r1.post('/forgot-password', forgotPassword);
r1.post('/reset-password', resetPassword);
module.exports.authRouter = r1;

// routes/messages.js
const r9 = require('express').Router();
const { sendMessage, getMyMessages, getMessages, replyMessage, markAsRead } = require('../controllers/messageController');
const { protect: p9, authorize: a9 } = require('../middleware/auth');
r9.post('/', p9, sendMessage);
r9.get('/my', p9, getMyMessages);
r9.get('/', p9, a9('admin','librarian'), getMessages);
r9.put('/:id/reply', p9, a9('admin','librarian'), replyMessage);
r9.put('/:id/read', p9, a9('admin','librarian'), markAsRead);
module.exports.messagesRouter = r9;

// routes/books.js
const r2 = require('express').Router();
const { getBooks, getBook, createBook, updateBook, deleteBook, uploadBookPdf, deleteBookPdf, getBookPdf, exportBooks, importBooks } = require('../controllers/bookController');
const { protect: p2, authorize: a2 } = require('../middleware/auth');
r2.get('/', (req, res, next) => { req.optionalAuth = true; next(); }, p2, getBooks);
r2.get('/export', p2, a2('admin','librarian'), exportBooks);
r2.get('/:id', (req, res, next) => { req.optionalAuth = true; next(); }, p2, getBook);
r2.get('/:id/pdf', (req, res, next) => { req.optionalAuth = true; next(); }, p2, getBookPdf);
r2.post('/import', p2, a2('admin','librarian'), uploadExcel, importBooks);
r2.post('/', p2, a2('admin','librarian'), createBook);
r2.put('/:id', p2, a2('admin','librarian'), updateBook);
r2.post('/:id/pdf', p2, a2('admin','librarian'), uploadPdf, uploadBookPdf);
r2.delete('/:id/pdf', p2, a2('admin','librarian'), deleteBookPdf);
r2.delete('/:id', p2, a2('admin'), deleteBook);
module.exports.booksRouter = r2;

// routes/borrows.js
const r3 = require('express').Router();
const { borrowBook, returnBook, renewBorrow, getBorrows, getMyBorrows, generateBill, exportBorrowsExcel } = require('../controllers/borrowController');
const { protect: p3, authorize: a3 } = require('../middleware/auth');
r3.get('/', p3, a3('admin','librarian'), getBorrows);
r3.get('/export', p3, a3('admin','librarian'), exportBorrowsExcel);
r3.get('/my', p3, getMyBorrows);
r3.post('/', p3, a3('admin','librarian'), borrowBook);
r3.put('/:id/return', p3, a3('admin','librarian'), returnBook);
r3.put('/:id/renew', p3, renewBorrow);
r3.get('/:id/bill', p3, a3('admin','librarian'), generateBill);
module.exports.borrowsRouter = r3;

// routes/categories.js
const r4 = require('express').Router();
const { getCategories, createCategory, updateCategory, deleteCategory, uploadCategoryPdf, deleteCategoryPdf } = require('../controllers/otherControllers');
const { protect: p4, authorize: a4 } = require('../middleware/auth');
r4.get('/', getCategories);
r4.post('/', p4, a4('admin','librarian'), createCategory);
r4.put('/:id', p4, a4('admin','librarian'), updateCategory);
r4.post('/:id/pdf', p4, a4('admin','librarian'), uploadPdf, uploadCategoryPdf);
r4.delete('/:id/pdf', p4, a4('admin','librarian'), deleteCategoryPdf);
r4.delete('/:id', p4, a4('admin'), deleteCategory);
module.exports.categoriesRouter = r4;

// routes/departments.js
const r4d = require('express').Router();
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/otherControllers');
const { protect: p4d, authorize: a4d } = require('../middleware/auth');
r4d.get('/', getDepartments);
r4d.post('/', p4d, a4d('admin','librarian'), createDepartment);
r4d.put('/:id', p4d, a4d('admin','librarian'), updateDepartment);
r4d.delete('/:id', p4d, a4d('admin'), deleteDepartment);
module.exports.departmentsRouter = r4d;

// routes/users.js
const r5 = require('express').Router();
const { getUsers, getUser, updateUser, updateProfile, exportUsers, importUsers, deleteUser } = require('../controllers/otherControllers');
const { protect: p5, authorize: a5 } = require('../middleware/auth');
r5.get('/', p5, a5('admin','librarian'), getUsers);
r5.get('/export', p5, a5('admin','librarian'), exportUsers);
r5.post('/import', p5, a5('admin','librarian'), uploadExcel, importUsers);
r5.get('/:id', p5, a5('admin','librarian'), getUser);
r5.put('/profile/me', p5, updateProfile);
r5.put('/:id', p5, a5('admin'), updateUser);
r5.delete('/:id', p5, a5('admin'), deleteUser);
module.exports.usersRouter = r5;

// routes/fines.js
const r6 = require('express').Router();
const { getFines, payFine, getMyFines, getMyOverdueBorrows, generateFines } = require('../controllers/otherControllers');
const { protect: p6, authorize: a6 } = require('../middleware/auth');
r6.get('/', p6, a6('admin','librarian'), getFines);
r6.get('/my', p6, getMyFines);
r6.get('/my/overdue', p6, getMyOverdueBorrows);
r6.post('/generate', p6, a6('admin','librarian'), generateFines);
r6.put('/:id/pay', p6, a6('admin','librarian'), payFine);
module.exports.finesRouter = r6;

// routes/reservations.js
const r7 = require('express').Router();
const { reserve, getMyReservations, getReservations, cancelReservation, updateReservationStatus } = require('../controllers/otherControllers');
const { protect: p7, authorize: a7 } = require('../middleware/auth');
r7.get('/', p7, a7('admin','librarian'), getReservations);
r7.post('/', p7, reserve);
r7.get('/my', p7, getMyReservations);
r7.put('/:id/cancel', p7, cancelReservation);
r7.put('/:id/status', p7, a7('admin','librarian'), updateReservationStatus);
module.exports.reservationsRouter = r7;

// routes/stats.js
const r8 = require('express').Router();
const { getDashboardStats, getBorrowStats, getDailyReport, exportDailyReport, getInventoryStats, exportComprehensiveReport, checkInventory } = require('../controllers/otherControllers');
const { protect: p8, authorize: a8 } = require('../middleware/auth');
r8.get('/dashboard',            p8, a8('admin','librarian'), getDashboardStats);
r8.get('/summary',              (req, res, next) => { req.optionalAuth = true; next(); }, p8, getDashboardStats);
r8.get('/borrows',              p8, a8('admin','librarian'), getBorrowStats);
r8.get('/daily',                p8, a8('admin','librarian'), getDailyReport);
r8.get('/export/daily',         p8, a8('admin','librarian'), exportDailyReport);
r8.get('/export/comprehensive', p8, a8('admin','librarian'), exportComprehensiveReport);
r8.get('/inventory',            p8, a8('admin','librarian'), getInventoryStats);
r8.post('/check-inventory',     p8, a8('admin','librarian'), checkInventory);
module.exports.statsRouter = r8;

// routes/copies.js
const r10 = require('express').Router();
const { getCopiesByBook, findByCopyCode, previewNextCode, createCopies, updateCopy, deleteCopy } = require('../controllers/copyController');
const { protect: p10, authorize: a10 } = require('../middleware/auth');
r10.get('/preview-code', p10, a10('admin', 'librarian'), previewNextCode);
r10.get('/find/:code',   p10, a10('admin', 'librarian'), findByCopyCode);
r10.get('/book/:bookId', getCopiesByBook);
r10.post('/',            p10, a10('admin', 'librarian'), createCopies);
r10.put('/:id',          p10, a10('admin', 'librarian'), updateCopy);
r10.delete('/:id',       p10, a10('admin'),              deleteCopy);
module.exports.copiesRouter = r10;
