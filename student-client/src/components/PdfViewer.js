import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiX, FiZoomIn, FiZoomOut, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

const PDFJS_URL  = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function loadPdfJs() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const s = document.createElement('script');
    s.src = PDFJS_URL;
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL; resolve(window.pdfjsLib); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function PdfViewer({ blobUrl, title, onClose }) {
  const containerRef  = useRef(null);
  const scrollRef     = useRef(null);
  const [pdfDoc, setPdfDoc]         = useState(null);
  const [scale, setScale]           = useState(1.3);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [totalPages, setTotal]      = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const canvasRefs = useRef([]);
  const pageObserver = useRef(null);

  // Block context menu, drag, keyboard shortcuts
  useEffect(() => {
    const blockCtx  = e => e.preventDefault();
    const blockDrag = e => e.preventDefault();
    const blockKey  = e => {
      if ((e.ctrlKey || e.metaKey) && ['s','S','p','P','a','A'].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    document.addEventListener('contextmenu', blockCtx,  true);
    document.addEventListener('dragstart',   blockDrag, true);
    window.addEventListener('keydown',       blockKey,  true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('contextmenu', blockCtx,  true);
      document.removeEventListener('dragstart',   blockDrag, true);
      window.removeEventListener('keydown',       blockKey,  true);
      document.body.style.overflow = '';
    };
  }, []);

  // Load PDF
  useEffect(() => {
    if (!blobUrl) return;
    setLoading(true); setError('');
    loadPdfJs()
      .then(lib => lib.getDocument(blobUrl).promise)
      .then(pdf => { setPdfDoc(pdf); setTotal(pdf.numPages); setLoading(false); })
      .catch(err => { setError('Không thể tải PDF: ' + (err.message || '')); setLoading(false); });
  }, [blobUrl]);

  // Render tất cả trang vào canvas riêng
  const renderAllPages = useCallback(async (pdf, sc) => {
    canvasRefs.current = canvasRefs.current.slice(0, pdf.numPages);
    for (let i = 1; i <= pdf.numPages; i++) {
      const canvas = canvasRefs.current[i - 1];
      if (!canvas) continue;
      const pdfPage  = await pdf.getPage(i);
      const viewport = pdfPage.getViewport({ scale: sc });
      canvas.height  = viewport.height;
      canvas.width   = viewport.width;
      await pdfPage.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  }, []);

  useEffect(() => {
    if (pdfDoc) renderAllPages(pdfDoc, scale);
  }, [pdfDoc, scale, renderAllPages]);

  // Theo dõi trang hiện tại khi scroll
  useEffect(() => {
    if (!pdfDoc || !scrollRef.current) return;
    if (pageObserver.current) pageObserver.current.disconnect();
    pageObserver.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = parseInt(entry.target.dataset.page);
          if (!isNaN(idx)) setCurrentPage(idx);
        }
      });
    }, { root: scrollRef.current, threshold: 0.5 });
    const wrappers = scrollRef.current.querySelectorAll('[data-page]');
    wrappers.forEach(w => pageObserver.current.observe(w));
    return () => pageObserver.current?.disconnect();
  }, [pdfDoc, totalPages]);

  const zoomIn  = () => setScale(s => Math.min(+(s + 0.2).toFixed(1), 3));
  const zoomOut = () => setScale(s => Math.max(+(s - 0.2).toFixed(1), 0.5));
  const toggleFull = () => {
    if (!fullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(f => !f);
  };

  return (
    <div ref={containerRef} onContextMenu={e => e.preventDefault()}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column', userSelect: 'none', WebkitUserSelect: 'none' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        background: '#1e293b', borderBottom: '1px solid #334155', flexShrink: 0 }}>
        <div style={{ flex: 1, color: '#f1f5f9', fontSize: 14, fontWeight: 600,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📖 {title}
        </div>

        {/* Số trang */}
        {totalPages > 0 && (
          <span style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }}>
            Trang <strong style={{ color: '#f1f5f9' }}>{currentPage}</strong> / {totalPages}
          </span>
        )}

        <div style={{ fontSize: 11, color: '#94a3b8', background: '#0f172a',
          padding: '3px 10px', borderRadius: 6, flexShrink: 0 }}>
          🔒 Chỉ xem — Không sao chép
        </div>

        <button onClick={zoomOut} style={tb}><FiZoomOut size={15} /></button>
        <span style={{ color: '#f1f5f9', fontSize: 13, minWidth: 44, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </span>
        <button onClick={zoomIn} style={tb}><FiZoomIn size={15} /></button>
        <button onClick={toggleFull} style={tb}>
          {fullscreen ? <FiMinimize2 size={15} /> : <FiMaximize2 size={15} />}
        </button>
        <button onClick={onClose} style={{ ...tb, color: '#f87171' }}><FiX size={18} /></button>
      </div>

      {/* Scroll area — tất cả trang liên tục */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'auto',
        background: '#374151', padding: '16px 0' }}>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', color: '#94a3b8', gap: 12 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #334155',
              borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 14 }}>Đang tải tài liệu...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && (
          <div style={{ color: '#f87171', fontSize: 14, textAlign: 'center', padding: 40 }}>{error}</div>
        )}

        {/* Render từng trang liên tục */}
        {!loading && !error && Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
          <div key={pageNum} data-page={pageNum}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, position: 'relative' }}>
            <div style={{ position: 'relative', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
              <canvas
                ref={el => { canvasRefs.current[pageNum - 1] = el; }}
                onContextMenu={e => e.preventDefault()}
                style={{ display: 'block', maxWidth: '100%' }}
              />
              {/* Watermark chìm */}
              <div style={{ position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%) rotate(-30deg)',
                fontSize: 48, fontWeight: 900, color: 'rgba(0,0,0,0.04)',
                pointerEvents: 'none', whiteSpace: 'nowrap', letterSpacing: 8 }}>
                HỆ THỐNG MƯỢN TRẢ SÁCH
              </div>
              {/* Số trang nhỏ góc */}
              <div style={{ position: 'absolute', bottom: 8, right: 12,
                fontSize: 11, color: 'rgba(0,0,0,0.3)', pointerEvents: 'none' }}>
                {pageNum} / {totalPages}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding: '7px 16px', background: '#1e293b',
        borderTop: '1px solid #334155', flexShrink: 0, textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: '#475569' }}>
          ⚠️ Tài liệu được bảo vệ bản quyền. Nghiêm cấm sao chép, tải xuống hoặc phân phối.
        </span>
      </div>
    </div>
  );
}

const tb = {
  background: '#334155', border: 'none', borderRadius: 6,
  color: '#e2e8f0', cursor: 'pointer', padding: '6px 8px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};