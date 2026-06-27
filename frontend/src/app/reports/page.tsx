'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { reportService } from '@/services';

export default function ReportsPage() {
  const [tab, setTab] = useState<'inventory' | 'inbound' | 'outbound'>('inventory');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetch = tab === 'inventory' ? reportService.getInventory()
      : tab === 'inbound' ? reportService.getInbound()
      : reportService.getOutbound();
    fetch.then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [tab]);

  const fmt = new Intl.NumberFormat('vi-VN');

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Báo cáo</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>Báo cáo tồn kho, nhập kho và xuất kho</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {[
            { key: 'inventory', label: 'Tồn kho', icon: 'ri-home-4-line' },
            { key: 'inbound', label: 'Nhập kho', icon: 'ri-arrow-down-line' },
            { key: 'outbound', label: 'Xuất kho', icon: 'ri-arrow-up-line' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} style={{
              padding: '12px 20px', borderRadius: 14, border: 'none',
              background: tab === t.key ? '#10b981' : '#fff',
              color: tab === t.key ? 'white' : '#334155',
              fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: tab === t.key ? '0 10px 20px rgba(16,185,129,0.18)' : '0 4px 10px rgba(15,23,42,0.06)', fontSize: 14,
            }}>
              <i className={t.icon} />
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : data.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Không có dữ liệu.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  {tab === 'inventory' ? (
                    <>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Sản phẩm</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Kho</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Tồn kho</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Tối thiểu</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Giá</th>
                    </>
                  ) : (
                    <>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Sản phẩm</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Kho</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Số lượng</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Ngày</th>
                      <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Ghi chú</th>
                    </>
                  )}
                </tr></thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      {tab === 'inventory' ? (
                        <>
                          <td style={{ padding: '16px 18px', fontWeight: 700, color: '#0f172a' }}>{row.product_name} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>({row.product_sku})</span></td>
                          <td style={{ padding: '16px 18px', color: '#334155' }}>{row.warehouse_name}</td>
                          <td style={{ padding: '16px 18px' }}>
                            <span style={{ padding: '6px 12px', borderRadius: 999, background: row.on_hand_qty <= 0 ? '#fee2e2' : row.on_hand_qty < row.min_stock ? '#ffedd5' : '#dcfce7', color: row.on_hand_qty <= 0 ? '#b91c1c' : row.on_hand_qty < row.min_stock ? '#c2410c' : '#166534', fontWeight: 700, fontSize: 13 }}>
                              {row.on_hand_qty}
                            </span>
                          </td>
                          <td style={{ padding: '16px 18px', color: '#334155' }}>{row.min_stock}</td>
                          <td style={{ padding: '16px 18px', color: '#0f9d58', fontWeight: 700 }}>{fmt.format(row.sale_price)} đ</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '16px 18px', fontWeight: 700, color: '#0f172a' }}>{row.product_name}</td>
                          <td style={{ padding: '16px 18px', color: '#334155' }}>{row.warehouse_name}</td>
                          <td style={{ padding: '16px 18px', fontWeight: 700, color: tab === 'inbound' ? '#16a34a' : '#dc2626' }}>
                            {tab === 'inbound' ? '+' : '-'}{row.quantity}
                          </td>
                          <td style={{ padding: '16px 18px', color: '#334155' }}>{row.transaction_date}</td>
                          <td style={{ padding: '16px 18px', color: '#64748b', fontSize: 13 }}>{row.note || '-'}</td>
                        </>
                      )}
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
