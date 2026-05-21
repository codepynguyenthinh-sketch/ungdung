/**
 * middleware/lanAccess.js
 *
 * Phân quyền theo nguồn mạng:
 *   - isLAN()        : kiểm tra IP có thuộc LAN không
 *   - lanOnly        : block nếu không phải LAN (dùng cho route)
 *   - attachNetworkInfo : gắn req.isLAN vào request (dùng cho mọi route)
 *
 * Cấu hình các dải IP LAN trong .env:
 *   LAN_SUBNETS=192.168.1,192.168.0,10.0.0,172.16
 * Mặc định nếu không set: 192.168.x.x, 10.x.x.x, 172.16-31.x.x, 127.x (localhost)
 */

const DEFAULT_LAN_PREFIXES = [
  '127.',          // localhost
  '::1',           // localhost IPv6
  '::ffff:127.',   // localhost IPv4-mapped
  '192.168.',      // Class C private
  '10.',           // Class A private
];

// 172.16.x.x – 172.31.x.x (Class B private)
for (let i = 16; i <= 31; i++) {
  DEFAULT_LAN_PREFIXES.push(`172.${i}.`);
}

/**
 * Lấy IP thực của client (xử lý proxy / nginx)
 */
const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for có thể là danh sách: "client, proxy1, proxy2"
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '';
};

/**
 * Kiểm tra IP có thuộc LAN không
 */
const isLanIP = (ip) => {
  if (!ip) return false;

  // Lấy danh sách prefix từ env hoặc dùng mặc định
  let prefixes = DEFAULT_LAN_PREFIXES;
  if (process.env.LAN_SUBNETS) {
    prefixes = process.env.LAN_SUBNETS.split(',').map(s => s.trim()).filter(Boolean);
    // Luôn cho phép localhost
    if (!prefixes.includes('127.')) prefixes.push('127.', '::1', '::ffff:127.');
  }

  return prefixes.some(prefix => ip.startsWith(prefix));
};

/**
 * Middleware: gắn req.isLAN = true/false vào mọi request
 * Dùng app.use(attachNetworkInfo) trong index.js
 */
exports.attachNetworkInfo = (req, res, next) => {
  const ip = getClientIP(req);
  req.clientIP = ip;
  req.isLAN    = isLanIP(ip);
  next();
};

/**
 * Middleware: chặn nếu không phải LAN
 * Dùng cho các route chỉ cho phép nội bộ
 */
exports.lanOnly = (req, res, next) => {
  if (!req.isLAN) {
    return res.status(403).json({
      success: false,
      message: 'Nội dung này chỉ xem được trên mạng nội bộ (LAN)',
      code: 'LAN_ONLY',
    });
  }
  next();
};

/**
 * Middleware: kiểm tra access_level của book
 *
 * Gắn vào route lấy sách/PDF — tự động kiểm tra:
 *   - 'public'  → ai cũng xem
 *   - 'lan'     → chỉ LAN
 *   - 'private' → phải đăng nhập (LAN hoặc WAN đều được nếu có token)
 *
 * Cần chạy sau attachNetworkInfo và optionalAuth/protect
 */
exports.checkBookAccess = (req, res, next) => {
  const book = req.book; // phải set req.book trước khi gọi middleware này
  if (!book) return next();

  const level = book.access_level || 'public';

  if (level === 'public') return next();

  if (level === 'lan') {
    // Admin/librarian luôn vào được dù từ đâu
    if (req.user && ['admin', 'librarian'].includes(req.user.role)) return next();
    if (!req.isLAN) {
      return res.status(403).json({
        success: false,
        message: 'Tài liệu này chỉ xem được trên mạng nội bộ (LAN)',
        code: 'LAN_ONLY',
      });
    }
    return next();
  }

  if (level === 'private') {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để xem tài liệu này',
        code: 'LOGIN_REQUIRED',
      });
    }
    return next();
  }

  next();
};

exports.isLanIP  = isLanIP;
exports.getClientIP = getClientIP;
