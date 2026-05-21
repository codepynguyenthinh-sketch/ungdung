import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/users/profile/me', form);
      setUser(res.data.data);
      toast.success('Cập nhật thông tin thành công');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Mật khẩu mới không khớp');
    setLoading(true);
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success('Đổi mật khẩu thành công');
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Tài khoản của tôi</h1>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h2>Thông tin cá nhân</h2></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>{user?.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 17 }}>{user?.name}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{user?.email}</div>
                <div style={{ marginTop: 4 }}><span className="badge badge-info">{user?.role === 'admin' ? 'Quản trị viên' : user?.role === 'librarian' ? 'Thủ thư' : 'Độc giả'}</span></div>
              </div>
            </div>
            <form onSubmit={handleProfile}>
              <div className="form-group"><label className="form-label">Họ và tên</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="form-group"><label className="form-label">Email</label>
                <input className="form-control" value={user?.email} disabled style={{ background: '#f8fafc' }} /></div>
              {user?.studentId && <div className="form-group"><label className="form-label">Mã sinh viên</label>
                <input className="form-control" value={user?.studentId} disabled style={{ background: '#f8fafc' }} /></div>}
              <div className="form-group"><label className="form-label">Số điện thoại</label>
                <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Địa chỉ</label>
                <textarea className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <button className="btn btn-primary" type="submit" disabled={loading}>Lưu thay đổi</button>
            </form>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><h2>Đổi mật khẩu</h2></div>
            <div className="card-body">
              <form onSubmit={handlePassword}>
                <div className="form-group"><label className="form-label">Mật khẩu hiện tại</label>
                  <input className="form-control" type="password" value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Mật khẩu mới</label>
                  <input className="form-control" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} /></div>
                <div className="form-group"><label className="form-label">Xác nhận mật khẩu mới</label>
                  <input className="form-control" type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required /></div>
                <button className="btn btn-primary" type="submit" disabled={loading}>Đổi mật khẩu</button>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2>Thống kê</h2></div>
            <div className="card-body">
              {[['Tổng lượt mượn', user?.borrowCount || 0, '#2563eb'],
                ['Tổng phí phạt', `${(user?.totalFines || 0).toLocaleString('vi-VN')}đ`, '#dc2626'],
                ['Chưa thanh toán', `${(user?.unpaidFines || 0).toLocaleString('vi-VN')}đ`, user?.unpaidFines > 0 ? '#dc2626' : '#16a34a']
              ].map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: 14 }}>{label}</span>
                  <span style={{ fontWeight: 600, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
