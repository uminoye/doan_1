'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { reportService, warehouseService } from '@/services';

const fmt = new Intl.NumberFormat('vi-VN');

export default function InventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [r, w] = await Promise.all([
        reportService.getInventory(warehouseId !== 'all' ? { warehouse_id: warehouseId } : {}),
        warehouseService.getAll(),
      ]);
      setData(r.data);
      setWarehouses(w.data);
    } catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [warehouseId]);

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Quản lý Kho hàng</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>{data.length} mặt hàng đang theo dõi</p>
          </div>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)}
            style={{ height: 42, borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 14px', background: '#fff', color: '#334155', fontSize: 14, cursor: 'pointer' }}>
            <option value="all">Tất cả kho</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : data.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Không có dữ liệu.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Sản phẩm</th>
                    <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Kho</th>
                    <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Tồn kho</th>
                    <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Tối thiểu</th>
                    <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row: any, i: number) => {
                    const isLow = row.on_hand_qty > 0 && row.on_hand_qty < row.min_stock;
                    const isOut = row.on_hand_qty <= 0;
                    return (
                      <tr key={i} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                        <td style={{ padding: '16px 18px', fontWeight: 700, color: '#0f172a' }}>
                          {row.product_name} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 12 }}>({row.product_sku})</span>
                        </td>
                        <td style={{ padding: '16px 18px', color: '#334155' }}>{row.warehouse_name}</td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: 999, background: isOut ? '#fee2e2' : isLow ? '#ffedd5' : '#dcfce7', color: isOut ? '#b91c1c' : isLow ? '#c2410c' : '#166534', fontWeight: 700, fontSize: 13 }}>
                            {row.on_hand_qty}
                          </span>
                        </td>
                        <td style={{ padding: '16px 18px', color: '#334155' }}>{row.min_stock}</td>
                        <td style={{ padding: '16px 18px', color: '#0f9d58', fontWeight: 700 }}>{fmt.format(row.sale_price)} đ</td>
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
