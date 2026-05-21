import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiBook, FiBookmark, FiInfo } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(false);

  useEffect(() => {
    api.get(`/books/${id}`).then(r => setBook(r.data.data)).finally(() => setLoading(false));
  }, [id]);

  const handleReserve = async () => {
    setAction(true);
    try {
      await api.post('/reservations', { bookId: id });
      toast.success('Đặt trước thành công! Bạn sẽ được thông báo khi sách có sẵn.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi đặt trước');
    } finally {
      setAction(false);
    }
  };

  if (loading) return <Layout><div style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div></Layout>;
  if (!book) return <Layout><div className="empty-state"><h3>Không tìm thấy sách</h3></div></Layout>;

  return (
    <Layout>
      <button className="btn btn-secondary" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        <FiArrowLeft /> Quay lại
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
        {/* Cover */}
        <div>
          <div style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', borderRadius: 12, height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 16 }}>
            <FiBook size={80} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {book.availableCopies > 0 ? (
              <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px', textAlign: 'center', color: '#16a34a', fontSize: 13, fontWeight: 500 }}>
                ✓ Còn {book.availableCopies}/{book.totalCopies} bản
              </div>
            ) : (
              <div style={{ flex: 1 }}>
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleReserve} disabled={action}>
                  <FiBookmark /> Đặt trước
                </button>
              </div>
            )}
          </div>
          {book.availableCopies === 0 && (
            <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 10, fontSize: 13, color: '#dc2626' }}>
              Hiện tại sách đã hết. Nhấn "Đặt trước" để được thông báo khi có sẵn.
            </div>
          )}
          {book.availableCopies > 0 && (
            <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 10, fontSize: 13, color: '#92400e' }}>
              <FiInfo size={12} style={{ marginRight: 4 }} />
              Đến thư viện hoặc liên hệ thủ thư để làm thủ tục mượn sách.
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>{book.category?.name}</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{book.title}</h1>
          <p style={{ fontSize: 16, color: '#64748b', marginBottom: 20 }}>Tác giả: <strong>{book.author}</strong></p>

          {book.description && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Mô tả</h3>
              <p style={{ color: '#475569', lineHeight: 1.7 }}>{book.description}</p>
            </div>
          )}

          <div className="card">
            <div className="card-header"><h2>Thông tin sách</h2></div>
            <div className="card-body">
              <table style={{ width: '100%', fontSize: 14 }}>
                <tbody>
                  {[
                    ['ISBN', book.isbn],
                    ['Nhà xuất bản', book.publisher],
                    ['Năm xuất bản', book.publishYear],
                    ['Phiên bản', book.edition],
                    ['Ngôn ngữ', book.language],
                    ['Số trang', book.pages],
                    ['Vị trí', book.location],
                    ['Lượt mượn', book.borrowCount],
                  ].filter(([, v]) => v).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '8px 0', color: '#64748b', width: '40%' }}>{k}</td>
                      <td style={{ padding: '8px 0', fontWeight: 500 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
