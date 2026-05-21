import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiMail, FiMessageSquare, FiCheck, FiClock, FiUser, FiX, FiSend } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

const STATUS_LABEL = {
  new:     { label: 'Mới',         color: '#ef4444', bg: '#fef2f2' },
  read:    { label: 'Đã đọc',      color: '#f59e0b', bg: '#fffbeb' },
  replied: { label: 'Đã phản hồi', color: '#10b981', bg: '#f0fdf4' },
};

export default function AdminMessages() {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [selected, setSelected]   = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending]     = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages');
      setMessages(res.data.data);
    } catch {
      toast.error('Không thể tải tin nhắn');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const openMessage = async (msg) => {
    setSelected(msg);
    setReplyText(msg.reply || '');
    if (msg.status === 'new') {
      try {
        await api.put(`/messages/${msg.id}/read`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
      } catch {}
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error('Vui lòng nhập nội dung phản hồi');
    setSending(true);
    try {
      await api.put(`/messages/${selected.id}/reply`, { reply: replyText });
      toast.success('Đã gửi phản hồi!');
      setMessages(prev => prev.map(m => m.id === selected.id ? { ...m, status: 'replied', reply: replyText } : m));
      setSelected(prev => ({ ...prev, status: 'replied', reply: replyText }));
    } catch {
      toast.error('Gửi phản hồi thất bại');
    } finally { setSending(false); }
  };

  const filtered = filter === 'all' ? messages : messages.filter(m => m.status === filter);
  const counts = { all: messages.length, new: messages.filter(m => m.status === 'new').length, read: messages.filter(m => m.status === 'read').length, replied: messages.filter(m => m.status === 'replied').length };

  return (
    <Layout>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Tin nhắn từ sinh viên</h2>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 14 }}>Xem và phản hồi các yêu cầu từ sinh viên / độc giả</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all','Tất cả'],['new','Mới'],['read','Đã đọc'],['replied','Đã phản hồi']].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: filter === val ? '#2563eb' : '#f1f5f9',
            color: filter === val ? '#fff' : '#64748b',
            transition: 'all .2s',
          }}>
            {lbl} <span style={{ background: filter===val?'rgba(255,255,255,0.25)':'#e2e8f0', borderRadius: 10, padding: '1px 7px', marginLeft: 4, fontSize: 11 }}>{counts[val]}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Message list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Đang tải...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <FiMail size={32} style={{ marginBottom: 8, opacity: .4 }} /><br />Không có tin nhắn nào
            </div>
          ) : filtered.map(msg => {
            const st = STATUS_LABEL[msg.status];
            const isActive = selected?.id === msg.id;
            return (
              <div key={msg.id} onClick={() => openMessage(msg)} style={{
                background: '#fff', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                border: isActive ? '2px solid #2563eb' : '1px solid #e2e8f0',
                boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,.1)' : '0 1px 3px rgba(0,0,0,.04)',
                transition: 'all .15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {msg.status === 'new' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />}
                      <span style={{ fontWeight: msg.status === 'new' ? 700 : 600, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {msg.subject}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiUser size={11} /> {msg.user?.name} ({msg.user?.email})
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {msg.body}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color }}>{st.label}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiClock size={10} /> {new Date(msg.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 24, height: 'fit-content', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0, flex: 1 }}>{selected.subject}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><FiX size={18} /></button>
            </div>

            {/* Sender info */}
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                  {selected.user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{selected.user?.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{selected.user?.email}</div>
                </div>
              </div>
            </div>

            {/* Message body */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Nội dung</div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selected.body}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiClock size={10} /> {new Date(selected.created_at).toLocaleString('vi-VN')}
              </div>
            </div>

            {/* Existing reply */}
            {selected.reply && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#10b981', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FiCheck size={12} /> Phản hồi đã gửi
                </div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 14px', fontSize: 14, color: '#166534', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selected.reply}
                </div>
              </div>
            )}

            {/* Reply box */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiMessageSquare size={12} /> {selected.reply ? 'Cập nhật phản hồi' : 'Viết phản hồi'}
              </div>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi..."
                rows={4}
                style={{ width: '100%', borderRadius: 8, border: '1px solid #e2e8f0', padding: '10px 12px', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', color: '#374151' }}
              />
              <button onClick={handleReply} disabled={sending || !replyText.trim()} style={{
                marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: sending || !replyText.trim() ? 'not-allowed' : 'pointer',
                background: sending || !replyText.trim() ? '#e2e8f0' : '#2563eb',
                color: sending || !replyText.trim() ? '#94a3b8' : '#fff',
                fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .2s',
              }}>
                <FiSend size={14} /> {sending ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}