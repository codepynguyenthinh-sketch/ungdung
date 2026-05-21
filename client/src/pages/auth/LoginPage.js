import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiBook, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      toast.success(`Chào mừng, ${res.data.user.name}!`);
      if (['admin', 'librarian'].includes(res.data.user.role)) navigate('/admin');
      else navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40, color: '#2563eb', marginBottom: 8 }}><FiBook /></div>
          <h1>Hệ Thống Mượn Trả Sách</h1>
          <p>Đăng nhập để tiếp tục</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <FiMail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input className="form-control" style={{ paddingLeft: 38 }} type="email" placeholder="email@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <FiLock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input className="form-control" style={{ paddingLeft: 38, paddingRight: 40 }}
                type={showPw ? 'text' : 'password'} placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', marginTop: 4 }}
            type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>Đăng ký</Link>
        </p>
        <div style={{ marginTop: 20, padding: 14, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
          <strong>Demo:</strong><br />
          Admin: admin@library.com / 123456<br />
          User: user@library.com / 123456
        </div>
      </div>
    </div>
  );
}
