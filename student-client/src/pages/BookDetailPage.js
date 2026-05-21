import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiBook, FiBookmark, FiInfo, FiLogIn, FiHash, FiMapPin, FiFileText, FiLock } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import PdfViewer from '../components/PdfViewer';
import { useAuth } from '../context/AuthContext';
import api, { apiBaseUrl } from '../services/api';

const COVERS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

const STATUS_MAP = {
  available:   { label: 'Có sẵn trên kệ',    color: '#16a34a', bg: '#f0fdf4' },
  borrowed:    { label: 'Đang được mượn',     color: '#2563eb', bg: '#eff6ff' },
  reserved:    { label: 'Đã được đặt trước',  color: '#d97706', bg: '#fffbeb' },
  maintenance: { label: 'Đang bảo trì',       color: '#94a3b8', bg: '#f8fafc' },
  lost:        { label: 'Đã mất',             color: '#dc2626', bg: '#fef2f2' },
};

const CONDITION_MAP = {
  good:    '✅ Tốt',
  worn:    '🟡 Cũ',
  damaged: '🔴 Hỏng',
  lost:    '⚫ Mất',
};

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook]                 = useState(null);
  const [copies, setCopies]             = useState([]);
  const [suggestedByDept, setSuggestedByDept]     = useState([]);
  const [suggestedByCategory, setSuggestedByCategory] = useState([]);
  const [suggestedByKeyword, setSuggestedByKeyword]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [acting, setActing]             = useState(false);
  const [showAll, setShowAll]           = useState(false);
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl]     = useState(null);
  const [pdfOpen, setPdfOpen]           = useState(false);

  const closePdf = () => {
    setPdfOpen(false);
    if (pdfBlobUrl) { URL.revokeObjectURL(pdfBlobUrl); setPdfBlobUrl(null); }
  };

  const handleReadPdf = async () => {
    if (!book?.pdf_url) return;

    // Kiểm tra access_level trước khi gọi API
    if (book.access_level === 'lan') {
      toast.error('📡 Tài liệu này chỉ đọc được trên mạng nội bộ (LAN)', { duration: 4000 });
      return;
    }
    if (book.access_level === 'private' && !user) {
      toast.error('Vui lòng đăng nhập để xem PDF');
      navigate('/login');
      return;
    }
    if (!book.is_public_pdf && !user) {
      toast.error('Vui lòng đăng nhập để xem PDF');
      navigate('/login');
      return;
    }
    setPdfLoading(true);
    try {
      const token = localStorage.getItem('student_token');
      const url = `${apiBaseUrl}/books/${id}/pdf`;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'LAN_ONLY') {
          toast.error('📡 Tài liệu này chỉ đọc được trên mạng nội bộ (LAN)', { duration: 4000 });
        } else if (data.code === 'LOGIN_REQUIRED') {
          toast.error('Vui lòng đăng nhập để đọc tài liệu này');
          navigate('/login');
        } else {
          toast.error(data.message || 'Không thể mở PDF');
        }
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(blobUrl);
      setPdfOpen(true);
    } catch {
      toast.error('Lỗi khi tải PDF');
    } finally { setPdfLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/books/${id}`).catch(err => {
        const code = err.response?.data?.code;
        if (code === 'LAN_ONLY') {
          toast.error('📡 Tài liệu này chỉ xem được trên mạng nội bộ (LAN)', { duration: 5000 });
        } else if (code === 'LOGIN_REQUIRED') {
          // User chưa đăng nhập, nhưng cho phép xem detail page
          // (chỉ block khi click "Đọc PDF")
        }
        return null;
      }),
      api.get(`/copies/book/${id}`).catch(() => ({ data: { data: [] } })),
    ]).then(async ([bookRes, copiesRes]) => {
      const bookData = bookRes?.data?.data || null;
      setBook(bookData);
      setCopies(copiesRes.data.data || []);
      
      if (!bookData) return;

      // 1. Sách cùng khoa
      if (bookData?.department_id) {
        try {
          const res = await api.get('/books', { params: { department: bookData.department_id, limit: 10 } });
          const list = (res.data.data || []).filter(b => b.id !== parseInt(id));
          setSuggestedByDept(list.slice(0, 6));
        } catch (e) {}
      }

      // 2. Sách cùng thể loại
      if (bookData?.category_id) {
        try {
          const res = await api.get('/books', { params: { category: bookData.category_id, limit: 10 } });
          const list = (res.data.data || []).filter(b => b.id !== parseInt(id));
          setSuggestedByCategory(list.slice(0, 6));
        } catch (e) {}
      }

      // 3. Sách theo từ khóa từ title (search)
      if (bookData?.title) {
        try {
          const keywords = bookData.title.split(' ').filter(w => w.length > 2).slice(0, 3).join(' ');
          if (keywords) {
            const res = await api.get('/books', { params: { search: keywords, limit: 10 } });
            const list = (res.data.data || []).filter(b => b.id !== parseInt(id));
            setSuggestedByKeyword(list.slice(0, 6));
          }
        } catch (e) {}
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleReserve = async () => {
    if (!user) { toast.error('Vui lòng đăng nhập để đặt trước'); navigate('/login'); return; }
    setActing(true);
    try {
      await api.post('/reservations', { book_id: id });
      toast.success('Đặt trước thành công! Bạn sẽ được thông báo khi sách có sẵn.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi đặt trước');
    } finally { setActing(false); }
  };

  if (loading) return <><Navbar /><div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div></>;
  if (!book)   return <><Navbar /><div className="container section empty"><h3>Không tìm thấy sách</h3></div></>;

  const avail    = book.available_copies || 0;
  const total    = book.total_copies || 0;
  const pct      = total > 0 ? Math.round((avail / total) * 100) : 0;
  const barColor = avail === 0 ? '#dc2626' : avail <= 2 ? '#d97706' : '#16a34a';

  const displayed = showAll ? copies : copies.slice(0, 5);

  return (
    <>
      <Navbar />
      <div className="container section">
        <button className="btn btn-secondary" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
          <FiArrowLeft /> Quay lại
        </button>

        <div className="detail-grid">

          {/* ── Cột trái ── */}
          <div style={{ display: 'grid', gap: 20 }}>
            <div className="detail-cover" style={{ background: COVERS[parseInt(id) % COVERS.length] }}>
              <FiBook size={80} />
            </div>

            {/* Tồn kho */}
            <div style={{ marginTop: 16, padding: 20, background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>📦 Tình trạng kho</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Tồn trên kệ</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: barColor }}>
                  {avail}<span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>/{total} bản</span>
                </span>
              </div>
              <div style={{ height: 8, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 6, transition: 'width 0.4s' }} />
              </div>

              {/* Mini stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  ['Có sẵn',      copies.filter(c => c.status === 'available').length,                      '#16a34a', '#f0fdf4'],
                  ['Đang mượn',   copies.filter(c => c.status === 'borrowed').length,                       '#2563eb', '#eff6ff'],
                  ['Đặt trước',   copies.filter(c => c.status === 'reserved').length,                       '#d97706', '#fffbeb'],
                  ['Hỏng/Mất',    copies.filter(c => ['maintenance','lost'].includes(c.status)).length,     '#dc2626', '#fef2f2'],
                ].map(([lbl, cnt, color, bg]) => (
                  <div key={lbl} style={{ background: bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>{cnt}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{lbl}</div>
                  </div>
                ))}
              </div>

              {avail > 0 ? (
                <>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 10, textAlign: 'center', color: '#16a34a', fontWeight: 600, fontSize: 14 }}>
                    ✓ Có thể mượn ngay
                  </div>
                  <div className="info-box info" style={{ fontSize: 12 }}>
                    <FiInfo size={13} style={{ flexShrink: 0 }} />
                    <span>Đến quầy và báo <strong>mã ĐKCB</strong> bên phải để làm thủ tục mượn.</span>
                  </div>
                  {!user && (
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                      <FiLogIn /> Đăng nhập
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <div className="info-box danger" style={{ marginBottom: 10, fontSize: 12 }}>
                    Tất cả bản đang được mượn. Đặt trước để ưu tiên khi có sẵn.
                  </div>
                  {user ? (
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleReserve} disabled={acting}>
                      <FiBookmark /> {acting ? 'Đang đặt...' : 'Đặt trước sách này'}
                    </button>
                  ) : (
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                      <FiLogIn /> Đăng nhập để đặt trước
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Cột phải ── */}
          <div>
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-info">{book.category?.name}</span>
              {book.access_level === 'lan' && (
                <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🏫 Chỉ xem trên mạng nội bộ (LAN)
                </span>
              )}
              {book.access_level === 'private' && (
                <span style={{ fontSize: 11, background: '#fffbeb', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔐 Yêu cầu đăng nhập
                </span>
              )}
              {book.access_level === 'public' && (
                <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '3px 10px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🌐 Công khai
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>{book.title}</h1>
            <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: 20 }}>
              Tác giả: <strong style={{ color: 'var(--text)' }}>{book.author}</strong>
            </p>

            <div style={{ marginBottom: 20, padding: '16px 18px', borderRadius: 18, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Đặt trước sách</div>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                  {avail > 0
                    ? 'Sách vẫn còn trên kệ nhưng bạn có thể đặt trước để giữ và đến lấy sau.'
                    : 'Sách đã hết. Đặt trước để được ưu tiên khi có sách về kho.'}
                </div>
              </div>
              {user ? (
                <button className="btn btn-primary" style={{ width: 'fit-content', justifyContent: 'center' }} onClick={handleReserve} disabled={acting}>
                  <FiBookmark /> {acting ? 'Đang đặt...' : 'Đặt trước'}
                </button>
              ) : (
                <Link to="/login" className="btn btn-primary" style={{ width: 'fit-content', justifyContent: 'center' }}>
                  <FiLogIn /> Đăng nhập để đặt trước
                </Link>
              )}
            </div>

            {book.access_level === 'private' && (
              <div className="info-box warning" style={{ marginBottom: 16, fontSize: 13 }}>
                <FiLock size={14} style={{ flexShrink: 0 }} />
                <span>📚 <strong>Chỉ đọc nội bộ tại thư viện</strong> - Bạn cần đăng nhập và ở trên mạng thư viện để xem</span>
              </div>
            )}

            {book.description && (
              <div style={{ marginBottom: 20, padding: '14px 16px', background: '#f8fafc', borderRadius: 8, borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mô tả</div>
                <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{book.description}</p>
              </div>
            )}

            {/* Thông tin chi tiết */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                📋 Thông tin chi tiết
              </div>
              <div style={{ padding: '4px 20px' }}>
                {[
                  ['ISBN',          book.isbn],
                  ['Nhà xuất bản',  book.publisher],
                  ['Năm xuất bản',  book.publish_year],
                  ['Phiên bản',     book.edition],
                  ['Ngôn ngữ',      book.language],
                  ['Số trang',      book.pages && `${book.pages} trang`],
                  ['Vị trí kệ',     book.location],
                  ['Lượt mượn',     book.borrow_count && `${book.borrow_count} lượt`],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="info-row">
                    <span className="label" style={{ color: '#64748b', fontSize: 13 }}>{k}</span>
                    <span style={{ fontWeight: 500, fontSize: 14, fontFamily: k === 'ISBN' ? 'monospace' : 'inherit' }}>
                      {k === 'Vị trí kệ'
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMapPin size={12} color="#94a3b8" />{v}</span>
                        : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Bảng ĐKCB ── */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiHash size={15} color="#2563eb" />
                  Mã ĐKCB
                  <span style={{ fontSize: 12, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12 }}>
                    {copies.length} bản đăng ký
                  </span>
                </div>
                {book.location && (
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiMapPin size={12} /> Kệ {book.location}
                  </span>
                )}
              </div>

              <div style={{ padding: '12px 20px' }}>
                {copies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                    Chưa có bản sao nào được đăng ký
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <span>Mã ĐKCB</span>
                      <span>Tình trạng</span>
                      <span>Trạng thái</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {displayed.map(copy => {
                        const st = STATUS_MAP[copy.status] || { label: copy.status, color: '#94a3b8', bg: '#f8fafc' };
                        return (
                          <div key={copy.id} style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.3fr', gap: 8,
                            padding: '9px 10px', borderRadius: 8, alignItems: 'center',
                            border: `1px solid ${copy.status === 'available' ? '#bbf7d0' : '#e2e8f0'}`,
                            background: copy.status === 'available' ? '#f0fdf4' : '#fff',
                          }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, letterSpacing: '0.5px', color: '#1e293b' }}>
                              {copy.copy_code}
                            </span>
                            <span style={{ fontSize: 12, color: '#475569' }}>
                              {CONDITION_MAP[copy.condition] || copy.condition}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 10, background: st.bg, color: st.color, textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {copies.length > 5 && (
                      <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 10, width: '100%', padding: '8px', background: 'none', border: '1px dashed #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#2563eb', fontWeight: 500 }}>
                        {showAll ? '▲ Thu gọn' : `▼ Xem thêm ${copies.length - 5} bản nữa`}
                      </button>
                    )}

                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#fffbeb', borderRadius: 6, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ flexShrink: 0 }}>💡</span>
                      <span>Báo <strong>mã ĐKCB</strong> của bản "Có sẵn trên kệ" cho thủ thư khi đến mượn để được phục vụ nhanh hơn.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PDF Section */}
            {book.pdf_url && (
              <div style={{ marginBottom: 16, padding: '16px 20px', background: book.is_public_pdf ? '#f0fdf4' : '#fffbeb', border: `1px solid ${book.is_public_pdf ? '#bbf7d0' : '#fde68a'}`, borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <FiFileText size={18} color={book.is_public_pdf ? '#16a34a' : '#d97706'} />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {book.is_public_pdf ? '📖 Sách có bản đọc Online miễn phí' : '🏛 Sách có bản PDF (chỉ đọc tại thư viện)'}
                  </span>
                </div>
                {book.is_public_pdf ? (
                  <div>
                    <p style={{ fontSize: 13, color: '#166534', marginBottom: 10 }}>Bạn có thể đọc trực tuyến ngay bây giờ — không cần mượn sách.</p>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleReadPdf} disabled={pdfLoading}>
                      <FiFileText /> {pdfLoading ? 'Đang tải...' : 'Đọc Online ngay'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: 13, color: '#92400e', marginBottom: 10 }}>
                      <FiLock size={12} style={{ marginRight: 4 }} />
                      PDF này chỉ dành cho sinh viên <strong>đang mượn sách</strong>. Đến thư viện mượn sách để được cấp quyền đọc.
                    </p>
                    {user ? (
                      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleReadPdf} disabled={pdfLoading}>
                        <FiFileText /> {pdfLoading ? 'Đang kiểm tra...' : 'Thử mở PDF (cần đang mượn)'}
                      </button>
                    ) : (
                      <Link to="/login" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                        <FiLogIn /> Đăng nhập để xem PDF
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Suggested Books - Multiple Sections */}
            {(suggestedByDept.length > 0 || suggestedByCategory.length > 0 || suggestedByKeyword.length > 0) && (
              <div style={{ marginBottom: 16 }}>
                {/* Sách cùng khoa */}
                {suggestedByDept.length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🏫 Sách khác trong khoa
                    </div>
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                      {suggestedByDept.map((sug, idx) => (
                        <div key={sug.id} onClick={() => { navigate(`/books/${sug.id}`); window.scrollTo(0, 0); }} style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          <div style={{
                            background: COVERS[idx % COVERS.length],
                            height: 140, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 8, transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <FiBook size={32} color="#fff" />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {sug.title}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{sug.author}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sách cùng thể loại */}
                {suggestedByCategory.length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      📚 Sách cùng thể loại
                    </div>
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                      {suggestedByCategory.map((sug, idx) => (
                        <div key={sug.id} onClick={() => { navigate(`/books/${sug.id}`); window.scrollTo(0, 0); }} style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          <div style={{
                            background: COVERS[(idx + 3) % COVERS.length],
                            height: 140, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 8, transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <FiBook size={32} color="#fff" />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {sug.title}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{sug.author}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sách liên quan */}
                {suggestedByKeyword.length > 0 && (
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🔍 Sách liên quan
                    </div>
                    <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                      {suggestedByKeyword.map((sug, idx) => (
                        <div key={sug.id} onClick={() => { navigate(`/books/${sug.id}`); window.scrollTo(0, 0); }} style={{ cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          <div style={{
                            background: COVERS[(idx + 6) % COVERS.length],
                            height: 140, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 8, transition: 'transform 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                          }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                            <FiBook size={32} color="#fff" />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {sug.title}
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{sug.author}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Liên hệ */}
            <div>
              {user ? (
                <Link to={`/messages?book=${book.id}&title=${encodeURIComponent(book.title)}`}
                  className="btn btn-secondary" style={{ fontSize: 14 }}>
                  💬 Hỏi thủ thư về cuốn sách này
                </Link>
              ) : (
                <div className="info-box warning">
                  <FiInfo size={14} style={{ flexShrink: 0 }} />
                  <span><Link to="/login">Đăng nhập</Link> để liên hệ thủ thư hoặc đặt trước sách.</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* PDF Viewer Popup */}
      {pdfOpen && pdfBlobUrl && (
        <PdfViewer
          blobUrl={pdfBlobUrl}
          title={book.title}
          onClose={closePdf}
        />
      )}
    </>
  );
}