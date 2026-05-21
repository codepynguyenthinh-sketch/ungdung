// student-client/src/pages/OtherPages.js  (THAY THẾ TOÀN BỘ FILE)
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiClock, FiBook, FiSend, FiHash } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const statusMap = {
  borrowed: ['Đang mượn', 'badge-success'],
  renewed:  ['Đã gia hạn', 'badge-info'],
  overdue:  ['Quá hạn', 'badge-danger'],
  returned: ['Đã trả', 'badge-gray'],
  lost:     ['Mất sách', 'badge-danger'],
};

const CONDITION_VI = { good: 'Tốt', worn: 'Cũ', damaged: 'Hỏng', lost: 'Mất' };

// ─── MyBorrowsPage ───────────────────────────────────────────────────────────
export function MyBorrowsPage() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');
  const [renewing, setRenewing] = useState(null);

  const fetchBorrows = () => {
    setLoading(true);
    const params = filter ? { status: filter } : {};
    api.get('/borrows/my', { params }).then(r => setBorrows(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBorrows(); }, [filter]);

  const handleRenew = async (id) => {
    setRenewing(id);
    try {
      await api.put(`/borrows/${id}/renew`);
      toast.success('Gia hạn thành công!');
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
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Sách đang mượn</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Quản lý sách bạn đang mượn và lịch sử</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[['', 'Tất cả'], ['borrowed', 'Đang mượn'], ['overdue', 'Quá hạn'], ['returned', 'Đã trả'], ['renewed', 'Gia hạn']].map(([v, l]) => (
            <button key={v} className={`btn ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>

        {/* Mobile: card view */}
        <div style={{ display: 'none' }} className="borrow-cards">
          {borrows.map(b => <BorrowCard key={b.id} b={b} onRenew={handleRenew} renewing={renewing} daysLeft={daysLeft} />)}
        </div>

        {/* Desktop: table view */}
        <div className="card">
          {loading
            ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" /></div>
            : borrows.length === 0
              ? <div className="empty"><div className="ico">📖</div><h3>Chưa có lịch sử mượn</h3></div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['Sách', 'Mã cá biệt', 'Ngày mượn', 'Hạn trả', 'Trạng thái', 'Gia hạn', ''].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {borrows.map(b => {
                        const days = daysLeft(b.due_date);
                        const canRenew = ['borrowed', 'renewed'].includes(b.status) && b.renew_count < b.max_renewals && days >= 0;
                        return (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <FiBook color="#2563eb" />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{b.book?.title}</div>
                                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.book?.author}</div>
                                </div>
                              </div>
                            </td>

                            {/* Mã cá biệt */}
                            <td style={{ padding: '12px 14px' }}>
                              {b.copy ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <FiHash size={11} color="#2563eb" />
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>
                                      {b.copy.copy_code}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                    Tình trạng: {CONDITION_VI[b.copy.condition] || b.copy.condition}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                              )}
                            </td>

                            <td style={{ padding: '12px 14px', fontSize: 13 }}>
                              {new Date(b.borrow_date).toLocaleDateString('vi-VN')}
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13 }}>
                              <div>{new Date(b.due_date).toLocaleDateString('vi-VN')}</div>
                              {b.status !== 'returned' && (
                                <div style={{ fontSize: 11, color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : 'var(--muted)' }}>
                                  <FiClock size={10} /> {days < 0 ? `Trễ ${Math.abs(days)} ngày` : `Còn ${days} ngày`}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span className={`badge ${statusMap[b.status]?.[1]}`}>{statusMap[b.status]?.[0]}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>
                              {b.renew_count}/{b.max_renewals}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {canRenew && (
                                <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 13 }}
                                  onClick={() => handleRenew(b.id)} disabled={renewing === b.id}>
                                  <FiRefreshCw size={12} /> {renewing === b.id ? '...' : 'Gia hạn'}
                                </button>
                              )}
                              {b.fine && !b.fine.is_paid && (
                                <span className="badge badge-danger" style={{ fontSize: 11 }}>
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
              )}
        </div>
      </div>
    </>
  );
}

// Card view cho mobile
function BorrowCard({ b, onRenew, renewing, daysLeft }) {
  const days = daysLeft(b.due_date);
  const canRenew = ['borrowed', 'renewed'].includes(b.status) && b.renew_count < b.max_renewals && days >= 0;
  const [sLabel, sBadge] = statusMap[b.status] || ['?', ''];
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{b.book?.title}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{b.book?.author}</div>
        </div>
        <span className={`badge ${sBadge}`} style={{ flexShrink: 0, marginLeft: 8 }}>{sLabel}</span>
      </div>

      {b.copy && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '6px 10px', background: '#eff6ff', borderRadius: 8 }}>
          <FiHash size={13} color="#2563eb" />
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: '#1e40af' }}>{b.copy.copy_code}</span>
          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>· {CONDITION_VI[b.copy.condition]}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
        <div>📅 Mượn: {new Date(b.borrow_date).toLocaleDateString('vi-VN')}</div>
        <div style={{ color: days < 0 ? '#dc2626' : days <= 3 ? '#d97706' : 'inherit' }}>
          ⏰ Hạn: {new Date(b.due_date).toLocaleDateString('vi-VN')}
          {b.status !== 'returned' && <span style={{ display: 'block', fontSize: 11 }}>{days < 0 ? `Trễ ${Math.abs(days)} ngày` : `Còn ${days} ngày`}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {canRenew && (
          <button className="btn btn-secondary btn-sm" onClick={() => onRenew(b.id)} disabled={renewing === b.id}>
            <FiRefreshCw size={12} /> {renewing === b.id ? '...' : 'Gia hạn'}
          </button>
        )}
        {b.fine && !b.fine.is_paid && (
          <span className="badge badge-danger" style={{ fontSize: 11 }}>Phạt: {b.fine.amount?.toLocaleString('vi-VN')}đ</span>
        )}
      </div>
    </div>
  );
}

// ─── MessagesPage ─────────────────────────────────────────────────────────────
export function MessagesPage() {
  const [searchParams] = useSearchParams();
  const bookTitle = searchParams.get('title') || '';
  const [form, setForm] = useState({
    subject: bookTitle ? `Hỏi về sách: ${bookTitle}` : '',
    body: bookTitle ? `Xin chào, tôi muốn hỏi về cuốn sách "${bookTitle}". ` : '',
    type: 'general',
  });
  const [sending, setSending]           = useState(false);
  const [sent, setSent]                 = useState(false);
  const [history, setHistory]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = () => {
    setLoadingHistory(true);
    api.get('/messages/my').then(r => setHistory(r.data.data)).catch(() => {}).finally(() => setLoadingHistory(false));
  };
  useEffect(() => { fetchHistory(); }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.body.trim()) return toast.error('Vui lòng nhập nội dung');
    if (!form.subject.trim()) return toast.error('Vui lòng nhập tiêu đề');
    setSending(true);
    try {
      await api.post('/messages', { subject: form.subject, body: form.body });
      toast.success('Đã gửi tin nhắn đến thủ thư!');
      setSent(true);
      setForm({ subject: '', body: '', type: 'general' });
      fetchHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi gửi tin nhắn');
    } finally { setSending(false); }
  };

  const statusLabel = { new: 'Đã gửi, chờ phản hồi', read: 'Đã xem', replied: 'Đã phản hồi' };
  const statusClass = { new: 'badge-warning', read: 'badge-info', replied: 'badge-success' };

  return (
    <>
      <Navbar />
      <div className="container section">
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Liên hệ thủ thư</h1>
        <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Gửi câu hỏi hoặc yêu cầu đến thủ thư.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="msg-form">
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>📩 Gửi tin nhắn mới</h3>
              {sent && <div className="info-box info" style={{ marginBottom: 16 }}>✓ Tin nhắn đã được gửi!</div>}
              <form onSubmit={handleSend}>
                <div className="form-group">
                  <label className="form-label">Loại yêu cầu</label>
                  <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="general">Câu hỏi chung</option>
                    <option value="borrow">Hỏi về mượn sách</option>
                    <option value="reserve">Đặt trước sách</option>
                    <option value="renew">Gia hạn sách</option>
                    <option value="fine">Phí phạt</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tiêu đề</label>
                  <input className="form-control" placeholder="Tiêu đề tin nhắn..." value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Nội dung *</label>
                  <textarea className="form-control msg-form" placeholder="Nhập nội dung..." value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required />
                </div>
                <button className="btn btn-primary" type="submit" disabled={sending} style={{ width: '100%', justifyContent: 'center' }}>
                  <FiSend /> {sending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>
              </form>
            </div>
            <div className="card card-body" style={{ marginTop: 16 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>📍 Thông tin liên hệ</h4>
              {[['🕐', 'Giờ làm việc', 'Thứ 2 - Thứ 7: 7:30 - 17:00'], ['📞', 'Điện thoại', '(028) 1234 5678'], ['📧', 'Email', 'thuvien@truong.edu.vn'], ['📍', 'Địa chỉ', 'Tòa nhà A, Tầng 1']].map(([ico, label, val]) => (
                <div key={label} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>{ico}</span>
                  <div><div style={{ fontWeight: 600, fontSize: 12, color: 'var(--muted)' }}>{label}</div><div>{val}</div></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 16 }}>📋 Lịch sử tin nhắn</h3>
            {loadingHistory ? <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" /></div>
              : history.length === 0
                ? <div className="card card-body" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}><div style={{ fontSize: 40, marginBottom: 10 }}>💬</div><p>Chưa có tin nhắn nào</p></div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {history.map(msg => (
                      <div key={msg.id} className="card card-body">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{msg.subject}</div>
                          <span className="badge badge-info" style={{ fontSize: 11, flexShrink: 0 }}>Chung</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#475569', marginBottom: 10, lineHeight: 1.6 }}>{msg.body}</p>
                        {msg.reply && (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#166534' }}>
                            <strong>Phản hồi:</strong> {msg.reply}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                          <span>🕐 {new Date(msg.created_at).toLocaleString('vi-VN')}</span>
                          <span className={`badge ${statusClass[msg.status] || 'badge-warning'}`}>{statusLabel[msg.status] || msg.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── ProfilePage ─────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm]   = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [fines, setFines]     = useState([]);

  useEffect(() => { api.get('/fines/my').then(r => setFines(r.data.data)); }, []);

  const handleProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/users/profile/me', form);
      setUser(res.data.data);
      localStorage.setItem('student_user', JSON.stringify(res.data.data));
      toast.success('Cập nhật thành công');
    } catch { toast.error('Lỗi cập nhật'); }
    finally { setLoading(false); }
  };

  const handlePw = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Mật khẩu không khớp');
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success('Đổi mật khẩu thành công');
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi'); }
  };

  const unpaid = fines.filter(f => !f.is_paid).reduce((s, f) => s + f.amount, 0);

  return (
    <>
      <Navbar />
      <div className="container section">
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Tài khoản của tôi</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Thông tin cá nhân</div>
            <div className="card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>{user?.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</div>
                  {user?.student_id && <div style={{ fontSize: 12, marginTop: 2 }}><span className="badge badge-info">SV: {user.student_id}</span></div>}
                </div>
              </div>
              <form onSubmit={handleProfile}>
                <div className="form-group"><label className="form-label">Họ tên</label><input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Số điện thoại</label><input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Địa chỉ</label><textarea className="form-control" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ minHeight: 70 }} /></div>
                <button className="btn btn-primary" type="submit" disabled={loading}>Lưu thay đổi</button>
              </form>
            </div>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Đổi mật khẩu</div>
              <div className="card-body">
                <form onSubmit={handlePw}>
                  <div className="form-group"><label className="form-label">Mật khẩu hiện tại</label><input className="form-control" type="password" value={pwForm.oldPassword} onChange={e => setPwForm({ ...pwForm, oldPassword: e.target.value })} required /></div>
                  <div className="form-group"><label className="form-label">Mật khẩu mới</label><input className="form-control" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} /></div>
                  <div className="form-group"><label className="form-label">Xác nhận</label><input className="form-control" type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required /></div>
                  <button className="btn btn-primary" type="submit">Đổi mật khẩu</button>
                </form>
              </div>
            </div>
            <div className="card">
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Phí phạt</div>
              <div className="card-body">
                {unpaid > 0
                  ? <div className="info-box danger">Bạn có <strong>{unpaid.toLocaleString('vi-VN')}đ</strong> phí phạt chưa thanh toán. Đến quầy thư viện để nộp phí.</div>
                  : <div className="info-box" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>✓ Không có phí phạt nào!</div>}
                {fines.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {fines.slice(0, 3).map(f => (
                      <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                        <span>{f.borrow?.book?.title}</span>
                        <span style={{ fontWeight: 600, color: f.is_paid ? '#16a34a' : '#dc2626' }}>{f.amount.toLocaleString('vi-VN')}đ {f.is_paid ? '✓' : '⚠'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
