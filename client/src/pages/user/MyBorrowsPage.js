import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiClock, FiBook } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const statusMap = { borrowed: ['Đang mượn', 'badge-success'], renewed: ['Đã gia hạn', 'badge-info'], overdue: ['Quá hạn', 'badge-danger'], returned: ['Đã trả', 'badge-secondary'], lost: ['Mất sách', 'badge-danger'] };

export default function MyBorrowsPage() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [renewing, setRenewing] = useState(null);

  const fetchBorrows = () => {
    setLoading(true);
    const params = filter ? { status: filter } : {};
    api.get('/borrows/my', { params }).then(r => setBorrows(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => {fetchBorrows();}, [fetchBorrows]);

  const handleRenew = async (id) => {
    setRenewing(id);
    try {
      await api.put(`/borrows/${id}/renew`);
      toast.success('Gia hạn thành công!');
      fetchBorrows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gia hạn');
    } finally {
      setRenewing(null);
    }
  };

  const daysLeft = (dueDate) => Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Lịch sử mượn sách</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Quản lý sách bạn đang mượn và lịch sử</p>
      </div>

      <div className="filters-row">
        {[['', 'Tất cả'], ['borrowed', 'Đang mượn'], ['overdue', 'Quá hạn'], ['returned', 'Đã trả'], ['renewed', 'Đã gia hạn']].map(([v, l]) => (
          <button key={v} className={`btn ${filter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : borrows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📖</div>
            <h3>Chưa có lịch sử mượn</h3>
            <p>Hãy đến thư viện để mượn sách!</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Sách</th><th>Ngày mượn</th><th>Hạn trả</th><th>Ngày trả</th><th>Trạng thái</th><th>Gia hạn</th><th></th></tr></thead>
              <tbody>
                {borrows.map(b => {
                  const days = daysLeft(b.dueDate);
                  const canRenew = ['borrowed', 'renewed'].includes(b.status) && b.renewCount < b.maxRenewals && days >= 0;
                  return (
                    <tr key={b._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FiBook color="#2563eb" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 14 }}>{b.book?.title}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{b.book?.author}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(b.borrowDate).toLocaleDateString('vi-VN')}</td>
                      <td style={{ fontSize: 13 }}>
                        <div>{new Date(b.dueDate).toLocaleDateString('vi-VN')}</div>
                        {b.status !== 'returned' && (
                          <div style={{ fontSize: 11, color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : '#64748b' }}>
                            <FiClock size={10} /> {days < 0 ? `Trễ ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 13 }}>{b.returnDate ? new Date(b.returnDate).toLocaleDateString('vi-VN') : '—'}</td>
                      <td><span className={`badge ${statusMap[b.status]?.[1] || 'badge-secondary'}`}>{statusMap[b.status]?.[0]}</span></td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{b.renewCount}/{b.maxRenewals}</td>
                      <td>
                        {canRenew && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleRenew(b._id)} disabled={renewing === b._id}>
                            <FiRefreshCw size={12} /> {renewing === b._id ? '...' : 'Gia hạn'}
                          </button>
                        )}
                        {b.fine && !b.fine.isPaid && (
                          <span className="badge badge-danger" style={{ fontSize: 11 }}>Phạt: {b.fine.amount?.toLocaleString('vi-VN')}đ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
