import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiGrid, FiList, FiFilter, FiX, FiBookOpen, FiFileText } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import api from '../services/api';

const COVERS = [
  'linear-gradient(160deg,#667eea,#764ba2)', 'linear-gradient(160deg,#f093fb,#f5576c)',
  'linear-gradient(160deg,#4facfe,#00f2fe)', 'linear-gradient(160deg,#43e97b,#38f9d7)',
  'linear-gradient(160deg,#fa709a,#fee140)', 'linear-gradient(160deg,#a18cd1,#fbc2eb)',
  'linear-gradient(160deg,#fccb90,#d57eeb)', 'linear-gradient(160deg,#a1c4fd,#c2e9fb)',
  'linear-gradient(160deg,#fd7043,#ff8a65)', 'linear-gradient(160deg,#26c6da,#00acc1)',
];

/* ─── Grid card ──────────────────────────────────────────────────── */
function GridCard({ book, index, onClick, renderBadge }) {
  const avail = book.available_copies || 0;
  return (
    <div className="book-card" onClick={onClick}>
      {/* Cover */}
      <div className="book-cover" style={{ background: COVERS[index % COVERS.length], padding: '18px 14px' }}>
        <div className="book-cover-spine" />
        {renderBadge?.(book)}
        {book.pdf_url && (
          <div style={{ position: 'absolute', top: 9, right: 9, background: book.is_public_pdf ? 'rgba(22,163,74,0.92)' : 'rgba(234,179,8,0.92)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
            <FiFileText size={9} /> {book.is_public_pdf ? 'E-Book' : 'PDF'}
          </div>
        )}
        {avail === 0 && (
          <div style={{ position: 'absolute', top: 9, left: 12, background: 'rgba(220,38,38,0.9)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>Hết</div>
        )}
        <FiBookOpen size={40} color="rgba(255,255,255,0.85)" />
        <div style={{ color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: 600, textAlign: 'center', marginTop: 10, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {book.title}
        </div>
      </div>

      {/* Info */}
      <div className="book-info">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <div className="book-meta">
          <span className="book-cat">{book.category?.name}</span>
          <span className={`book-avail ${avail === 0 ? 'out' : avail <= 2 ? 'low' : 'ok'}`}>
            {avail === 0 ? '❌' : `${avail} 📕`}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── List card ──────────────────────────────────────────────────── */
function ListCard({ book, index, onClick, renderBadge }) {
  const avail = book.available_copies || 0;
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer', display: 'flex', gap: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.borderColor = '#c7d7f0'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
      {/* Mini cover */}
      <div style={{
        width: 80, flexShrink: 0, background: COVERS[index % COVERS.length],
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'rgba(0,0,0,0.14)' }} />
        {renderBadge?.(book)}
        <FiBookOpen size={28} color="rgba(255,255,255,0.88)" />
        {book.pdf_url && (
          <div style={{ position: 'absolute', bottom: 5, right: 5, background: book.is_public_pdf ? 'rgba(22,163,74,0.9)' : 'rgba(234,179,8,0.9)', width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>📄</div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: '14px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {book.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{book.author}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          <span className="book-cat" style={{ fontSize: 11 }}>{book.category?.name}</span>
          {book.publish_year && <span style={{ fontSize: 12, color: 'var(--muted)' }}>📅 {book.publish_year}</span>}
          {book.isbn && <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{book.isbn}</span>}
        </div>
      </div>
      {/* Right: availability */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: avail === 0 ? 'var(--red)' : avail <= 2 ? 'var(--yellow)' : 'var(--green)', lineHeight: 1 }}>
            {avail}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontWeight: 600 }}>bản</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function BooksPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilter, setShowFilter] = useState(false);
  const [categories, setCategories] = useState([]);

  const [search, setSearch]     = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [available, setAvailable] = useState('');
  const [hasPdf, setHasPdf]     = useState(searchParams.get('has_pdf') || '');
  const [sortBy, setSortBy]     = useState('created_at');
  const [page, setPage]         = useState(1);

  const selectedCategory = categories.find(c => String(c.id) === category);

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data.data || [])); }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 24, sort: sortBy, order: 'DESC' };
      if (search)    params.search   = search;
      if (category)  params.category = category;
      if (available) params.available = available;
      if (hasPdf)    params.has_pdf  = hasPdf;
      const res = await api.get('/books', { params });
      setBooks(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.pages || 1);
    } finally { setLoading(false); }
  }, [page, sortBy, search, category, available, hasPdf]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBooks();
  };

  const activeFilters = [available, hasPdf, category].filter(Boolean).length;

  const pages = Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
    if (totalPages <= 9) return i + 1;
    if (page <= 5) return i + 1;
    if (page >= totalPages - 4) return totalPages - 8 + i;
    return page - 4 + i;
  });

  const renderAccessBadge = (book) => {
    if (book.access_level === 'lan') {
      return <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(59,130,246,0.95)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 999, textTransform: 'uppercase' }}>LAN</span>;
    }
    if (book.access_level === 'private') {
      return <span style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(234,179,8,0.95)', color: '#111827', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 999, textTransform: 'uppercase' }}>Đăng nhập</span>;
    }
    return null;
  };

  return (
    <>
      <Navbar />

      <div className="books-hero">
        <div className="container">
          <div className="hero-copy">
            <span style={{ fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--blue)', fontWeight: 700 }}>
              {selectedCategory ? `Thể loại: ${selectedCategory.name}` : 'Phần mềm mượn trả sách'}
            </span>
            <h1 style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, color: 'var(--text)', margin: '18px 0 10px' }}>
              {selectedCategory ? `Khám phá ${selectedCategory.name}` : 'Tìm sách nhanh, lọc dễ và đọc ngay'}
            </h1>
            <p>
              {selectedCategory
                ? `Xem ${total.toLocaleString()} sách thuộc thể loại ${selectedCategory.name}. Lọc theo trạng thái, ebook và các thuộc tính khác để tìm đúng sách bạn cần.`
                : 'Khám phá sách giấy, ebook và tài liệu PDF với giao diện sạch, đơn giản và phù hợp với mọi thiết bị.'}
            </p>
          </div>
          <div style={{ display: 'grid', gap: 14, maxWidth: 860, margin: '0 auto' }}>
            <form onSubmit={handleSearch} className="hero-search" style={{ background: 'var(--blue)', borderRadius: '32px', padding: '10px', boxShadow: '0 20px 60px rgba(37,99,235,0.12)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                <FiSearch style={{ position: 'absolute', left: 16, color: 'rgba(255,255,255,0.7)' }} />
                <input className="form-control" style={{ paddingLeft: 46, fontSize: 16, background: 'transparent', border: 'none', color: '#fff' }}
                  placeholder="Tìm tên sách, tác giả, ISBN..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                <button className="btn btn-primary" type="submit" style={{ padding: '12px 24px', borderRadius: '24px', minWidth: 140 }}>
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 'var(--nav-h)', zIndex: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--muted)', flex: 1 }}>
            {loading ? '⏳ Đang tải...' : (
              <><strong style={{ color: 'var(--text)' }}>{total.toLocaleString()}</strong> cuốn sách</>
            )}
          </span>

          {/* Category pills (desktop) */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 2 }}>
            <button className={`cat-pill ${!category ? 'active' : ''}`} style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => { setCategory(''); setPage(1); }}>Tất cả</button>
            {categories.slice(0, 8).map(c => (
              <button key={c.id} className={`cat-pill ${category === String(c.id) ? 'active' : ''}`} style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={() => { setCategory(String(c.id)); setPage(1); }}>
                {c.name}
              </button>
            ))}
          </div>

          <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="form-control" style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}>
            <option value="created_at">🆕 Mới nhất</option>
            <option value="borrow_count">🔥 Phổ biến</option>
            <option value="title">🔤 Tên A-Z</option>
          </select>

          <button onClick={() => setShowFilter(f => !f)} className={`btn ${showFilter || activeFilters > 0 ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            <FiFilter size={13} /> Lọc {activeFilters > 0 && `(${activeFilters})`}
          </button>

          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[['grid', <FiGrid size={15} />], ['list', <FiList size={15} />]].map(([m, icon]) => (
              <button key={m} onClick={() => setViewMode(m)} style={{
                padding: '7px 11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex',
                background: viewMode === m ? 'var(--blue)' : 'var(--bg)',
                color: viewMode === m ? '#fff' : 'var(--muted)',
                transition: 'var(--transition)',
              }}>{icon}</button>
            ))}
          </div>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', background: 'var(--bg)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tình trạng</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['', 'Tất cả'], ['true', '✅ Còn sẵn'], ['false', '❌ Đã mượn hết']].map(([v, l]) => (
                  <button key={v} onClick={() => { setAvailable(v); setPage(1); }} className={`cat-pill ${available === v ? 'active' : ''}`} style={{ fontSize: 12 }}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Loại tài liệu</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['', 'Tất cả'], ['true', '📱 E-Book'], ['false', '📖 Sách giấy']].map(([v, l]) => (
                  <button key={v} onClick={() => { setHasPdf(v); setPage(1); }} className={`cat-pill ${hasPdf === v ? 'active' : ''}`} style={{ fontSize: 12 }}>{l}</button>
                ))}
              </div>
            </div>
            {activeFilters > 0 && (
              <button className="btn btn-danger btn-sm" onClick={() => { setAvailable(''); setHasPdf(''); setCategory(''); setPage(1); }}>
                <FiX size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Book list ────────────────────────────────────── */}
      <div className="container" style={{ padding: '28px 20px 48px' }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>Đang tải sách...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="empty">
            <div className="ico">📭</div>
            <h3>Không tìm thấy sách</h3>
            <p>Thử từ khóa khác hoặc bỏ bộ lọc</p>
            <button className="btn btn-primary" style={{ marginTop: 20 }}
              onClick={() => { setSearch(''); setCategory(''); setAvailable(''); setHasPdf(''); setPage(1); }}>
              Xem tất cả sách
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="books-grid">
            {books.map((b, i) => <GridCard key={b.id} book={b} index={i} onClick={() => navigate(`/books/${b.id}`)} renderBadge={renderAccessBadge} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {books.map((b, i) => <ListCard key={b.id} book={b} index={i} onClick={() => navigate(`/books/${b.id}`)} renderBadge={renderAccessBadge} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="pagination">
            <button onClick={() => setPage(1)} disabled={page === 1}>«</button>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {pages.map(p => (
              <button key={p} onClick={() => setPage(p)} className={p === page ? 'active' : ''}>{p}</button>
            ))}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>
    </>
  );
}
