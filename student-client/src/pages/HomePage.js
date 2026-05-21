import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiSearch, FiBookOpen, FiArrowRight, FiTag, FiUsers, FiLayers, FiTrendingUp, FiMonitor, FiRefreshCw, FiMessageSquare, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PALETTES = [
  ['#667eea','#764ba2'], ['#f093fb','#f5576c'], ['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'], ['#fa709a','#fee140'], ['#a18cd1','#fbc2eb'],
  ['#fccb90','#d57eeb'], ['#a1c4fd','#c2e9fb'], ['#fd7043','#ff8a65'],
  ['#26c6da','#00acc1'], ['#ff6b6b','#feca57'], ['#48dbfb','#ff9ff3'],
];

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const numTarget = typeof target === 'number' ? target : parseInt(target) || 0;
    if (numTarget === 0) return;
    started.current = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * numTarget));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
}

function Cover({ book, idx }) {
  const [c1, c2] = PALETTES[idx % PALETTES.length];
  return (
    <div className="book-cover" style={{ background: `linear-gradient(160deg,${c1},${c2})` }}>
      <div className="book-cover-spine" />
      <FiBookOpen size={28} color="rgba(255,255,255,0.88)" />
      {book.pdf_url && book.is_public_pdf && (
        <div style={{ position:'absolute', top:7, right:7, background:'#16a34a', color:'#fff', fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:99 }}>PDF</div>
      )}
      {book.available_copies === 0 && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(220,38,38,0.88)', color:'#fff', fontSize:10, fontWeight:700, textAlign:'center', padding:'3px 0' }}>Hết sách</div>
      )}
    </div>
  );
}

function BookCard({ book, idx, onClick }) {
  const avail = book.available_copies || 0;
  return (
    <div className="book-card" onClick={onClick}>
      <Cover book={book} idx={idx} />
      <div className="book-info">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author}</div>
        <div className="book-meta">
          <span className="book-cat">{book.category?.name}</span>
          <span className={`book-avail ${avail === 0 ? 'out' : avail <= 2 ? 'low' : 'ok'}`}>
            {avail === 0 ? 'Hết' : avail}
          </span>
        </div>
      </div>
    </div>
  );
}

