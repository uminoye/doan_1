'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { logisticsService } from '@/services';

export default function LogisticsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try { const r = await logisticsService.getAll(); setRequests(r.data); }
    catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleProcess = async (id: string, action: string) => {
    try {
      await logisticsService.process({ sales_order_id: id, action });
      alert('Xử lý thành công!'); fetch();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const statusLabel: Record<string, string> = {
    pending: 'Chờ tiếp nhận', received: 'Đã nhận', forwarded: 'Đã chuyển kho',
    warehouse_processing: 'Kho xử lý', completed: 'Hoàn tất', returned: 'Hoàn trả',
  };
  const statusStyle: Record<string, React.CSSProperties> = {
    pending: { background: '#fef3c7', color: '#92400e' },
    received: { background: '#dbeafe', color: '#1d4ed8' },
    forwarded: { background: '#ede9fe', color: '#6b21a8' },
    warehouse_processing: { background: '#fff7ed', color: '#9a3412' },
    completed: { background: '#dcfce7', color: '#166534' },
    returned: { background: '#fee2e2', color: '#991b1b' },
  };

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Tiếp nhận giao hàng</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>{requests.length} yêu cầu giao hàng</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : requests.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Không có yêu cầu giao hàng nào.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Mã đơn</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Khách hàng</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Địa chỉ giao</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Trạng thái</th>
                  <th style={{ width: 240 }}></th>
                </tr></thead>
                <tbody>
                  {requests.map(r => {
                    const s = r.status || 'pending';
                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                        <td style={{ padding: '16px 18px', fontWeight: 800, color: '#2563eb' }}>{r.order_no}</td>
                        <td style={{ padding: '16px 18px', color: '#334155' }}>{r.customer_name}</td>
                        <td style={{ padding: '16px 18px', color: '#64748b', fontSize: 13, maxWidth: 200 }}>{r.delivery_address || '-'}</td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ ...statusStyle[s], display: 'inline-flex', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
                            {statusLabel[s] || s}
                          </span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          {s === 'pending' && (
                            <button onClick={() => handleProcess(r.sales_order_id, 'receive')} style={{ padding: '9px 16px', background: '#10b981', border: 'none', borderRadius: 12, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                              Tiếp nhận
                            </button>
                          )}
                          {s === 'received' && (
                            <button onClick={() => handleProcess(r.sales_order_id, 'forward')} style={{ padding: '9px 16px', background: '#2563eb', border: 'none', borderRadius: 12, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                              Chuyển kho
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
