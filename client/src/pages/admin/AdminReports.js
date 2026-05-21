// client/src/pages/admin/AdminReports.js  (THAY THẾ TOÀN BỘ)
import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  FiDownload, FiRefreshCw, FiBook, FiCornerDownLeft,
  FiAlertTriangle, FiDollarSign, FiPackage, FiUsers, FiTrendingUp,
  FiList, FiBarChart2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const fmt  = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—';
const fmtN = (n) => Number(n || 0).toLocaleString('vi-VN');

const STATUS_MAP = {
  borrowed: { label: 'Đang mượn', color: '#16a34a', bg: '#f0fdf4' },
  renewed:  { label: 'Gia hạn',   color: '#0891b2', bg: '#ecfeff' },
  overdue:  { label: 'Quá hạn',   color: '#dc2626', bg: '#fef2f2' },
  returned: { label: 'Đã trả',    color: '#2563eb', bg: '#eff6ff' },
  lost:     { label: 'Mất sách',  color: '#6b7280', bg: '#f9fafb' },
};

const TABS = [
  { id: 'overview',  icon: <FiBarChart2 />,   label: 'Tổng quan'          },
  { id: 'borrow',    icon: <FiList />,         label: 'Mượn / Trả'         },
  { id: 'popular',   icon: <FiTrendingUp />,   label: 'Sách mượn nhiều'    },
  { id: 'stock',     icon: <FiPackage />,      label: 'Tồn kho'            },
  { id: 'debtors',   icon: <FiAlertTriangle />,label: 'Nợ phạt'            },
];