function BookRow({ books, title, icon, startIdx = 0, onBook, viewAllHref }) {
  const scrollRef = useRef(null);
  if (!books?.length) return null;

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="book-section fade-in-up">
      <div className="section-header">
        <h3 className="section-title">
          <span className="section-icon">{icon}</span> {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="scroll-nav">
            <button className="scroll-btn" onClick={() => scroll(-1)} aria-label="Scroll left">
              <FiChevronLeft size={16} />
            </button>
            <button className="scroll-btn" onClick={() => scroll(1)} aria-label="Scroll right">
              <FiChevronRight size={16} />
            </button>
          </div>
          <Link to={viewAllHref || '/books'} className="section-link">
            Xem tất cả <FiArrowRight size={13} />
          </Link>
        </div>
      </div>
      <div className="books-scroll" ref={scrollRef}>
        {books.slice(0, 12).map((b, i) => (
          <div className="books-scroll-item" key={b.id}>
            <BookCard book={b} idx={startIdx + i} onClick={() => onBook(b)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [popularBooks, setPopularBooks] = useState([]);
  const [newBooks, setNewBooks] = useState([]);
  const [eBooks, setEBooks] = useState([]);
  const [stats, setStats] = useState({ books: 0, users: 0, borrows: 0, copies: 0, ebooks: 0 });
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('');
  const [userAlert, setUserAlert] = useState({ overdue: 0, unpaid: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/books', { params: { limit: 12, sort: 'borrow_count', order: 'DESC' } }).catch(() => ({ data: { data: [] } })),
      api.get('/books', { params: { limit: 12, sort: 'created_at', order: 'DESC' } }).catch(() => ({ data: { data: [] } })),
      api.get('/books', { params: { limit: 8, has_pdf: 'true' } }).catch(() => ({ data: { data: [] } })),
      api.get('/categories').catch(() => ({ data: { data: [] } })),
      api.get('/stats/summary').catch(() => ({ data: { data: {} } })),
    ]).then(([pop, newB, eb, cats, st]) => {
      setPopularBooks(pop.data?.data || []);
      setNewBooks(newB.data?.data || []);
      setEBooks(eb.data?.data || []);
      setCategories(cats.data?.data || []);
      const s = st.data?.data || {};
      setStats({ 
        books: s.totalBooks || 0, 
        users: s.totalUsers || 0, 
        borrows: s.activeBorrows || 0,
        copies: s.totalCopies || 0,
        ebooks: s.totalEBooks || 0
      });
    }).catch(err => {
      console.error('Error loading page:', err);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return setUserAlert({ overdue: 0, unpaid: 0 });
    let cancelled = false;
    Promise.all([
      api.get('/borrows/my/overdue'),
      api.get('/fines/my'),
    ]).then(([overdueRes, finesRes]) => {
      if (cancelled) return;
      const overdue = (overdueRes.data.data || []).length;
      const unpaid = (finesRes.data.data || []).filter(f => !f.is_paid).reduce((sum, f) => sum + (f.amount || 0), 0);
      setUserAlert({ overdue, unpaid });
    }).catch(() => {
      if (!cancelled) setUserAlert({ overdue: 0, unpaid: 0 });
    });
    return () => { cancelled = true; };
  }, [user]);

  const handleSearch = () => {
    if (search.trim()) navigate(`/books?search=${encodeURIComponent(search)}`);
  };

  const handleCat = (id) => {
    setActiveCat(String(id));
    navigate(`/books?category=${id}`);
  };

  return (
    <>
      <Navbar />

      {/* HERO */}
      <div className="hero-modern">
        <div className="hero-bg-shapes">
          <div className="hero-shape hero-shape-1" />
          <div className="hero-shape hero-shape-2" />
          <div className="hero-shape hero-shape-3" />
          <div className="hero-float hero-float-1">
            <FiBookOpen size={24} />
          </div>
          <div className="hero-float hero-float-2">
            <FiLayers size={20} />
          </div>
          <div className="hero-float hero-float-3">
            <FiTrendingUp size={18} />
          </div>
        </div>

        <div className="hero-content">
          <div className="hero-badge fade-in-up">
            <span className="hero-badge-dot" />
            Hệ thống đang hoạt động
          </div>

          <h1 className="hero-heading fade-in-up" style={{ animationDelay: '0.1s' }}>
            Thư viện số
            <br />
            <span className="hero-gradient-text">trong tầm tay bạn</span>
          </h1>

          <p className="hero-subtitle fade-in-up" style={{ animationDelay: '0.2s' }}>
            Tra cứu, mượn sách và đọc E-Book trực tuyến — nhanh, tiện, miễn phí.
            <br className="hide-mobile" />
            Trải nghiệm thư viện hiện đại ngay hôm nay.
          </p>

          <div className="hero-search-wrap fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="hero-search">
              <FiSearch size={18} className="hero-search-icon" />
              <input
                placeholder="Tìm tên sách, tác giả, ISBN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button onClick={handleSearch}>Tìm kiếm</button>
            </div>
            <div className="hero-search-hints">
              <span>Phổ biến:</span>
              <button onClick={() => { setSearch('Lập trình'); navigate('/books?search=Lập trình'); }}>Lập trình</button>
              <button onClick={() => { setSearch('Kinh tế'); navigate('/books?search=Kinh tế'); }}>Kinh tế</button>
              <button onClick={() => { setSearch('Toán'); navigate('/books?search=Toán'); }}>Toán học</button>
            </div>
          </div>

          {/* Stats cards */}
          <div className="hero-stats fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { icon: <FiBookOpen size={22} />, n: stats.books, label: 'Đầu sách', color: '#60a5fa' },
              { icon: <FiLayers size={22} />, n: stats.copies, label: 'Bản sao', color: '#a78bfa' },
              { icon: <FiMonitor size={22} />, n: stats.ebooks, label: 'E-Book PDF', color: '#34d399' },
              { icon: <FiUsers size={22} />, n: stats.users, label: 'Độc giả', color: '#fbbf24' },
            ].map(s => (
              <div key={s.label} className="hero-stat-card">
                <div className="hero-stat-icon" style={{ color: s.color }}>
                  {s.icon}
                </div>
                <div className="hero-stat-number">
                  <AnimatedCounter target={s.n} />
                </div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {user && (userAlert.overdue > 0 || userAlert.unpaid > 0) && (
            <div
              className="fade-in-up"
              style={{
                animationDelay: '0.45s',
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 20,
                padding: 22,
                marginTop: 24,
                boxShadow: '0 16px 50px rgba(15,23,42,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text)' }}>Cảnh báo dành cho bạn</h3>
                <p style={{ margin: '10px 0 0', color: 'var(--muted)', lineHeight: 1.6 }}>
                  {userAlert.overdue > 0 && `Bạn có ${userAlert.overdue} phiếu mượn quá hạn.`}
                  {userAlert.overdue > 0 && userAlert.unpaid > 0 && ' '}
                  {userAlert.unpaid > 0 && `Còn ${userAlert.unpaid.toLocaleString()} VNĐ tiền phạt chưa thanh toán.`}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={() => navigate('/my-fines')}>
                Xem chi tiết
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="cat-bar">
        <div className="container">
          <div className="cat-pills">
            <button className={`cat-pill ${activeCat === '' ? 'active' : ''}`} onClick={() => { setActiveCat(''); navigate('/books'); }}>
              <FiSearch size={13} /> Tất cả
            </button>
            {categories.map(c => (
              <button key={c.id} className={`cat-pill ${activeCat === String(c.id) ? 'active' : ''}`} onClick={() => handleCat(c.id)}>
                <FiTag size={12} /> {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container section">
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div className="spinner" />
            <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14 }}>Đang tải sách...</p>
          </div>
        ) : (
          <>
            <BookRow title="Được mượn nhiều nhất" icon="🔥" books={popularBooks} startIdx={0} onBook={b => navigate(`/books/${b.id}`)} />
            <BookRow title="Sách mới nhất" icon="✨" books={newBooks} startIdx={12} onBook={b => navigate(`/books/${b.id}`)} />
            {eBooks.length > 0 && (
              <BookRow title="Đọc online — E-Book" icon="📱" books={eBooks} startIdx={24} onBook={b => navigate(`/books/${b.id}`)} viewAllHref="/books?has_pdf=true" />
            )}
          </>
        )}

        {/* Feature cards */}
        {!loading && (
          <div className="features-section fade-in-up">
            <div className="features-header">
              <h2 className="features-title">Khám phá thư viện</h2>
              <p className="features-subtitle">Trải nghiệm đầy đủ tính năng của hệ thống thư viện số</p>
            </div>
            <div className="features-grid">
              {[
                { icon: <FiSearch size={26} />, title: 'Tra cứu sách', desc: 'Tìm theo tên, tác giả, thể loại hoặc ISBN với kết quả tức thì', href: '/books', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
                { icon: <FiMonitor size={26} />, title: 'E-Book online', desc: 'Đọc sách PDF ngay trong trình duyệt, không cần tải về', href: '/books?has_pdf=true', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                { icon: <FiRefreshCw size={26} />, title: 'Gia hạn online', desc: 'Gia hạn sách trực tuyến mà không cần đến thư viện', href: user ? '/my-borrows' : '/login', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
                { icon: <FiMessageSquare size={26} />, title: 'Liên hệ thủ thư', desc: 'Gửi câu hỏi và nhận hỗ trợ nhanh chóng từ thủ thư', href: user ? '/messages' : '/login', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
              ].map(f => (
                <Link key={f.title} to={f.href} className="feature-card-modern">
                  <div className="feature-icon-wrap" style={{ background: f.gradient }}>
                    {f.icon}
                  </div>
                  <div className="feature-content">
                    <div className="feature-card-title">{f.title}</div>
                    <div className="feature-card-desc">{f.desc}</div>
                  </div>
                  <FiArrowRight size={18} className="feature-arrow" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA for non-logged-in users */}
        {!user && !loading && (
          <div className="cta-section fade-in-up">
            <div className="cta-bg-pattern" />
            <div className="cta-content">
              <div className="cta-icon-wrap">
                <FiBookOpen size={32} />
              </div>
              <h3 className="cta-heading">Bắt đầu mượn sách ngay hôm nay</h3>
              <p className="cta-text">
                Đăng ký miễn phí và khám phá kho sách hơn {stats.books.toLocaleString()} đầu sách
              </p>
              <div className="cta-buttons">
                <Link to="/register" className="cta-btn-primary">
                  Đăng ký miễn phí
                  <FiArrowRight size={16} />
                </Link>
                <Link to="/login" className="cta-btn-secondary">
                  Đăng nhập
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
