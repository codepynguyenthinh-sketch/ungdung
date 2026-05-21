import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiX, FiPrinter, FiArrowRight, FiCheck, FiArrowLeft } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── In bill 80mm trực tiếp trong trình duyệt ────────────────────────────────
function printBill({ student, books, borrows, borrowType, librarian }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN');
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const totalDeposit = books.reduce((s, b) => s + (b.deposit || 0), 0);

  // Ghép dữ liệu từ borrows (sau khi tạo) và books (trước khi tạo)
  const items = borrows.length > 0 ? borrows.map((borrow, i) => ({
    copy_code: borrow.copy?.copy_code || books[i]?.copy_code || '',
    deposit: borrow.book?.deposit ?? books[i]?.deposit ?? 0,
  })) : books.map(b => ({
    copy_code: b.copy_code || '',
    deposit: b.deposit || 0,
  }));

  const billHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Biên lai mượn sách</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 11px;
    width: 80mm;
    padding: 3mm;
    background: #fff;
    color: #000;
  }
  .center { text-align: center; }
  .bold   { font-weight: bold; }
  .line   { border-top: 1px dashed #000; margin: 2px 0; }
  .line-solid { border-top: 2px solid #000; margin: 2px 0; }
  .row    { display: flex; justify-content: space-between; margin: 1px 0; font-size: 10px; }
  .code-item { margin: 1px 0; font-family: 'Courier New', monospace; font-size: 11px; font-weight: bold; }
  .total-box  { background: #f5f5f5; padding: 4px; margin: 4px 0; border: 1px solid #000; }
  .total-amount { font-size: 16px; font-weight: bold; text-align: center; margin-top: 2px; }
  @media print {
    body { width: 80mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head>
<body>

<div class="center bold" style="font-size:13px;">PHIẾU MƯỢN SÁCH</div>
<div class="line-solid"></div>

<div class="row"><span>Tên SV:</span><span class="bold">${student?.name || ''}</span></div>
<div class="row"><span>Mã SV:</span><span class="bold">${student?.student_id || '—'}</span></div>
<div class="row"><span>Thủ thư:</span><span class="bold">${librarian?.name || ''}</span></div>

<div class="line"></div>
<div class="bold" style="font-size:10px; margin-bottom:2px;">MÃ ĐKCB (${items.length}):</div>

${items.map((item, i) => `<div class="code-item">${i + 1}. ${item.copy_code || 'N/A'}</div>`).join('')}

<div class="line-solid"></div>

<div class="total-box">
  <div class="total-amount">${totalDeposit.toLocaleString('vi-VN')} đ</div>
</div>

<div style="text-align:center; font-size:9px; margin-top:2px;">${dateStr} ${timeStr}</div>

<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=350,height=600,scrollbars=yes');
  if (!w) {
    const blob = new Blob([billHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const fallbackWindow = window.open(url, '_blank');
    if (!fallbackWindow) {
      toast.error('Trình duyệt chặn popup! Vui lòng cho phép popup hoặc tải file HTML để in.');
      return;
    }
    return;
  }
  w.document.write(billHtml);
  w.document.close();
}

// ─── Component chính ──────────────────────────────────────────────────────────
export default function AdminBorrow() {
  const { user: librarian } = useAuth();
  const [step, setStep] = useState(1);
  const [borrowType, setBorrowType] = useState('home');

  const [studentSearch, setStudentSearch] = useState('');
  const [studentList, setStudentList]     = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [bookSearch, setBookSearch] = useState('');
  const [bookList, setBookList]     = useState([]);
  const [selectedBook, setSelectedBook]   = useState(null);
  const [foundCopy, setFoundCopy]         = useState(null);
  const [codeInput, setCodeInput]         = useState('');
  const codeDebounce = useRef(null);

  const [selectedBooks, setSelectedBooks] = useState([]);
  const [saving, setSaving]               = useState(false);
  const [createdBorrows, setCreatedBorrows] = useState([]);

  // ── Tìm sinh viên ──
  const handleSearchStudent = async (val) => {
    setStudentSearch(val);
    if (!val.trim()) { setStudentList([]); return; }
    setSearchLoading(true);
    try {
      const res = await api.get('/users', { params: { search: val, role: 'user', limit: 10 } });
      setStudentList(res.data.data || []);
    } catch { setStudentList([]); }
    finally { setSearchLoading(false); }
  };

  // ── Tìm sách theo mã ĐKCB ──
  const handleSearchBookCode = (val) => {
    setCodeInput(val);
    clearTimeout(codeDebounce.current);
    if (!val.trim()) { setFoundCopy(null); return; }
    codeDebounce.current = setTimeout(async () => {
      try {
        const res = await api.get(`/copies/find/${val}`);
        if (res.data.success) {
          const copy = res.data.data;
          setFoundCopy(copy);
          if (selectedBooks.length < 4) {
            setTimeout(() => {
              setSelectedBooks(prev => [...prev, {
                id: prev.length + 1,
                title: copy.book?.title,
                author: copy.book?.author,
                copy_code: copy.copy_code,
                book_id: copy.book?.id,
                deposit: copy.book?.deposit || 0,
              }]);
              toast.success(`Đã thêm sách (${selectedBooks.length + 1}/4)`);
              setCodeInput('');
              setFoundCopy(null);
            }, 300);
          } else {
            toast.error('Đã đủ 4 cuốn!');
          }
        } else {
          setFoundCopy(null);
          toast.error(res.data.message || 'Mã sách không tồn tại');
        }
      } catch (err) {
        setFoundCopy(null);
        toast.error(err.response?.data?.message || 'Lỗi khi tìm sách bằng mã');
      }
    }, 500);
  };

  // ── Tìm sách theo tên ──
  const handleSearchBookName = async (val) => {
    setBookSearch(val);
    if (!val.trim()) { setBookList([]); return; }
    try {
      const res = await api.get('/books', { params: { search: val, limit: 10 } });
      setBookList(res.data.data || []);
    } catch { setBookList([]); }
  };

  const handleRemoveBook = (index) => setSelectedBooks(selectedBooks.filter((_, i) => i !== index));

  const totalDeposit = selectedBooks.reduce((sum, b) => sum + (b.deposit || 0), 0);

  // ── Tạo mượn ──
  const handleCreateBorrow = async () => {
    if (!selectedStudent) { toast.error('Vui lòng chọn sinh viên'); return; }
    if (selectedBooks.length === 0) { toast.error('Vui lòng chọn ít nhất 1 sách'); return; }
    setSaving(true);
    try {
      const results = [];
      for (const book of selectedBooks) {
        const payload = {
          user_id: selectedStudent.id,
          borrow_type: borrowType,
          book_id: book.book_id,
          ...(book.copy_code ? { copy_code: book.copy_code } : {}),
        };
        const res = await api.post('/borrows', payload);
        results.push(res.data.data);
      }
      setCreatedBorrows(results);
      toast.success(`Tạo mượn ${results.length} sách thành công!`);
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tạo mượn sách');
    } finally { setSaving(false); }
  };

  // ── In bill toàn bộ phiếu mượn ──
  const handlePrintAll = () => {
    printBill({
      student: selectedStudent,
      books: selectedBooks,
      borrows: createdBorrows,
      borrowType,
      librarian,
    });
  };

  const handleReset = () => {
    setStep(1); setSelectedStudent(null); setSelectedBooks([]);
    setSelectedBook(null); setFoundCopy(null); setCodeInput('');
    setStudentSearch(''); setBookSearch(''); setCreatedBorrows([]);
  };

  // ── Styles tái sử dụng ──
  const cardHeader = (text) => (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{text}</h3>
    </div>
  );

  const infoLabel = { fontSize: 12, color: '#64748b', marginBottom: 4 };
  const infoValue = { fontSize: 14, fontWeight: 600 };

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h1 style={{ marginBottom: 20 }}>📤 Mượn Sách</h1>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 30, justifyContent: 'center' }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: step >= s ? '#2563eb' : '#e2e8f0',
                color: step >= s ? 'white' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
              }}>
                {step > s ? <FiCheck /> : s}
              </div>
              <span style={{ fontSize: 13, color: step >= s ? '#2563eb' : '#94a3b8', fontWeight: 500 }}>
                {s === 1 ? 'Chọn SV' : s === 2 ? 'Chọn Sách' : s === 3 ? 'Xác nhận' : 'In bill'}
              </span>
              {s < 4 && <FiArrowRight size={16} color="#cbd5e1" />}
            </div>
          ))}
        </div>

        {/* ── Step 1: Chọn sinh viên ── */}
        {step === 1 && (
          <div className="card">
            {cardHeader('👤 Bước 1: Chọn Sinh Viên')}
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tìm sinh viên</label>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" placeholder="Nhập tên, email hoặc mã SV..."
                    value={studentSearch} onChange={e => handleSearchStudent(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
                </div>
              </div>

              {searchLoading ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Đang tìm...</div>
              ) : studentList.length > 0 ? (
                <div style={{ marginBottom: 20 }}>
                  {studentList.map(student => (
                    <div key={student.id} onClick={() => { setSelectedStudent(student); setStep(2); }}
                      style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: 'white', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#2563eb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{student.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>📧 {student.email}</div>
                      {student.student_id && <div style={{ fontSize: 12, color: '#94a3b8' }}>🆔 {student.student_id}</div>}
                    </div>
                  ))}
                </div>
              ) : studentSearch.trim() ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>Không tìm thấy sinh viên</div>
              ) : null}

              {selectedStudent && (
                <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>✓ Đã chọn: {selectedStudent.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>ID: {selectedStudent.student_id} | {selectedStudent.email}</div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}><FiX size={18} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Chọn sách ── */}
        {step === 2 && (
          <div className="card">
            {cardHeader('📚 Bước 2: Chọn Sách & Hình Thức Mượn')}
            <div style={{ padding: 24 }}>
              {/* Hình thức */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 12, fontWeight: 600, fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hình thức mượn</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[{ id: 'home', label: '🏠 Mượn Về Nhà', desc: 'Mang sách về nhà' }, { id: 'onsite', label: '🏛️ Mượn Tại Chỗ', desc: 'Đọc tại thư viện' }].map(t => (
                    <div key={t.id} onClick={() => setBorrowType(t.id)} style={{ padding: 16, border: borrowType === t.id ? '2px solid #2563eb' : '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: borrowType === t.id ? '#eff6ff' : 'white', transition: 'all 0.2s' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nhập mã ĐKCB */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📖 Nhập mã ĐKCB (tối đa 4 cuốn)</label>
                <input type="text" placeholder="VD: LIB-2025-00001"
                  value={codeInput} onChange={e => handleSearchBookCode(e.target.value)}
                  disabled={selectedBooks.length >= 4}
                  style={{ width: '100%', padding: '10px 12px', border: selectedBooks.length >= 4 ? '1px solid #fecaca' : '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'monospace', fontWeight: 500, background: selectedBooks.length >= 4 ? '#fef2f2' : 'white' }} />
              </div>

              {foundCopy && (
                <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>✓ {foundCopy.book?.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Mã: {foundCopy.copy_code}</div>
                </div>
              )}

              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, margin: '16px 0' }}>— HOẶC TÌM THEO TÊN —</div>

              {/* Tìm theo tên */}
              <div style={{ marginBottom: 20 }}>
                <input type="text" placeholder="Nhập tên sách..."
                  value={bookSearch} onChange={e => handleSearchBookName(e.target.value)}
                  disabled={selectedBooks.length >= 4}
                  style={{ width: '100%', padding: '10px 12px', border: selectedBooks.length >= 4 ? '1px solid #fecaca' : '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: selectedBooks.length >= 4 ? '#fef2f2' : 'white' }} />
              </div>

              {bookList.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  {bookList.map(book => (
                    <div key={book.id} onClick={() => {
                      if (selectedBooks.length < 4) {
                        setSelectedBooks(prev => [...prev, { id: prev.length + 1, title: book.title, author: book.author, copy_code: null, book_id: book.id, deposit: book.deposit || 0 }]);
                        toast.success(`Đã thêm sách`);
                        setBookSearch(''); setBookList([]);
                      }
                    }}
                      style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, cursor: selectedBooks.length >= 4 ? 'not-allowed' : 'pointer', background: 'white', opacity: selectedBooks.length >= 4 ? 0.5 : 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{book.title}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>Tác giả: {book.author}</div>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginBottom: 16 }}>
                <FiArrowLeft /> Quay lại
              </button>

              {/* Danh sách đã chọn */}
              {selectedBooks.length > 0 && (
                <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#16a34a', textTransform: 'uppercase' }}>
                    ✓ Danh sách sách ({selectedBooks.length}/4)
                  </div>
                  {selectedBooks.map((book, idx) => (
                    <div key={idx} style={{ padding: 12, background: 'white', border: '1px solid #d1fae5', borderRadius: 6, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{idx + 1}. {book.title}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{book.author}</div>
                        {book.copy_code && <div style={{ fontSize: 11, color: '#2563eb', marginTop: 2, fontFamily: 'monospace' }}>ĐKCB: {book.copy_code}</div>}
                        {book.deposit > 0 && <div style={{ fontSize: 11, color: '#d97706', marginTop: 4, fontWeight: 600 }}>Thế chân: {book.deposit.toLocaleString('vi-VN')}đ</div>}
                      </div>
                      <button onClick={() => handleRemoveBook(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '4px 8px' }}>✕</button>
                    </div>
                  ))}

                  {/* Tổng tiền thế chân */}
                  <div style={{ marginTop: 12, padding: '12px 14px', background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#92400e', marginBottom: 4 }}>💰 Tổng tiền thế chân cần thu:</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#b45309' }}>{totalDeposit.toLocaleString('vi-VN')} đồng</div>
                  </div>

                  <button onClick={() => setStep(3)} className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>
                    ✅ Tiếp tục Xác Nhận ({selectedBooks.length} sách)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Xác nhận ── */}
        {step === 3 && (
          <div className="card">
            {cardHeader(`✅ Bước 3: Xác Nhận (${selectedBooks.length} sách)`)}
            <div style={{ padding: 24 }}>
              {/* Sinh viên */}
              <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Sinh viên</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedStudent?.name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Mã SV: {selectedStudent?.student_id}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>{selectedStudent?.email}</div>
              </div>

              {/* Danh sách sách */}
              <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>Danh sách sách ({selectedBooks.length})</div>
                {selectedBooks.map((book, idx) => (
                  <div key={idx} style={{ padding: 12, background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{idx + 1}. {book.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Tác giả: {book.author}</div>
                    {book.copy_code && <div style={{ fontSize: 12, color: '#2563eb', marginTop: 2, fontFamily: 'monospace' }}>ĐKCB: {book.copy_code}</div>}
                    {book.deposit > 0 && <div style={{ fontSize: 12, color: '#d97706', marginTop: 4, fontWeight: 600 }}>💰 Thế chân: {book.deposit.toLocaleString('vi-VN')}đ</div>}
                  </div>
                ))}
              </div>

              {/* Hình thức */}
              <div style={{ marginBottom: 16, padding: 16, background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Hình thức</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{borrowType === 'home' ? '🏠 Mượn Về Nhà' : '🏛️ Mượn Tại Chỗ'}</div>
              </div>

              {/* Tổng tiền */}
              <div style={{ marginBottom: 24, padding: 16, background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#c2410c', marginBottom: 8 }}>💰 Tổng tiền thế chân cần thu</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#b45309' }}>{totalDeposit.toLocaleString('vi-VN')} đồng</div>
                {totalDeposit === 0 && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Không có sách nào thu thế chân</div>}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex: 1 }}><FiArrowLeft /> Quay lại</button>
                <button onClick={handleCreateBorrow} disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  <FiPrinter /> {saving ? 'Đang xử lý...' : 'Xác Nhận & In Bill'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Hoàn thành ── */}
        {step === 4 && createdBorrows.length > 0 && (
          <div className="card">
            {cardHeader(`✅ Hoàn Thành — ${createdBorrows.length} sách`)}
            <div style={{ padding: 24 }}>
              {/* Thành công */}
              <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✓ Mượn sách thành công!</div>
                <div style={{ fontSize: 13, color: '#16a34a' }}>{createdBorrows.length} cuốn sách đã được ghi nhận</div>
              </div>

              {/* Thông tin sinh viên */}
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 20 }}>
                <div><div style={infoLabel}>Sinh viên</div><div style={infoValue}>{selectedStudent?.name}</div></div>
                <div><div style={infoLabel}>Mã SV</div><div style={infoValue}>{selectedStudent?.student_id || '—'}</div></div>
              </div>

              {/* Danh sách phiếu */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10, color: '#64748b', textTransform: 'uppercase' }}>📚 Chi tiết phiếu mượn</div>
                {createdBorrows.map((borrow, idx) => (
                  <div key={borrow.id} style={{ padding: 16, background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{idx + 1}. {borrow.book?.title}</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                      <div><span style={{ color: '#94a3b8' }}>Tác giả: </span>{borrow.book?.author}</div>
                      {borrow.copy?.copy_code && (
                        <div><span style={{ color: '#94a3b8' }}>ĐKCB: </span><span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>{borrow.copy.copy_code}</span></div>
                      )}
                      {borrow.book?.deposit > 0 && (
                        <div><span style={{ color: '#94a3b8' }}>Thế chân: </span><span style={{ fontWeight: 700, color: '#d97706' }}>{borrow.book.deposit.toLocaleString('vi-VN')}đ</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tổng tiền */}
              <div style={{ padding: '14px 18px', background: '#fff7ed', border: '2px solid #fed7aa', borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#92400e', marginBottom: 6 }}>💰 Tổng tiền thế chân đã thu:</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#b45309' }}>
                  {createdBorrows.reduce((s, b) => s + (b.book?.deposit || 0), 0).toLocaleString('vi-VN')} đồng
                </div>
              </div>

              {/* Nút in bill */}
              <button onClick={handlePrintAll} className="btn btn-primary" style={{ width: '100%', marginBottom: 12, fontSize: 15 }}>
                <FiPrinter /> In Bill (80mm) — Tất cả {createdBorrows.length} sách
              </button>

              <button onClick={handleReset} className="btn btn-secondary" style={{ width: '100%' }}>
                ➕ Mượn sách khác
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
