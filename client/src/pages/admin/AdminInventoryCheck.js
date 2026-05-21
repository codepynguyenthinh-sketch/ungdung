import React, { useState } from 'react';
import { FiUpload, FiSearch, FiCheck, FiX, FiDownload } from 'react-icons/fi';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function AdminInventoryCheck() {
  const [codes, setCodes] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheckInventory = async () => {
    if (!codes.trim()) {
      toast.error('Vui lòng nhập mã sách');
      return;
    }

    const codeArray = codes
      .split('\n')
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0);

    if (codeArray.length === 0) {
      toast.error('Vui lòng nhập danh sách mã sách');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/stats/check-inventory', { codes: codeArray });
      if (res.data.success) {
        setResults(res.data.data);
        toast.success(`Kiểm kê xong: ${res.data.data.stats.foundCount} sách tìm thấy, ${res.data.data.stats.missingCount} sách mất`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi kiểm kê');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if Excel or text file
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // Handle Excel
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          // Sử dụng XLSX library
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Lấy tất cả giá trị từ cột A
          const codeList = [];
          let row = 1;
          while (true) {
            const cell = worksheet[`A${row}`];
            if (!cell) break;
            const value = cell.v || '';
            if (value && value.toString().trim()) {
              codeList.push(value.toString().trim().toUpperCase());
            }
            row++;
          }
          
          if (codeList.length > 0) {
            setCodes(codeList.join('\n'));
            toast.success(`Đã tải ${codeList.length} mã sách từ Excel`);
          } else {
            toast.error('Không tìm thấy mã sách trong cột A');
          }
        } catch (err) {
          toast.error('Lỗi đọc file Excel: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle text file
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        setCodes(text);
        toast.success('Đã tải file');
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    // Create Excel template
    const workbook = XLSX.utils.book_new();
    const data = [
      ['Mã Sách'],
      ['LIB-2025-00001'],
      ['LIB-2025-00002'],
      ['LIB-2025-00003'],
      ['LIB-2025-00004'],
      ['LIB-2025-00005'],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['A1'].font = { bold: true, color: { rgb: 'FFFFFF' } };
    worksheet['A1'].fill = { type: 'pattern', pattern: 'solid', fgColor: { rgb: '2563EB' } };
    worksheet['!cols'] = [{ wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Kiểm Kê');
    XLSX.writeFile(workbook, 'template-kiem-ke.xlsx');
  };

  const downloadResults = () => {
    if (!results) return;
    
    const workbook = XLSX.utils.book_new();
    
    // Sheet 1: Thống kê
    const statsData = [
      ['DANH SÁCH KIỂM KÊ'],
      [''],
      ['Thời gian kiểm kê:', new Date().toLocaleString('vi-VN')],
      ['Tổng mã:', results.stats.total],
      ['Tìm thấy:', results.stats.foundCount],
      ['Mất:', results.stats.missingCount],
      ['Tỷ lệ:', results.stats.foundPercent + '%'],
    ];
    const statsWs = XLSX.utils.aoa_to_sheet(statsData);
    statsWs['!cols'] = [{ wch: 25 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(workbook, statsWs, 'Tổng Hợp');

    // Sheet 2: Sách tìm thấy
    const foundData = [
      ['Mã Sách', 'Tên Sách', 'Tác Giả', 'Tình Trạng', 'Tình Trạng Sách'],
      ...results.found.map(f => [f.copy_code, f.title, f.author, f.status, f.condition])
    ];
    const foundWs = XLSX.utils.aoa_to_sheet(foundData);
    foundWs['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, foundWs, 'Sách Tìm Thấy');

    // Sheet 3: Sách mất
    const missingData = [
      ['Mã Sách'],
      ...results.missing.map(m => [m])
    ];
    const missingWs = XLSX.utils.aoa_to_sheet(missingData);
    missingWs['!cols'] = [{ wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, missingWs, 'Sách Mất');

    XLSX.writeFile(workbook, `kiem-ke-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Layout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>📚 Kiểm Kê Kho Sách</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>Scan mã vạch hoặc nhập mã sách để kiểm tra kho</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Input Section */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📝 Nhập Mã Sách</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#64748b' }}>
              Danh sách mã sách (một mã trên một dòng):
            </label>
            <textarea
              value={codes}
              onChange={(e) => setCodes(e.target.value)}
              placeholder="LIB-2025-00001&#10;LIB-2025-00002&#10;LIB-2025-00003"
              style={{
                width: '100%',
                height: 200,
                padding: 12,
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'monospace',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <label style={{ flex: 1, position: 'relative', cursor: 'pointer' }}>
              <input type="file" accept=".txt,.csv,.xlsx,.xls" onChange={handleFileUpload} style={{ display: 'none' }} />
              <div style={{
                padding: '10px 16px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                textAlign: 'center',
                fontWeight: 600,
                fontSize: 13,
                color: '#475569',
                transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; }}
                onMouseLeave={(e) => { e.target.style.background = '#f1f5f9'; }}>
                <FiUpload size={16} style={{ display: 'inline', marginRight: 6 }} />
                Tải Excel/Text
              </div>
            </label>

            <button onClick={downloadTemplate} style={{
              flex: 1,
              padding: '10px 16px',
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              color: '#16a34a',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { e.target.style.background = '#dcfce7'; }}
              onMouseLeave={(e) => { e.target.style.background = '#f0fdf4'; }}>
              <FiDownload size={16} style={{ display: 'inline', marginRight: 6 }} />
              Template
            </button>
          </div>

          <button onClick={handleCheckInventory} disabled={loading} style={{
            width: '100%',
            padding: '12px 16px',
            background: loading ? '#ccc' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => !loading && (e.target.style.background = '#1d4ed8')}
            onMouseLeave={(e) => !loading && (e.target.style.background = '#2563eb')}>
            {loading ? '⏳ Đang kiểm kê...' : '🔍 Kiểm Kê'}
          </button>
        </div>

        {/* Stats Section */}
        <div>
          {results ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                padding: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>📊 Kết Quả Kiểm Kê</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    background: '#eff6ff',
                    borderRadius: 8,
                    padding: 12,
                    textAlign: 'center',
                    borderLeft: '4px solid #2563eb',
                  }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tìm Thấy</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#2563eb' }}>
                      {results.stats.foundCount}
                    </div>
                  </div>

                  <div style={{
                    background: '#fef2f2',
                    borderRadius: 8,
                    padding: 12,
                    textAlign: 'center',
                    borderLeft: '4px solid #dc2626',
                  }}>
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Mất / Sai Chỗ</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>
                      {results.stats.missingCount}
                    </div>
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  borderRadius: 8,
                  padding: 12,
                  textAlign: 'center',
                  marginBottom: 12,
                }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Tỷ Lệ Tìm Thấy</div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 800,
                    background: `linear-gradient(90deg, ${results.stats.foundPercent > 90 ? '#16a34a' : results.stats.foundPercent > 70 ? '#d97706' : '#dc2626'}, ${results.stats.foundPercent > 90 ? '#22c55e' : results.stats.foundPercent > 70 ? '#f59e0b' : '#ef4444'})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    {results.stats.foundPercent}%
                  </div>
                </div>

                <button onClick={downloadResults} style={{
                  width: '100%',
                  padding: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#475569',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={(e) => { e.target.style.background = '#e2e8f0'; }}
                  onMouseLeave={(e) => { e.target.style.background = '#f1f5f9'; }}>
                  <FiDownload size={14} style={{ display: 'inline', marginRight: 6 }} />
                  Tải Kết Quả
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              border: '2px dashed #e2e8f0',
              padding: 40,
              textAlign: 'center',
              color: '#94a3b8',
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Chưa kiểm kê</div>
              <p style={{ fontSize: 12, margin: '4px 0 0 0' }}>Nhập mã sách và nhấn "Kiểm Kê"</p>
            </div>
          )}
        </div>
      </div>

      {/* Results Details */}
      {results && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Found Books */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f0fdf4',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#16a34a' }}>
                ✓ Sách Tìm Thấy ({results.stats.foundCount})
              </h3>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.found.length > 0 ? (
                results.found.map((f, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#f0fdf4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#16a34a',
                    }}>
                      <FiCheck size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: '#1e293b', marginBottom: 2 }}>
                        {f.copy_code}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          borderRadius: 4,
                          marginRight: 6,
                        }}>
                          {f.status}
                        </span>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 6px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          borderRadius: 4,
                        }}>
                          {f.condition}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  Không có sách tìm thấy
                </div>
              )}
            </div>
          </div>

          {/* Missing Books */}
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#fef2f2',
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#dc2626' }}>
                ✗ Sách Mất ({results.stats.missingCount})
              </h3>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.missing.length > 0 ? (
                results.missing.map((m, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: i % 2 === 0 ? '#fff' : '#f8fafc',
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#dc2626',
                    }}>
                      <FiX size={16} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#dc2626', fontFamily: 'monospace' }}>
                      {m}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                  Tất cả sách đều được tìm thấy! 🎉
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
