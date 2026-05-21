import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiEdit2, FiX, FiShield, FiCheck, FiMinus, FiUser, FiLock, FiDownload, FiUpload, FiTrash2 } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// ── Danh sách TẤT CẢ quyền có thể gán ───────────────────────────────────
const ALL_PERMISSIONS = [
  { key: 'books.view',        label: 'Xem danh mục sách',             group: 'Sách' },
  { key: 'books.create',      label: 'Thêm sách mới',                 group: 'Sách' },
  { key: 'books.edit',        label: 'Sửa thông tin sách',            group: 'Sách' },
  { key: 'books.delete',      label: 'Xóa sách',                      group: 'Sách' },
  { key: 'books.pdf',         label: 'Upload & quản lý PDF',          group: 'Sách' },
  { key: 'borrows.view',      label: 'Xem phiếu mượn',                group: 'Mượn trả' },
  { key: 'borrows.create',    label: 'Tạo phiếu mượn',               group: 'Mượn trả' },
  { key: 'borrows.return',    label: 'Xử lý trả sách',               group: 'Mượn trả' },
  { key: 'fines.view',        label: 'Xem phí phạt',                  group: 'Phạt' },
  { key: 'fines.manage',      label: 'Thu & xử lý phí phạt',         group: 'Phạt' },
  { key: 'users.view',        label: 'Xem danh sách người dùng',      group: 'Người dùng' },
  { key: 'users.edit',        label: 'Sửa thông tin người dùng',      group: 'Người dùng' },
  { key: 'users.role',        label: 'Phân quyền & đổi vai trò',     group: 'Người dùng' },
  { key: 'users.lock',        label: 'Khóa / mở tài khoản',          group: 'Người dùng' },
  { key: 'categories.manage', label: 'Quản lý thể loại sách',        group: 'Danh mục' },
  { key: 'messages.view',     label: 'Xem tin nhắn từ sinh viên',    group: 'Tin nhắn' },
  { key: 'messages.reply',    label: 'Trả lời tin nhắn',             group: 'Tin nhắn' },
  { key: 'stats.view',        label: 'Xem báo cáo & thống kê',       group: 'Báo cáo' },
  { key: 'copies.manage',     label: 'Quản lý bản cá biệt (ĐKCB)',   group: 'Sách' },
];

// Quyền mặc định theo role
const DEFAULT_PERMS = {
  admin: ALL_PERMISSIONS.map(p => p.key),
  librarian: [
    'books.view','books.create','books.edit','books.pdf','copies.manage',
    'borrows.view','borrows.create','borrows.return',
    'fines.view','fines.manage',
    'categories.manage',
    'messages.view','messages.reply',
    'stats.view',
  ],
  user: [],
};

const GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

