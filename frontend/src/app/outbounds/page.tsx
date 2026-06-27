'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { stockOutboundService } from '@/services';

export default function OutboundsPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try { const r = await stockOutboundService.getAll(); setNotes(r.data); }
    catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const statusLabel: Record<string, string> = { pending: 'Chờ duyệt', completed: 'Hoàn tất', rejected: 'Từ chối', delayed: 'Trễ hạn' };
  const statusStyle: Record<string, React.CSSProperties> = {
    pending: { background: '#fef3c7', color: '#92400e' },
    completed: { background: '#dcfce7', color: '#166534' },
    rejected: { background: '#fee2e2', color: '#991b1b' },
    delayed: { background: '#ffedd5', color: '#9a3412' },
  };

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Xuất kho</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>{notes.length} phiếu xuất kho</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : notes.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Chưa có phiếu xuất kho nào.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Số phiếu
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Đơn hàng
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Kho
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Ngày
                  </th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Trạng thái
                  </th>
                </tr></thead>
                <tbody>
                  {notes.map(n => (
                    <tr key={n.id} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      <td style={{ padding: '16px 18px', fontWeight: 800, color: '#0f172a' }}>{n.note_no}</td>
                      <td style={{ padding: '16px 18px', color: '#2563eb', fontWeight: 600 }}>{n.order_no}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{n.warehouse_name}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{n.export_date}</td>
                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ ...statusStyle[n.status], display: 'inline-flex', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
                          {statusLabel[n.status] || n.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
