import React, { useState } from 'react';

export default function LanguageSwitcher() {
  const [lang, setLang] = useState(() => localStorage.getItem('app_language') || 'vi');

  const handleLanguageChange = (newLang) => {
    localStorage.setItem('app_language', newLang);
    setLang(newLang);
    
    // Trigger Google Translate combo box
    const langCode = newLang === 'en' ? 'en' : 'vi';
    const element = document.querySelector('.goog-te-combo');
    
    if (element) {
      try {
        // Override CSS !important rules to temporarily show element
        const originalInline = element.getAttribute('style');
        element.setAttribute('style', `
          display: block !important;
          visibility: visible !important;
          position: absolute !important;
          left: -9999px !important;
          opacity: 0 !important;
          pointer-events: none !important;
        `);
        
        // Set the value
        element.value = langCode;
        
        // Dispatch events with proper sequence
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        
        // Restore original style after longer delay to ensure all events processed
        setTimeout(() => {
          if (originalInline) {
            element.setAttribute('style', originalInline);
          } else {
            element.removeAttribute('style');
          }
        }, 200);
      } catch (e) {
        console.error('Language change error:', e);
      }
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <button
        onClick={() => handleLanguageChange('vi')}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: lang === 'vi' ? '2px solid #2563eb' : '1px solid #e2e8f0',
          background: lang === 'vi' ? '#dbeafe' : '#f8fafc',
          color: lang === 'vi' ? '#1e40af' : '#64748b',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: lang === 'vi' ? 700 : 600,
          transition: 'all 0.2s',
        }}
        title="Tiếng Việt"
      >
        🇻🇳 VN
      </button>
      <button
        onClick={() => handleLanguageChange('en')}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: lang === 'en' ? '2px solid #2563eb' : '1px solid #e2e8f0',
          background: lang === 'en' ? '#dbeafe' : '#f8fafc',
          color: lang === 'en' ? '#1e40af' : '#64748b',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: lang === 'en' ? 700 : 600,
          transition: 'all 0.2s',
        }}
        title="English"
      >
        🇬🇧 EN
      </button>
    </div>
  );
}