const ROLE_LABELS = {
  admin:     { label: 'Quản trị viên', color: '#dc2626', bg: '#fef2f2' },
  librarian: { label: 'Thủ thư',       color: '#2563eb', bg: '#eff6ff' },
  user:      { label: 'Độc giả',       color: '#64748b', bg: '#f8fafc' },
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [importModal, setImportModal]     = useState(false);
  const [importFile, setImportFile]       = useState(null);
  const [isImporting, setIsImporting]     = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', student_id: '', role: 'user', is_active: true, permissions: [],
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search)     params.search = search;
      if (filterRole) params.role   = filterRole;
      const res = await api.get('/users', { params });
      setUsers(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } finally { setLoading(false); }
  }, [page, search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openEdit = (u) => {
    setEditing(u.id);
    // Nếu user chưa có permissions tùy chỉnh → lấy mặc định theo role
    const perms = u.permissions?.length > 0 ? u.permissions : DEFAULT_PERMS[u.role] || [];
    setForm({ name: u.name, phone: u.phone || '', student_id: u.student_id || '',
      role: u.role, is_active: u.is_active, permissions: perms });
    setModal(true);
  };

  // Khi đổi role → reset permissions về mặc định của role đó
  const handleRoleChange = (newRole) => {
    setForm(f => ({ ...f, role: newRole, permissions: DEFAULT_PERMS[newRole] || [] }));
  };

  const togglePerm = (key) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }));
  };

  const toggleGroup = (group) => {
    const groupKeys = ALL_PERMISSIONS.filter(p => p.group === group).map(p => p.key);
    const allOn = groupKeys.every(k => form.permissions.includes(k));
    setForm(f => ({
      ...f,
      permissions: allOn
        ? f.permissions.filter(k => !groupKeys.includes(k))
        : [...new Set([...f.permissions, ...groupKeys])],
    }));
  };

  const selectAll   = () => setForm(f => ({ ...f, permissions: ALL_PERMISSIONS.map(p => p.key) }));
  const clearAll    = () => setForm(f => ({ ...f, permissions: [] }));
  const resetToRole = () => setForm(f => ({ ...f, permissions: DEFAULT_PERMS[f.role] || [] }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${editing}`, form);
      toast.success('Cập nhật thành công');
      setModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật');
    } finally { setSaving(false); }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa sinh viên "${userName}" khỏi hệ thống?\n\nLưu ý: Không thể xóa sinh viên nếu còn sách đang mượn!`)) return;
    
    try {
      await api.delete(`/users/${userId}`);
      toast.success(`Đã xóa sinh viên ${userName}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi xóa sinh viên');
    }
  };

  // Export/Import
  const handleExportUsers = async () => {
    try {
      const response = await api.get('/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Tải xuống danh sách sinh viên thành công!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi tải xuống file');
    }
  };

  const handleImportUsers = async () => {
    if (!importFile) {
      toast.error('Vui lòng chọn file Excel');
      return;
    }
    
    setIsImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const response = await api.post('/users/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      toast.success(`✅ Import thành công! Đã thêm ${response.data.data?.added || 0} sinh viên, cập nhật ${response.data.data?.updated || 0} sinh viên`);
      setImportModal(false);
      setImportFile(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi import file');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Quản lý người dùng</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>Phân quyền và quản lý tài khoản</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportUsers} title="Xuất danh sách sinh viên ra file Excel">
            <FiDownload /> Xuất Excel
          </button>
          <button className="btn btn-secondary" onClick={() => setImportModal(true)} title="Nhập danh sách sinh viên từ file Excel">
            <FiUpload /> Nhập Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input className="form-control" style={{ paddingLeft: 36 }} placeholder="Tìm theo tên, email, mã SV..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {[['', 'Tất cả'], ['user', 'Độc giả'], ['librarian', 'Thủ thư'], ['admin', 'Admin']].map(([v, l]) => (
          <button key={v} className={`btn ${filterRole === v ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setFilterRole(v); setPage(1); }}>{l}</button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {loading
          ? <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Người dùng</th><th>Mã SV</th><th>Vai trò</th>
                    <th>Quyền đang có</th><th>Lượt mượn</th><th>Nợ phạt</th><th>Trạng thái</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const ri = ROLE_LABELS[u.role] || ROLE_LABELS.user;
                    const permCount = u.permissions?.length || 0;
                    const defaultCount = DEFAULT_PERMS[u.role]?.length || 0;
                    const isCustom = permCount > 0 && permCount !== defaultCount;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: ri.bg,
                              border: `2px solid ${ri.color}20`, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontWeight: 700, fontSize: 14, color: ri.color }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{u.student_id || '—'}</td>
                        <td>
                          <span style={{ background: ri.bg, color: ri.color, border: `1px solid ${ri.color}30`,
                            borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                            {ri.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                              {permCount}/{ALL_PERMISSIONS.length}
                            </span>
                            {isCustom && (
                              <span style={{ fontSize: 10, background: '#fef9c3', color: '#92400e',
                                padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>Tùy chỉnh</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{u.borrow_count || 0}</td>
                        <td style={{ fontSize: 13, fontWeight: u.unpaid_fines > 0 ? 600 : 400,
                          color: u.unpaid_fines > 0 ? '#dc2626' : 'inherit' }}>
                          {u.unpaid_fines > 0 ? `${u.unpaid_fines.toLocaleString('vi-VN')}đ` : '—'}
                        </td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {u.is_active ? 'Hoạt động' : 'Bị khóa'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)} title="Sửa & phân quyền">
                            <FiShield size={13} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id, u.name)} title="Xóa sinh viên" style={{ marginLeft: 4 }}>
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        {totalPages > 1 && (
          <div className="pagination" style={{ padding: '12px 0' }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</button>
          </div>
        )}
      </div>

      {/* ── Modal phân quyền ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 680, width: '95vw' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiShield size={18} color="#2563eb" /> Phân quyền người dùng
              </h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setModal(false)}><FiX /></button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

                {/* Thông tin cơ bản */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Họ tên</label>
                    <input className="form-control" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mã SV</label>
                    <input className="form-control" value={form.student_id}
                      onChange={e => setForm({ ...form, student_id: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SĐT</label>
                    <input className="form-control" value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vai trò</label>
                    <select className="form-control" value={form.role} onChange={e => handleRoleChange(e.target.value)}>
                      <option value="user">Độc giả</option>
                      <option value="librarian">Thủ thư</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-control" value={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <option value="true">Hoạt động</option>
                      <option value="false">Khóa tài khoản</option>
                    </select>
                  </div>
                </div>

                {/* Phân quyền */}
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>⚙️ Quyền hạn chi tiết</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                        ({form.permissions.length}/{ALL_PERMISSIONS.length} quyền được chọn)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={resetToRole}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#374151' }}>
                        Reset theo vai trò
                      </button>
                      <button type="button" onClick={selectAll}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: 'pointer', color: '#16a34a' }}>
                        Tất cả
                      </button>
                      <button type="button" onClick={clearAll}
                        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', color: '#dc2626' }}>
                        Bỏ hết
                      </button>
                    </div>
                  </div>

                  {/* Checkbox theo nhóm */}
                  {GROUPS.map(group => {
                    const groupPerms = ALL_PERMISSIONS.filter(p => p.group === group);
                    const allOn  = groupPerms.every(p => form.permissions.includes(p.key));
                    const someOn = groupPerms.some(p => form.permissions.includes(p.key));
                    return (
                      <div key={group} style={{ marginBottom: 14, background: '#f8fafc', borderRadius: 10, overflow: 'hidden', border: '1px solid #e8ecf0' }}>
                        {/* Header nhóm */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                          background: allOn ? '#eff6ff' : someOn ? '#fff' : '#f8fafc',
                          borderBottom: '1px solid #e8ecf0', cursor: 'pointer' }}
                          onClick={() => toggleGroup(group)}>
                          <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${allOn ? '#2563eb' : someOn ? '#2563eb' : '#cbd5e1'}`,
                            background: allOn ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {allOn && <FiCheck size={11} color="#fff" />}
                            {!allOn && someOn && <FiMinus size={11} color="#2563eb" />}
                          </div>
                          <span style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>{group}</span>
                          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                            {groupPerms.filter(p => form.permissions.includes(p.key)).length}/{groupPerms.length}
                          </span>
                        </div>
                        {/* Danh sách quyền trong nhóm */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                          {groupPerms.map(perm => {
                            const on = form.permissions.includes(perm.key);
                            return (
                              <label key={perm.key} onClick={() => togglePerm(perm.key)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                                  cursor: 'pointer', background: on ? '#f0f7ff' : 'transparent',
                                  borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                                <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${on ? '#2563eb' : '#cbd5e1'}`,
                                  background: on ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', flexShrink: 0 }}>
                                  {on && <FiCheck size={10} color="#fff" />}
                                </div>
                                <span style={{ fontSize: 13, color: on ? '#1e40af' : '#374151' }}>{perm.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang lưu...' : '💾 Lưu & cập nhật quyền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setImportModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3><FiUpload style={{ marginRight: 8 }} />Nhập danh sách sinh viên</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setImportModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
                💡 <strong>Hướng dẫn:</strong>
                <ul style={{ marginLeft: 20, marginTop: 6, marginBottom: 0 }}>
                  <li>Tải file template bằng cách click "Xuất Excel" trước</li>
                  <li>Điền thông tin sinh viên vào file Excel</li>
                  <li>Tải file lên để thêm hoặc cập nhật sinh viên</li>
                </ul>
              </div>

              <div className="form-group">
                <label className="form-label">Chọn file Excel (*.xlsx)</label>
                <input type="file" accept=".xlsx,.xls" className="form-control"
                  onChange={e => setImportFile(e.target.files[0])} />
                {importFile && (
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 6 }}>
                    📄 {importFile.name}
                  </div>
                )}
              </div>

              <div style={{ background: '#fef3c7', border: '1px solid #fde047', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                ⚠️ <strong>Lưu ý:</strong> 
                <ul style={{ marginLeft: 20, marginTop: 4, marginBottom: 0 }}>
                  <li>Email là trường bắt buộc và dùng để xác định sinh viên có sẵn</li>
                  <li>Nếu email đã tồn tại, dữ liệu sẽ được cập nhật, không thêm mới</li>
                  <li>Mật khẩu mặc định nếu không có: 123456</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setImportModal(false); setImportFile(null); }} disabled={isImporting}>Hủy</button>
              <button className="btn btn-primary" onClick={handleImportUsers} disabled={!importFile || isImporting}>
                {isImporting ? <>🔄 Đang nhập...</> : <>✅ Nhập dữ liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 

