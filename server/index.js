require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');

const { connectDB } = require('./config/db');
const { scheduleOverdueCheck } = require('./utils/scheduler');
const { attachNetworkInfo } = require('./middleware/lanAccess');
const {
  authRouter, booksRouter, borrowsRouter, categoriesRouter, departmentsRouter,
  usersRouter, finesRouter, reservationsRouter, statsRouter,
  messagesRouter, copiesRouter,
} = require('./routes');

connectDB();

const app = express();
const PORT = process.env.PORT || 5000;
const defaultClientOrigins = ['http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002'];
// Thêm origin của chính server vào danh sách cho phép (production same-origin)
const serverOrigins = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];
const clientOrigins = [
  ...defaultClientOrigins,
  ...serverOrigins,
  ...((process.env.CLIENT_URL || '').split(',').map(o => o.trim()).filter(Boolean)),
].map(o => o.replace(/\/$/, ''));
const lanSubnets = (process.env.LAN_SUBNETS || '192.168.,10.,172.16.,172.17.,172.18.,172.19.,172.20.,172.21.,172.22.,172.23.,172.24.,172.25.,172.26.,172.27.,172.28.,172.29.,172.30.,172.31.,127.,::1,::ffff:127.').split(',').map(s => s.trim()).filter(Boolean);
const isLanOrigin = (origin) => {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return lanSubnets.some(prefix => url.hostname.startsWith(prefix));
  } catch (err) {
    return false;
  }
};
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (clientOrigins.includes(normalizedOrigin)) return cb(null, true);
    if (isLanOrigin(normalizedOrigin)) return cb(null, true);
    return cb(new Error('Origin không được phép'), false);
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(attachNetworkInfo);   // gắn req.isLAN, req.clientIP vào mọi request
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Tăng timeout cho upload file lớn (1GB có thể mất vài phút)
app.use('/api/books/:id/pdf', (req, res, next) => {
  req.setTimeout(30 * 60 * 1000); // 30 phút
  res.setTimeout(30 * 60 * 1000);
  next();
});

app.use('/api/auth',         authRouter);
app.use('/api/books',        booksRouter);
app.use('/api/borrows',      borrowsRouter);
app.use('/api/categories',   categoriesRouter);
app.use('/api/departments',  departmentsRouter);
app.use('/api/users',        usersRouter);
app.use('/api/fines',        finesRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/stats',        statsRouter);
app.use('/api/messages',     messagesRouter);
app.use('/api/copies',       copiesRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ─── Production: Serve React client builds ──────────────────────────────────────
// Trong production, Express phục vụ file tĩnh từ client/build và student-client/build
// Điều này cho phép cùng 1 source chạy được cả localhost (dev) lẫn production (host)
// - Development: React dev server proxy /api → Express (qua "proxy" trong package.json)
// - Production: Express serve cả API lẫn file tĩnh React → /api vẫn hoạt động bình thường
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/build');
  const studentBuild = path.join(__dirname, '../student-client/build');
  const fs = require('fs');

  // Serve student-client tại /student (nếu build tồn tại)
  if (fs.existsSync(studentBuild)) {
    app.use('/student', express.static(studentBuild));
    app.get('/student/*', (req, res) => {
      res.sendFile(path.join(studentBuild, 'index.html'));
    });
  }

  // Serve admin client tại root / (nếu build tồn tại)
  if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }
}

scheduleOverdueCheck();

console.log('Server env PORT:', process.env.PORT);
console.log('JWT_SECRET configured:', Boolean(process.env.JWT_SECRET));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));