import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { FiBook, FiUsers, FiList, FiAlertTriangle, FiDollarSign, FiBookOpen, FiTrendingUp } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/stats/dashboard'), api.get('/stats/borrows')])
      .then(([s, b]) => {
        setStats(s.data.data);
        const months = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
        const data = months.map((m, i) => {
          const found = b.data.data?.find(d => d.month === i + 1 || d._id?.month === i + 1);
          return { month: m, count: found?.count || 0 };
        });
        setChartData(data);
      })
      .catch(err => console.error('Stats error:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div></Layout>;

  // Top cards - main metrics
  const cards = [
    { label: 'Tổng sách', value: stats?.totalBooks, icon: <FiBook />, color: '#eff6ff', iconColor: '#2563eb' },
    { label: 'Người dùng', value: stats?.totalUsers, icon: <FiUsers />, color: '#f0fdf4', iconColor: '#16a34a' },
    { label: 'Đang mượn', value: stats?.activeBorrows, icon: <FiList />, color: '#f5f3ff', iconColor: '#7c3aed' },
    { label: 'Quá hạn', value: stats?.overdueBorrows, icon: <FiAlertTriangle />, color: '#fef2f2', iconColor: '#dc2626' },
    { label: 'E-Books', value: stats?.totalEBooks, icon: <FiBookOpen />, color: '#f0fdf4', iconColor: '#16a34a' },
    { label: 'Phí chưa thu', value: `${(stats?.unpaidFines || 0).toLocaleString('vi-VN')}đ`, icon: <FiDollarSign />, color: '#fffbeb', iconColor: '#d97706' },
  ];

  const copyStatusData = Object.entries(stats?.copyStatusBreakdown || {}).map(([status, count]) => ({
    name: status === 'available' ? 'Có sẵn' : status === 'borrowed' ? 'Đang mượn' : status === 'reserved' ? 'Đã đặt' : status === 'lost' ? 'Mất' : 'Bảo trì',
    value: count,
  }));

  const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#94a3b8'];

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>📊 Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Tổng quan hệ thống thư viện</p>
      </div>

      {/* Main metrics cards */}
      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ background: c.color, color: c.iconColor }}>{c.icon}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="card">
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>📅 Năm nay</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb', marginBottom: 4 }}>{stats?.booksAddedThisYear}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Sách được thêm vào</div>
          </div>
        </div>
        
        <div className="card">
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>📍 Sách mất</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>{stats?.lostBooks}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Cần kiểm tra kho</div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>🔖 Đặt trước</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>{stats?.pendingReservations}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Chưa xử lý</div>
          </div>
        </div>

        <div className="card">
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>📊 E-Books</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginBottom: 4 }}>{stats?.eBookPercentage}%</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>Tỷ lệ sách điện tử</div>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Borrow chart */}
        <div className="card">
          <div className="card-header"><h2>📈 Lượt mượn theo tháng ({new Date().getFullYear()})</h2></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Lượt mượn" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Copy status pie chart */}
        <div className="card">
          <div className="card-header"><h2>📚 Trạng thái bản sao</h2></div>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220 }}>
            {copyStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={copyStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {copyStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      {/* Category performance */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>🏆 Thể loại được mượn nhiều nhất</h2></div>
        <div className="card-body">
          {stats?.categoryStats && stats.categoryStats.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {stats.categoryStats.map((cat, i) => (
                <div key={cat.categoryId} style={{ 
                  padding: 14, 
                  background: '#f8fafc', 
                  borderRadius: 8, 
                  borderLeft: `4px solid ${['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed'][i % 5]}`
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#1e293b' }}>
                    {i + 1}. {cat.categoryName}
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                    <div>
                      <div style={{ color: '#64748b', marginBottom: 2 }}>Số sách</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>{cat.bookCount}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', marginBottom: 2 }}>Lượt mượn</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#7c3aed' }}>{cat.totalBorrows}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Chưa có dữ liệu thể loại</div>
          )}
        </div>
      </div>

      {/* Recent borrows */}
      <div className="card">
        <div className="card-header"><h2>🔄 Mượn sách gần đây</h2></div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Người mượn</th><th>Sách</th><th>Thời gian</th></tr></thead>
            <tbody>
              {stats?.recentBorrows && stats.recentBorrows.length > 0 ? stats.recentBorrows.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{b.user?.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{b.user?.student_id}</div>
                  </td>
                  <td style={{ fontSize: 14 }}>{b.book?.title}</td>
                  <td style={{ fontSize: 13, color: '#64748b' }}>{new Date(b.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>Chưa có mượn sách nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 20px;
        }
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
        .card-header {
          padding: 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .card-header h2 {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .card-body {
          padding: 16px;
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
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
        }
        td {
          padding: 12px 10px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:hover {
          background: #f8fafc;
        }
      `}</style>
    </Layout>
  );
}
