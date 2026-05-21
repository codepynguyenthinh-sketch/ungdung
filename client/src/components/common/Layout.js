import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import {
  FiHome, FiBook, FiList, FiDollarSign, FiBookmark, FiInbox,
  FiUser, FiLogOut, FiUsers, FiBarChart2, FiTag, FiTrendingUp,
  FiRepeat, FiChevronDown, FiChevronRight, FiCheckSquare, FiMenu, FiX,
} from 'react-icons/fi';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [borrowOpen, setBorrowOpen] = useState(
    // Mở sẵn nếu đang ở trang mượn/trả
    location.pathname.startsWith('/admin/borrow') || location.pathname.startsWith('/admin/return')
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isAdmin = ['admin', 'librarian'].includes(user?.role);
  const isOnlyLibrarian = user?.role === 'librarian';

  const userLinks = [
    { to: '/',                icon: <FiHome />,      label: 'Trang chủ' },
    { to: '/books',           icon: <FiBook />,      label: 'Danh mục sách' },
    { to: '/my-borrows',      icon: <FiList />,      label: 'Sách đang mượn' },
    ...(!isAdmin ? [{ to: '/my-reservations', icon: <FiBookmark />, label: 'Đặt trước' }] : []),
    { to: '/my-fines',        icon: <FiDollarSign />,label: 'Phí phạt' },
    { to: '/profile',         icon: <FiUser />,      label: 'Tài khoản' },
  ];

  const adminLinks = [
    { to: '/admin',              icon: <FiBarChart2 />,  label: 'Dashboard', exact: true },
    { to: '/admin/books',        icon: <FiBook />,       label: 'Quản lý sách' },
    { to: '/admin/reservations', icon: <FiBookmark />,   label: 'Đặt trước' },
    { to: '/admin/categories',   icon: <FiTag />,        label: 'Thể loại' },
    { to: '/admin/departments',  icon: <FiTag />,        label: 'Khoa viện' },
    // Đây là item accordion — xử lý riêng bên dưới
    '__BORROW__',
    { to: '/admin/fines',        icon: <FiDollarSign />, label: 'Phí phạt' },
    ...(!isOnlyLibrarian ? [{ to: '/admin/users', icon: <FiUsers />, label: 'Người dùng' }] : []),
    { to: '/admin/messages',     icon: <FiInbox />,      label: 'Tin nhắn' },
    { to: '/admin/reports',      icon: <FiTrendingUp />, label: 'Báo cáo' },
    { to: '/admin/inventory-check', icon: <FiCheckSquare />, label: 'Kiểm Kê Kho' },
  ];

  const isBorrowActive = location.pathname.startsWith('/admin/borrow') || location.pathname.startsWith('/admin/return');

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 20px', color: isActive ? '#60a5fa' : '#94a3b8',
    textDecoration: 'none', fontSize: 14, transition: 'all 0.15s',
    borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
    background: isActive ? 'rgba(37,99,235,0.15)' : 'transparent',
  });

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      {/* ── OVERLAY (Mobile) ── */}
      {sidebarOpen && isMobile && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            display: 'block',
            pointerEvents: 'auto',
          }}
          className={sidebarOpen ? 'sidebar-overlay open' : 'sidebar-overlay'}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 240, background: '#1e293b', color: '#fff',
        flexShrink: 0, display: 'flex', flexDirection: 'column',
        position: 'fixed', height: '100vh', overflowY: 'auto', zIndex: 100,
        scrollbarWidth: 'none',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        pointerEvents: 'auto',
      }}
      className={sidebarOpen ? 'open' : 'closed'}>
        {/* Logo */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiBook size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>Phần mềm mượn trả sách</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Library Management</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '12px 0', flex: 1 }}>
          {/* User section */}
          <div style={{ padding: '8px 20px 4px', fontSize: 10, textTransform: 'uppercase',
            letterSpacing: 1.2, color: '#475569', fontWeight: 700 }}>
            Menu
          </div>
          {userLinks.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              style={navLinkStyle}>
              {l.icon} {l.label}
            </NavLink>
          ))}

          {/* Admin section */}
          {isAdmin && (
            <>
              <div style={{ padding: '16px 20px 4px', fontSize: 10, textTransform: 'uppercase',
                letterSpacing: 1.2, color: '#475569', fontWeight: 700 }}>
                Quản trị
              </div>
              {adminLinks.map((l, i) => {
                if (l === '__BORROW__') {
                  return (
                    <div key="borrow-accordion">
                      {/* Accordion trigger */}
                      <button onClick={() => setBorrowOpen(o => !o)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '10px 20px', border: 'none', cursor: 'pointer',
                          background: isBorrowActive ? 'rgba(37,99,235,0.15)' : 'transparent',
                          borderLeft: isBorrowActive ? '3px solid #60a5fa' : '3px solid transparent',
                          color: isBorrowActive ? '#60a5fa' : '#94a3b8',
                          fontSize: 14, textAlign: 'left', transition: 'all .15s' }}>
                        <FiRepeat size={15} />
                        <span style={{ flex: 1 }}>Mượn / Trả sách</span>
                        {borrowOpen
                          ? <FiChevronDown size={13} style={{ flexShrink: 0 }} />
                          : <FiChevronRight size={13} style={{ flexShrink: 0 }} />}
                      </button>
                      {/* Sub-items */}
                      {borrowOpen && (
                        <div style={{ background: 'rgba(0,0,0,0.15)' }}>
                          <NavLink to="/admin/borrow-return" end
                            style={({ isActive }) => ({
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 20px 8px 44px', fontSize: 13, textDecoration: 'none',
                              color: isActive ? '#60a5fa' : '#94a3b8',
                              background: isActive ? 'rgba(37,99,235,0.12)' : 'transparent',
                              borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
                              transition: 'all .15s',
                            })}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%',
                              background: 'currentColor', flexShrink: 0 }} />
                            📤 Mượn sách
                          </NavLink>
                          <NavLink to="/admin/borrow-return?tab=return"
                            style={({ isActive }) => {
                              const tabReturn = new URLSearchParams(location.search).get('tab') === 'return'
                                && location.pathname === '/admin/borrow-return';
                              return {
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 20px 8px 44px', fontSize: 13, textDecoration: 'none',
                                color: tabReturn ? '#60a5fa' : '#94a3b8',
                                background: tabReturn ? 'rgba(37,99,235,0.12)' : 'transparent',
                                borderLeft: tabReturn ? '3px solid #60a5fa' : '3px solid transparent',
                                transition: 'all .15s',
                              };
                            }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%',
                              background: 'currentColor', flexShrink: 0 }} />
                            📥 Trả sách
                          </NavLink>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <NavLink key={l.to} to={l.to} end={l.exact}
                    style={navLinkStyle}>
                    {l.icon} {l.label}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Logout */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12, padding:'0 4px' }}>
            <div style={{ width:32, height:32, borderRadius:'50%',
              background:'linear-gradient(135deg,#2563eb,#7c3aed)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontWeight:700, fontSize:13, color:'#fff', flexShrink:0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize:10, color:'#64748b' }}>
                {user?.role === 'admin' ? 'Quản trị viên' : 'Thủ thư'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              width:'100%', padding:'8px', border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:8, background:'rgba(255,255,255,0.05)', color:'#94a3b8',
              cursor:'pointer', fontSize:13, transition:'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,0.15)'; e.currentTarget.style.color='#f87171'; e.currentTarget.style.borderColor='rgba(239,68,68,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}>
            <FiLogOut size={14} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, marginLeft: sidebarOpen && !isMobile ? 240 : 0, display: 'flex', flexDirection: 'column', minHeight: '100vh', transition: 'margin-left 0.3s ease' }} className="main-content">
        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0',
          padding: '0 24px', height: 60, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger Menu Button */}
            <button 
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: '#1e293b',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
            </button>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>
              Phần mềm mượn trả sách
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {user?.unpaidFines > 0 && (
              <span style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca',
                padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
                Nợ: {user.unpaidFines.toLocaleString('vi-VN')}đ
              </span>
            )}
            <LanguageSwitcher />
            <div onClick={() => navigate('/profile')} style={{ display:'flex', alignItems:'center',
              gap:8, cursor:'pointer', padding:'6px 10px', borderRadius:8, transition:'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background=''}>
              <div style={{ width:32, height:32, borderRadius:'50%',
                background:'linear-gradient(135deg,#2563eb,#7c3aed)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:700, fontSize:13, color:'#fff' }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{user?.name}</div>
                <div style={{ fontSize:10, color:'#94a3b8' }}>
                  {user?.role === 'admin' ? 'Quản trị viên' : 'Thủ thư'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '24px', background: '#f5f7fa' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
