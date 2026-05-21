import React, { useEffect, useState } from 'react';
import { FiSearch, FiFilter, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const statusMap = {
  pending: { label: 'Đang chờ', color: '#d97706', bg: '#fffbeb', icon: '⏳' },
  ready: { label: 'Sẵn sàng', color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
  fulfilled: { label: 'Đã mượn', color: '#2563eb', bg: '#eff6ff', icon: '📖' },
  cancelled: { label: 'Đã hủy', color: '#94a3b8', bg: '#f8fafc', icon: '❌' },
  expired: { label: 'Hết hạn', color: '#dc2626', bg: '#fef2f2', icon: '⏰' },
};

export default function AdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter) params.status = filter;
      if (search) params.search = search;
      const res = await api.get('/reservations', { params });
      setReservations(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [page, filter, search]);

  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      await api.put(`/reservations/${reservationId}/status`, { status: newStatus });
      toast.success(`Cập nhật thành công`);
      fetchReservations();
      setSelectedReservation(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>📚 Quản lý đặt trước sách</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Xem và xử lý các yêu cầu đặt trước từ sinh viên</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#64748b' }}>
            🔍 Tìm kiếm (tên/email/mã SV)
          </label>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Nhập để tìm..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#64748b' }}>
            Trạng thái
          </label>
          <select
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(statusMap).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>⏳ Đang chờ</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>
            {reservations.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>✅ Sẵn sàng</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>
            {reservations.filter(r => r.status === 'ready').length}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>📖 Đã mượn</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
            {reservations.filter(r => r.status === 'fulfilled').length}
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>❌ Đã hủy</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8' }}>
            {reservations.filter(r => r.status === 'cancelled').length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : reservations.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
            <FiAlertCircle size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <h3>Không có đặt trước</h3>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sinh viên</th>
                  <th>Sách</th>
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => {
                  const status = statusMap[r.status];
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{r.user?.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{r.user?.student_id || r.user?.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{r.book?.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{r.book?.author}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 12,
                          background: status.bg,
                          color: status.color,
                        }}>
                          {status.icon} {status.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(r.id, 'ready')}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  background: '#f0fdf4',
                                  color: '#16a34a',
                                  border: '1px solid #bbf7d0',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                ✅ Sẵn sàng
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(r.id, 'cancelled')}
                                style={{
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  background: '#fef2f2',
                                  color: '#dc2626',
                                  border: '1px solid #fecaca',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                }}
                              >
                                ❌ Hủy
                              </button>
                            </>
                          )}
                          {r.status === 'ready' && (
                            <button
                              onClick={() => handleUpdateStatus(r.id, 'fulfilled')}
                              style={{
                                padding: '6px 10px',
                                fontSize: 12,
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: 6,
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              📖 Đã mượn
                            </button>
                          )}
                          {(r.status === 'fulfilled' || r.status === 'cancelled') && (
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            style={{
              padding: '8px 12px',
              background: page === 1 ? '#f1f5f9' : '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: page === 1 ? 0.5 : 1,
            }}
          >
            ← Trước
          </button>
          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const p = Math.max(1, page - 2) + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  width: 32,
                  height: 32,
                  background: p === page ? '#2563eb' : '#fff',
                  color: p === page ? '#fff' : '#1e293b',
                  border: `1px solid ${p === page ? '#2563eb' : '#cbd5e1'}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {p}
              </button>
            );
          })}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            style={{
              padding: '8px 12px',
              background: page === totalPages ? '#f1f5f9' : '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              opacity: page === totalPages ? 0.5 : 1,
            }}
          >
            Sau →
          </button>
        </div>
      )}

      <style>{`
        .card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .table-wrapper {
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        thead {
          background: #f8fafc;
          border-bottom: 2px solid #e2e8f0;
        }
        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:hover {
          background: #f8fafc;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  );
}
