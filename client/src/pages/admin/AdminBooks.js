import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiSearch, FiX, FiList, FiRefreshCw, FiTrash2, FiCopy, FiUpload, FiEye, FiEyeOff, FiFileText, FiDownload } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const EMPTY = {
  title: '', author: '', isbn: '', category_id: '', department_id: '', publisher: '',
  publish_year: '', edition: '', description: '', total_copies: 1,
  location: '', language: 'Tiếng Việt', pages: '', deposit: 0,
  access_level: 'public',
};

const CONDITION_LABEL = { good: '✅ Tốt', worn: '🟡 Cũ', damaged: '🔴 Hỏng', lost: '⚫ Mất' };
const STATUS_LABEL    = { available: ['Có sẵn', '#16a34a'], borrowed: ['Đang mượn', '#2563eb'], reserved: ['Đặt trước', '#d97706'], lost: ['Mất sách', '#dc2626'], maintenance: ['Bảo trì', '#94a3b8'] };

export default function AdminBooks() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [books, setBooks]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [search, setSearch]         = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [saving, setSaving]         = useState(false);

  // PDF states
  const [pdfModal, setPdfModal]       = useState(false);
  const [pdfBook, setPdfBook]         = useState(null);
  const [pdfFile, setPdfFile]         = useState(null);
  const [isPublicPdf, setIsPublicPdf] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // Copy management
  const [copyModal, setCopyModal]         = useState(false);
  const [selectedBook, setSelectedBook]   = useState(null);
  const [copies, setCopies]               = useState([]);
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [addCopyMode, setAddCopyMode]     = useState('auto');  // 'auto' | 'manual'
  const [addQty, setAddQty]               = useState(1);
  const [manualCodes, setManualCodes]     = useState(['']);
  const [previewCodes, setPreviewCodes]   = useState([]);
  const [addingCopy, setAddingCopy]       = useState(false);
  const [editCopy, setEditCopy]           = useState(null);  // { id, condition, note, status }

  // Import/Export
  const [importModal, setImportModal]     = useState(false);
  const [importFile, setImportFile]       = useState(null);
  const [isImporting, setIsImporting]     = useState(false);

  // ── Sách ──
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      const res = await api.get('/books', { params });
      setBooks(res.data.data);
      setTotalPages(res.data.pages);
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { 
    api.get('/categories').then(r => setCategories(r.data.data));
    api.get('/departments').then(r => setDepartments(r.data.data));
  }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit   = (b) => {
    setEditing(b.id);
    setForm({
      title: b.title, author: b.author, isbn: b.isbn || '',
      category_id: b.category?.id || b.category_id || '', department_id: b.department?.id || b.department_id || '', publisher: b.publisher || '',
      publish_year: b.publish_year || '', edition: b.edition || '',
      description: b.description || '', total_copies: b.total_copies,
      location: b.location || '', language: b.language || 'Tiếng Việt',
      pages: b.pages || '', deposit: b.deposit || 0,
      access_level: b.access_level || 'public',
      is_public_pdf: b.is_public_pdf || false,
    });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Convert number fields
      const payload = {
        ...form,
        total_copies: parseInt(form.total_copies) || 1,
        publish_year: form.publish_year ? parseInt(form.publish_year) : null,
        pages: form.pages ? parseInt(form.pages) : null,
        deposit: parseInt(form.deposit) || 0,
        category_id: parseInt(form.category_id),
        department_id: form.department_id ? parseInt(form.department_id) : null,
      };

      let bookId = editing;
      if (editing) {
        await api.put(`/books/${editing}`, payload);
        toast.success('Cập nhật sách thành công');
      } else {
        const res = await api.post('/books', payload);
        bookId = res.data.data.id;
        toast.success('Thêm sách thành công');
      }
      // Upload PDF nếu có chọn file
      if (pdfFile && bookId) {
        const fd = new FormData();
        fd.append('pdf', pdfFile);
        fd.append('is_public_pdf', isPublicPdf);
        await api.post(`/books/${bookId}/pdf`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Upload PDF thành công!');
      }
      setModal(false);
      setPdfFile(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu sách');
    } finally { setSaving(false); }
  };

  const f = (field) => ({ value: form[field], onChange: e => setForm({ ...form, [field]: e.target.value }) });

  const openPdfModal = (b) => { setPdfBook(b); setIsPublicPdf(b.is_public_pdf || false); setPdfFile(null); setPdfModal(true); };

  const handlePdfUpload = async () => {
    if (!pdfFile) return toast.error('Chọn file PDF trước');
    setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append('pdf', pdfFile);
      fd.append('is_public_pdf', isPublicPdf);
      await api.post(`/books/${pdfBook.id}/pdf`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Upload PDF thành công!');
      setPdfModal(false);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi upload PDF');
    } finally { setUploadingPdf(false); }
  };

  const handleDeletePdf = async (book) => {
    if (!window.confirm(`Xóa PDF của "${book.title}"?`)) return;
    try {
      await api.delete(`/books/${book.id}/pdf`);
      toast.success('Đã xóa PDF');
      fetchBooks();
    } catch { toast.error('Lỗi xóa PDF'); }
  };

  const togglePublicPdf = async (book) => {
    try {
      await api.put(`/books/${book.id}`, { is_public_pdf: !book.is_public_pdf });
      toast.success(!book.is_public_pdf ? 'PDF đã mở cho đọc online' : 'PDF chuyển sang chỉ đọc tại thư viện');
      fetchBooks();
    } catch { toast.error('Lỗi cập nhật'); }
  };

  // ── Copies ──
  const openCopyModal = async (book) => {
    setSelectedBook(book);
    setCopyModal(true);
    setAddCopyMode('auto');
    setAddQty(1);
    setManualCodes(['']);
    setEditCopy(null);
    await loadCopies(book.id);
    await loadPreviewCodes(1);
  };

  const loadCopies = async (bookId) => {
    setCopiesLoading(true);
    try {
      const res = await api.get(`/copies/book/${bookId}`);
      setCopies(res.data.data);
    } finally { setCopiesLoading(false); }
  };

  const loadPreviewCodes = async (qty) => {
    try {
      const res = await api.get(`/copies/preview-code?qty=${qty}`);
      setPreviewCodes(res.data.data);
    } catch {}
  };

  const handleQtyChange = async (val) => {
    const n = Math.max(1, Math.min(100, parseInt(val) || 1));
    setAddQty(n);
    setManualCodes(Array.from({ length: n }, (_, i) => manualCodes[i] || ''));
    if (addCopyMode === 'auto') await loadPreviewCodes(n);
  };

  const handleAddCopies = async () => {
    setAddingCopy(true);
    try {
      const payload = { book_id: selectedBook.id, quantity: addQty, condition: 'good' };
      if (addCopyMode === 'manual') {
        const codes = manualCodes.map(c => c.trim()).filter(Boolean);
        if (codes.length !== addQty) { toast.error('Nhập đủ tất cả mã'); return; }
        payload.custom_codes = codes;
      }
      await api.post('/copies', payload);
      toast.success(`Đã thêm ${addQty} bản sao`);
      await loadCopies(selectedBook.id);
      await loadPreviewCodes(addQty);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi thêm bản sao');
    } finally { setAddingCopy(false); }
  };

  const handleUpdateCopy = async () => {
    try {
      await api.put(`/copies/${editCopy.id}`, { condition: editCopy.condition, note: editCopy.note });
      toast.success('Cập nhật bản sao');
      setEditCopy(null);
      await loadCopies(selectedBook.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const handleDeleteCopy = async (copy) => {
    if (!window.confirm(`Xóa bản sao ${copy.copy_code}?`)) return;
    try {
      await api.delete(`/copies/${copy.id}`);
      toast.success('Đã xóa bản sao');
      await loadCopies(selectedBook.id);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa');
    }
  };

  const countByStatus = (status) => copies.filter(c => c.status === status).length;

  // Export/Import
  const handleExportBooks = async () => {
    try {
      const response = await api.get('/books/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `books-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Tải xuống file sách thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tải xuống file');
    }
  };

  const handleImportBooks = async () => {
    if (!importFile) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }
    
    setIsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const response = await api.post('/books/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      toast.success(`✅ Import thành công! Đã thêm ${response.data.data?.added || 0} sách, cập nhật ${response.data.data?.updated || 0} sách`);
      setImportModal(false);
      setImportFile(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi import file');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Quản lý sách</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Thêm, sửa, xóa sách và quản lý đăng ký cá biệt</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportBooks} title="Xuất danh sách sách ra file Excel">
            <FiDownload /> Xuất Excel
          </button>
          <button className="btn btn-secondary" onClick={() => setImportModal(true)} title="Nhập danh sách sách từ file Excel">
            <FiUpload /> Nhập Excel
          </button>
          <button className="btn btn-primary" onClick={openCreate}><FiPlus /> Thêm sách</button>
        </div>
      </div>

      <div className="filters-row">
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-control" style={{ paddingLeft: 36 }} placeholder="Tìm sách..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="card">
        {loading
          ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Tên sách</th><th>Tác giả</th><th>Thể loại</th><th>ISBN</th>
                    <th>Bản sách</th><th>Vị trí kệ</th><th>Thế chân</th><th>Truy cập</th><th>PDF</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(b => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{b.title}</div>
                        {b.edition && <div style={{ fontSize: 11, color: '#94a3b8' }}>{b.edition}</div>}
                      </td>
                      <td style={{ fontSize: 13 }}>{b.author}</td>
                      <td><span style={{ fontSize: 12, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12 }}>{b.category?.name}</span></td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{b.isbn || '—'}</td>
                      <td>
                        <span style={{ fontSize: 13 }}>{b.available_copies}/{b.total_copies}</span>
                        <div style={{ width: 60, height: 4, background: '#f1f5f9', borderRadius: 2, marginTop: 4 }}>
                          <div style={{ width: `${b.total_copies > 0 ? (b.available_copies / b.total_copies) * 100 : 0}%`, height: '100%', background: b.available_copies > 0 ? '#16a34a' : '#dc2626', borderRadius: 2 }} />
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: '#64748b' }}>{b.location || '—'}</td>
                      <td style={{ fontSize: 13, fontWeight: 600, color: b.deposit > 0 ? '#d97706' : '#94a3b8' }}>
                        {b.deposit > 0 ? `${b.deposit.toLocaleString('vi-VN')}đ` : '—'}
                      </td>
                      <td>
                        {b.access_level === 'lan'
                          ? <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>🏫 LAN only</span>
                          : b.access_level === 'private'
                          ? <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>🔐 Đăng nhập</span>
                          : <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 10, fontWeight: 600 }}>🌐 Công khai</span>
                        }
                      </td>
                      <td>
                        {b.pdf_url ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <button
                              title={b.is_public_pdf ? 'Đang: Online công khai — Click để chuyển sang Offline' : 'Đang: Chỉ đọc tại thư viện — Click để mở Online'}
                              onClick={() => togglePublicPdf(b)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                              {b.is_public_pdf
                                ? <span style={{ fontSize: 11, background: '#dcfce7', color: '#16a34a', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>🌐 Online</span>
                                : <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>🏛 Offline</span>
                              }
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openPdfModal(b)} title="Thay PDF"><FiUpload size={12} /></button>
                            <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeletePdf(b)} title="Xóa PDF"><FiTrash2 size={12} /></button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-sm" onClick={() => openPdfModal(b)} title="Upload PDF">
                            <FiUpload size={12} /> Upload
                          </button>
                        )}
                      </td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)} title="Sửa"><FiEdit2 size={13} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openCopyModal(b)} title="Đăng ký cá biệt" style={{ color: '#2563eb' }}>
                          <FiList size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* ── Modal sửa/thêm sách ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa sách' : 'Thêm sách mới'}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Tên sách *</label><input className="form-control" {...f('title')} required /></div>
                  <div className="form-group"><label className="form-label">Tác giả *</label><input className="form-control" {...f('author')} required /></div>
                  <div className="form-group"><label className="form-label">Thể loại *</label>
                    <select className="form-control" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} required>
                      <option value="">Chọn thể loại</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Khoa viện</label>
                    <select className="form-control" value={String(form.department_id || '')} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                      <option value="">-- Không chọn --</option>
                      {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">ISBN</label><input className="form-control" {...f('isbn')} /></div>
                  <div className="form-group"><label className="form-label">Nhà xuất bản</label><input className="form-control" {...f('publisher')} /></div>
                  <div className="form-group"><label className="form-label">Năm XB</label><input className="form-control" type="number" {...f('publish_year')} /></div>
                  <div className="form-group"><label className="form-label">Phiên bản</label><input className="form-control" {...f('edition')} /></div>
                  <div className="form-group"><label className="form-label">Số bản *</label><input className="form-control" type="number" min="0" {...f('total_copies')} required /></div>
                  <div className="form-group"><label className="form-label">Vị trí kệ</label><input className="form-control" placeholder="A1-01" {...f('location')} /></div>
                  <div className="form-group"><label className="form-label">Số trang</label><input className="form-control" type="number" {...f('pages')} /></div>
                  <div className="form-group"><label className="form-label">💰 Tiền thế chân (đ)</label><input className="form-control" type="number" min="0" placeholder="0" {...f('deposit')} /></div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}><label className="form-label">Mô tả</label><textarea className="form-control" {...f('description')} /></div>

                  {/* Phân quyền truy cập theo mạng */}
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">🔒 Phân quyền truy cập & Bản quyền</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 6 }}>
                      {[
                        { 
                          value: 'public',  
                          icon: '🌐', 
                          title: 'Công khai', 
                          desc: 'Không bản quyền — Ai cũng xem (Internet & LAN)',
                          detail: 'Phù hợp: Tài liệu open-source, preview',
                          color: '#16a34a', 
                          bg: '#f0fdf4' 
                        },
                        { 
                          value: 'lan',     
                          icon: '🏫', 
                          title: 'Chỉ nội bộ (LAN)', 
                          desc: 'Có bản quyền — Chỉ xem trong mạng trường',
                          detail: 'Phù hợp: Sách có bản quyền, tránh sao lưu',
                          color: '#2563eb', 
                          bg: '#eff6ff' 
                        },
                        { 
                          value: 'private', 
                          icon: '🔐', 
                          title: 'Phải đăng nhập', 
                          desc: 'Không bản quyền — Cần tài khoản (LAN & Internet)',
                          detail: 'Phù hợp: Tài liệu học tập, chỉ cho sinh viên',
                          color: '#d97706', 
                          bg: '#fffbeb' 
                        },
                      ].map(opt => (
                        <label key={opt.value} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                          padding: '12px 14px', borderRadius: 10,
                          border: `2px solid ${form.access_level === opt.value ? opt.color : '#e2e8f0'}`,
                          background: form.access_level === opt.value ? opt.bg : '#fff',
                          transition: 'all 0.15s',
                        }} onClick={() => setForm({ ...form, access_level: opt.value })}>
                          <input type="radio" checked={form.access_level === opt.value}
                            onChange={() => setForm({ ...form, access_level: opt.value })}
                            style={{ accentColor: opt.color, marginTop: 2 }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.icon} {opt.title}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{opt.desc}</div>
                            <div style={{ fontSize: 10, color: opt.color, marginTop: 4, fontStyle: 'italic' }}>{opt.detail}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 11, color: '#166534', borderLeft: '3px solid #16a34a' }}>
                      💡 <strong>Ghi chú:</strong> 
                      <ul style={{ marginLeft: 20, marginTop: 6 }}>
                        <li><strong>LAN (bản quyền):</strong> Người dùng phải đăng nhập + truy cập từ mạng trường. Admin/Thủ thư được từ bất kỳ đâu.</li>
                        <li><strong>Phải đăng nhập:</strong> Người dùng chỉ cần đăng nhập, có thể xem từ ngoài mạng.</li>
                      </ul>
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">📄 File PDF (không bắt buộc)</label>
                    <input type="file" accept="application/pdf" className="form-control"
                      onChange={e => setPdfFile(e.target.files[0])} />
                    {pdfFile && (
                      <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6 }}>
                        📄 {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                    {pdfFile && (
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          padding: '8px 12px', borderRadius: 8, border: `2px solid ${isPublicPdf ? '#2563eb' : '#e2e8f0'}`, flex: 1 }}
                          onClick={() => setIsPublicPdf(true)}>
                          <input type="radio" checked={isPublicPdf} onChange={() => setIsPublicPdf(true)} style={{ accentColor: '#2563eb' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>🌐 Đọc Online</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Sinh viên đọc tự do</div>
                          </div>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          padding: '8px 12px', borderRadius: 8, border: `2px solid ${!isPublicPdf ? '#d97706' : '#e2e8f0'}`, flex: 1 }}
                          onClick={() => setIsPublicPdf(false)}>
                          <input type="radio" checked={!isPublicPdf} onChange={() => setIsPublicPdf(false)} style={{ accentColor: '#d97706' }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>🏛 Chỉ tại thư viện</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Cần mượn sách mới xem</div>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm sách'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal đăng ký cá biệt ── */}
      {copyModal && selectedBook && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCopyModal(false)}>
          <div className="modal" style={{ maxWidth: 760, width: '95vw' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0 }}>📋 Đăng ký cá biệt</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{selectedBook.title} — {selectedBook.author}</p>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setCopyModal(false)}><FiX /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

              {/* Thống kê nhanh */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {[['Có sẵn', countByStatus('available'), '#16a34a'], ['Đang mượn', countByStatus('borrowed'), '#2563eb'], ['Bảo trì', countByStatus('maintenance'), '#94a3b8'], ['Mất sách', countByStatus('lost'), '#dc2626']].map(([label, count, color]) => (
                  <div key={label} style={{ flex: 1, minWidth: 100, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, textAlign: 'center', border: `2px solid ${color}20` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{count}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Form thêm bản sao */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiPlus /> Thêm bản sao mới
                </div>

                {/* Chọn chế độ */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[['auto', '🤖 Tự động tạo mã'], ['manual', '✏️ Nhập mã tay']].map(([mode, label]) => (
                    <button key={mode}
                      className={`btn ${addCopyMode === mode ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                      onClick={() => { setAddCopyMode(mode); if (mode === 'auto') loadPreviewCodes(addQty); }}>
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 120px' }}>
                    <label className="form-label">Số lượng</label>
                    <input className="form-control" type="number" min="1" max="100" value={addQty}
                      onChange={e => handleQtyChange(e.target.value)} />
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    {addCopyMode === 'auto' ? (
                      <>
                        <label className="form-label">Mã sẽ được tạo</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {previewCodes.map(code => (
                            <span key={code} style={{ padding: '4px 10px', background: '#eff6ff', color: '#2563eb', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', fontWeight: 600 }}>
                              {code}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="form-label">Nhập mã từng cuốn</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {manualCodes.map((code, i) => (
                            <input key={i} className="form-control" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                              placeholder={`Mã cuốn ${i + 1} (vd: TV-001)`}
                              value={code}
                              onChange={e => {
                                const arr = [...manualCodes];
                                arr[i] = e.target.value;
                                setManualCodes(arr);
                              }} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={handleAddCopies} disabled={addingCopy}>
                      {addingCopy ? <><FiRefreshCw style={{ animation: 'spin 1s linear infinite' }} /> Đang thêm...</> : <><FiPlus /> Thêm {addQty} bản</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh sách bản sao */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontWeight: 600 }}>Danh sách bản sao ({copies.length})</div>
                  <button className="btn btn-secondary btn-sm" onClick={() => loadCopies(selectedBook.id)}><FiRefreshCw size={13} /></button>
                </div>

                {copiesLoading
                  ? <div style={{ padding: 24, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                  : copies.length === 0
                    ? <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Chưa có bản sao nào. Hãy thêm bên trên.</div>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {copies.map(copy => {
                          const [sLabel, sColor] = STATUS_LABEL[copy.status] || ['?', '#94a3b8'];
                          const activeBorrow = copy.borrows?.[0];
                          return (
                            <div key={copy.id} style={{ padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              {/* Mã */}
                              <div style={{ flex: '0 0 auto' }}>
                                <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 15, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <FiCopy size={13} color="#94a3b8" />
                                  {copy.copy_code}
                                </div>
                              </div>

                              {/* Trạng thái */}
                              <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: `${sColor}18`, color: sColor }}>{sLabel}</span>

                              {/* Tình trạng */}
                              <span style={{ fontSize: 12, color: '#64748b' }}>{CONDITION_LABEL[copy.condition]}</span>

                              {/* Đang mượn bởi ai */}
                              {activeBorrow && (
                                <div style={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                                  👤 {activeBorrow.user?.name} ({activeBorrow.user?.student_id || activeBorrow.user?.email})
                                  · Hạn: {new Date(activeBorrow.due_date).toLocaleDateString('vi-VN')}
                                </div>
                              )}

                              {/* Actions */}
                              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                {editCopy?.id === copy.id ? (
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <select className="form-control" style={{ fontSize: 12, padding: '4px 8px', height: 32 }}
                                      value={editCopy.condition}
                                      onChange={e => setEditCopy({ ...editCopy, condition: e.target.value })}>
                                      {Object.entries(CONDITION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                    <input className="form-control" style={{ fontSize: 12, padding: '4px 8px', height: 32, width: 140 }}
                                      placeholder="Ghi chú..." value={editCopy.note || ''}
                                      onChange={e => setEditCopy({ ...editCopy, note: e.target.value })} />
                                    <button className="btn btn-primary btn-sm" onClick={handleUpdateCopy}>Lưu</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditCopy(null)}>Hủy</button>
                                  </div>
                                ) : (
                                  <>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditCopy({ id: copy.id, condition: copy.condition, note: copy.note || '' })}><FiEdit2 size={13} /></button>
                                    {copy.status === 'available' && (
                                      <button className="btn btn-secondary btn-sm" style={{ color: '#dc2626' }} onClick={() => handleDeleteCopy(copy)}><FiTrash2 size={13} /></button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCopyModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Upload Modal */}
      {pdfModal && pdfBook && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPdfModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3><FiFileText style={{ marginRight: 8 }} />Quản lý PDF — {pdfBook.title}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setPdfModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              {pdfBook.pdf_url && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                  ✅ Sách đã có PDF. Upload mới sẽ thay thế file cũ.
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Chọn file PDF (tối đa 50MB)</label>
                <input type="file" accept="application/pdf" className="form-control"
                  onChange={e => setPdfFile(e.target.files[0])} />
                {pdfFile && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6 }}>📄 {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Quyền truy cập PDF</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, border: `2px solid ${isPublicPdf ? '#2563eb' : '#e2e8f0'}`, flex: 1 }}
                    onClick={() => setIsPublicPdf(true)}>
                    <input type="radio" checked={isPublicPdf} onChange={() => setIsPublicPdf(true)} style={{ accentColor: '#2563eb' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>🌐 Đọc Online</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Sinh viên đọc tự do qua mạng</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, border: `2px solid ${!isPublicPdf ? '#d97706' : '#e2e8f0'}`, flex: 1 }}
                    onClick={() => setIsPublicPdf(false)}>
                    <input type="radio" checked={!isPublicPdf} onChange={() => setIsPublicPdf(false)} style={{ accentColor: '#d97706' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b' }}>🏛 Chỉ tại thư viện</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Chỉ SV đang mượn sách mới xem được</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPdfModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handlePdfUpload} disabled={!pdfFile || uploadingPdf}>
                <FiUpload size={14} /> {uploadingPdf ? 'Đang upload...' : 'Upload PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3><FiUpload style={{ marginRight: 8 }} />Nhập danh sách sách</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setImportModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                💡 <strong>Hướng dẫn:</strong>
                <ul style={{ marginLeft: 20, marginTop: 6, marginBottom: 0 }}>
                  <li>Tải file template bằng cách click "Xuất Excel" trước</li>
                  <li>Điền thông tin sách vào file Excel</li>
                  <li>Tải file lên để thêm hoặc cập nhật sách</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Chọn file Excel (*.xlsx)</label>
                <input type="file" accept=".xlsx,.xls" className="form-control"
                  onChange={e => setImportFile(e.target.files[0])} />
                {importFile && (
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6 }}>
                    📄 {importFile.name}
                  </div>
                )}
              </div>

              <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                ⚠️ <strong>Lưu ý:</strong> Chỉ cập nhật những trường có dữ liệu. Sách có ISBN hoặc tên giống sẽ được cập nhật, không thêm mới.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setImportModal(false); setImportFile(null); }} disabled={isImporting}>Hủy</button>
              <button className="btn btn-primary" onClick={handleImportBooks} disabled={!importFile || isImporting}>
                {isImporting ? <>🔄 Đang nhập...</> : <>✅ Nhập dữ liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}