import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import { FiSend } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/messages/my')
      .then(res => setMessages(res.data.data || []))
      .catch(() => toast.error('Không tải được tin nhắn của bạn'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/messages', { subject, body });
      toast.success('Tin nhắn đã được gửi đến admin/thủ thư');
      setSubject('');
      setBody('');
      const res = await api.get('/messages/my');
      setMessages(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Liên hệ admin / thủ thư</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Gửi yêu cầu hoặc phản hồi, admin và thủ thư sẽ nhận được.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tiêu đề</label>
            <input className="form-control" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Nhập tiêu đề" required />
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung</label>
            <textarea className="form-control" value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Nhập tin nhắn của bạn" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={sending}>
            {sending ? 'Đang gửi...' : <><FiSend style={{ marginRight: 8 }} /> Gửi tin nhắn</>}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Lịch sử tin nhắn của bạn</h2>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>Đang tải...</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 24, color: '#64748b' }}>Bạn chưa gửi tin nhắn nào.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Ngày gửi</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(msg => (
                  <tr key={msg.id}>
                    <td>{msg.subject}</td>
                    <td>{new Date(msg.created_at).toLocaleString('vi-VN')}</td>
                    <td>{msg.status === 'new' ? 'Mới' : msg.status === 'read' ? 'Đã đọc' : 'Đã phản hồi'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
