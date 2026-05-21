// client/src/pages/admin/AdminBorrows.js - Xem lịch sử mượn/trả sách
import React, { useEffect, useState } from 'react';
import { FiSearch, FiFilter, FiCornerDownLeft, FiPrinter } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const statusMap = {
  borrowed: { label: 'Đang mượn', color: '#16a34a', bg: '#f0fdf4' },
  renewed:  { label: 'Đã gia hạn', color: '#2563eb', bg: '#eff6ff' },
  overdue:  { label: 'Quá hạn', color: '#dc2626', bg: '#fef2f2' },
  returned: { label: 'Đã trả', color: '#94a3b8', bg: '#f8fafc' },
  lost:     { label: 'Mất sách', color: '#dc2626', bg: '#fef2f2' },
};

export default function AdminBorrows() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBorrows = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter) params.status = filter;
      if (search) params.search = search;
      const res = await api.get('/borrows', { params });
      setBorrows(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching borrows:', err);
      setBorrows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrows();
  }, [page, filter, search]);

  const daysRemaining = (dueDate) => {
    const days = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
    return days;
  };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Lịch sử mượn/trả sách</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Xem tất cả các phiếu mượn trả sách</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#64748b' }}>
            Tìm kiếm (tên/email/mã SV)
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
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" /></div>
        ) : borrows.length === 0 ? (
          <div className="empty" style={{ padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            <h3>Không tìm thấy lịch sử mượn</h3>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['Sinh viên', 'Sách', 'Mã cá biệt', 'Ngày mượn', 'Hạn trả', 'Trạng thái', 'Ghi chú'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {borrows.map(b => {
                  const days = daysRemaining(b.due_date);
                  const st = statusMap[b.status] || { label: b.status, color: '#666', bg: '#f0f0f0' };
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{b.user?.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {b.user?.student_id} • {b.user?.email}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{b.book?.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{b.book?.author}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {b.copy ? (
                          <span style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#eff6ff',
                            color: '#2563eb',
                            padding: '4px 8px',
                            borderRadius: 6
                          }}>
                            {b.copy.copy_code}
                          </span>
                        ) : (
                          <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        {new Date(b.borrow_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {new Date(b.due_date).toLocaleDateString('vi-VN')}
                        </div>
                        {b.status !== 'returned' && (
                          <div style={{
                            fontSize: 11,
                            color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : '#64748b',
                            marginTop: 2,
                          }}>
                            {days < 0 ? `Trễ ${Math.abs(days)} ngày` : days === 0 ? 'Hôm nay' : `Còn ${days} ngày`}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            background: st.bg,
                            color: st.color,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', maxWidth: 150 }}>
                        {b.note ? (
                          <span title={b.note}>{b.note.substring(0, 25)}...</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                padding: '8px 12px',
                border: page === p ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: page === p ? '#eff6ff' : 'white',
                color: page === p ? '#2563eb' : '#64748b',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: page === p ? 600 : 400,
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </Layout>
  );
}


const statusMap = {
  borrowed: ['Đang mượn', 'badge-success'],
  renewed:  ['Đã gia hạn', 'badge-info'],
  overdue:  ['Quá hạn',    'badge-danger'],
  returned: ['Đã trả',     'badge-secondary'],
  lost:     ['Mất sách',   'badge-danger'],
};

const CONDITION_LABEL = { good: 'Tốt', worn: 'Cũ', damaged: 'Hỏng', lost: 'Mất' };

export default function AdminBorrows() {
  const [borrows, setBorrows]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('');
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [modal, setModal]               = useState(false);
  const [returning, setReturning]       = useState(null);

  // Form cho mượn — hai tab
  const [borrowTab, setBorrowTab]       = useState('code');  // 'code' | 'search'

  // Tab nhập mã cá biệt
  const [codeInput, setCodeInput]       = useState('');
  const [codeLoading, setCodeLoading]   = useState(false);
  const [foundCopy, setFoundCopy]       = useState(null);   // { copy_code, status, condition, book: {...} }
  const codeDebounce                    = useRef(null);

  // Tab tìm theo tên sách
  const [bookSearch, setBookSearch]     = useState('');
  const [userSearch, setUserSearch]     = useState('');
  const [books, setBooks]               = useState([]);
  const [users, setUsers]               = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const [saving, setSaving]             = useState(false);

  const fetchBorrows = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter) params.status = filter;
      const res = await api.get('/borrows', { params });
      setBorrows(res.data.data);
      setTotalPages(res.data.pages);
    } finally { setLoading(false); }
  }, [page, filter]);

  useEffect(() => { fetchBorrows(); }, [fetchBorrows]);

  // Tìm copy theo mã (debounce 400ms)
  const handleCodeInput = (val) => {
    setCodeInput(val);
    setFoundCopy(null);
    clearTimeout(codeDebounce.current);
    if (!val.trim()) return;
    codeDebounce.current = setTimeout(async () => {
      setCodeLoading(true);
      try {
        const res = await api.get(`/copies/find/${val.trim()}`);
        setFoundCopy(res.data.data);
      } catch (err) {
        if (err.response?.status === 404) setFoundCopy(null);
      } finally { setCodeLoading(false); }
    }, 400);
  };

  const searchBooks = async (q) => {
    if (!q) return setBooks([]);
    const res = await api.get('/books', { params: { search: q, available: 'true', limit: 5 } });
    setBooks(res.data.data);
  };

  const searchUsers = async (q) => {
    if (!q) return setUsers([]);
    const res = await api.get('/users', { params: { search: q, limit: 5 } });
    setUsers(res.data.data);
  };

  // Tìm người dùng dùng chung cho cả 2 tab
  const [sharedUserSearch, setSharedUserSearch] = useState('');
  const [sharedUsers, setSharedUsers]           = useState([]);
  const [sharedUser, setSharedUser]             = useState(null);

  const searchSharedUsers = async (q) => {
    setSharedUserSearch(q);
    if (!q) return setSharedUsers([]);
    const res = await api.get('/users', { params: { search: q, limit: 5 } });
    setSharedUsers(res.data.data);
  };

  const resetModal = () => {
    setCodeInput(''); setFoundCopy(null); setCodeLoading(false);
    setBookSearch(''); setUserSearch(''); setBooks([]); setUsers([]);
    setSelectedBook(null); setSelectedUser(null);
    setSharedUserSearch(''); setSharedUsers([]); setSharedUser(null);
    setBorrowTab('code');
  };

  const handleBorrow = async () => {
    if (!sharedUser) return toast.error('Vui lòng chọn người mượn');

    setSaving(true);
    try {
      let payload = { user_id: sharedUser.id };

      if (borrowTab === 'code') {
        if (!foundCopy) return toast.error('Vui lòng nhập mã sách hợp lệ');
        if (foundCopy.status !== 'available') return toast.error('Cuốn sách này không sẵn sàng để mượn');
        payload.copy_code = foundCopy.copy_code;
      } else {
        if (!selectedBook) return toast.error('Vui lòng chọn sách');
        payload.book_id = selectedBook.id;
      }

      await api.post('/borrows', payload);
      toast.success('Tạo mượn/trả sách thành công!');
      setModal(false);
      resetModal();
      fetchBorrows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo mượn/trả sách');
    } finally { setSaving(false); }
  };

  const handleReturn = async (id) => {
    if (!window.confirm('Xác nhận trả sách?')) return;
    setReturning(id);
    try {
      const res = await api.put(`/borrows/${id}/return`);
      if (res.data.fine) {
        toast.success(`Trả sách thành công. Phí phạt: ${res.data.fine.amount.toLocaleString('vi-VN')}đ`);
      } else {
        toast.success('Trả sách thành công!');
      }
      fetchBorrows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi trả sách');
    } finally { setReturning(null); }
  };

  const handlePrintBill = async (id) => {
    try {
      const response = await api.get(`/borrows/${id}/bill`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bill_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Lỗi tải bill');
    }
  };

  // Sách được xác định để mượn (cho phần preview bên dưới form)
  const pendingBook = borrowTab === 'code' ? foundCopy?.book : selectedBook;

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Quản lý mượn trả</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Xử lý mượn sách và trả sách</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetModal(); setModal(true); }}><FiPlus /> Tạo mượn/trả sách</button>
      </div>

      <div className="filters-row">
        {[['', 'Tất cả'], ['borrowed', 'Đang mượn'], ['overdue', 'Quá hạn'], ['returned', 'Đã trả'], ['renewed', 'Gia hạn']].map(([v, l]) => (
          <button key={v} className={`btn ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFilter(v); setPage(1); }}>{l}</button>
        ))}
      </div>

      <div className="card">
        {loading
          ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Người mượn</th><th>Sách</th><th>Mã cá biệt</th>
                    <th>Ngày mượn</th><th>Hạn trả</th><th>Thế chân</th><th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {borrows.map(b => {
                    const days = Math.ceil((new Date(b.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{b.user?.name}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{b.user?.student_id || b.user?.email}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{b.book?.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{b.book?.author}</div>
                        </td>
                        <td>
                          {b.copy
                            ? <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>{b.copy.copy_code}</span>
                            : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ fontSize: 13 }}>{new Date(b.borrow_date).toLocaleDateString('vi-VN')}</td>
                        <td style={{ fontSize: 13 }}>
                          <div>{new Date(b.due_date).toLocaleDateString('vi-VN')}</div>
                          {b.status !== 'returned' && (
                            <div style={{ fontSize: 11, color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : '#64748b' }}>
                              {days < 0 ? `Trễ ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: b.book?.deposit > 0 ? '#d97706' : '#94a3b8' }}>
                          {b.book?.deposit > 0 ? `${b.book.deposit.toLocaleString('vi-VN')}đ` : '—'}
                        </td>
                        <td><span className={`badge ${statusMap[b.status]?.[1]}`}>{statusMap[b.status]?.[0]}</span></td>
                        <td>
                          {['borrowed', 'renewed', 'overdue'].includes(b.status) && (
                            <button className="btn btn-secondary btn-sm" onClick={() => handleReturn(b.id)} disabled={returning === b.id}>
                              <FiCornerDownLeft size={13} /> {returning === b.id ? '...' : 'Trả sách'}
                            </button>
                          )}
                          <button className="btn btn-outline-primary btn-sm ml-2" onClick={() => handlePrintBill(b.id)}>
                            <FiPrinter size={13} /> In bill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* ── Modal tạo mượn/trả sách ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Tạo mượn/trả sách</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setModal(false)}><FiX /></button>
            </div>

            <div className="modal-body">
              {/* Tab chọn cách tìm sách */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setBorrowTab('code')}
                  style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: borrowTab === 'code' ? '#2563eb' : '#fff',
                    color: borrowTab === 'code' ? '#fff' : '#64748b' }}>
                  <FiHash style={{ marginRight: 6 }} />Nhập mã sách
                </button>
                <button onClick={() => setBorrowTab('search')}
                  style={{ flex: 1, padding: '10px 0', border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: borrowTab === 'search' ? '#2563eb' : '#fff',
                    color: borrowTab === 'search' ? '#fff' : '#64748b' }}>
                  <FiSearch style={{ marginRight: 6 }} />Tìm theo tên sách
                </button>
              </div>

              {/* ── Tab 1: Nhập mã cá biệt ── */}
              {borrowTab === 'code' && (
                <div className="form-group">
                  <label className="form-label">Mã đăng ký cá biệt (scan barcode hoặc nhập tay)</label>
                  <div style={{ position: 'relative' }}>
                    <FiHash style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input className="form-control"
                      style={{ paddingLeft: 36, fontFamily: 'monospace', fontSize: 15, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}
                      placeholder="LIB-2025-00001"
                      value={codeInput}
                      autoFocus
                      onChange={e => handleCodeInput(e.target.value)} />
                    {codeLoading && <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}><div className="spinner" style={{ width: 16, height: 16 }} /></div>}
                  </div>

                  {/* Kết quả tìm mã */}
                  {codeInput && !codeLoading && !foundCopy && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                      ❌ Không tìm thấy mã sách này
                    </div>
                  )}
                  {foundCopy && (
                    <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 8, border: '2px solid', borderColor: foundCopy.status === 'available' ? '#16a34a' : '#dc2626', background: foundCopy.status === 'available' ? '#f0fdf4' : '#fef2f2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{foundCopy.book?.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{foundCopy.book?.author}</div>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb' }}>
                          {foundCopy.copy_code}
                        </span>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, fontSize: 12 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontWeight: 600, background: foundCopy.status === 'available' ? '#dcfce7' : '#fee2e2', color: foundCopy.status === 'available' ? '#16a34a' : '#dc2626' }}>
                          {foundCopy.status === 'available' ? '✅ Có sẵn' : '❌ Không sẵn sàng'}
                        </span>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: '#f1f5f9', color: '#64748b' }}>
                          {CONDITION_LABEL[foundCopy.condition]}
                        </span>
                        {foundCopy.book?.deposit > 0 && (
                          <span style={{ padding: '2px 8px', borderRadius: 12, background: '#fffbeb', color: '#d97706', fontWeight: 600 }}>
                            💰 {foundCopy.book.deposit.toLocaleString('vi-VN')}đ thế chân
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 2: Tìm theo tên sách ── */}
              {borrowTab === 'search' && (
                <div className="form-group">
                  <label className="form-label">Tìm sách</label>
                  <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input className="form-control" style={{ paddingLeft: 36 }} placeholder="Tên sách, tác giả..."
                      value={bookSearch} onChange={e => { setBookSearch(e.target.value); searchBooks(e.target.value); }} />
                  </div>
                  {books.length > 0 && !selectedBook && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                      {books.map(b => (
                        <div key={b.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: '#fff' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          onClick={() => { setSelectedBook(b); setBookSearch(b.title); setBooks([]); }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{b.title}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>
                            {b.author} · Còn {b.available_copies} bản
                            {b.deposit > 0 && <span style={{ color: '#d97706', marginLeft: 8 }}>· Thế chân: {b.deposit.toLocaleString('vi-VN')}đ</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedBook && (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#16a34a' }}>✓ {selectedBook.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {selectedBook.author} · Còn {selectedBook.available_copies} bản
                          {selectedBook.deposit > 0 && <span style={{ color: '#d97706', marginLeft: 8 }}>· Thế chân: {selectedBook.deposit.toLocaleString('vi-VN')}đ</span>}
                        </div>
                      </div>
                      <button onClick={() => { setSelectedBook(null); setBookSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><FiX /></button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tìm người mượn (dùng chung) ── */}
              <div className="form-group" style={{ marginTop: 4 }}>
                <label className="form-label">Người mượn</label>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input className="form-control" style={{ paddingLeft: 36 }} placeholder="Tên, email, mã SV..."
                    value={sharedUserSearch} onChange={e => searchSharedUsers(e.target.value)} />
                </div>
                {sharedUsers.length > 0 && !sharedUser && (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4, overflow: 'hidden' }}>
                    {sharedUsers.map(u => (
                      <div key={u.id} style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: '#fff' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        onClick={() => { setSharedUser(u); setSharedUserSearch(u.name); setSharedUsers([]); }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{u.student_id ? `${u.student_id} · ` : ''}{u.email}</div>
                      </div>
                    ))}
                  </div>
                )}
                {sharedUser && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#16a34a' }}>✓ {sharedUser.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{sharedUser.student_id || sharedUser.email}</div>
                    </div>
                    <button onClick={() => { setSharedUser(null); setSharedUserSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><FiX /></button>
                  </div>
                )}
              </div>

              {/* Preview mượn/trả sách */}
              {pendingBook && sharedUser && (
                <div style={{ padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, marginTop: 8 }}>
                  <div>📖 <strong>{pendingBook.title}</strong></div>
                  <div style={{ marginTop: 4 }}>👤 <strong>{sharedUser.name}</strong></div>
                  <div style={{ marginTop: 4 }}>📅 Hạn trả: <strong>{new Date(Date.now() + 14 * 86400000).toLocaleDateString('vi-VN')}</strong> (14 ngày)</div>
                  {pendingBook.deposit > 0 && (
                    <div style={{ marginTop: 6, color: '#92400e' }}>💰 Tiền thế chân cần thu: <strong>{pendingBook.deposit.toLocaleString('vi-VN')}đ</strong></div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleBorrow}
                disabled={!sharedUser || (borrowTab === 'code' ? !foundCopy || foundCopy.status !== 'available' : !selectedBook) || saving}>
                {saving ? 'Đang xử lý...' : 'Xác nhận mượn sách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