// ─── Spinner ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ padding: 60, textAlign: 'center' }}>
    <div className="spinner" style={{ margin: '0 auto', width: 40, height: 40 }} />
    <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 14 }}>Đang tải...</div>
  </div>
);

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, bg, sub }) => (
  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
    <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: 20, flexShrink: 0 }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AdminReports() {
  const today    = new Date().toISOString().split('T')[0];
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [tab,    setTab]    = useState('overview');
  const [from,   setFrom]   = useState(monthAgo);
  const [to,     setTo]     = useState(today);
  const [stockFilter, setStockFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  // Data states
  const [overview,  setOverview]  = useState(null);
  const [borrowData,setBorrowData]= useState(null);
  const [popular,   setPopular]   = useState([]);
  const [stock,     setStock]     = useState(null);
  const [debtors,   setDebtors]   = useState([]);

  const [loadingOverview,  setLoadingOverview]  = useState(false);
  const [loadingBorrow,    setLoadingBorrow]    = useState(false);
  const [loadingPopular,   setLoadingPopular]   = useState(false);
  const [loadingStock,     setLoadingStock]     = useState(false);
  const [loadingDebtors,   setLoadingDebtors]   = useState(false);

  // ── Fetch functions ────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await api.get('/stats/dashboard');
      setOverview(res.data.data);
    } catch { toast.error('Lỗi tải tổng quan'); }
    finally { setLoadingOverview(false); }
  }, []);

  const fetchBorrow = useCallback(async () => {
    setLoadingBorrow(true);
    try {
      const res = await api.get('/stats/daily', { params: { from, to } });
      setBorrowData(res.data.data);
    } catch { toast.error('Lỗi tải dữ liệu mượn trả'); }
    finally { setLoadingBorrow(false); }
  }, [from, to]);

  const fetchPopular = useCallback(async () => {
    setLoadingPopular(true);
    try {
      const res = await api.get('/stats/popular-books', { params: { from, to, limit: 20 } });
      setPopular(res.data.data || []);
    } catch { toast.error('Lỗi tải sách phổ biến'); }
    finally { setLoadingPopular(false); }
  }, [from, to]);

  const fetchStock = useCallback(async () => {
    setLoadingStock(true);
    try {
      const res = await api.get('/stats/stock', { params: { status: stockFilter } });
      setStock(res.data);
    } catch { toast.error('Lỗi tải tồn kho'); }
    finally { setLoadingStock(false); }
  }, [stockFilter]);

  const fetchDebtors = useCallback(async () => {
    setLoadingDebtors(true);
    try {
      const res = await api.get('/stats/fine-debtors', { params: { limit: 100 } });
      setDebtors(res.data.data || []);
    } catch { toast.error('Lỗi tải danh sách nợ phạt'); }
    finally { setLoadingDebtors(false); }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => {
    if (tab === 'borrow')  fetchBorrow();
    if (tab === 'popular') fetchPopular();
    if (tab === 'stock')   fetchStock();
    if (tab === 'debtors') fetchDebtors();
  }, [tab, fetchBorrow, fetchPopular, fetchStock, fetchDebtors]);

  // ── Export Excel đầy đủ ───────────────────────────────────────────────────
  const handleExportFull = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const year = new Date().getFullYear();
      const url = `/api/stats/export/comprehensive?year=${year}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export thất bại');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `baocao-5sheets-nam-${year}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Xuất Excel 5 sheets thành công!');
    } catch { toast.error('Lỗi xuất Excel'); }
    finally { setExporting(false); }
  };

  const handleExportBasic = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const url = `/api/stats/export/daily?from=${from}&to=${to}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `baocao-muon-tra-${from}-${to}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Xuất Excel thành công!');
    } catch { toast.error('Lỗi xuất Excel'); }
    finally { setExporting(false); }
  };

  // ── Chart data helper ──────────────────────────────────────────────────────
  const chartData = borrowData?.dailyBorrows?.map(d => ({
    date: d.date?.slice(5) || d.date,
    Mượn: parseInt(d.count || 0),
    Trả:  (borrowData.dailyReturns?.find(r => r.date === d.date)?.count || 0),
  })) || [];

  const pieData = overview ? [
    { name: 'Đang mượn', value: overview.activeBorrows  || 0, color: '#16a34a' },
    { name: 'Quá hạn',   value: overview.overdueBorrows || 0, color: '#dc2626' },
  ].filter(d => d.value > 0) : [];

  // ── Date filter row ────────────────────────────────────────────────────────
  const DateFilter = () => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>Từ:</span>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1e293b', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>Đến:</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          style={{ border: 'none', outline: 'none', fontSize: 13, color: '#1e293b', fontFamily: 'inherit' }} />
      </div>
      {[
        { label: '7 ngày', days: 7 }, { label: '30 ngày', days: 30 },
        { label: '3 tháng', days: 90 }, { label: 'Năm nay', days: null },
      ].map(p => (
        <button key={p.label} className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
          onClick={() => {
            const t = new Date().toISOString().split('T')[0];
            setTo(t);
            if (p.days) setFrom(new Date(Date.now() - p.days * 86400000).toISOString().split('T')[0]);
            else setFrom(new Date().getFullYear() + '-01-01');
          }}>
          {p.label}
        </button>
      ))}
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>📊 Báo cáo & Thống kê</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Tổng hợp dữ liệu mượn trả, tồn kho và tài chính</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportBasic} disabled={exporting}>
            <FiDownload size={14} /> Excel cơ bản
          </button>
          <button className="btn btn-primary" onClick={handleExportFull} disabled={exporting}>
            <FiDownload size={14} /> {exporting ? 'Đang xuất...' : 'Excel đầy đủ (5 sheets)'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, minWidth: 100, padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#2563eb' : '#64748b',
              fontWeight: tab === t.id ? 700 : 400,
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Tổng quan ── */}
      {tab === 'overview' && (
        <>
          {loadingOverview ? <Spinner /> : overview && (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
                <StatCard label="Tổng đầu sách" value={fmtN(overview.totalBooks)} icon={<FiBook />} color="#2563eb" bg="#eff6ff" />
                <StatCard label="Người dùng" value={fmtN(overview.totalUsers)} icon={<FiUsers />} color="#7c3aed" bg="#f5f3ff" />
                <StatCard label="Đang mượn" value={fmtN(overview.activeBorrows)} icon={<FiList />} color="#16a34a" bg="#f0fdf4"
                  sub={`${fmtN(overview.overdueBorrows)} quá hạn`} />
                <StatCard label="Phí phạt chưa thu" value={`${fmtN(overview.unpaidFines)}đ`} icon={<FiDollarSign />} color="#dc2626" bg="#fef2f2"
                  sub={`Tổng: ${fmtN(overview.totalFines)}đ`} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
                {/* Top sách mượn nhiều */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>🔥 Sách được mượn nhiều nhất</div>
                  {(overview.popularBooks || []).map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid #f1f5f9' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? ['#fef3c7','#f1f5f9','#fff7ed'][i] : '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i < 3 ? ['#ca8a04','#64748b','#b45309'][i] : '#94a3b8', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.author}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{fmtN(b.borrow_count)} lượt</div>
                    </div>
                  ))}
                </div>

                {/* Pie chart */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>📊 Tình trạng mượn</div>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${value}`}>
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(v, name) => [fmtN(v), name]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {pieData.map(d => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                            <span style={{ flex: 1, color: '#374151' }}>{d.name}</span>
                            <span style={{ fontWeight: 700 }}>{fmtN(d.value)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 13 }}>Không có dữ liệu</div>
                  )}
                </div>
              </div>

              {/* Recent borrows */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 15 }}>🕐 Mượn sách gần đây</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Sách','Người mượn','Mã SV','Ngày mượn','Trạng thái'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(overview.recentBorrows || []).map((b, i) => {
                        const st = STATUS_MAP[b.status] || { label: b.status, color: '#64748b', bg: '#f8fafc' };
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ fontWeight: 500, fontSize: 13 }}>{b.book?.title}</div>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 13 }}>{b.user?.name}</td>
                            <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{b.user?.student_id || '—'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(b.borrow_date)}</td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Mượn / Trả ── */}
      {tab === 'borrow' && (
        <>
          <div style={{ marginBottom: 16 }}><DateFilter /></div>
          {loadingBorrow ? <Spinner /> : borrowData && (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Tổng lượt mượn',   value: fmtN(borrowData.totalBorrowed),   color: '#2563eb', bg: '#eff6ff', icon: <FiBook /> },
                  { label: 'Đã trả',            value: fmtN(borrowData.totalReturned),   color: '#16a34a', bg: '#f0fdf4', icon: <FiCornerDownLeft /> },
                  { label: 'Đang quá hạn',      value: fmtN(borrowData.overdue),         color: '#dc2626', bg: '#fef2f2', icon: <FiAlertTriangle /> },
                  { label: 'Phí đã thu',        value: `${fmtN(borrowData.finesCollected)}đ`, color: '#d97706', bg: '#fffbeb', icon: <FiDollarSign /> },
                ].map(s => <StatCard key={s.label} {...s} />)}
              </div>

              {/* Bar chart */}
              {chartData.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📈 Biểu đồ mượn / trả theo ngày</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Mượn" fill="#2563eb" radius={[4,4,0,0]} />
                      <Bar dataKey="Trả"  fill="#16a34a" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Line chart */}
              {chartData.length > 1 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>📉 Xu hướng mượn trả</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Mượn" stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Trả"  stroke="#16a34a" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table chi tiết */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Chi tiết {borrowData.borrows?.length || 0} phiếu mượn</span>
                  <button className="btn btn-secondary btn-sm" onClick={handleExportBasic} disabled={exporting}>
                    <FiDownload size={13} /> Xuất Excel
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['STT','Ngày mượn','Hạn trả','Ngày trả','Sách','Người mượn','Mã SV','Trạng thái'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(borrowData.borrows || []).map((b, i) => {
                        const st = STATUS_MAP[b.status] || { label: b.status, color: '#64748b', bg: '#f8fafc' };
                        const isLate = b.status !== 'returned' && new Date(b.due_date) < new Date();
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{fmt(b.borrow_date)}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: isLate ? '#dc2626' : '#374151', fontWeight: isLate ? 600 : 400 }}>{fmt(b.due_date)}</td>
                            <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#64748b' }}>{b.return_date ? fmt(b.return_date) : '—'}</td>
                            <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                              <div style={{ fontWeight: 500 }}>{b.book?.title}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.book?.author}</div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>{b.user?.name}</td>
                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{b.user?.student_id || '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>{st.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Sách mượn nhiều ── */}
      {tab === 'popular' && (
        <>
          <div style={{ marginBottom: 16 }}><DateFilter /></div>
          {loadingPopular ? <Spinner /> : (
            <>
              {/* Bar chart top 10 */}
              {popular.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>🏆 Top 10 sách được mượn nhiều nhất</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={popular.slice(0, 10).map(p => ({ name: p.book?.title?.slice(0, 20) + (p.book?.title?.length > 20 ? '…' : ''), count: p.borrow_count }))} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [fmtN(v) + ' lượt', 'Số lượt mượn']} />
                      <Bar dataKey="count" fill="#2563eb" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Table */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 15 }}>
                  📚 Danh sách {popular.length} sách
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Hạng','Tên sách','Tác giả','Thể loại','Lượt mượn','Còn lại / Tổng'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {popular.map((p, i) => (
                        <tr key={p.book_id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? ['#fef3c7','#f1f5f9','#fff7ed'][i] : '#f8fafc', color: i < 3 ? ['#ca8a04','#475569','#b45309'][i] : '#94a3b8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                              {i + 1}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', maxWidth: 250 }}>
                            <div style={{ fontWeight: 600 }}>{p.book?.title}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{p.book?.isbn || ''}</div>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.book?.author}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{p.book?.category?.name || '—'}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#2563eb' }}>{fmtN(p.borrow_count)}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>lượt</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontWeight: 600, color: p.book?.available_copies === 0 ? '#dc2626' : '#16a34a' }}>
                              {p.book?.available_copies}
                            </span>
                            <span style={{ color: '#94a3b8' }}> / {p.book?.total_copies}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Tồn kho ── */}
      {tab === 'stock' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['all','Tất cả'],['low','Sắp hết (≤2)'],['out','Hết sách']].map(([v, l]) => (
              <button key={v} className={`btn ${stockFilter === v ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStockFilter(v)} style={{ fontSize: 13 }}>{l}</button>
            ))}
            <button className="btn btn-secondary" onClick={fetchStock} style={{ marginLeft: 'auto' }}>
              <FiRefreshCw size={13} /> Làm mới
            </button>
          </div>

          {loadingStock ? <Spinner /> : stock && (
            <>
              {/* Stock summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Tổng đầu sách', value: fmtN(stock.stats?.total_books),    color: '#2563eb', bg: '#eff6ff', icon: <FiBook /> },
                  { label: 'Tổng bản sao',  value: fmtN(stock.stats?.total_copies),   color: '#7c3aed', bg: '#f5f3ff', icon: <FiPackage /> },
                  { label: 'Đang có sẵn',   value: fmtN(stock.stats?.available_copies),color: '#16a34a', bg: '#f0fdf4', icon: <FiList /> },
                  { label: 'Đang mượn',     value: fmtN(stock.stats?.borrowed_copies), color: '#0891b2', bg: '#ecfeff', icon: <FiCornerDownLeft /> },
                  { label: 'Hết sách',      value: fmtN(stock.stats?.out_of_stock),    color: '#dc2626', bg: '#fef2f2', icon: <FiAlertTriangle />, sub: `${fmtN(stock.stats?.low_stock)} sắp hết` },
                ].map(s => <StatCard key={s.label} {...s} />)}
              </div>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 15 }}>
                  📦 Tồn kho {stock.data?.length || 0} đầu sách
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['STT','Tên sách','Tác giả','Thể loại','Vị trí kệ','Tổng bản','Đang mượn','Còn lại','Tình trạng'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(stock.data || []).map((b, i) => {
                        const borrowed = b.total_copies - b.available_copies;
                        const status = b.available_copies === 0 ? 'out' : b.available_copies <= 2 ? 'low' : 'ok';
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                            <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                              <div style={{ fontWeight: 600 }}>{b.title}</div>
                              <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{b.isbn || ''}</div>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#64748b' }}>{b.author}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{b.category?.name || '—'}</span>
                            </td>
                            <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{b.location || '—'}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>{b.total_copies}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: borrowed > 0 ? '#0891b2' : '#94a3b8' }}>{borrowed}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <span style={{ fontWeight: 700, fontSize: 15, color: status === 'out' ? '#dc2626' : status === 'low' ? '#d97706' : '#16a34a' }}>
                                {b.available_copies}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {status === 'out' && <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Hết sách</span>}
                              {status === 'low' && <span style={{ background: '#fffbeb', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Sắp hết</span>}
                              {status === 'ok'  && <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>Còn sách</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Nợ phạt ── */}
      {tab === 'debtors' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>
              Tổng nợ phạt: <strong style={{ color: '#dc2626', fontSize: 16 }}>
                {fmtN(debtors.reduce((s, u) => s + u.unpaid_fines, 0))}đ
              </strong> · {debtors.length} sinh viên
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchDebtors} disabled={loadingDebtors}>
              <FiRefreshCw size={13} className={loadingDebtors ? 'spin' : ''} /> Làm mới
            </button>
          </div>

          {loadingDebtors ? <Spinner /> : debtors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Không có sinh viên nào nợ phạt!</div>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: 15, display: 'flex', justifyContent: 'space-between' }}>
                <span>⚠️ Danh sách nợ phạt ({debtors.length} sinh viên)</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fef2f2' }}>
                      {['STT','Họ tên','Mã SV','Email','SĐT','Nợ chưa trả','Tổng phí phạt','Số sách nợ'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', borderBottom: '1px solid #fecaca', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {debtors.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12 }}>{u.student_id || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{u.email}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{u.phone || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: '#dc2626' }}>{fmtN(u.unpaid_fines)}đ</span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{fmtN(u.total_fines)}đ</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                            {u.unpaid_fines_detail?.length || 0} phiếu
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; display: inline-block; }
      `}</style>
    </Layout>
  );
}
