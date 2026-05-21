import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

export default function AdminReturn() {
  const [searchInput, setSearchInput] = useState(''); // mã sinh viên hoặc mã sách
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Thông tin sinh viên
  const [studentInfo, setStudentInfo] = useState(null);
  
  // Danh sách sách sinh viên đang mượn
  const [borrows, setBorrows] = useState([]);
  
  // Lựa chọn các cuốn muốn trả (map borrowId -> true/false)
  const [selectedReturns, setSelectedReturns] = useState({});
  
  const [returning, setReturning] = useState(false);
  const searchDebounce = useRef(null);

  // Tìm kiếm sinh viên bằng mã sinh viên hoặc mã sách
  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(searchDebounce.current);

    if (!val.trim()) {
      setStudentInfo(null);
      setBorrows([]);
      setSelectedReturns({});
      return;
    }

    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        let userId = null;
        let copy = null;

        // Thử tìm bằng mã sách trước
        try {
          const copyRes = await api.get(`/copies/find/${val}`);
          if (copyRes.data.success) {
            copy = copyRes.data.data;
            // Tìm borrow của sách này
            const borrowRes = await api.get('/borrows', { params: { limit: 100, page: 1 } });
            const activeBorrow = borrowRes.data.data?.find(b => 
              b.book_id === copy.book_id && 
              ['borrowed', 'renewed', 'overdue'].includes(b.status)
            );
            if (activeBorrow) {
              userId = activeBorrow.user_id;
            }
          }
        } catch (e) {
          // Không tìm thấy mã sách, thử tìm theo mã sinh viên
        }

        // Nếu không tìm được bằng mã sách, tìm bằng mã sinh viên
        if (!userId) {
          const userRes = await api.get('/users', { 
            params: { search: val, role: 'user', limit: 10 } 
          });
          if (userRes.data.data && userRes.data.data.length > 0) {
            userId = userRes.data.data[0].id;
          }
        }

        if (!userId) {
          toast.error('Không tìm thấy sinh viên hoặc sách');
          setSearchLoading(false);
          return;
        }

        // Lấy thông tin sinh viên
        const userRes = await api.get(`/users/${userId}`);
        setStudentInfo(userRes.data.data);

        // Lấy danh sách sách sinh viên đang mượn
        const borrowRes = await api.get('/borrows', { params: { limit: 100, page: 1 } });
        const studentBorrows = borrowRes.data.data?.filter(b => 
          b.user_id === userId && 
          ['borrowed', 'renewed', 'overdue'].includes(b.status)
        ) || [];

        setBorrows(studentBorrows);
        setSelectedReturns({});
        
        if (studentBorrows.length === 0) {
          toast.info('Sinh viên này không có sách đang mượn');
        }
      } catch (err) {
        toast.error('Lỗi khi tìm kiếm: ' + err.message);
        setStudentInfo(null);
        setBorrows([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  };

  // Toggle chọn/bỏ chọn cuốn sách
  const toggleReturn = (borrowId) => {
    setSelectedReturns(prev => ({
      ...prev,
      [borrowId]: !prev[borrowId]
    }));
  };

  // Tính tổng tiền hoàn cho các cuốn chọn
  const totalRefundAmount = borrows
    .filter(b => selectedReturns[b.id])
    .reduce((sum, b) => sum + (b.book?.deposit || 0), 0);

  // Trả nhiều cuốn sách
  const handleReturnBooks = async () => {
    const selectedBorrowIds = Object.entries(selectedReturns)
      .filter(([_, selected]) => selected)
      .map(([borrowId]) => borrowId);

    if (selectedBorrowIds.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 cuốn sách để trả');
      return;
    }

    setReturning(true);
    try {
      let fineTotal = 0;
      let refundTotal = 0;

      // Trả từng cuốn
      for (const borrowId of selectedBorrowIds) {
        const res = await api.put(`/borrows/${borrowId}/return`);
        if (res.data.fine) {
          fineTotal += res.data.fine.amount;
        }
      }

      refundTotal = totalRefundAmount;

      toast.success(`✓ Trả ${selectedBorrowIds.length} cuốn sách thành công!`);
      
      if (fineTotal > 0) {
        toast.error(
          `💰 Phí phạt: ${fineTotal.toLocaleString('vi-VN')}đ`
        );
      }
      
      if (refundTotal > 0) {
        toast.success(
          `✓ Hoàn tiền thế chân: ${refundTotal.toLocaleString('vi-VN')}đ`
        );
      }

      // Refresh danh sách (but don't let errors ruin the success message)
      try {
        const borrowRes = await api.get('/borrows', { params: { limit: 100, page: 1 } });
        const studentBorrows = borrowRes.data.data?.filter(b => 
          b.user_id === studentInfo.id && 
          ['borrowed', 'renewed', 'overdue'].includes(b.status)
        ) || [];
        setBorrows(studentBorrows);
        setSelectedReturns({});

        if (studentBorrows.length === 0) {
          toast.info('Sinh viên không còn sách đang mượn');
          setStudentInfo(null);
        }
      } catch (refreshErr) {
        console.error('Refresh error:', refreshErr);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi trả sách');
    } finally {
      setReturning(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 30 }}>📥 Trả Sách</h1>

        {/* Tìm kiếm */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: 0 }}>🔍 Tìm Sinh Viên</h3>
          </div>
          <div style={{ padding: 24 }}>
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: 14 }}>
              Nhập mã sinh viên (VD: SV001) hoặc mã bản đăng ký sách (VD: LIB-2025-00001)
            </p>

            <div style={{ position: 'relative', marginBottom: 16 }}>
              <FiSearch style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }} />
              <input
                type="text"
                autoFocus
                placeholder="Mã sinh viên hoặc mã sách..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                disabled={searchLoading}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  border: '2px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 15,
                  fontFamily: 'monospace',
                  fontWeight: 500,
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563eb';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                }}
              />
            </div>

            {searchLoading && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                ⏳ Đang tìm kiếm...
              </div>
            )}
          </div>
        </div>

        {/* Thông tin sinh viên */}
        {studentInfo && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0 }}>👤 Thông Tin Sinh Viên</h3>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tên</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{studentInfo.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Mã SV</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{studentInfo.student_id}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Email</div>
                <div style={{ fontSize: 14 }}>{studentInfo.email}</div>
              </div>
            </div>
          </div>
        )}

        {/* Danh sách sách đang mượn */}
        {borrows.length > 0 && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0 }}>
                📚 Sách Đang Mượn ({borrows.length} cuốn)
              </h3>
            </div>
            <div style={{ padding: 24 }}>
              {borrows.map((borrow, idx) => {
                const isOverdue = new Date() > new Date(borrow.due_date);
                const overdayDays = isOverdue 
                  ? Math.ceil((new Date() - new Date(borrow.due_date)) / (1000 * 60 * 60 * 24))
                  : 0;
                const isSelected = selectedReturns[borrow.id];

                return (
                  <div
                    key={borrow.id}
                    style={{
                      padding: 16,
                      background: isSelected ? '#eff6ff' : 'white',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: 8,
                      marginBottom: 12,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => toggleReturn(borrow.id)}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      {/* Checkbox */}
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        border: '2px solid ' + (isSelected ? '#2563eb' : '#cbd5e1'),
                        background: isSelected ? '#2563eb' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                        flexShrink: 0
                      }}>
                        {isSelected && <FiCheck color="white" size={16} />}
                      </div>

                      {/* Thông tin sách */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: '#1e293b' }}>
                          {idx + 1}. {borrow.book?.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                          Tác giả: {borrow.book?.author}
                        </div>
                        {borrow.copy?.copy_code && (
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                            Mã ĐKCB: {borrow.copy.copy_code}
                          </div>
                        )}

                        {/* Timeline */}
                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', marginBottom: 8 }}>
                          <div>Mượn: {new Date(borrow.borrow_date).toLocaleDateString('vi-VN')}</div>
                          <div>Hạn: {new Date(borrow.due_date).toLocaleDateString('vi-VN')}</div>
                        </div>

                        {/* Tiền thế chân */}
                        {borrow.book?.deposit > 0 && (
                          <div style={{
                            padding: 8,
                            background: '#fff7ed',
                            border: '1px solid #fed7aa',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#c2410c',
                            fontWeight: 600,
                            marginBottom: 8
                          }}>
                            💰 Thế chân: {borrow.book.deposit.toLocaleString('vi-VN')}đ
                            {!isOverdue && <span> (Sẽ hoàn)</span>}
                          </div>
                        )}

                        {/* Quá hạn */}
                        {isOverdue && (
                          <div style={{
                            padding: 8,
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 4,
                            fontSize: 12,
                            color: '#991b1b',
                            fontWeight: 600
                          }}>
                            ⚠️ Quá hạn {overdayDays} ngày
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tóm tắt trả sách */}
        {Object.values(selectedReturns).some(v => v) && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0 }}>✅ Tóm Tắt Trả Sách</h3>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
                  Số cuốn sách sẽ trả
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                  {Object.values(selectedReturns).filter(v => v).length}
                </div>
              </div>

              {totalRefundAmount > 0 && (
                <div style={{
                  padding: 16,
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  marginBottom: 16
                }}>
                  <div style={{ fontSize: 12, color: '#15803d', marginBottom: 8 }}>
                    💰 Tổng tiền thế chân sẽ hoàn lại
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#16a34a' }}>
                    {totalRefundAmount.toLocaleString('vi-VN')}đ
                  </div>
                </div>
              )}

              <button
                onClick={handleReturnBooks}
                disabled={returning}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <FiCheck /> {returning ? 'Đang xử lý...' : 'Xác Nhận Trả Sách'}
              </button>
            </div>
          </div>
        )}

        {/* Gợi ý */}
        {!studentInfo && (
          <div style={{
            padding: 16,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            fontSize: 13,
            color: '#92400e'
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>💡 Cách sử dụng:</div>
            <ul style={{ margin: '0 0 0 20px', paddingLeft: 0 }}>
              <li>Nhập mã sinh viên (VD: SV001) để xem tất cả sách sinh viên đang mượn</li>
              <li>Hoặc quét mã bản đăng ký (VD: LIB-2025-00001) để tìm sinh viên mượn sách đó</li>
              <li>Tích chọn các cuốn muốn trả, hệ thống sẽ tính tổng tiền hoàn lại</li>
              <li>Bấm "Xác Nhận Trả Sách" để hoàn thành</li>
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
