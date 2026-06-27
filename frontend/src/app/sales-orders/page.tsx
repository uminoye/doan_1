'use client';
import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { customerService, productService, salesOrderService } from '@/services';

const fmt = new Intl.NumberFormat('vi-VN');
const statusConfig: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Đang chờ duyệt', tone: 'warning' },
  returned: { label: 'Bị từ chối', tone: 'danger' },
  warehouse_processing: { label: 'Kho đang xuất', tone: 'info' },
  shipping: { label: 'Đang giao', tone: 'purple' },
  completed: { label: 'Đã hoàn tất', tone: 'success' },
  canceled: { label: 'Hủy đơn', tone: 'danger' },
};
const toneStyle: Record<string, React.CSSProperties> = {
  warning: { background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  danger: { background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' },
  info: { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd' },
  success: { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' },
  purple: { background: '#ede9fe', color: '#6b21a8', border: '1px solid #c4b5fd' },
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ order_no: '', customer_id: '', expected_delivery_date: '', note: '' });
  const [items, setItems] = useState<any[]>([]);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const orderNoRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [o, c, p] = await Promise.all([salesOrderService.getAll(), customerService.getAll(), productService.getAll()]);
      setOrders(o.data); setCustomers(c.data); setProducts(p.data);
    } catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => orderNoRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isOpen, editingId]);

  const filtered = orders.filter(o => {
    const s = statusConfig[o.status] ? o.status : 'pending';
    const kw = search.trim().toLowerCase();
    const match = !kw || [o.order_no, o.customer_name, o.note].some(v => String(v || '').toLowerCase().includes(kw));
    return match && (statusFilter === 'all' || s === statusFilter);
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => (statusConfig[o.status] ? o.status : 'pending') === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    issues: orders.filter(o => ['returned', 'canceled'].includes(o.status)).length,
  };

  const addItem = () => setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
  const updateItem = (i: number, field: string, value: any) => {
    const next = [...items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      next[i] = { ...next[i], product_id: value, unit_price: prod ? Number(prod.sale_price) : 0 };
    } else {
      next[i] = { ...next[i], [field]: field === 'quantity' ? Math.max(1, Number(value)) : value };
    }
    setItems(next);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const openCreate = () => {
    setEditingId(null); setForm({ order_no: '', customer_id: '', expected_delivery_date: '', note: '' });
    setItems([{ product_id: '', quantity: 1, unit_price: 0 }]); setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!items.length || !items[0].product_id) return alert('Chọn ít nhất 1 sản phẩm');
    try {
      if (editingId) {
        await salesOrderService.update(editingId, { customer_id: form.customer_id, expected_delivery_date: form.expected_delivery_date, note: form.note, items });
        alert('Cập nhật thành công!');
      } else {
        await salesOrderService.create({ order_no: form.order_no, customer_id: form.customer_id, expected_delivery_date: form.expected_delivery_date, note: form.note, items });
        alert('Tạo đơn hàng thành công!');
      }
      setIsOpen(false); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa vĩnh viễn đơn này?')) return;
    try { await salesOrderService.delete(id); fetchData(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Hủy đơn hàng này?')) return;
    try { await salesOrderService.returnInventory(id); alert('Đã hủy!'); fetchData(); } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const totalLine = (arr: any[]) => arr.reduce((s, i) => s + (Number(i.unit_price) * (i.quantity || 0)), 0);

  return (
    <AppLayout>
      <div style={{ padding: '28px', background: '#f7fafc', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, color: '#0f172a', letterSpacing: '-0.03em' }}>Quản lý đơn hàng</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>Theo dõi và xử lý đơn hàng</p>
          </div>
          <button onClick={openCreate} style={{ padding: '12px 18px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 28px rgba(37,99,235,0.22)', fontSize: 14 }}>
            + Tạo đơn hàng
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 40 }}>
          {[
            { label: 'Tổng đơn', value: stats.total, bg: '#eff6ff', color: '#2563eb' },
            { label: 'Chờ duyệt', value: stats.pending, bg: '#fffbeb', color: '#d97706' },
            { label: 'Đã hoàn tất', value: stats.completed, bg: '#ecfdf5', color: '#16a34a' },
            { label: 'Lỗi / Hủy', value: stats.issues, bg: '#fef2f2', color: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 22, padding: '18px 18px 16px', boxShadow: '0 12px 24px rgba(15,23,42,0.08)', borderTop: `4px solid ${s.color}`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 40, height: 40, borderRadius: 14, background: s.bg, display: 'grid', placeItems: 'center', color: s.color, marginBottom: 12, fontSize: 20 }}>
                <i className="ri-shopping-cart-2-line" />
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{s.label}</p>
              <p style={{ margin: '10px 0 0', fontSize: 30, fontWeight: 900, color: '#0f172a' }}>{loading ? '...' : s.value}</p>
            </div>
          ))}
        </div>

        {/* Create/Edit Modal */}
        {isOpen && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
            <div className="modal-panel-animate" style={{ background: '#fff', width: 'min(1100px, 100%)', maxHeight: '92vh', overflowY: 'auto', borderRadius: 24, border: '1px solid #e5eef8', boxShadow: '0 30px 80px rgba(15,23,42,0.22)' }}>
              <div style={{ padding: '22px 24px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{editingId ? 'Sửa' : 'Tạo'} đơn hàng</div>
                  <h3 style={{ margin: '6px 0 0', fontSize: 22, color: '#0f172a' }}>{editingId ? `Đơn ${form.order_no}` : 'Đơn hàng mới'}</h3>
                </div>
                <button onClick={() => setIsOpen(false)} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid #dbe3ee', background: '#fff', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
              <div style={{ padding: 24 }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Mã đơn hàng</label>
                      <input ref={orderNoRef} required placeholder="SO-2026-001" value={form.order_no} onChange={e => setForm({ ...form, order_no: e.target.value })} disabled={!!editingId} style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Khách hàng</label>
                      <select required value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: 14 }}>
                        <option value="">-- Chọn khách hàng --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Ngày giao dự kiến</label>
                      <input type="date" required value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: 14 }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Ghi chú</label>
                    <textarea placeholder="Địa chỉ giao hàng..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: 14, minHeight: 90, resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>

                  {/* Items */}
                  <div style={{ marginTop: 22, borderRadius: 18, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: 'linear-gradient(180deg, #f8fafc 0%, #fff 100%)', borderBottom: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Danh sách sản phẩm</div>
                        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Chọn sản phẩm, số lượng và xem thành tiền.</div>
                      </div>
                      <button type="button" onClick={addItem} style={{ padding: '11px 16px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #0f766e, #2563eb)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                        + Thêm sản phẩm
                      </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead><tr style={{ background: '#fff' }}>
                          <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Sản phẩm</th>
                          <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13, width: 140 }}>Số lượng</th>
                          <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13, width: 170 }}>Đơn giá</th>
                          <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13, width: 170 }}>Thành tiền</th>
                          <th style={{ width: 90 }}></th>
                        </tr></thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '16px 18px' }}>
                                <select required value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: 14 }}>
                                  <option value="">-- Chọn sản phẩm --</option>
                                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                </select>
                              </td>
                              <td style={{ padding: '16px 18px' }}>
                                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} style={{ width: '100%', padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: 14, fontWeight: 700, boxSizing: 'border-box' }} />
                              </td>
                              <td style={{ padding: '16px 18px', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>
                                {fmt.format(item.unit_price || 0)} đ
                              </td>
                              <td style={{ padding: '16px 18px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 14px', borderRadius: 14, background: '#ecfdf5', color: '#166534', fontWeight: 800, fontSize: 14 }}>
                                  {fmt.format((item.unit_price || 0) * (item.quantity || 0))} đ
                                </span>
                              </td>
                              <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                                <button type="button" onClick={() => removeItem(i)} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', fontWeight: 800 }}>×</button>
                              </td>
                            </tr>
                          ))}
                          {items.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Chưa có sản phẩm nào.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button type="submit" style={{ padding: '13px 20px', borderRadius: 14, border: 'none', background: editingId ? 'linear-gradient(135deg, #ea580c, #f97316)' : 'linear-gradient(135deg, #0f766e, #22c55e)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 30px rgba(15,118,110,0.18)', fontSize: 14 }}>
                      {editingId ? 'Lưu & Gửi lại' : 'Gửi đơn cho Logistics'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={() => setIsOpen(false)} style={{ padding: '13px 20px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Order list */}
        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 20px 50px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Filters */}
          <div style={{ padding: 24, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) repeat(2, minmax(180px, 1fr)) auto', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <i className="ri-search-line" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng..." style={{ width: '100%', padding: '13px 14px 13px 42px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', boxSizing: 'border-box', fontSize: 14 }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '13px 14px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: 14 }}>
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 13 }}>
                {filtered.length} / {orders.length} đơn
              </div>
              <button onClick={() => { setSearch(''); setStatusFilter('all'); }} style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid #dbe3ee', background: '#fff', color: '#334155', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>Xóa lọc</button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', borderRadius: 18, border: '1px solid #e2e8f0', margin: '0 24px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Mã đơn</th>
                <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Khách hàng</th>
                <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Ngày giao dự kiến</th>
                <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Trạng thái</th>
                <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Hành động</th>
              </tr></thead>
              <tbody>
                {filtered.map(o => {
                  const s = statusConfig[o.status] ? o.status : 'pending';
                  const cfg = statusConfig[s];
                  const ts = toneStyle[cfg.tone];
                  return (
                    <tr key={o.id} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      <td style={{ padding: '16px 18px', fontWeight: 800, color: '#2563eb', fontSize: 14 }}>{o.order_no}</td>
                      <td style={{ padding: '16px 18px', color: '#334155', fontSize: 14 }}>{o.customer_name}</td>
                      <td style={{ padding: '16px 18px', color: '#334155', fontSize: 14 }}>{o.expected_delivery_date}</td>
                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ ...ts, display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {s === 'pending' && (
                            <>
                              <button onClick={() => handleCancel(o.id)} title="Hủy đơn" style={{ padding: '8px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                                Hủy
                              </button>
                              <button onClick={() => handleDelete(o.id)} title="Xóa" style={{ padding: '8px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, color: '#334155', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                                Xóa
                              </button>
                            </>
                          )}
                          {s === 'completed' && (
                            <button onClick={() => setViewOrder(o)} style={{ padding: '8px 14px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, color: '#334155', cursor: 'pointer', fontSize: 12 }}>
                              Xem
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Không có đơn hàng nào.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Order Modal */}
        {viewOrder && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.68)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 }}>
            <div className="modal-panel-animate" style={{ width: 'min(760px, 100%)', borderRadius: 28, overflow: 'hidden', background: '#fff', border: '1px solid rgba(59,130,246,0.16)', boxShadow: '0 30px 90px rgba(15,23,42,0.32)' }}>
              <div style={{ padding: 22, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'inline-flex', padding: '7px 12px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: 12, marginBottom: 14 }}>ĐƠN HÀNG ĐÃ HOÀN TẤT</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: 26, color: '#0f172a' }}>Chi tiết đơn {viewOrder.order_no}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Tổng hợp thông tin đơn hàng.</p>
                  </div>
                  <button onClick={() => setViewOrder(null)} style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 18 }}>×</button>
                </div>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Khách hàng</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{viewOrder.customer_name}</div>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Ngày giao dự kiến</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{viewOrder.expected_delivery_date}</div>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 18, padding: 16, gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700, marginBottom: 8 }}>Ghi chú / Địa chỉ giao</div>
                    <div style={{ fontSize: 16, color: '#1e3a8a', lineHeight: 1.5 }}>{viewOrder.note || 'Không có'}</div>
                  </div>
                </div>
                <button onClick={() => setViewOrder(null)} style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 800, boxShadow: '0 14px 28px rgba(37,99,235,0.18)' }}>Đóng</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
