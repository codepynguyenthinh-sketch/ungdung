import React from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { user } = useAuth();

  return (
    <footer style={{
      background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
      color: '#64748b',
      padding: '64px 24px 40px',
      marginTop: 80,
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 48, marginBottom: 48 }}>
          {/* About */}
          <div>
            <div style={{
              fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
              }}>
                <FiBookOpen size={18} color="#fff" />
              </div>
              Thư Viện Số
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#94a3b8', marginBottom: 20 }}>
              Hệ thống quản lý thư viện hiện đại, hỗ trợ mượn trả sách trực tuyến, đọc E-Book, và thống kê kho sách tự động.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: <FiMail size={14} />, text: 'library@example.com' },
                { icon: <FiPhone size={14} />, text: '(028) 1234 5678' },
                { icon: <FiMapPin size={14} />, text: 'TP. Hồ Chí Minh, Việt Nam' },
              ].map(item => (
                <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748b' }}>
                  <span style={{ color: '#475569' }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{
              fontWeight: 700, color: '#e2e8f0', marginBottom: 20, fontSize: 14,
              letterSpacing: 0.3,
            }}>
              Tra Cứu
            </div>
            {[
              { label: 'Danh mục sách', href: '/books' },
              { label: 'E-Book Online', href: '/books?has_pdf=true' },
              { label: 'Sách mới nhất', href: '/books' },
            ].map(({ label, href }) => (
              <Link key={label} to={href} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                color: '#64748b', fontSize: 14, marginBottom: 14,
                textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
              }}
                onMouseEnter={e => { e.target.style.color = '#93c5fd'; e.target.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.transform = 'translateX(0)'; }}>
                {label}
              </Link>
            ))}
          </div>

          {/* Account */}
          {user && (
            <div>
              <div style={{
                fontWeight: 700, color: '#e2e8f0', marginBottom: 20, fontSize: 14,
                letterSpacing: 0.3,
              }}>
                Tài Khoản
              </div>
              {[
                { label: 'Sách đang mượn', href: '/my-borrows' },
                { label: 'Đặt trước', href: '/my-reservations' },
                { label: 'Liên hệ thủ thư', href: '/messages' },
                { label: 'Hồ sơ cá nhân', href: '/profile' },
              ].map(({ label, href }) => (
                <Link key={label} to={href} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: '#64748b', fontSize: 14, marginBottom: 14,
                  textDecoration: 'none', transition: 'all 0.2s', cursor: 'pointer',
                }}
                  onMouseEnter={e => { e.target.style.color = '#93c5fd'; e.target.style.transform = 'translateX(4px)'; }}
                  onMouseLeave={e => { e.target.style.color = '#64748b'; e.target.style.transform = 'translateX(0)'; }}>
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
            &copy; 2025 Phần mềm mượn trả sách. Tất cả quyền được bảo lưu.
          </p>
          <p style={{ fontSize: 12, color: '#334155', margin: 0 }}>
            Made with React + PostgreSQL
          </p>
        </div>
      </div>
    </footer>
  );
}
