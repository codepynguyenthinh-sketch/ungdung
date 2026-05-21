import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiX } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories').then(r => setCategories(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(fetchCategories, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setModal(true); };
  const openEdit = (c) => { setEditing(c.id); setForm({ name: c.name, description: c.description || '' }); setModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/categories/${editing}`, form); toast.success('Cập nhật thể loại thành công'); }
      else { await api.post('/categories', form); toast.success('Thêm thể loại thành công'); }
      setModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi lưu');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa thể loại này? (Nếu còn sách sẽ không thể xóa)')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Đã xóa thể loại');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa thể loại');
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div><h1 style={{ fontSize: 22, fontWeight: 700 }}>Thể loại sách</h1><p style={{ color: '#64748b', marginTop: 4 }}>Quản lý phân loại sách thư viện</p></div>
        <button className="btn btn-primary" onClick={openCreate}><FiPlus /> Thêm thể loại</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {loading ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
          : categories.map(c => (
            <div key={c.id} className="card card-body" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>{c.description || 'Chưa có mô tả'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-secondary btn-icon btn-sm" onClick={() => openEdit(c)}><FiEdit2 size={13} /></button>
                <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(c.id)}>✕</button>
              </div>
            </div>
          ))}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>{editing ? 'Sửa thể loại' : 'Thêm thể loại'}</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Tên thể loại *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="form-group"><label className="form-label">Mô tả</label>
                  <textarea className="form-control" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
