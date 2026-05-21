import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

export default function AdminFines() {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('false');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [paying, setPaying] = useState(null);

  const fetchFines = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter !== '') params.isPaid = filter;
      const res = await api.get('/fines', { params });
      setFines(res.data.data);
      setTotalPages(res.data.pages);
    } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchFines(); }, [fetchFines]);

  const handlePay = async (id) => {
    setPaying(id);
    try {
      await api.put(`/fines/${id}/pay`);
      toast.success('Đã thu phí thành công');
      fetchFines();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi thu phí');
    } finally { setPaying(null); }
  };

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Quản lý phí phạt</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Thu và theo dõi phí phạt trả trễ</p>
      </div>

      <div className="filters-row">
        {[['false', 'Chưa thu'], ['true', 'Đã thu'], ['', 'Tất cả']].map(([v, l]) => (
          <button key={v} className={`btn ${filter === v ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(v); setPage(1); }}>{l}</button>
        ))}
      </div>

      <div className="card">
        {loading ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
          : fines.length === 0 ? <div className="empty-state"><div className="empty-icon">✅</div><h3>Không có phiếu phạt</h3></div>
            : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Người dùng</th><th>Sách</th><th>Lý do</th><th>Ngày trễ</th><th>Số tiền</th><th>Trạng thái</th><th></th></tr></thead>
                  <tbody>
                    {fines.map(f => (
                      <tr key={f.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{f.user?.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{f.user?.student_id || f.user?.email}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{f.borrow?.book?.title}</td>
                        <td><span className="badge badge-warning">{f.reason === 'overdue' ? 'Trả trễ' : f.reason === 'damaged' ? 'Hư hỏng' : 'Mất sách'}</span></td>
                        <td style={{ fontSize: 13 }}>{f.overdueDays > 0 ? `${f.overdueDays} ngày` : '—'}</td>
                        <td style={{ fontWeight: 600, color: f.isPaid ? '#16a34a' : '#dc2626', fontSize: 14 }}>{f.amount.toLocaleString('vi-VN')}đ</td>
                        <td><span className={`badge ${f.isPaid ? 'badge-success' : 'badge-danger'}`}>{f.isPaid ? 'Đã thu' : 'Chưa thu'}</span></td>
                        <td>
                          {!f.isPaid && (
                            <button className="btn btn-success btn-sm" onClick={() => handlePay(f.id)} disabled={paying === f.id}>
                              <FiCheckCircle size={13} /> {paying === f.id ? '...' : 'Thu tiền'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 0' }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
