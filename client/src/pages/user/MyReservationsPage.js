import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const statusMap = { pending: ['Đang chờ', 'badge-warning'], ready: ['Sẵn sàng', 'badge-success'], fulfilled: ['Đã mượn', 'badge-secondary'], cancelled: ['Đã hủy', 'badge-secondary'], expired: ['Hết hạn', 'badge-danger'] };

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    api.get('/reservations/my').then(r => setReservations(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleCancel = async (id) => {
    try {
      await api.put(`/reservations/${id}/cancel`);
      toast.success('Đã hủy đặt trước');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi hủy');
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Sách đặt trước</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Danh sách sách bạn đã đặt trước</p>
      </div>
      <div className="card">
        {loading ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
          : reservations.length === 0 ? <div className="empty-state"><div className="empty-icon">🔖</div><h3>Chưa có đặt trước</h3><p>Khi sách hết bản, bạn có thể đặt trước để nhận thông báo sớm nhất</p></div>
            : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Sách</th><th>Ngày đặt</th><th>Trạng thái</th><th></th></tr></thead>
                  <tbody>
                    {reservations.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{r.book?.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{r.book?.author}</div>
                        </td>
                        <td style={{ fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                        <td><span className={`badge ${statusMap[r.status]?.[1]}`}>{statusMap[r.status]?.[0]}</span></td>
                        <td>
                          {r.status === 'pending' && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleCancel(r._id)}>Hủy</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>
    </Layout>
  );
}
