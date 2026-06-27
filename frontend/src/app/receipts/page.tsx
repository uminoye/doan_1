'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { productionReceiptService, productService, warehouseService } from '@/services';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [form, setForm] = useState({ receipt_no: '', warehouse_id: '', note: '' });
  const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 0 }]);
  const fetch = async () => {
    try {
      const [r, p, w] = await Promise.all([productionReceiptService.getAll(), productService.getAll(), warehouseService.getAll()]);
      setReceipts(r.data); setProducts(p.data); setWarehouses(w.data);
    } catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (!form.receipt_no || !form.warehouse_id || !validItems.length) return alert('Nhập đầy đủ thông tin');
    try {
      await productionReceiptService.create({ receipt_no: form.receipt_no, warehouse_id: form.warehouse_id, note: form.note, items: validItems });
      alert('Tạo phiếu nhập thành công!'); setIsOpen(false); fetch();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const statusLabel: Record<string, string> = { PENDING: 'Chờ duyệt', PROCESSING: 'Đang xử lý', REJECTED: 'Từ chối', COMPLETED: 'Hoàn tất' };
  const statusStyle: Record<string, React.CSSProperties> = {
    PENDING: { background: '#fef3c7', color: '#92400e' },
    PROCESSING: { background: '#dbeafe', color: '#1d4ed8' },
    REJECTED: { background: '#fee2e2', color: '#991b1b' },
    COMPLETED: { background: '#dcfce7', color: '#166534' },
  };

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Nhập kho</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>{receipts.length} phiếu nhập kho</p>
          </div>
          <button onClick={() => setIsOpen(true)} style={{ padding: '12px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>+ Tạo phiếu nhập</button>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : receipts.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Chưa có phiếu nhập kho nào.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Số phiếu</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Kho</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Ngày</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Trạng thái</th>
                </tr></thead>
                <tbody>
                  {receipts.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      <td style={{ padding: '16px 18px', fontWeight: 800, color: '#0f172a' }}>{r.receipt_no}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{r.warehouse_name}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{r.receipt_date}</td>
                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ ...statusStyle[r.status], display: 'inline-flex', padding: '6px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12 }}>
                          {statusLabel[r.status] || r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: '#fff', padding: 30, borderRadius: 16, width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
              <h3 style={{ color: '#16a34a', marginTop: 0 }}>Tạo phiếu nhập kho</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Số phiếu *</label>
                    <input required placeholder="PN-2026-001" value={form.receipt_no} onChange={e => setForm({ ...form, receipt_no: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Kho nhập *</label>
                    <select required value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }}>
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Ghi chú</label>
                  <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, height: 48, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Hủy</button>
                  <button type="submit" style={{ flex: 1, height: 48, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Tạo phiếu nhập</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
