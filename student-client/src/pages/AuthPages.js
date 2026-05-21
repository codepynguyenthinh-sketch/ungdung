import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiBook, FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiHash, FiPhone } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

/* ─── Input với icon ───────────────────────────────────────────────── */
function InputField({ icon, label, type = 'text', placeholder, value, onChange, required, minLength, extra }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: focused ? 'var(--blue)' : 'var(--muted)',
          transition: 'color 0.2s', display: 'flex', pointerEvents: 'none',
        }}>
          {icon}
        </span>
        <input
          className="form-control"
          style={{ paddingLeft: 40, paddingRight: extra ? 40 : 14 }}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {extra}
      </div>
    </div>
  );
}

/* ─── Login ────────────────────────────────────────────────────────── */
export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const adminUrl = `${window.location.protocol}//${window.location.hostname}:3001`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      if (['admin', 'librarian'].includes(res.data.user.role)) {
        toast.error('Tài khoản admin/thủ thư vui lòng đăng nhập tại cổng quản trị.');
        return;
      }
      login(res.data.token, res.data.user);
      toast.success(`Chào mừng, ${res.data.user.name}! 👋`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Email hoặc mật khẩu không đúng');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(37,99,235,0.3)',
          }}>
            <FiBook size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
            Đăng nhập
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 14 }}>
            Dành cho sinh viên & độc giả
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <InputField
            icon={<FiMail size={16} />}
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <FiLock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', display: 'flex', padding: 4,
              }}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 8 }}
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Đang đăng nhập...</>
            ) : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, fontSize: 14, color: 'var(--muted)' }}>
          <span>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 700 }}>Đăng ký ngay</Link>
          </span>
          <Link to="/forgot-password" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 13 }}>Quên mật khẩu?</Link>
        </div>

        <div style={{
          marginTop: 20,
          padding: '12px 14px',
          background: 'var(--bg)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--muted)',
          textAlign: 'center',
          border: '1px solid var(--border)',
        }}>
          Bạn là thủ thư / admin?{' '}
          <a href={adminUrl} style={{ color: 'var(--blue)', fontWeight: 600 }}>
            Vào cổng quản trị →
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Register ─────────────────────────────────────────────────────── */
export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', student_id: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      toast.success('Đăng ký thành công! Chào mừng bạn 🎉');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally { setLoading(false); }
  };

  const set = field => e => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 6px 20px rgba(37,99,235,0.28)',
          }}>
            <FiBook size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>
            Tạo tài khoản
          </h2>
          <p style={{ color: 'var(--muted)', marginTop: 5, fontSize: 14 }}>
            Đăng ký để mượn sách trực tuyến
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Họ tên */}
          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <div style={{ position: 'relative' }}>
              <FiUser size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input className="form-control" style={{ paddingLeft: 40 }} placeholder="Nguyễn Văn A"
                value={form.name} onChange={set('name')} required />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email *</label>
            <div style={{ position: 'relative' }}>
              <FiMail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input className="form-control" style={{ paddingLeft: 40 }} type="email" placeholder="email@example.com"
                value={form.email} onChange={set('email')} required />
            </div>
          </div>

          {/* Mật khẩu */}
          <div className="form-group">
            <label className="form-label">Mật khẩu *</label>
            <div style={{ position: 'relative' }}>
              <FiLock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input className="form-control" style={{ paddingLeft: 40, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'} placeholder="Tối thiểu 6 ký tự"
                value={form.password} onChange={set('password')} required minLength={6} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 4,
              }}>
                {showPw ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </div>

          {/* Mã SV + SĐT */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mã sinh viên</label>
              <div style={{ position: 'relative' }}>
                <FiHash size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input className="form-control" style={{ paddingLeft: 36, fontSize: 13 }} placeholder="SV001"
                  value={form.student_id} onChange={set('student_id')} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Số điện thoại</label>
              <div style={{ position: 'relative' }}>
                <FiPhone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                <input className="form-control" style={{ paddingLeft: 36, fontSize: 13 }} placeholder="0901234567"
                  value={form.phone} onChange={set('phone')} />
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 20 }}
            type="submit" disabled={loading}>
            {loading ? (
              <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Đang xử lý...</>
            ) : '🎉 Đăng ký'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 700 }}>Đăng nhập</Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── ForgotPassword ───────────────────────────────────────────── */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (res.data.resetToken) setDevToken(res.data.resetToken);
      toast.success(res.data.message || 'Mã đặt lại đã được gửi');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 6px 20px rgba(245,158,11,0.28)',
          }}>
            <FiLock size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)' }}>Quên mật khẩu</h2>
          <p style={{ color: 'var(--muted)', marginTop: 5, fontSize: 14 }}>
            Nhập email để nhận mã đặt lại mật khẩu
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <InputField
              icon={<FiMail size={16} />}
              label="Email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}
              type="submit" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi mã đặt lại'}
            </button>
          </form>
        ) : (
          <div>
            <div style={{
              padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 10, marginBottom: 16, fontSize: 14, color: '#166534',
            }}>
              Mã đặt lại mật khẩu đã được tạo. Vui lòng liên hệ thư viện để nhận mã, sau đó nhấn nút bên dưới.
            </div>
            {devToken && (
              <div style={{
                padding: '12px', background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: 10, marginBottom: 16, fontSize: 13, color: '#92400e',
              }}>
                <strong>Dev mode:</strong> Mã đặt lại: <code style={{ fontWeight: 700, fontSize: 15 }}>{devToken}</code>
              </div>
            )}
            <Link to={`/reset-password?email=${encodeURIComponent(email)}`}
              className="btn btn-primary btn-block btn-lg">
              Tôi đã có mã → Đặt lại mật khẩu
            </Link>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 700 }}>← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}

/* ─── ResetPassword ────────────────────────────────────────────── */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    token: '',
    newPassword: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    if (form.newPassword.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: form.email,
        token: form.token,
        newPassword: form.newPassword,
      });
      toast.success(res.data.message || 'Đặt lại mật khẩu thành công!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mã không hợp lệ hoặc đã hết hạn');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 60, height: 60,
            background: 'linear-gradient(135deg, #10b981, #2563eb)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 6px 20px rgba(16,185,129,0.28)',
          }}>
            <FiLock size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, color: 'var(--text)' }}>Đặt lại mật khẩu</h2>
          <p style={{ color: 'var(--muted)', marginTop: 5, fontSize: 14 }}>
            Nhập mã xác nhận và mật khẩu mới
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <InputField
            icon={<FiMail size={16} />}
            label="Email"
            type="email"
            placeholder="email@example.com"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="form-group">
            <label className="form-label">Mã đặt lại</label>
            <div style={{ position: 'relative' }}>
              <FiHash size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 40, letterSpacing: 4, fontWeight: 700, fontSize: 16, textTransform: 'uppercase' }}
                placeholder="ABC123DEF456"
                value={form.token}
                onChange={e => setForm({ ...form, token: e.target.value })}
                required
                maxLength={12}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu mới</label>
            <div style={{ position: 'relative' }}>
              <FiLock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                placeholder="Tối thiểu 6 ký tự"
                value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 4,
              }}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Xác nhận mật khẩu mới</label>
            <div style={{ position: 'relative' }}>
              <FiLock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 40 }}
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                required
                minLength={6}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 8 }}
            type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--muted)' }}>
          <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 700 }}>← Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
