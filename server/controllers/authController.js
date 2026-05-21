const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { Op } = require('sequelize');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

exports.register = async (req, res) => {
  try {
    const { name, email, password, student_id, phone } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ success: false, message: 'Email đã được sử dụng' });
    const user = await User.create({ name, email, password, student_id, phone });
    res.status(201).json({ success: true, token: signToken(user.id), user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    if (!user.is_active)
      return res.status(401).json({ success: false, message: 'Tài khoản đã bị khóa' });
    if (!process.env.JWT_SECRET)
      return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured' });
    res.json({ success: true, token: signToken(user.id), user });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
  }
};

exports.getMe = (req, res) => res.json({ success: true, user: req.user });

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!(await user.matchPassword(oldPassword)))
      return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Vui lòng nhập email' });

    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      return res.json({ success: true, message: 'Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.' });
    }

    const resetToken = crypto.randomBytes(6).toString('hex').toUpperCase();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.update({ reset_token: resetToken, reset_token_expires: expires });

    if (process.env.NODE_ENV === 'development') console.log(`[Auth] Password reset token for ${email}: ${resetToken} (expires: ${expires.toISOString()})`);

    res.json({
      success: true,
      message: 'Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.',
      // In development, return token directly for testing
      ...(process.env.NODE_ENV === 'development' ? { resetToken } : {}),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu mới tối thiểu 6 ký tự' });
    }

    const user = await User.findOne({
      where: {
        email,
        reset_token: token.toUpperCase(),
        reset_token_expires: { [Op.gt]: new Date() },
        is_active: true,
      },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Mã đặt lại không hợp lệ hoặc đã hết hạn' });
    }

    user.password = newPassword;
    user.reset_token = null;
    user.reset_token_expires = null;
    await user.save();

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
