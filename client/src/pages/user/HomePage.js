import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBook, FiList, FiDollarSign, FiBookmark, FiClock, FiAlertTriangle, FiMail } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function HomePage() {
  const { user } = useAuth();
  const [borrows, setBorrows] = useState([]);

  useEffect(() => {
    api.get('/borrows/my').then(res => setBorrows(res.data.data)).finally(() => setLoading(false));
  }, []);

  const active = borrows.filter(b => ['borrowed', 'renewed', 'overdue'].includes(b.status));
  const overdue = borrows.filter(b => b.status === 'overdue');
  const returned = borrows.filter(b => b.status === 'returned');

  const daysUntilDue = (dueDate) => {
    const diff = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Xin chào, {user?.name} 👋</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          {user?.studentId ? `Mã SV: ${user.studentId} • ` : ''}
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eff6ff' }}><FiList color="#2563eb" /></div>
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Đang mượn</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2' }}><FiAlertTriangle color="#dc2626" /></div>
          <div className="stat-value">{overdue.length}</div>
          <div className="stat-label">Quá hạn</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4' }}><FiBook color="#16a34a" /></div>
          <div className="stat-value">{returned.length}</div>
          <div className="stat-label">Đã trả</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb' }}><FiDollarSign color="#d97706" /></div>
          <div className="stat-value" style={{ fontSize: 20 }}>
            {user?.unpaidFines > 0 ? `${user.unpaidFines.toLocaleString('vi-VN')}đ` : '0đ'}
          </div>
          <div className="stat-label">Phí chưa trả</div>
        </div>
      </div>

      {/* Alerts */}
      {user?.unpaidFines > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiAlertTriangle color="#dc2626" size={20} />
          <div>
            <strong>Bạn có phí phạt chưa thanh toán:</strong> {user.unpaidFines.toLocaleString('vi-VN')}đ
            <Link to="/my-fines" style={{ marginLeft: 12, color: '#dc2626', fontWeight: 600 }}>Xem chi tiết →</Link>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { to: '/books', icon: <FiBook size={24} />, label: 'Tìm kiếm sách', desc: 'Xem danh mục sách', color: '#eff6ff', iconColor: '#2563eb' },
          { to: '/contact', icon: <FiMail size={24} />, label: 'Gửi yêu cầu', desc: 'Gửi tin nhắn cho admin/thủ thư', color: '#eef2ff', iconColor: '#4338ca' },
          { to: '/my-borrows', icon: <FiList size={24} />, label: 'Sách đang mượn', desc: `${active.length} cuốn đang mượn`, color: '#f0fdf4', iconColor: '#16a34a' },
          { to: '/my-reservations', icon: <FiBookmark size={24} />, label: 'Đặt trước', desc: 'Sách đã đặt trước', color: '#f5f3ff', iconColor: '#7c3aed' },
          { to: '/my-fines', icon: <FiDollarSign size={24} />, label: 'Phí phạt', desc: 'Xem lịch sử phí phạt', color: '#fffbeb', iconColor: '#d97706' },
        ].map(link => (
          <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: 18, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: link.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: link.iconColor }}>
                {link.icon}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{link.label}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{link.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Current borrows */}
      {active.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Sách đang mượn</h2>
            <Link to="/my-borrows" style={{ fontSize: 13, color: '#2563eb' }}>Xem tất cả →</Link>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Tên sách</th><th>Ngày mượn</th><th>Hạn trả</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {active.slice(0, 5).map(b => {
                  const days = daysUntilDue(b.dueDate);
                  return (
                    <tr key={b._id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{b.book?.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{b.book?.author}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(b.borrowDate).toLocaleDateString('vi-VN')}</td>
                      <td style={{ fontSize: 13 }}>
                        <div>{new Date(b.dueDate).toLocaleDateString('vi-VN')}</div>
                        {days >= 0 && <div style={{ fontSize: 11, color: days <= 3 ? '#dc2626' : '#64748b' }}>
                          <FiClock size={10} style={{ marginRight: 3 }} />{days} ngày nữa
                        </div>}
                      </td>
                      <td>
                        <span className={`badge ${b.status === 'overdue' ? 'badge-danger' : b.status === 'renewed' ? 'badge-info' : 'badge-success'}`}>
                          {b.status === 'overdue' ? 'Quá hạn' : b.status === 'renewed' ? 'Đã gia hạn' : 'Đang mượn'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
