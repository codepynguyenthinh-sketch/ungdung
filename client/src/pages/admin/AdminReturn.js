import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

// ─── Component chính ──────────────────────────────────────────────────────────
export default function AdminReturn() {
  const [searchInput, setSearchInput]     = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [studentInfo, setStudentInfo]     = useState(null);
  const [borrows, setBorrows]             = useState([]);
  const [selectedReturns, setSelectedReturns] = useState({});
  const [returning, setReturning]         = useState(false);

  const searchDebounce = useRef(null);

  // ── Tìm kiếm ──
  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(searchDebounce.current);
    if (!val.trim()) { setStudentInfo(null); setBorrows([]); setSelectedReturns({}); return; }

    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        let userId = null;

        // Thử tìm bằng mã sách trước
        try {
          const copyRes = await api.get(`/copies/find/${val}`);
          if (copyRes.data.success) {
            const copy = copyRes.data.data;
            const borrowRes = await api.get('/borrows', { params: { limit: 100, page: 1 } });
            const activeBorrow = borrowRes.data.data?.find(b =>
              b.copy_id === copy.id && ['borrowed', 'renewed', 'overdue'].includes(b.status)
            ) || borrowRes.data.data?.find(b =>
              b.book_id === copy.book_id && ['borrowed', 'renewed', 'overdue'].includes(b.status)
            );
            if (activeBorrow) userId = activeBorrow.user_id;
          }
        } catch {}

        // Tìm bằng mã SV / tên
        if (!userId) {
          const userRes = await api.get('/users', { params: { search: val, role: 'user', limit: 10 } });
          if (userRes.data.data && userRes.data.data.length > 0) userId = userRes.data.data[0].id;
        }

        if (!userId) { toast.error('Không tìm thấy sinh viên hoặc sách'); setSearchLoading(false); return; }

        const userRes = await api.get(`/users/${userId}`);
        setStudentInfo(userRes.data.data);

        const borrowRes = await api.get('/borrows', { params: { limit: 100, page: 1 } });
        const studentBorrows = borrowRes.data.data?.filter(b =>
          b.user_id === userId && ['borrowed', 'renewed', 'overdue'].includes(b.status)
        ) || [];
        setBorrows(studentBorrows);
        setSelectedReturns({});

        if (studentBorrows.length === 0) toast.info('Sinh viên này không có sách đang mượn');
      } catch (err) {
        toast.error('Lỗi khi tìm kiếm: ' + err.message);
        setStudentInfo(null); setBorrows([]);
      } finally { setSearchLoading(false); }
    }, 500);
  };

  const toggleReturn = (borrowId) => {
    setSelectedReturns(prev => ({ ...prev, [borrowId]: !prev[borrowId] }));
  };

  const selectAll = () => {
    const allSelected = borrows.every(b => selectedReturns[b.id]);
    if (allSelected) setSelectedReturns({});
    else {
      const all = {};
      borrows.forEach(b => { all[b.id] = true; });
      setSelectedReturns(all);
    }
  };

  // Tính các khoản tiền
  const selectedBorrows = borrows.filter(b => selectedReturns[b.id]);
  const selectedNonOverdue = selectedBorrows.filter(b => new Date() <= new Date(b.due_date));
  const totalRefundAmount = selectedNonOverdue.reduce((s, b) => s + (b.book?.deposit || 0), 0);
  const estimatedFine = selectedBorrows
    .filter(b => new Date() > new Date(b.due_date))
    .reduce((s, b) => {
      const days = Math.ceil((new Date() - new Date(b.due_date)) / 86400000);
      return s + days * 2000; // 2000đ/ngày mặc định
    }, 0);

  // ── Trả sách ──
  const handleReturnBooks = async () => {
    const selectedIds = Object.entries(selectedReturns).filter(([_, v]) => v).map(([id]) => id);
    if (selectedIds.length === 0) { toast.error('Vui lòng chọn ít nhất 1 cuốn sách để trả'); return; }

    setReturning(true);
    try {
      let fineTotal = 0;
      const totalRefund = selectedBorrows
        .filter(b => new Date() <= new Date(b.due_date))
        .reduce((s, b) => s + (b.book?.deposit || 0), 0);

      for (const borrowId of selectedIds) {
        const res = await api.put(`/borrows/${borrowId}/return`);
        if (res.data.fine) fineTotal += res.data.fine.amount;
      }

      toast.success(`✓ Trả ${selectedIds.length} cuốn sách thành công!`);
      if (fineTotal > 0) toast.error(`💰 Phí phạt: ${fineTotal.toLocaleString('vi-VN')}đ`);
      if (totalRefund > 0) toast.success(`✓ Hoàn thế chân: ${totalRefund.toLocaleString('vi-VN')}đ`);

      // Refresh (but don't let errors here ruin the success message)
      try {
        const borrowRes = await api.get('/borrows', { params: { limit: 100, page: 1 } });
        const remaining = borrowRes.data.data?.filter(b =>
          b.user_id === studentInfo.id && ['borrowed', 'renewed', 'overdue'].includes(b.status)
        ) || [];
        setBorrows(remaining);
        setSelectedReturns({});

        if (remaining.length === 0) toast.info('Sinh viên không còn sách đang mượn');
      } catch (refreshErr) {
        console.error('Refresh error:', refreshErr);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi trả sách');
    } finally { setReturning(false); }
  };

  const allSelected = borrows.length > 0 && borrows.every(b => selectedReturns[b.id]);

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 30 }}>📥 Trả Sách</h1>

        {/* Tìm kiếm */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>🔍 Tìm Sinh Viên</h3>
          </div>
          <div style={{ padding: 24 }}>
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
              Nhập mã sinh viên (VD: SV001) hoặc mã ĐKCB sách (VD: LIB-2025-00001)
            </p>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input type="text" autoFocus
                placeholder="Mã sinh viên hoặc mã ĐKCB sách..."
                value={searchInput} onChange={e => handleSearch(e.target.value)}
                disabled={searchLoading}
                style={{ width: '100%', padding: '12px 12px 12px 40px', border: '2px solid #cbd5e1', borderRadius: 8, fontSize: 15, fontFamily: 'monospace', fontWeight: 500 }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'} />
            </div>
            {searchLoading && <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>⏳ Đang tìm kiếm...</div>}
          </div>
        </div>

        {/* Thông tin sinh viên */}
        {studentInfo && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0 }}>👤 Thông Tin Sinh Viên</h3>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div><div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tên</div><div style={{ fontSize: 16, fontWeight: 700 }}>{studentInfo.name}</div></div>
                <div><div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Mã SV</div><div style={{ fontSize: 16, fontWeight: 700 }}>{studentInfo.student_id || '—'}</div></div>
                <div><div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Email</div><div style={{ fontSize: 14 }}>{studentInfo.email}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Danh sách sách đang mượn */}
        {borrows.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📚 Sách Đang Mượn ({borrows.length} cuốn)</h3>
              <button onClick={selectAll} className="btn btn-secondary" style={{ fontSize: 13 }}>
                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>
            <div style={{ padding: 24 }}>
              {borrows.map((borrow, idx) => {
                const isOverdue = new Date() > new Date(borrow.due_date);
                const overdayDays = isOverdue ? Math.ceil((new Date() - new Date(borrow.due_date)) / 86400000) : 0;
                const estimFine = isOverdue ? overdayDays * 2000 : 0;
                const isSelected = selectedReturns[borrow.id];

                return (
                  <div key={borrow.id} onClick={() => toggleReturn(borrow.id)}
                    style={{ padding: 16, background: isSelected ? '#eff6ff' : 'white', border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Checkbox */}
                      <div style={{ width: 24, height: 24, borderRadius: 4, border: '2px solid ' + (isSelected ? '#2563eb' : '#cbd5e1'), background: isSelected ? '#2563eb' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0 }}>
                        {isSelected && <FiCheck color="white" size={16} />}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#1e293b' }}>{idx + 1}. {borrow.book?.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Tác giả: {borrow.book?.author}</div>
                        {borrow.copy?.copy_code && (
                          <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 6, fontFamily: 'monospace', fontWeight: 700 }}>Mã ĐKCB: {borrow.copy.copy_code}</div>
                        )}
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          <span>Mượn: {new Date(borrow.borrow_date).toLocaleDateString('vi-VN')}</span>
                          <span>Hạn: {new Date(borrow.due_date).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {borrow.book?.deposit > 0 && (
                            <span style={{ padding: '4px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 6, fontSize: 12, color: '#c2410c', fontWeight: 600 }}>
                              💰 Thế chân: {borrow.book.deposit.toLocaleString('vi-VN')}đ {!isOverdue ? '(sẽ hoàn)' : ''}
                            </span>
                          )}
                          {isOverdue && (
                            <span style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#991b1b', fontWeight: 600 }}>
                              ⚠️ Quá hạn {overdayDays} ngày — phạt ~{estimFine.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tóm tắt & xác nhận */}
        {Object.values(selectedReturns).some(v => v) && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0 }}>✅ Tóm Tắt Trả Sách</h3>
            </div>
            <div style={{ padding: 24 }}>
              {/* Grid số liệu */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Số cuốn trả</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{selectedBorrows.length}</div>
                </div>
                <div style={{ padding: 14, background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>💰 Hoàn thế chân</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{totalRefundAmount.toLocaleString('vi-VN')}đ</div>
                </div>
                {estimatedFine > 0 && (
                  <div style={{ padding: 14, background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>⚠️ Phạt (ước tính)</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#dc2626' }}>~{estimatedFine.toLocaleString('vi-VN')}đ</div>
                  </div>
                )}
              </div>

              <button onClick={handleReturnBooks} disabled={returning} className="btn btn-primary" style={{ width: '100%', fontSize: 15 }}>
                <FiCheck /> {returning ? 'Đang xử lý...' : `Xác Nhận Trả ${selectedBorrows.length} Cuốn`}
              </button>
            </div>
          </div>
        )}

        {/* Hướng dẫn */}
        {!studentInfo && (
          <div style={{ padding: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>💡 Cách sử dụng:</div>
            <ul style={{ margin: '0 0 0 20px', paddingLeft: 0 }}>
              <li>Nhập mã sinh viên (VD: SV001) để xem tất cả sách đang mượn</li>
              <li>Hoặc quét mã ĐKCB sách (VD: LIB-2025-00001) để tìm nhanh</li>
              <li>Tích chọn các cuốn muốn trả — hệ thống tính sẵn tiền hoàn & phạt</li>
              <li>Sau khi trả thành công, bấm "In Bill" để in biên lai 80mm</li>
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
