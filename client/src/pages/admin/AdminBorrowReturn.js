/**
 * AdminBorrowReturn.js
 * Trang gộp Mượn Sách + Trả Sách vào 2 tab
 * Route: /admin/borrow-return
 * Menu sidebar: "Mượn / Trả sách" → accordion → 2 sub-links
 */
import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiSearch, FiX, FiPrinter, FiArrowRight, FiCheck, FiArrowLeft,
  FiCornerDownLeft, FiAlertTriangle, FiUser, FiBook,
} from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/* ── Làm tròn tiền thế chân lên bội số 5 gần nhất ── */
const roundDep = (n) => n > 0 ? Math.ceil(n / 5) * 5 : 0;
const fmtMoney = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

/* ══════════════════════ IN BILL 80mm ══════════════════════ */
function printBill({ student, books, borrows, borrowType, librarian }) {
  const now = new Date();
  const items = borrows.length > 0
    ? borrows.map((b, i) => ({ copy_code: b.copy?.copy_code || books[i]?.copy_code || '', deposit: b.book?.deposit ?? books[i]?.deposit ?? 0 }))
    : books.map(b => ({ copy_code: b.copy_code || '', deposit: b.deposit || 0 }));
  const totalDep = items.reduce((s, i) => s + roundDep(i.deposit), 0);

  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:11px;width:80mm;padding:3mm;background:#fff;color:#000}.center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:3px 0}.line2{border-top:2px solid #000;margin:3px 0}.row{display:flex;justify-content:space-between;margin:2px 0;font-size:10px}.code{font-family:'Courier New',monospace;font-size:12px;font-weight:bold;margin:2px 0}.total{background:#f5f5f5;padding:6px;margin:4px 0;border:1px solid #000;text-align:center;font-size:18px;font-weight:bold}@media print{body{width:80mm}@page{margin:0;size:80mm auto}}</style></head>
<body>
<div class="center bold" style="font-size:14px">PHIẾU MƯỢN SÁCH</div>
<div class="line2"></div>
<div class="row"><span>Sinh viên:</span><span class="bold">${student?.name || ''}</span></div>
<div class="row"><span>Mã SV:</span><span class="bold">${student?.student_id || '—'}</span></div>
<div class="row"><span>Thủ thư:</span><span class="bold">${librarian?.name || ''}</span></div>
<div class="row"><span>Ngày:</span><span>${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}</span></div>
<div class="line"></div>
<div class="bold" style="font-size:10px;margin-bottom:2px">MÃ ĐKCB (${items.length} cuốn):</div>
${items.map((it, i) => `<div class="code">${i+1}. ${it.copy_code || 'N/A'}${it.deposit > 0 ? ' — ' + roundDep(it.deposit).toLocaleString('vi-VN') + 'đ' : ''}</div>`).join('')}
<div class="line2"></div>
<div style="font-size:10px;margin-bottom:2px">TỔNG THẾ CHÂN:</div>
<div class="total">${totalDep.toLocaleString('vi-VN')} đ</div>
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`;
  const w = window.open('','_blank','width=350,height=600');
  if (!w) { toast.error('Trình duyệt chặn popup!'); return; }
  w.document.write(html);
  w.document.close();
}

/* ══════════════════════ TAB MƯỢN SÁCH ══════════════════════ */
function BorrowTab() {
  const { user: librarian } = useAuth();
  const [step, setStep] = useState(1);
  const [borrowType, setBorrowType] = useState('home');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentList, setStudentList]     = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookList, setBookList]     = useState([]);
  const [foundCopy, setFoundCopy]   = useState(null);
  const [codeInput, setCodeInput]   = useState('');
  const codeDebounce = useRef(null);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [saving, setSaving]               = useState(false);
  const [createdBorrows, setCreatedBorrows] = useState([]);

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
                id: prev.length + 1, title: copy.book?.title, author: copy.book?.author,
                copy_code: copy.copy_code, book_id: copy.book?.id, deposit: copy.book?.deposit || 0,
              }]);
              toast.success(`Đã thêm sách (${selectedBooks.length + 1}/4)`);
              setCodeInput(''); setFoundCopy(null);
            }, 300);
          } else { toast.error('Đã đủ 4 cuốn!'); }
        } else { setFoundCopy(null); toast.error('Mã sách không tồn tại'); }
      } catch (err) { setFoundCopy(null); toast.error(err.response?.data?.message || 'Lỗi tìm sách'); }
    }, 500);
  };

  const handleSearchBookName = async (val) => {
    setBookSearch(val);
    if (!val.trim()) { setBookList([]); return; }
    try {
      const res = await api.get('/books', { params: { search: val, limit: 10 } });
      setBookList(res.data.data || []);
    } catch { setBookList([]); }
  };

  const handleCreateBorrow = async () => {
    if (!selectedStudent) { toast.error('Chọn sinh viên trước'); return; }
    if (!selectedBooks.length) { toast.error('Chọn ít nhất 1 sách'); return; }
    setSaving(true);
    try {
      const results = [];
      for (const b of selectedBooks) {
        const res = await api.post('/borrows', { user_id: selectedStudent.id, borrow_type: borrowType, book_id: b.book_id, ...(b.copy_code ? { copy_code: b.copy_code } : {}) });
        results.push(res.data.data);
      }
      setCreatedBorrows(results);
      toast.success(`Tạo mượn ${results.length} sách thành công!`);
      setStep(4);
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi tạo mượn'); }
    finally { setSaving(false); }
  };

  const handleReset = () => {
    setStep(1); setSelectedStudent(null); setSelectedBooks([]);
    setFoundCopy(null); setCodeInput(''); setStudentSearch('');
    setBookSearch(''); setCreatedBorrows([]);
  };

  const totalDep = selectedBooks.reduce((s, b) => s + roundDep(b.deposit || 0), 0);

  /* ── STEP INDICATOR ── */
  const steps = ['Chọn SV', 'Chọn Sách', 'Xác nhận', 'Hoàn thành'];

  return (
    <div>
      {/* Step progress */}
      <div style={{ display:'flex', gap:0, marginBottom:28, background:'#fff',
        borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden', padding:'16px 24px',
        alignItems:'center', justifyContent:'center', gap:8 }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:'50%', fontWeight:700, fontSize:13,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: step > i+1 ? '#16a34a' : step === i+1 ? '#2563eb' : '#e2e8f0',
                color: step >= i+1 ? '#fff' : '#94a3b8', flexShrink:0 }}>
                {step > i+1 ? <FiCheck size={14}/> : i+1}
              </div>
              <span style={{ fontSize:13, fontWeight: step === i+1 ? 700 : 400,
                color: step === i+1 ? '#2563eb' : step > i+1 ? '#16a34a' : '#94a3b8' }}>
                {s}
              </span>
            </div>
            {i < 3 && <FiArrowRight size={14} color="#cbd5e1" style={{ flexShrink:0 }}/>}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'linear-gradient(135deg,#f8fafc,#fff)',
              display:'flex', alignItems:'center', gap:8 }}>
              <FiUser size={15} color="#2563eb"/>
              <span style={{ fontWeight:700, fontSize:15 }}>Tìm sinh viên</span>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ position:'relative', marginBottom:14 }}>
                <FiSearch style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
                <input style={{ width:'100%', padding:'10px 12px 10px 36px', border:'1px solid #e2e8f0',
                  borderRadius:8, fontSize:14, outline:'none' }}
                  placeholder="Tên, email, mã SV..."
                  value={studentSearch} onChange={e => handleSearchStudent(e.target.value)} />
              </div>
              {searchLoading ? <div style={{ textAlign:'center', padding:16, color:'#94a3b8' }}>Đang tìm...</div>
                : studentList.map(sv => (
                  <div key={sv.id} onClick={() => { setSelectedStudent(sv); setStep(2); }}
                    style={{ padding:'10px 14px', borderRadius:8, cursor:'pointer', border:'1px solid #e2e8f0',
                      marginBottom:8, transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.borderColor='#2563eb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background=''; e.currentTarget.style.borderColor='#e2e8f0'; }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{sv.name}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{sv.student_id} · {sv.email}</div>
                  </div>
                ))}
            </div>
          </div>

          <div style={{ background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', borderRadius:12,
            border:'1px solid #ddd6fe', padding:28, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', textAlign:'center' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>👤</div>
            <div style={{ fontWeight:700, fontSize:16, color:'#1e293b', marginBottom:8 }}>
              Chọn sinh viên để tiếp tục
            </div>
            <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
              Tìm sinh viên theo tên, email<br/>hoặc mã sinh viên
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div>
          {/* Selected student bar */}
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10,
            padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center',
            justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'#16a34a', color:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                {selectedStudent?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:14 }}>{selectedStudent?.name}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{selectedStudent?.student_id}</div>
              </div>
            </div>
            <button onClick={() => { setSelectedStudent(null); setStep(1); }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', padding:4 }}>
              <FiX size={16}/>
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Input */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'linear-gradient(135deg,#f8fafc,#fff)', display:'flex', alignItems:'center', gap:8 }}>
                <FiBook size={15} color="#2563eb"/>
                <span style={{ fontWeight:700, fontSize:15 }}>Thêm sách</span>
                <span style={{ marginLeft:'auto', fontSize:12, background: selectedBooks.length >= 4 ? '#fef2f2' : '#eff6ff', color: selectedBooks.length >= 4 ? '#dc2626' : '#2563eb', padding:'2px 8px', borderRadius:10, fontWeight:600 }}>
                  {selectedBooks.length}/4 cuốn
                </span>
              </div>
              <div style={{ padding:20 }}>
                {/* Hình thức */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>Hình thức</div>
                  <div style={{ display:'flex', gap:8 }}>
                    {[{id:'home',label:'🏠 Về nhà'},{id:'onsite',label:'🏛 Tại chỗ'}].map(t => (
                      <button key={t.id} onClick={() => setBorrowType(t.id)}
                        style={{ flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600,
                          border: borrowType===t.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: borrowType===t.id ? '#eff6ff' : '#fff',
                          color: borrowType===t.id ? '#2563eb' : '#374151' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mã ĐKCB */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Mã ĐKCB</div>
                  <input style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8,
                    fontSize:14, fontFamily:'monospace', fontWeight:600, outline:'none',
                    opacity: selectedBooks.length >= 4 ? 0.5 : 1 }}
                    placeholder="LIB-2025-00001"
                    value={codeInput} onChange={e => handleSearchBookCode(e.target.value)}
                    disabled={selectedBooks.length >= 4} />
                </div>

                {/* Tên sách */}
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.5, marginBottom:6 }}>Hoặc tìm theo tên</div>
                  <input style={{ width:'100%', padding:'9px 12px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:14, outline:'none', opacity: selectedBooks.length >= 4 ? 0.5 : 1 }}
                    placeholder="Nhập tên sách..."
                    value={bookSearch} onChange={e => handleSearchBookName(e.target.value)}
                    disabled={selectedBooks.length >= 4} />
                  {bookList.map(b => (
                    <div key={b.id} onClick={() => {
                      if (selectedBooks.length < 4) {
                        setSelectedBooks(prev => [...prev, { id: prev.length+1, title:b.title, author:b.author, copy_code:null, book_id:b.id, deposit:b.deposit||0 }]);
                        setBookSearch(''); setBookList([]);
                        toast.success('Đã thêm sách');
                      }
                    }} style={{ padding:'8px 12px', borderBottom:'1px solid #f1f5f9', cursor:'pointer', fontSize:13 }}
                      onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background=''}>
                      <div style={{ fontWeight:600 }}>{b.title}</div>
                      <div style={{ fontSize:11, color:'#64748b' }}>{b.author}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected books list */}
            <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'linear-gradient(135deg,#f8fafc,#fff)' }}>
                <span style={{ fontWeight:700, fontSize:15 }}>Sách đã chọn</span>
              </div>
              <div style={{ padding:20, minHeight:200 }}>
                {selectedBooks.length === 0
                  ? <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8', fontSize:13 }}>
                      Chưa có sách nào<br/>Nhập mã ĐKCB hoặc tìm theo tên
                    </div>
                  : selectedBooks.map((b, idx) => (
                    <div key={idx} style={{ padding:'10px 12px', border:'1px solid #e2e8f0', borderRadius:8, marginBottom:8 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13, marginBottom:2 }}>{idx+1}. {b.title}</div>
                          <div style={{ fontSize:11, color:'#64748b' }}>{b.author}</div>
                          {b.copy_code && <div style={{ fontSize:11, color:'#2563eb', fontFamily:'monospace', fontWeight:600, marginTop:2 }}>{b.copy_code}</div>}
                          {b.deposit > 0 && <div style={{ fontSize:11, color:'#d97706', marginTop:2 }}>💰 {fmtMoney(roundDep(b.deposit))}</div>}
                        </div>
                        <button onClick={() => setSelectedBooks(selectedBooks.filter((_,i)=>i!==idx))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#dc2626', padding:'0 4px', flexShrink:0 }}>✕</button>
                      </div>
                    </div>
                  ))}

                {selectedBooks.length > 0 && (
                  <>
                    {totalDep > 0 && (
                      <div style={{ marginTop:12, padding:'10px 14px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8 }}>
                        <div style={{ fontSize:11, color:'#92400e', marginBottom:2 }}>💰 Tổng thế chân</div>
                        <div style={{ fontSize:20, fontWeight:900, color:'#b45309' }}>{fmtMoney(totalDep)}</div>
                      </div>
                    )}
                    <button onClick={() => setStep(3)} className="btn btn-primary" style={{ width:'100%', marginTop:12, justifyContent:'center' }}>
                      Tiếp tục xác nhận <FiArrowRight size={14}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', fontWeight:700, fontSize:16 }}>
              ✅ Xác nhận mượn sách
            </div>
            <div style={{ padding:20 }}>
              <div style={{ background:'#f8fafc', borderRadius:8, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:6, fontWeight:700, textTransform:'uppercase' }}>Sinh viên</div>
                <div style={{ fontWeight:700, fontSize:15 }}>{selectedStudent?.name}</div>
                <div style={{ fontSize:12, color:'#64748b' }}>{selectedStudent?.student_id} · {selectedStudent?.email}</div>
              </div>

              <div style={{ background:'#f8fafc', borderRadius:8, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:8, fontWeight:700, textTransform:'uppercase' }}>
                  Sách mượn ({selectedBooks.length})
                </div>
                {selectedBooks.map((b, i) => (
                  <div key={i} style={{ paddingBottom:8, marginBottom:8, borderBottom: i < selectedBooks.length-1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{i+1}. {b.title}</div>
                    {b.copy_code && <div style={{ fontSize:11, color:'#2563eb', fontFamily:'monospace' }}>ĐKCB: {b.copy_code}</div>}
                    {b.deposit > 0 && <div style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>💰 {fmtMoney(roundDep(b.deposit))}</div>}
                  </div>
                ))}
              </div>

              <div style={{ background:'#f8fafc', borderRadius:8, padding:'12px 14px', marginBottom:14 }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:4, fontWeight:700, textTransform:'uppercase' }}>Hình thức</div>
                <div style={{ fontWeight:700 }}>{borrowType==='home' ? '🏠 Mượn về nhà' : '🏛 Tại chỗ'}</div>
              </div>

              {totalDep > 0 && (
                <div style={{ background:'#fff7ed', border:'2px solid #fed7aa', borderRadius:10, padding:'14px 16px', marginBottom:18 }}>
                  <div style={{ fontSize:12, color:'#92400e', marginBottom:4 }}>💰 Tổng tiền thế chân cần thu</div>
                  <div style={{ fontSize:28, fontWeight:900, color:'#b45309' }}>{fmtMoney(totalDep)}</div>
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setStep(2)} className="btn btn-secondary" style={{ flex:1 }}>
                  <FiArrowLeft size={14}/> Quay lại
                </button>
                <button onClick={handleCreateBorrow} disabled={saving} className="btn btn-primary" style={{ flex:2, justifyContent:'center' }}>
                  <FiPrinter size={14}/> {saving ? 'Đang xử lý...' : 'Xác nhận & In bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 ── */}
      {step === 4 && createdBorrows.length > 0 && (
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'20px', marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#16a34a' }}>Mượn sách thành công!</div>
            <div style={{ fontSize:13, color:'#16a34a', marginTop:4 }}>{createdBorrows.length} cuốn · {selectedStudent?.name}</div>
          </div>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', padding:20, marginBottom:16 }}>
            {createdBorrows.map((b, i) => (
              <div key={b.id} style={{ padding:'10px 0', borderBottom: i < createdBorrows.length-1 ? '1px solid #f1f5f9':'none' }}>
                <div style={{ fontWeight:600, fontSize:13 }}>{i+1}. {b.book?.title}</div>
                {b.copy?.copy_code && <div style={{ fontSize:11, color:'#2563eb', fontFamily:'monospace' }}>ĐKCB: {b.copy.copy_code}</div>}
                {b.book?.deposit > 0 && <div style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>💰 {fmtMoney(roundDep(b.book.deposit))}</div>}
              </div>
            ))}
            {createdBorrows.reduce((s,b) => s + roundDep(b.book?.deposit||0), 0) > 0 && (
              <div style={{ marginTop:12, padding:'10px 14px', background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:8 }}>
                <div style={{ fontSize:11, color:'#92400e' }}>Tổng đã thu</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#b45309' }}>
                  {fmtMoney(createdBorrows.reduce((s,b)=>s+roundDep(b.book?.deposit||0),0))}
                </div>
              </div>
            )}
          </div>
          <button onClick={() => printBill({ student:selectedStudent, books:selectedBooks, borrows:createdBorrows, borrowType, librarian })}
            className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:10, fontSize:15 }}>
            <FiPrinter size={14}/> In Bill (80mm)
          </button>
          <button onClick={handleReset} className="btn btn-secondary" style={{ width:'100%', justifyContent:'center' }}>
            ➕ Mượn sách mới
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ TAB TRẢ SÁCH ══════════════════════ */
function ReturnTab() {
  const [searchInput, setSearchInput]     = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [studentInfo, setStudentInfo]     = useState(null);
  const [borrows, setBorrows]             = useState([]);
  const [selected, setSelected]           = useState({});
  const [returning, setReturning]         = useState(false);
  const debounce = useRef(null);

  const handleSearch = (val) => {
    setSearchInput(val);
    clearTimeout(debounce.current);
    if (!val.trim()) { setStudentInfo(null); setBorrows([]); setSelected({}); return; }
    debounce.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const uRes = await api.get('/users', { params: { search: val, role:'user', limit:1 } });
        const users = uRes.data.data || [];
        if (!users.length) { setStudentInfo(null); setBorrows([]); toast.error('Không tìm thấy sinh viên'); return; }
        const u = users[0];
        setStudentInfo(u);
        const bRes = await api.get('/borrows', { params: { user_id: u.id, status:'borrowed', limit:20 } });
        const overRes = await api.get('/borrows', { params: { user_id: u.id, status:'overdue', limit:20 } });
        const all = [...(bRes.data.data||[]), ...(overRes.data.data||[])];
        setBorrows(all);
        const sel = {};
        all.forEach(b => { sel[b.id] = true; });
        setSelected(sel);
      } catch { toast.error('Lỗi tìm kiếm'); }
      finally { setSearchLoading(false); }
    }, 500);
  };

  const handleReturn = async () => {
    const ids = Object.entries(selected).filter(([,v])=>v).map(([k])=>k);
    if (!ids.length) { toast.error('Chọn ít nhất 1 phiếu'); return; }
    setReturning(true);
    try {
      let ok = 0, fined = 0;
      for (const id of ids) {
        const res = await api.put(`/borrows/${id}/return`);
        if (res.data.fine) fined++;
        ok++;
      }
      toast.success(`Đã trả ${ok} sách${fined > 0 ? ` · ${fined} phiếu phạt` : ''}`);
      // Reload
      const bRes = await api.get('/borrows', { params: { user_id: studentInfo.id, status:'borrowed', limit:20 } });
      const overRes = await api.get('/borrows', { params: { user_id: studentInfo.id, status:'overdue', limit:20 } });
      const all = [...(bRes.data.data||[]), ...(overRes.data.data||[])];
      setBorrows(all);
      setSelected({});
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi trả sách'); }
    finally { setReturning(false); }
  };

  const today = new Date();
  const selectedIds = Object.entries(selected).filter(([,v])=>v).map(([k])=>k);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'400px 1fr', gap:20, alignItems:'start' }}>
      {/* Search panel */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #e2e8f0', background:'linear-gradient(135deg,#f8fafc,#fff)',
          display:'flex', alignItems:'center', gap:8 }}>
          <FiCornerDownLeft size={15} color="#16a34a"/>
          <span style={{ fontWeight:700, fontSize:15 }}>Tìm sinh viên trả sách</span>
        </div>
        <div style={{ padding:20 }}>
          <div style={{ position:'relative', marginBottom:14 }}>
            <FiSearch style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
            <input style={{ width:'100%', padding:'10px 12px 10px 36px', border:'1px solid #e2e8f0',
              borderRadius:8, fontSize:14, outline:'none' }}
              placeholder="Tên, email, mã SV..."
              value={searchInput} onChange={e => handleSearch(e.target.value)} />
          </div>
          {searchLoading && <div style={{ textAlign:'center', padding:14, color:'#94a3b8' }}>Đang tìm...</div>}
          {studentInfo && (
            <div style={{ padding:'12px 14px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>{studentInfo.name}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>{studentInfo.student_id} · {studentInfo.email}</div>
              <div style={{ marginTop:8, display:'flex', gap:8 }}>
                <div style={{ background:'#fff', border:'1px solid #bbf7d0', borderRadius:6, padding:'6px 10px', textAlign:'center', flex:1 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#16a34a' }}>{borrows.length}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>đang mượn</div>
                </div>
                <div style={{ background:'#fff', border:'1px solid #fecaca', borderRadius:6, padding:'6px 10px', textAlign:'center', flex:1 }}>
                  <div style={{ fontSize:20, fontWeight:800, color:'#dc2626' }}>
                    {borrows.filter(b=>b.status==='overdue').length}
                  </div>
                  <div style={{ fontSize:11, color:'#64748b' }}>quá hạn</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Borrow list */}
      {studentInfo && borrows.length > 0 ? (
        <div>
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:14 }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #e2e8f0',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:15 }}>Phiếu mượn ({borrows.length})</span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { const s={}; borrows.forEach(b=>{s[b.id]=true}); setSelected(s); }}
                  style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', background:'#f8fafc' }}>
                  Chọn tất cả
                </button>
                <button onClick={() => setSelected({})}
                  style={{ fontSize:12, padding:'4px 10px', borderRadius:6, border:'1px solid #e2e8f0', cursor:'pointer', background:'#f8fafc' }}>
                  Bỏ chọn
                </button>
              </div>
            </div>
            <div style={{ padding:'12px 20px' }}>
              {borrows.map(b => {
                const isOverdue = b.status === 'overdue';
                const days = Math.ceil((today - new Date(b.due_date)) / 86400000);
                return (
                  <div key={b.id} onClick={() => setSelected(s => ({...s, [b.id]: !s[b.id]}))}
                    style={{ padding:'12px 14px', borderRadius:10, marginBottom:8, cursor:'pointer',
                      border: selected[b.id] ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      background: selected[b.id] ? '#eff6ff' : isOverdue ? '#fff9f9' : '#fff',
                      transition:'all .15s' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                      <div style={{ width:20, height:20, borderRadius:4, border: selected[b.id] ? '2px solid #2563eb' : '2px solid #e2e8f0',
                        background: selected[b.id] ? '#2563eb' : '#fff', display:'flex', alignItems:'center',
                        justifyContent:'center', flexShrink:0, marginTop:2 }}>
                        {selected[b.id] && <FiCheck size={12} color="#fff"/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{b.book?.title}</div>
                        <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{b.book?.author}</div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {b.copy?.copy_code && (
                            <span style={{ fontSize:10, background:'#eff6ff', color:'#2563eb', padding:'1px 7px', borderRadius:8, fontFamily:'monospace', fontWeight:700 }}>
                              {b.copy.copy_code}
                            </span>
                          )}
                          <span style={{ fontSize:10, padding:'1px 7px', borderRadius:8, fontWeight:600,
                            background: isOverdue ? '#fef2f2' : '#f0fdf4',
                            color: isOverdue ? '#dc2626' : '#16a34a' }}>
                            {isOverdue ? `⚠ Trễ ${days} ngày` : `Hạn: ${new Date(b.due_date).toLocaleDateString('vi-VN')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleReturn} disabled={returning || !selectedIds.length}
            className="btn btn-success" style={{ width:'100%', justifyContent:'center', fontSize:15, padding:'12px 0' }}>
            <FiCornerDownLeft size={15}/>
            {returning ? 'Đang xử lý...' : `Xác nhận trả ${selectedIds.length} phiếu`}
          </button>
        </div>
      ) : studentInfo && borrows.length === 0 ? (
        <div style={{ background:'#f0fdf4', borderRadius:12, border:'1px solid #bbf7d0',
          padding:40, textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:10 }}>✅</div>
          <div style={{ fontSize:16, fontWeight:700, color:'#16a34a' }}>Không có sách đang mượn</div>
          <div style={{ fontSize:13, color:'#64748b', marginTop:6 }}>{studentInfo.name} đã trả hết sách</div>
        </div>
      ) : (
        <div style={{ background:'linear-gradient(135deg,#f0fdf4,#fff)', borderRadius:12,
          border:'1px solid #bbf7d0', padding:40, textAlign:'center' }}>
          <div style={{ fontSize:52, marginBottom:12 }}>📥</div>
          <div style={{ fontWeight:700, fontSize:16, color:'#1e293b', marginBottom:6 }}>Tìm sinh viên để trả sách</div>
          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6 }}>
            Nhập tên, email hoặc mã SV<br/>để tìm phiếu mượn cần trả
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ TRANG CHÍNH ══════════════════════ */
export default function AdminBorrowReturn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'return' ? 'return' : 'borrow';

  const setTab = (tab) => {
    if (tab === 'borrow') setSearchParams({});
    else setSearchParams({ tab: 'return' });
  };

  return (
    <Layout>
      {/* Page header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'#1e293b', marginBottom:4 }}>
          🔄 Mượn / Trả Sách
        </h1>
        <p style={{ color:'#64748b', fontSize:14 }}>Xử lý phiếu mượn và trả sách tại quầy thư viện</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:24, background:'#fff',
        borderRadius:12, border:'1px solid #e2e8f0', overflow:'hidden',
        boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        {[
          { key:'borrow', icon:'📤', label:'Mượn Sách', color:'#2563eb', bg:'#eff6ff' },
          { key:'return', icon:'📥', label:'Trả Sách',  color:'#16a34a', bg:'#f0fdf4' },
        ].map((t, i) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'16px 24px', border:'none', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:10,
              fontSize:15, fontWeight: activeTab===t.key ? 800 : 500, transition:'all .2s',
              background: activeTab===t.key ? t.bg : '#fff',
              color: activeTab===t.key ? t.color : '#64748b',
              borderBottom: activeTab===t.key ? `3px solid ${t.color}` : '3px solid transparent',
              borderRight: i === 0 ? '1px solid #e2e8f0' : 'none',
            }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            {t.label}
            {activeTab===t.key && (
              <span style={{ background:t.color, color:'#fff', borderRadius:'50%',
                width:20, height:20, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:10, fontWeight:800 }}>✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'borrow' ? <BorrowTab /> : <ReturnTab />}
    </Layout>
  );
}
