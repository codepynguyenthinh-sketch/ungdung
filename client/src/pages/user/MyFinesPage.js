import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

export default function MyFinesPage() {
  const [fines, setFines] = useState([]);
  const [overdueBorrows, setOverdueBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/fines/my').catch(() => ({ data: { data: [] } })),
      api.get('/fines/my/overdue').catch(() => ({ data: { data: { borrows: [], totalFineOwed: 0, count: 0 } } })),
    ]).then(([finesRes, overdueRes]) => {
      setFines(finesRes.data.data || []);
      setOverdueBorrows(overdueRes.data.data?.borrows || []);
    }).finally(() => setLoading(false));
  }, []);

  const paidFines = fines.filter(f => f.is_paid);
  const unpaidFines = fines.filter(f => !f.is_paid);
  
  const totalPaidFines = paidFines.reduce((s, f) => s + f.amount, 0);
  const totalUnpaidFines = unpaidFines.reduce((s, f) => s + f.amount, 0);
  const totalOverdueFine = overdueBorrows.reduce((s, b) => s + b.fineAmount, 0);
  const totalOwed = totalUnpaidFines + totalOverdueFine;

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>💰 Phí phạt & Sách trễ hạn</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Xem phí phạt và sách bạn chưa trả</p>
      </div>

      {/* Summary cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <FiAlertTriangle size={20} />
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{totalOwed.toLocaleString('vi-VN')}đ</div>
          <div className="stat-label">Tổng nợ</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <FiClock size={20} />
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>{overdueBorrows.length}</div>
          <div className="stat-label">Sách trễ hạn</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <FiAlertTriangle size={20} />
          </div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{unpaidFines.length}</div>
          <div className="stat-label">Phiếu phạt chưa trả</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            ✓
          </div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{totalPaidFines.toLocaleString('vi-VN')}đ</div>
          <div className="stat-label">Đã thanh toán</div>
        </div>
      </div>

      {/* Overdue books section */}
      {overdueBorrows.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⏰ Sách chưa trả (Trễ hạn)</h2>
            <p style={{ color: '#64748b', fontSize: 13 }}>
              Những cuốn sách này đã quá hạn trả. Phí phạt {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(5000)}/ngày sẽ được tính cho mỗi cuốn.
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {overdueBorrows.map((borrow, i) => (
              <div key={i} style={{
                background: '#fff',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: 14,
                display: 'flex',
                gap: 12,
              }}>
                <div style={{
                  width: 50,
                  height: 50,
                  borderRadius: 8,
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 24,
                }}>
                  📖
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {borrow.book?.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                    {borrow.book?.author}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Ngày trả:</span>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {new Date(borrow.dueDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#dc2626', fontWeight: 600 }}>Trễ {borrow.daysOverdue} ngày</span>
                    </div>
                  </div>
                  <div style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    background: '#fef2f2',
                    borderRadius: 6,
                    textAlign: 'center',
                    fontWeight: 600,
                    color: '#dc2626',
                    fontSize: 13,
                  }}>
                    Phí: {borrow.fineAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing fines section */}
      {fines.length > 0 && (
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>📋 Phiếu phạt đã lập</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Sách</th><th>Lý do</th><th>Ngày trễ</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày lập</th></tr></thead>
              <tbody>
                {fines.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{f.borrow?.book?.title || 'N/A'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{f.borrow?.book?.author}</div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: 10,
                        background: '#fffbeb',
                        color: '#d97706',
                      }}>
                        {f.reason === 'overdue' ? 'Trả trễ' : f.reason === 'damaged' ? 'Hư hỏng' : 'Mất sách'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{f.overdue_days > 0 ? `${f.overdue_days} ngày` : '—'}</td>
                    <td style={{ fontWeight: 600, color: f.is_paid ? '#16a34a' : '#dc2626', fontSize: 14 }}>
                      {f.amount.toLocaleString('vi-VN')}đ
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 10,
                        background: f.is_paid ? '#f0fdf4' : '#fef2f2',
                        color: f.is_paid ? '#16a34a' : '#dc2626',
                      }}>
                        {f.is_paid ? '✓ Đã trả' : '✗ Chưa trả'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{new Date(f.createdAt).toLocaleDateString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {loading === false && fines.length === 0 && overdueBorrows.length === 0 && (
        <div className="card">
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Không có phí phạt</h3>
            <p style={{ color: '#64748b' }}>Bạn chưa có phí phạt nào. Hãy trả sách đúng hạn!</p>
          </div>
        </div>
      )}

      {/* Warning if has unpaid fines or overdue books */}
      {totalOwed > 0 && (
        <div style={{
          marginTop: 16,
          background: '#fffbeb',
          border: '2px solid #fbbf24',
          borderRadius: 10,
          padding: 16,
          fontSize: 14,
          color: '#92400e',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>⚠️</span>
          <div>
            <strong>Bạn có {totalOwed.toLocaleString('vi-VN')}đ cần thanh toán!</strong>
            <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
              Vui lòng đến quầy thủ thư trong giờ làm việc để thanh toán và tránh bị phạt thêm.
            </p>
          </div>
        </div>
      )}

      <style>{`
        .stat-card {
          background: #fff;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 10px;
          font-size: 20px;
        }
        .stat-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        }
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
      `}</style>
    </Layout>
  );
}
