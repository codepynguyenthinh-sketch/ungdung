import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiBook } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', studentId: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      toast.success('Đăng ký thành công!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ fontSize: 40, color: '#2563eb', marginBottom: 8 }}><FiBook /></div>
          <h1>Đăng ký tài khoản</h1>
          <p>Tạo tài khoản thư viện của bạn</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <input className="form-control" placeholder="Nguyễn Văn A" {...f('name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-control" type="email" placeholder="email@example.com" {...f('email')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu *</label>
            <input className="form-control" type="password" placeholder="Tối thiểu 6 ký tự" {...f('password')} required minLength={6} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Mã sinh viên</label>
              <input className="form-control" placeholder="SV001" {...f('studentId')} />
            </div>
            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input className="form-control" placeholder="0901234567" {...f('phone')} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11 }}
            type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: '#2563eb', fontWeight: 600 }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
