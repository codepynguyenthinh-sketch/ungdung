const jwt = require('jsonwebtoken');
const { User } = require('../models');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    if (req.optionalAuth) { req.user = null; return next(); }
    return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id);
    if (!req.user || !req.user.is_active)
      return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ' });
    next();
  } catch {
    if (req.optionalAuth) { req.user = null; return next(); }
    res.status(401).json({ success: false, message: 'Token không hợp lệ' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
  next();
};