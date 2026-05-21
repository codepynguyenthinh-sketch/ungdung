import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiClock, FiBook, FiSend, FiHash, FiAlertCircle, FiCheckCircle, FiBookmark, FiUser, FiLock, FiDollarSign } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusConfig = {
  borrowed: { label: 'Đang mượn', badge: 'badge-success', icon: '📖' },
  renewed:  { label: 'Đã gia hạn', badge: 'badge-info',    icon: '🔄' },
  overdue:  { label: 'Quá hạn',   badge: 'badge-danger',  icon: '⏰' },
  returned: { label: 'Đã trả',    badge: 'badge-gray',    icon: '✅' },
  lost:     { label: 'Mất sách',  badge: 'badge-danger',  icon: '❌' },
};

const CONDITION_VI = { good: 'Tốt', worn: 'Cũ', damaged: 'Hỏng', lost: 'Mất' };

/* ─── Tiêu đề trang ────────────────────────────────────────────── */
function PageHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.3 }}>{title}</h1>
      {subtitle && <p style={{ color: 'var(--muted)', marginTop: 5, fontSize: 14 }}>{subtitle}</p>}
    </div>
  );
}

/* ─── MyBorrowsPage ──────────────────────────────────────────────── */
export function MyBorrowsPage() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [renewing, setRenewing] = useState(null);

  const fetchBorrows = () => {
    setLoading(true);
    api.get('/borrows/my', { params: filter ? { status: filter } : {} })
      .then(r => setBorrows(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBorrows(); }, [filter]);

  const handleRenew = async (id) => {
    setRenewing(id);
    try {
      const res = await api.put(`/borrows/${id}/renew`);
      toast.success(res.data.message || 'Gia hạn thành công!');
      fetchBorrows();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gia hạn');
    } finally { setRenewing(null); }
  };

  const daysLeft = (due) => Math.ceil((new Date(due) - new Date()) / 86400000);

  return (
    <>
      <Navbar />
      <div className="container section">
        <PageHeader title="📖 Sách đang mượn" subtitle="Theo dõi lịch sử mượn sách của bạn" />

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
          {[['', 'Tất cả'], ['borrowed', 'Đang mượn'], ['overdue', 'Quá hạn'], ['returned', 'Đã trả'], ['renewed', 'Đã gia hạn']].map(([v, l]) => (
            <button key={v} className={`cat-pill ${filter === v ? 'active' : ''}`} style={{ fontSize: 13 }}
              onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
        ) : borrows.length === 0 ? (
          <div className="empty">
            <div className="ico">📚</div>
            <h3>Chưa có sách nào</h3>
            <p>Hãy đến thư viện để mượn sách đầu tiên nhé!</p>
            <Link to="/books" className="btn btn-primary" style={{ marginTop: 20 }}>Khám phá sách</Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card" style={{ display: 'none' }} id="borrow-table">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {['Sách', 'Mã ĐKCB', 'Ngày mượn', 'Hạn trả', 'Thế chân', 'Trạng thái', ''].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {borrows.map(b => {
                      const days = daysLeft(b.due_date);
                      const cfg = statusConfig[b.status] || { label: b.status, badge: 'badge-gray' };
                      const canRenew = ['borrowed','renewed'].includes(b.status) && b.renew_count < b.max_renewals && days >= 0;
                      return (
                        <tr key={b.id}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{b.book?.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.book?.author}</div>
                          </td>
                          <td>
                            {b.copy?.copy_code ? (
                              <span className="mono" style={{ color: 'var(--blue)', fontWeight: 600, fontSize: 12 }}>{b.copy.copy_code}</span>
                            ) : '—'}
                          </td>
                          <td style={{ fontSize: 13 }}>{new Date(b.borrow_date).toLocaleDateString('vi-VN')}</td>
                          <td style={{ fontSize: 13 }}>
                            <div style={{ color: b.status !== 'returned' && days < 0 ? 'var(--red)' : days <= 3 && b.status !== 'returned' ? 'var(--yellow)' : 'inherit', fontWeight: (days < 0 || days <= 3) && b.status !== 'returned' ? 600 : 400 }}>
                              {new Date(b.due_date).toLocaleDateString('vi-VN')}
                            </div>
                            {b.status !== 'returned' && (
                              <div style={{ fontSize: 11, color: days < 0 ? 'var(--red)' : days <= 3 ? 'var(--yellow)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <FiClock size={10} /> {days < 0 ? `Trễ ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                              </div>
                            )}
                          </td>
                          <td style={{ fontSize: 13, fontWeight: b.book?.deposit > 0 ? 600 : 400, color: b.book?.deposit > 0 ? 'var(--yellow)' : 'var(--muted)' }}>
                            {b.book?.deposit > 0 ? `${b.book.deposit.toLocaleString('vi-VN')}đ` : '—'}
                          </td>
                          <td><span className={`badge ${cfg.badge}`}>{cfg.icon} {cfg.label}</span></td>
                          <td>
                            {canRenew && (
                              <button className="btn btn-secondary btn-sm" onClick={() => handleRenew(b.id)} disabled={renewing === b.id}>
                                <FiRefreshCw size={12} /> {renewing === b.id ? '...' : 'Gia hạn'}
                              </button>
                            )}
                            {b.fine && !b.fine.is_paid && (
                              <span className="badge badge-danger" style={{ fontSize: 11, marginTop: 4, display: 'flex' }}>
                                Phạt: {b.fine.amount?.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards (always visible) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {borrows.map(b => {
                const days = daysLeft(b.due_date);
                const cfg = statusConfig[b.status] || { label: b.status, badge: 'badge-gray', icon: '?' };
                const canRenew = ['borrowed','renewed'].includes(b.status) && b.renew_count < b.max_renewals && days >= 0;
                const isLate = b.status !== 'returned' && days < 0;
                const isSoon = b.status !== 'returned' && !isLate && days <= 3;

                return (
                  <div key={b.id} className="borrow-card" style={{ borderLeft: `4px solid ${isLate ? 'var(--red)' : isSoon ? 'var(--yellow)' : 'var(--border)'}` }}>
                    {/* Top: title + badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', lineHeight: 1.4 }}>{b.book?.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{b.book?.author}</div>
                      </div>
                      <span className={`badge ${cfg.badge}`} style={{ flexShrink: 0 }}>{cfg.icon} {cfg.label}</span>
                    </div>

                    {/* Mã ĐKCB */}
                    {b.copy?.copy_code && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--blue-light)', borderRadius: 8, marginBottom: 10, width: 'fit-content' }}>
                        <FiHash size={12} color="var(--blue)" />
                        <span className="mono" style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 13 }}>{b.copy.copy_code}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {CONDITION_VI[b.copy.condition]}</span>
                      </div>
                    )}

                    {/* Ngày tháng */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Ngày mượn</div>
                        <div style={{ color: 'var(--text-2)' }}>{new Date(b.borrow_date).toLocaleDateString('vi-VN')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Hạn trả</div>
                        <div style={{ color: isLate ? 'var(--red)' : isSoon ? 'var(--yellow)' : 'var(--text-2)', fontWeight: isLate || isSoon ? 700 : 400 }}>
                          {new Date(b.due_date).toLocaleDateString('vi-VN')}
                        </div>
                        {b.status !== 'returned' && (
                          <div style={{ fontSize: 11, color: isLate ? 'var(--red)' : isSoon ? 'var(--yellow)' : 'var(--muted)', marginTop: 2 }}>
                            {isLate ? `⚠️ Trễ ${Math.abs(days)} ngày` : `⏱ Còn ${days} ngày`}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Thế chân */}
                    {b.book?.deposit > 0 && (
                      <div style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 600, marginBottom: 10 }}>
                        💰 Thế chân: {b.book.deposit.toLocaleString('vi-VN')}đ
                      </div>
                    )}

                    {/* Phí phạt */}
                    {b.fine && !b.fine.is_paid && (
                      <div className="info-box danger" style={{ marginBottom: 10, padding: '8px 12px', fontSize: 13 }}>
                        ⚠️ Phí phạt chưa trả: <strong>{b.fine.amount?.toLocaleString('vi-VN')}đ</strong>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        Gia hạn: {b.renew_count}/{b.max_renewals} lần
                      </span>
                      {canRenew && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleRenew(b.id)} disabled={renewing === b.id}>
                          <FiRefreshCw size={13} /> {renewing === b.id ? 'Đang gia hạn...' : 'Gia hạn'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

const reservationStatusLabels = {
  pending:   { label: 'Chờ xử lý', color: '#d97706' },
  ready:     { label: 'Sẵn sàng nhận', color: '#16a34a' },
  fulfilled: { label: 'Hoàn thành', color: '#0f766e' },
  cancelled: { label: 'Đã hủy', color: '#dc2626' },
};

export function MyReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  const fetchReservations = () => {
    setLoading(true);
    api.get('/reservations/my')
      .then(r => setReservations(r.data.data || []))
      .catch(() => setReservations([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReservations(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có muốn hủy yêu cầu đặt trước này?')) return;
    setCancelling(id);
    try {
      await api.put(`/reservations/${id}/cancel`);
      toast.success('Đã hủy đặt trước');
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể hủy đặt trước');
    } finally { setCancelling(null); }
  };

  return (
    <>
      <Navbar />
      <div className="container section">
        <PageHeader title="🔖 Sách đã đặt trước" subtitle="Danh sách yêu cầu đặt trước của bạn" />

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
        ) : reservations.length === 0 ? (
          <div className="empty">
            <div className="ico">🔖</div>
            <h3>Chưa có đặt trước</h3>
            <p>Trên trang chi tiết sách, bạn có thể đặt trước khi sách đang được mượn hết.</p>
            <Link to="/books" className="btn btn-primary" style={{ marginTop: 20 }}>Khám phá sách</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {reservations.map(item => {
              const status = reservationStatusLabels[item.status] || { label: item.status, color: '#64748b' };
              return (
                <div key={item.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{item.book?.title || 'Không rõ tựa sách'}</div>
                      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{item.book?.author || 'Không rõ tác giả'}</div>
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#475569' }}>Ngày đặt: {new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
                        <span style={{ fontSize: 12, color: '#475569' }}>Mã đặt: #{item.id}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: status.color, background: `${status.color}15`, padding: '6px 10px', borderRadius: 999 }}>{status.label}</span>
                      {item.status === 'pending' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(item.id)} disabled={cancelling === item.id}>
                          <FiBookmark size={14} /> {cancelling === item.id ? 'Đang hủy...' : 'Hủy đặt trước'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* ─── MessagesPage ───────────────────────────────────────────────── */
export function MessagesPage() {
  const [searchParams] = useSearchParams();
  const bookTitle = searchParams.get('title') || '';
  const [form, setForm] = useState({
    subject: bookTitle ? `Hỏi về sách: ${bookTitle}` : '',
    body: bookTitle ? `Xin chào, tôi muốn hỏi về cuốn sách "${bookTitle}". ` : '',
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = () => {
    setLoadingHistory(true);
    api.get('/messages/my').then(r => setHistory(r.data.data || [])).catch(() => {}).finally(() => setLoadingHistory(false));
  };
  useEffect(() => { fetchHistory(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.body.trim() || !form.subject.trim()) { toast.error('Vui lòng điền đầy đủ thông tin'); return; }
    setSending(true);
    try {
      await api.post('/messages', { subject: form.subject, body: form.body });
      toast.success('Đã gửi tin nhắn! Thủ thư sẽ phản hồi sớm 💬');
      setSent(true);
      setForm({ subject: '', body: '' });
      fetchHistory();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi gửi tin nhắn'); }
    finally { setSending(false); }
  };

  const msgStatusConfig = {
    new:     { label: 'Chờ phản hồi', badge: 'badge-warning' },
    read:    { label: 'Đã xem',       badge: 'badge-blue' },
    replied: { label: 'Đã phản hồi',  badge: 'badge-success' },
  };

  return (
    <>
      <Navbar />
      <div className="container section">
        <PageHeader title="💬 Liên hệ thủ thư" subtitle="Gửi câu hỏi hoặc yêu cầu — chúng tôi phản hồi sớm nhất có thể" />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px,1fr) minmax(280px,1fr)', gap: 24, alignItems: 'start' }}>
          {/* Form */}
          <div>
            <div className="card card-body">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiSend size={16} color="var(--blue)" /> Gửi tin nhắn mới
              </div>

              {sent && (
                <div className="info-box success" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiCheckCircle size={15} /> Tin nhắn đã gửi thành công!
                </div>
              )}

              <form onSubmit={handleSend}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề *</label>
                  <input className="form-control" placeholder="Tóm tắt nội dung cần hỏi..."
                    value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nội dung *</label>
                  <textarea className="form-control" style={{ minHeight: 120 }}
                    placeholder="Mô tả chi tiết câu hỏi hoặc yêu cầu của bạn..."
                    value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required />
                </div>
                <button className="btn btn-primary btn-block" type="submit" disabled={sending}>
                  <FiSend size={14} /> {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>
              </form>
            </div>

            {/* Contact info */}
            <div className="card card-body" style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📍 Thông tin liên hệ</div>
              {[['🕐','Giờ mở cửa','Thứ 2–7: 7:30–17:00'],['📞','Điện thoại','(028) 1234 5678'],['📧','Email','thuvien@truong.edu.vn'],['📍','Địa chỉ','Tòa nhà A, Tầng 1']].map(([i,l,v]) => (
                <div key={l} style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 14 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{i}</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{l}</div>
                    <div style={{ color: 'var(--text-2)' }}>{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--text)' }}>📋 Lịch sử tin nhắn</div>
            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : history.length === 0 ? (
              <div className="card card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <p style={{ fontSize: 14 }}>Chưa có tin nhắn nào</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map(msg => {
                  const cfg = msgStatusConfig[msg.status] || { label: msg.status, badge: 'badge-gray' };
                  return (
                    <div key={msg.id} className="card card-body">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{msg.subject}</div>
                        <span className={`badge ${cfg.badge}`} style={{ flexShrink: 0 }}>{cfg.label}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>{msg.body}</p>
                      {msg.reply && (
                        <div style={{ background: 'var(--green-light)', border: '1px solid #86efac', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 13, color: '#166534' }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>📩 Phản hồi từ thủ thư:</div>
                          {msg.reply}
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        🕐 {new Date(msg.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <style>{`@media(max-width:768px){.msg-grid{grid-template-columns:1fr!important;}}`}</style>
      </div>
    </>
  );
}

/* ─── ProfilePage ────────────────────────────────────────────────── */
export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm]   = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [fines, setFines]     = useState([]);
  const [tab, setTab]         = useState('info');

  useEffect(() => { api.get('/fines/my').then(r => setFines(r.data.data || [])); }, []);

  const handleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/users/profile/me', form);
      setUser(res.data.data);
      localStorage.setItem('student_user', JSON.stringify(res.data.data));
      toast.success('Cập nhật thành công! ✅');
    } catch { toast.error('Lỗi cập nhật'); }
    finally { setLoading(false); }
  };

  const handlePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) { toast.error('Mật khẩu xác nhận không khớp'); return; }
    if (pwForm.newPassword.length < 6) { toast.error('Mật khẩu tối thiểu 6 ký tự'); return; }
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success('Đổi mật khẩu thành công! 🔐');
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi đổi mật khẩu'); }
  };

  const unpaid = fines.filter(f => !f.is_paid).reduce((s, f) => s + f.amount, 0);

  return (
    <>
      <Navbar />
      <div className="container section">
        <PageHeader title="👤 Tài khoản của tôi" subtitle="Quản lý thông tin và bảo mật tài khoản" />

        {/* Profile header */}
        <div className="card card-body" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{user?.name}</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 3 }}>{user?.email}</div>
            {user?.student_id && (
              <span className="badge badge-blue" style={{ marginTop: 6, fontSize: 12 }}>🎓 {user.student_id}</span>
            )}
          </div>
          {unpaid > 0 && (
            <div style={{ padding: '10px 16px', background: 'var(--red-light)', border: '1px solid #fca5a5', borderRadius: 10, fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>
              ⚠️ Nợ phạt: {unpaid.toLocaleString('vi-VN')}đ
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {[['info','👤 Thông tin'],['password','🔐 Mật khẩu'],['fines','💰 Phí phạt']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              flex: 1, padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: tab === v ? 'var(--surface)' : 'transparent',
              color: tab === v ? 'var(--blue)' : 'var(--muted)',
              fontWeight: tab === v ? 700 : 400, fontSize: 14,
              boxShadow: tab === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>

        {/* Tab: Info */}
        {tab === 'info' && (
          <div className="card card-body">
            <form onSubmit={handleProfile}>
              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input className="form-control" placeholder="0901234567" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Địa chỉ</label>
                <textarea className="form-control" style={{ minHeight: 80 }} placeholder="Địa chỉ liên hệ..." value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'Đang lưu...' : '✅ Lưu thay đổi'}
              </button>
            </form>
          </div>
        )}

        {/* Tab: Password */}
        {tab === 'password' && (
          <div className="card card-body">
            <form onSubmit={handlePw}>
              <div className="form-group">
                <label className="form-label">Mật khẩu hiện tại</label>
                <input className="form-control" type="password" placeholder="••••••••" value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới</label>
                <input className="form-control" type="password" placeholder="Tối thiểu 6 ký tự" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu mới</label>
                <input className="form-control" type="password" placeholder="Nhập lại mật khẩu mới" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required />
              </div>
              <button className="btn btn-primary" type="submit">🔐 Đổi mật khẩu</button>
            </form>
          </div>
        )}

        {/* Tab: Fines */}
        {tab === 'fines' && (
          <div>
            {unpaid > 0 ? (
              <div className="info-box danger" style={{ marginBottom: 16 }}>
                <FiAlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                Bạn có <strong>{unpaid.toLocaleString('vi-VN')}đ</strong> phí phạt chưa thanh toán. Vui lòng đến quầy thư viện để nộp phí.
              </div>
            ) : (
              <div className="info-box success" style={{ marginBottom: 16 }}>
                <FiCheckCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                Bạn không có phí phạt nào. Tiếp tục mượn sách đúng hạn nhé! 🎉
              </div>
            )}
            {fines.length > 0 ? (
              <div className="card">
                <div className="table-wrapper">
                  <table>
                    <thead><tr>{['Sách','Ngày phạt','Số ngày trễ','Tiền phạt','Trạng thái'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {fines.map(f => (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 500 }}>{f.borrow?.book?.title || '—'}</td>
                          <td style={{ fontSize: 13 }}>{f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                          <td style={{ fontSize: 13 }}>{f.overdue_days} ngày</td>
                          <td style={{ fontWeight: 700, color: f.is_paid ? 'var(--green)' : 'var(--red)' }}>
                            {f.amount.toLocaleString('vi-VN')}đ
                          </td>
                          <td>
                            <span className={`badge ${f.is_paid ? 'badge-success' : 'badge-danger'}`}>
                              {f.is_paid ? '✅ Đã trả' : '⚠️ Chưa trả'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty">
                <div className="ico">🎉</div>
                <h3>Không có phí phạt nào</h3>
              </div>
            )}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <Link to="/my-fines" className="btn btn-secondary btn-sm">Xem chi tiết phí phạt →</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ─── MyFinesPage ─────────────────────────────────────────────── */
export function MyFinesPage() {
  const [fines, setFines] = useState([]);
  const [overdue, setOverdue] = useState({ borrows: [], totalFineOwed: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/fines/my'),
      api.get('/fines/my/overdue').catch(() => ({ data: { data: { borrows: [], totalFineOwed: 0, count: 0 } } })),
    ]).then(([finesRes, overdueRes]) => {
      setFines(finesRes.data.data || []);
      setOverdue(overdueRes.data.data || { borrows: [], totalFineOwed: 0, count: 0 });
    }).finally(() => setLoading(false));
  }, []);

  const filteredFines = filter === 'paid' ? fines.filter(f => f.is_paid)
    : filter === 'unpaid' ? fines.filter(f => !f.is_paid)
    : fines;

  const totalUnpaid = fines.filter(f => !f.is_paid).reduce((s, f) => s + f.amount, 0);
  const totalPaid = fines.filter(f => f.is_paid).reduce((s, f) => s + f.amount, 0);

  return (
    <>
      <Navbar />
      <div className="container section">
        <PageHeader title="💰 Phí phạt của tôi" subtitle="Theo dõi các khoản phí phạt và tình trạng thanh toán" />

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div className="card card-body" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Tổng phí phạt</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                  {(totalUnpaid + totalPaid).toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="card card-body" style={{ textAlign: 'center', borderLeft: '3px solid var(--red)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Chưa thanh toán</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)' }}>
                  {totalUnpaid.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div className="card card-body" style={{ textAlign: 'center', borderLeft: '3px solid var(--green)' }}>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Đã thanh toán</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>
                  {totalPaid.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* Overdue warning */}
            {overdue.count > 0 && (
              <div style={{
                padding: '14px 18px', marginBottom: 20, borderRadius: 10,
                background: '#fef2f2', border: '1px solid #fca5a5',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <FiAlertCircle size={20} color="#dc2626" />
                <div>
                  <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
                    Bạn có {overdue.count} sách quá hạn!
                  </div>
                  <div style={{ fontSize: 13, color: '#991b1b', marginTop: 2 }}>
                    Tiền phạt ước tính: {overdue.totalFineOwed.toLocaleString('vi-VN')}đ. Vui lòng trả sách sớm.
                  </div>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
              {[['', 'Tất cả'], ['unpaid', 'Chưa trả'], ['paid', 'Đã trả']].map(([v, l]) => (
                <button key={v} className={`cat-pill ${filter === v ? 'active' : ''}`} style={{ fontSize: 13 }}
                  onClick={() => setFilter(v)}>{l}</button>
              ))}
            </div>

            {/* Fines list */}
            {filteredFines.length > 0 ? (
              <div className="card">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        {['Sách', 'Lý do', 'Ngày phạt', 'Số ngày trễ', 'Tiền phạt', 'Trạng thái'].map(h => <th key={h}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFines.map(f => {
                        const reasonVi = { overdue: 'Quá hạn', damaged: 'Hỏng sách', lost: 'Mất sách', deposit: 'Thế chân' };
                        return (
                          <tr key={f.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{f.borrow?.book?.title || '—'}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{f.borrow?.book?.author || ''}</div>
                            </td>
                            <td><span className="badge badge-gray">{reasonVi[f.reason] || f.reason}</span></td>
                            <td style={{ fontSize: 13 }}>{f.created_at ? new Date(f.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                            <td style={{ fontSize: 13 }}>{f.overdue_days > 0 ? `${f.overdue_days} ngày` : '—'}</td>
                            <td style={{ fontWeight: 700, color: f.is_paid ? 'var(--green)' : 'var(--red)' }}>
                              {f.amount.toLocaleString('vi-VN')}đ
                            </td>
                            <td>
                              <span className={`badge ${f.is_paid ? 'badge-success' : 'badge-danger'}`}>
                                {f.is_paid ? 'Đã trả' : 'Chưa trả'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty">
                <div className="ico">🎉</div>
                <h3>Không có phí phạt nào</h3>
                <p>Tuyệt vời! Bạn không có khoản phạt nào.</p>
              </div>
            )}

            {/* Overdue books detail */}
            {overdue.borrows.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>📚 Sách đang quá hạn</h3>
                <div className="card">
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>{['Sách', 'Hạn trả', 'Quá hạn', 'Phạt ước tính'].map(h => <th key={h}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {overdue.borrows.map((b, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{b.bookTitle || '—'}</td>
                            <td style={{ fontSize: 13 }}>{b.dueDate ? new Date(b.dueDate).toLocaleDateString('vi-VN') : '—'}</td>
                            <td style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>{b.daysOverdue} ngày</td>
                            <td style={{ fontWeight: 700, color: 'var(--red)' }}>{(b.fineAmount || 0).toLocaleString('vi-VN')}đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
