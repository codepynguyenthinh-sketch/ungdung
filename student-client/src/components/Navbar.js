import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiBookOpen, FiHome, FiBook, FiUser, FiLogOut, FiLogIn, FiMessageSquare, FiList, FiBookmark, FiMenu, FiX, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setMobileOpen(false); };

  const navLinks = [
    { to: '/', label: 'Trang chủ', icon: <FiHome size={14} />, end: true },
    { to: '/books', label: 'Danh mục sách', icon: <FiBook size={14} /> },
    ...(user ? [
      { to: '/my-borrows', label: 'Sách đang mượn', icon: <FiList size={14} /> },
      { to: '/my-fines', label: user?.unpaid_fines > 0 ? `Phí phạt (${user.unpaid_fines.toLocaleString('vi-VN')}đ)` : 'Phí phạt', icon: <FiDollarSign size={14} />, highlight: user?.unpaid_fines > 0 },
      { to: '/my-reservations', label: 'Đặt trước', icon: <FiBookmark size={14} /> },
      { to: '/messages', label: 'Liên hệ', icon: <FiMessageSquare size={14} /> },
    ] : []),
  ];

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <FiBookOpen size={22} />
          Phần mềm mượn trả sách
        </Link>

        {/* Desktop nav */}
        <div className="navbar-nav">
          {navLinks.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {l.icon}{l.label}
            </NavLink>
          ))}
        </div>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* User / Auth */}
        <div className="navbar-user">
          {user ? (
            <>
              <span style={{ fontSize: 13, color: 'var(--muted)', display: 'none' }} className="hide-mobile">
                {user.name}{user.student_id ? ` · ${user.student_id}` : ''}
              </span>
              <Link to="/profile">
                <div className="avatar-sm" title={user.name}>{user.name?.[0]?.toUpperCase()}</div>
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                <FiLogOut size={14} /> <span style={{ display: 'none' }} className="hide-mobile">Đăng xuất</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <FiLogIn size={14} /> Đăng nhập
            </Link>
          )}

          {/* Mobile hamburger */}
          <button className="btn btn-secondary btn-sm"
            style={{ display: 'none' }}
            id="mobile-menu-btn"
            onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'auto',
        }} onClick={() => setMobileOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            position: 'absolute', top: 0, right: 0,
            width: 260, height: '100%',
            background: 'var(--surface)',
            padding: '20px 16px',
            display: 'flex', flexDirection: 'column', gap: 6,
            boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
            pointerEvents: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: 'var(--blue)' }}>Menu</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setMobileOpen(false)} style={{ pointerEvents: 'auto' }}><FiX size={16} /></button>
            </div>
            {navLinks.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
                style={{ fontSize: 15, padding: '10px 14px', pointerEvents: 'auto' }}
                onClick={() => setMobileOpen(false)}>
                {l.icon}{l.label}
              </NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/profile" className="nav-link" style={{ fontSize: 15, padding: '10px 14px', pointerEvents: 'auto' }} onClick={() => setMobileOpen(false)}>
                  <FiUser size={14} /> Tài khoản ({user.name})
                </NavLink>
                <button className="btn btn-secondary btn-block" style={{ marginTop: 8, pointerEvents: 'auto' }} onClick={handleLogout}>
                  <FiLogOut size={14} /> Đăng xuất
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-block" style={{ marginTop: 8, pointerEvents: 'auto' }} onClick={() => setMobileOpen(false)}>
                <FiLogIn size={14} /> Đăng nhập
              </Link>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .navbar-nav { display: none !important; }
          #mobile-menu-btn { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}
