import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiBook } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const BOOK_COLORS = ['#667eea,#764ba2','#f093fb,#f5576c','#4facfe,#00f2fe','#43e97b,#38f9d7','#fa709a,#fee140','#a18cd1,#fbc2eb'];

export default function BooksPage() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [available, setAvailable] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (available) params.available = available;
      const res = await api.get('/books', { params });
      setBooks(res.data.data);
      setTotalPages(res.data.pages);
    } finally {
      setLoading(false);
    }
  }, [search, category, available, page]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);
  useEffect(() => { api.get('/categories').then(r => setCategories(r.data.data)); }, []);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchBooks(); };

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Danh mục sách</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Tìm kiếm và mượn sách từ thư viện</p>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch}>
        <div className="filters-row">
          <div className="search-input" style={{ flex: 2, position: 'relative' }}>
            <FiSearch className="search-icon" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input className="form-control" style={{ paddingLeft: 36 }} placeholder="Tìm theo tên sách, tác giả, ISBN..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 200 }} value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
            <option value="">Tất cả thể loại</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select className="form-control" style={{ width: 160 }} value={available} onChange={e => { setAvailable(e.target.value); setPage(1); }}>
            <option value="">Tất cả sách</option>
            <option value="true">Còn sẵn</option>
          </select>
          <button className="btn btn-primary" type="submit"><FiSearch /> Tìm</button>
        </div>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3>Không tìm thấy sách</h3>
          <p>Thử tìm với từ khóa khác</p>
        </div>
      ) : (
        <>
          <div className="books-grid">
            {books.map((book, i) => (
              <div key={book._id} className="book-card" onClick={() => navigate(`/books/${book.id}`)} style={{ cursor: 'pointer' }}>
                <div className="book-cover" style={{ background: `linear-gradient(135deg, ${BOOK_COLORS[i % BOOK_COLORS.length]})` }}>
                  {book.cover ? <img src={book.cover} alt={book.title} /> : <FiBook size={44} />}
                </div>
                <div className="book-info">
                  <div className="book-title">{book.title}</div>
                  <div className="book-author">{book.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 12 }}>
                      {book.category?.name}
                    </span>
                    <span className={`book-available ${book.availableCopies > 0 ? 'badge-success' : 'badge-danger'}`}
                      style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>
                      {book.availableCopies > 0 ? `Còn ${book.availableCopies}` : 'Hết sách'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
