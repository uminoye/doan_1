'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { salesOrderService, customerService, productService } from '@/services';

const statusConfig: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Đang chờ duyệt', tone: 'warning' },
  returned: { label: 'Bị từ chối', tone: 'danger' },
  warehouse_processing: { label: 'Kho đang xuất', tone: 'info' },
  shipping: { label: 'Đang giao', tone: 'purple' },
  completed: { label: 'Đã hoàn tất', tone: 'success' },
  logistics_review: { label: 'Kho báo lỗi', tone: 'purple' },
  canceled: { label: 'Hủy đơn', tone: 'danger' },
};

const toneStyles: Record<string, { background: string; color: string; border: string }> = {
  warning: { background: '#fef3c7', color: '#92400e', border: '#fcd34d' },
  danger: { background: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  info: { background: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  success: { background: '#dcfce7', color: '#166534', border: '#86efac' },
  purple: { background: '#ede9fe', color: '#6b21a8', border: '#c4b5fd' },
};

const pageStyles = {
  page: { minHeight: '100vh', padding: '28px', background: 'radial-gradient(circle at top left, #eff6ff 0%, #f8fafc 35%, #f3f4f6 100%)', color: '#0f172a' },
  shell: { maxWidth: '1400px', margin: '0 auto' },
  hero: { display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '20px', alignItems: 'stretch', marginBottom: '22px' },
  heroCard: { background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', borderRadius: '24px', padding: '28px', color: 'white', boxShadow: '0 24px 60px rgba(15,23,42,0.16)' },
  heroTitle: { margin: 0, fontSize: '30px', lineHeight: 1.2, letterSpacing: '-0.03em' },
  heroSubtitle: { margin: '12px 0 0', maxWidth: '760px', color: 'rgba(255,255,255,0.78)', lineHeight: 1.7 },
  heroStats: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px', width: '100%' },
  statCard: { background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(241,245,249,0.94))', borderRadius: '22px', padding: '18px 18px 16px', boxShadow: '0 12px 24px rgba(15,23,42,0.08)', border: '1px solid rgba(148,163,184,0.18)', position: 'relative' as const, overflow: 'hidden' as const, minHeight: '104px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
  statBlue: { borderTop: '4px solid #2563eb' },
  statAmber: { borderTop: '4px solid #f59e0b' },
  statGreen: { borderTop: '4px solid #16a34a' },
  statRose: { borderTop: '4px solid #dc2626' },
  statBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '14px', marginBottom: '12px', fontSize: '20px', boxShadow: '0 8px 18px rgba(15,23,42,0.08)' },
  statLabel: { margin: 0, color: '#64748b', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  statValue: { margin: '10px 0 0', fontSize: '30px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' },
  section: { background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(148,163,184,0.18)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(15,23,42,0.08)', overflow: 'hidden', marginBottom: '22px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' },
  input: { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', boxSizing: 'border-box' as const },
  table: { width: '100%' as const, borderCollapse: 'separate' as const, borderSpacing: 0 },
  overlay: { position: 'fixed' as const, inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.62)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 20 },
  modal: { width: 'min(1100px, 100%)', maxHeight: '92vh', overflowY: 'auto' as const, borderRadius: 24, background: '#fff', border: '1px solid #e5eef8', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.22)' },
};

function formatCurrency(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

function normalizeOrderItems(order: any) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((item: any) => ({
    product_id: item.product_id || '',
    product_name: item.product_name || item.product?.name || '',
    quantity: Number(item.quantity || 0),
    unit_price: Number(item.unit_price || item.sale_price || 0),
  }));
}

function formatOrderItems(order: any) {
  const items = normalizeOrderItems(order);
  if (!items.length) return 'Chưa có sản phẩm';
  return items.map(i => `${i.product_name} x${i.quantity}`).join(', ');
}

export default function SalesOrdersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [errorOrder, setErrorOrder] = useState<any>(null);
  const orderNoRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [c, p, o] = await Promise.all([
        customerService.getAll(),
        productService.getAll(),
        salesOrderService.getAll(),
      ]);
      setCustomers(c.data);
      setProducts(p.data);
      setOrders(o.data);
    } catch { alert('Lỗi tải dữ liệu hệ thống'); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (isCreateOpen) {
      const t = setTimeout(() => orderNoRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isCreateOpen, editingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsCreateOpen(false); setIsViewOpen(false); setIsReasonOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filteredOrders = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    return orders.filter(o => {
      const searchable = [o.order_no, o.customer_name, o.expected_delivery_date, o.note, ...(o.items || []).flatMap((i: any) => [i.product_name, i.product_sku])].filter(Boolean).join(' ').toLowerCase();
      const status = statusConfig[o.status] ? o.status : 'pending';
      return (!kw || searchable.includes(kw)) && (statusFilter === 'all' || status === statusFilter);
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => (statusConfig[o.status] ? o.status : 'pending') === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    issues: orders.filter(o => ['returned', 'logistics_review'].includes(o.status)).length,
  }), [orders]);

  const addItem = () => setSelectedItems(prev => [...prev, { product_id: '', quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setSelectedItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    setSelectedItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: field === 'quantity' ? Math.max(1, Number(val) || 1) : val };
      if (field === 'product_id') {
        const prod = products.find(p => p.id === val);
        if (prod) next[i].unit_price = Number(prod.sale_price || 0);
      }
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null); setOrderNo(''); setCustomerId(''); setExpectedDate(''); setNote(''); setSelectedItems([]);
    setIsCreateOpen(true);
  };
  const openEdit = async (order: any) => {
    if (['warehouse_processing', 'shipping', 'completed', 'canceled'].includes(order.status)) {
      alert('Đơn đang trong trạng thái này nên không thể chỉnh sửa.'); return;
    }
    try {
      const res = await salesOrderService.getItems(order.id);
      setOrderNo(order.order_no); setCustomerId(order.customer_id); setExpectedDate(order.expected_delivery_date); setNote(order.note || ''); setSelectedItems(res.data);
      setEditingId(order.id); setIsCreateOpen(true);
    } catch { alert('Lỗi tải chi tiết đơn'); }
  };
  const cancelEdit = () => { setEditingId(null); setOrderNo(''); setCustomerId(''); setExpectedDate(''); setNote(''); setSelectedItems([]); setIsCreateOpen(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) return alert('Vui lòng chọn ít nhất 1 sản phẩm');
    try {
      const data = { customer_id: customerId, order_date: new Date().toISOString(), expected_delivery_date: expectedDate, note, items: selectedItems };
      if (editingId) { await salesOrderService.update(editingId, data); alert('Cập nhật thành công!'); }
      else { await salesOrderService.create({ ...data, order_no: orderNo }); alert('Tạo đơn hàng thành công!'); }
      cancelEdit(); fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi khi xử lý đơn'); }
  };

  const handleDelete = async (order: any) => {
    if (['warehouse_processing', 'shipping', 'completed', 'canceled'].includes(order.status)) { alert('Không thể xóa đơn đang ở trạng thái này.'); return; }
    if (window.confirm('Xác nhận xóa vĩnh viễn đơn hàng này?')) {
      try { await salesOrderService.delete(order.id); fetchData(); }
      catch (err: any) { alert(err.response?.data?.message || 'Lỗi xóa đơn'); }
    }
  };

  const handleView = async (order: any) => {
    try { const res = await salesOrderService.getItems(order.id); setViewOrder({ ...order, items: res.data }); }
    catch { setViewOrder(order); }
    setIsViewOpen(true);
  };

  const handleCancel = async (order: any) => {
    if (window.confirm('Xác nhận hủy đơn hàng này?')) {
      try { await salesOrderService.returnInventory(order.id); alert('Đã hủy đơn!'); fetchData(); }
      catch (err: any) { alert(err.response?.data?.message || 'Lỗi hủy đơn'); }
    }
  };

  const orderTotal = (items: any[]) => items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);

  return (
    <div style={pageStyles.page}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>
      <div style={pageStyles.shell}>
        {/* Hero */}
        <div style={{ marginBottom: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, color: '#0f172a', letterSpacing: '-0.03em' }}>Quản lý đơn hàng</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>Theo dõi, chỉnh sửa và xử lý đơn hàng.</p>
          </div>
          <button type="button" onClick={openCreate} style={{ padding: '12px 18px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 28px rgba(37,99,235,0.22)', fontFamily: 'inherit' }}>+ Tạo đơn hàng</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '14px', marginBottom: '40px' }}>
          {[
            { key: 'total', label: 'Tổng đơn', value: stats.total, color: '#2563eb', bg: '#eff6ff' },
            { key: 'pending', label: 'Chờ duyệt', value: stats.pending, color: '#f59e0b', bg: '#fffbeb' },
            { key: 'completed', label: 'Đã hoàn tất', value: stats.completed, color: '#16a34a', bg: '#ecfdf5' },
            { key: 'issues', label: 'Đơn lỗi', value: stats.issues, color: '#dc2626', bg: '#fef2f2' },
          ].map(s => (
            <div key={s.key} style={{ ...pageStyles.statCard, borderTop: `4px solid ${s.color}` }}>
              <div style={{ ...pageStyles.statBadge, background: s.bg, color: s.color, marginBottom: 12, width: 40, height: 40, borderRadius: 14, fontSize: 18 }}>📊</div>
              <p style={pageStyles.statLabel}>{s.label}</p>
              <p style={{ ...pageStyles.statValue, color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ ...pageStyles.section }}>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) repeat(2, minmax(180px, 1fr)) auto', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm mã đơn, khách hàng..." style={{ ...pageStyles.input, paddingLeft: 42 }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={pageStyles.input}>
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Đang chờ duyệt</option>
                <option value="returned">Bị từ chối</option>
                <option value="warehouse_processing">Kho đang xuất</option>
                <option value="completed">Đã hoàn tất</option>
                <option value="canceled">Hủy đơn</option>
              </select>
              <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, color: '#475569' }}>
                {filteredOrders.length} / {orders.length} đơn
              </div>
              <button type="button" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }} style={{ padding: '12px 16px', borderRadius: 14, border: '1px solid #dbe3ee', background: '#fff', fontWeight: 800, cursor: 'pointer' }}>Xóa lọc</button>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: 18, border: '1px solid #e2e8f0' }}>
              <table style={pageStyles.table}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Mã đơn</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Khách hàng</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Sản phẩm đặt</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Ngày giao dự kiến</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Trạng thái</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Hành động</th>
                </tr></thead>
                <tbody>
                  {filteredOrders.map(o => {
                    const status = statusConfig[o.status] ? o.status : 'pending';
                    const style = toneStyles[statusConfig[status]?.tone || 'info'];
                    return (
                      <tr key={o.id} onMouseEnter={() => setHoveredOrderId(o.id)} onMouseLeave={() => setHoveredOrderId(null)}
                        style={{ borderTop: '1px solid #e2e8f0', background: hoveredOrderId === o.id ? 'linear-gradient(90deg, rgba(37,99,235,0.05), rgba(255,255,255,0.98))' : '#fff',
                          transition: 'background 180ms ease' }}>
                        <td style={{ padding: '16px 18px', fontWeight: 800, color: '#2563eb' }}>{o.order_no}</td>
                        <td style={{ padding: '16px 18px', color: '#334155' }}>{o.customer_name}</td>
                        <td style={{ padding: '16px 18px', color: '#475569', fontSize: 13, lineHeight: 1.6, maxWidth: 420 }}>{formatOrderItems(o)}</td>
                        <td style={{ padding: '16px 18px', color: '#334155' }}>{o.expected_delivery_date}</td>
                        <td style={{ padding: '16px 18px' }}>
                          <span style={{ ...style, display: 'inline-flex', alignItems: 'center', padding: '8px 12px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>{statusConfig[status]?.label}</span>
                        </td>
                        <td style={{ padding: '16px 18px' }}>
                          {status === 'completed' || status === 'warehouse_processing' || status === 'shipping' ? (
                            <button onClick={() => handleView(o)} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>👁 Xem</button>
                          ) : status === 'pending' ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => openEdit(o)} style={{ padding: '8px 12px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, cursor: 'pointer', color: '#1d4ed8', fontWeight: 700, fontSize: 12 }}>✏️ Sửa</button>
                              <button onClick={() => handleDelete(o)} style={{ padding: '8px 12px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: 12 }}>🗑️ Xóa</button>
                            </div>
                          ) : status === 'returned' ? (
                            <button onClick={() => { setErrorOrder(o); setIsReasonOpen(true); }} style={{ padding: '8px 12px', background: '#fee2e2', border: 'none', borderRadius: 10, cursor: 'pointer', color: '#b91c1c', fontWeight: 700, fontSize: 12 }}>⚠️ Xử lý lỗi</button>
                          ) : (
                            <button onClick={() => handleView(o)} style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', fontSize: 12 }}>👁 Xem</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>Không có đơn hàng nào.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isCreateOpen && (
        <div style={pageStyles.overlay}>
          <div style={{ ...pageStyles.modal, animation: 'fadeIn 220ms ease-out' }}>
            <div style={{ padding: '22px 24px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{editingId ? 'Sửa đơn' : 'Tạo đơn hàng'}</div>
                <h3 style={{ margin: '6px 0 0', fontSize: 22, color: '#0f172a' }}>{editingId ? `Chỉnh sửa đơn ${orderNo}` : 'Tạo đơn hàng mới'}</h3>
              </div>
              <button type="button" onClick={cancelEdit} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid #dbe3ee', background: '#fff', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit}>
                <div style={pageStyles.formGrid}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Mã đơn hàng</label>
                    <input ref={orderNoRef} required placeholder="VD: SO-001" value={orderNo} onChange={e => setOrderNo(e.target.value)} disabled={!!editingId} style={pageStyles.input} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Khách hàng *</label>
                    <select required value={customerId} onChange={e => setCustomerId(e.target.value)} style={pageStyles.input}>
                      <option value="">-- Chọn khách hàng --</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Ngày giao dự kiến</label>
                    <input required type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} style={pageStyles.input} />
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 700, color: '#334155' }}>Ghi chú</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Địa chỉ giao hàng..." style={{ ...pageStyles.input, minHeight: 80, resize: 'vertical' }} />
                </div>
                <div style={{ marginTop: 22, borderRadius: 18, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', background: 'linear-gradient(180deg, #f8fafc, #fff)', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a' }}>Danh sách sản phẩm</div>
                    <button type="button" onClick={addItem} style={{ padding: '10px 14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0f766e, #2563eb)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>+ Thêm sản phẩm</button>
                  </div>
                  {selectedItems.length === 0 ? (
                    <div style={{ padding: '24px 18px', textAlign: 'center', color: '#64748b' }}>Chưa có sản phẩm nào.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#f8fafc' }}>
                        <th style={{ textAlign: 'left', padding: '12px 16px', color: '#475569', fontSize: 13 }}>Sản phẩm</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', color: '#475569', fontSize: 13, width: 140 }}>Số lượng</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', color: '#475569', fontSize: 13, width: 160 }}>Đơn giá</th>
                        <th style={{ textAlign: 'left', padding: '12px 16px', color: '#475569', fontSize: 13, width: 160 }}>Thành tiền</th>
                        <th style={{ width: 60 }}></th>
                      </tr></thead>
                      <tbody>
                        {selectedItems.map((item, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '14px 16px' }}>
                              <select value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} style={{ ...pageStyles.input, background: '#fff' }}>
                                <option value="">-- Chọn sản phẩm --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ''}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} style={{ ...pageStyles.input, fontWeight: 700, paddingRight: 40 }} />
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(item.unit_price)} đ</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ padding: '8px 12px', borderRadius: 12, background: '#ecfdf5', color: '#166534', fontWeight: 800, fontSize: 13, border: '1px solid #86efac' }}>{formatCurrency(item.quantity * item.unit_price)} đ</span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <button type="button" onClick={() => removeItem(i)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #fecaca', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', fontWeight: 800 }}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' as const }}>
                  <button type="submit" style={{ padding: '13px 20px', borderRadius: 14, border: 'none', background: editingId ? 'linear-gradient(135deg, #ea580c, #f97316)' : 'linear-gradient(135deg, #0f766e, #22c55e)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 30px rgba(15,118,110,0.18)' }}>
                    {editingId ? 'Lưu & Gửi lại' : 'Gửi đơn'}
                  </button>
                  {editingId && <button type="button" onClick={cancelEdit} style={{ padding: '13px 20px', borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>Hủy chỉnh sửa</button>}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewOpen && viewOrder && (
        <div style={pageStyles.overlay}>
          <div style={{ width: 'min(760px, 100%)', borderRadius: 28, overflow: 'hidden', background: '#fff', border: '1px solid rgba(59,130,246,0.16)', boxShadow: '0 30px 90px rgba(15,23,42,0.32)' }}>
            <div style={{ padding: 22, borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ display: 'inline-flex', padding: '7px 12px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 800, fontSize: 12, marginBottom: 14 }}>CHI TIẾT ĐƠN HÀNG</span>
                  <h3 style={{ margin: 0, fontSize: 26, color: '#0f172a' }}>{viewOrder.order_no}</h3>
                </div>
                <button onClick={() => setIsViewOpen(false)} style={{ width: 42, height: 42, borderRadius: 14, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 800, fontSize: 18 }}>×</button>
              </div>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={{ padding: 16, borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Khách hàng</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{viewOrder.customer_name}</div>
                </div>
                <div style={{ padding: 16, borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Ngày giao dự kiến</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{viewOrder.expected_delivery_date}</div>
                </div>
                <div style={{ padding: 16, borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Trạng thái</div>
                  {(() => { const s = statusConfig[viewOrder.status] || statusConfig.pending; const ts = toneStyles[s.tone]; return <span style={{ ...ts, display: 'inline-flex', padding: '7px 12px', borderRadius: 999, fontWeight: 800, fontSize: 12 }}>{s.label}</span>; })()}
                </div>
                <div style={{ padding: 16, borderRadius: 18, border: '1px solid #bfdbfe', background: '#eff6ff', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
                  <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 700, marginBottom: 8 }}>Tổng tiền</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#1d4ed8' }}>{formatCurrency(orderTotal(normalizeOrderItems(viewOrder)))} đ</div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 18, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15,23,42,0.04)' }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 10 }}>Danh sách sản phẩm</div>
                <div style={{ color: '#0f172a', lineHeight: 1.8 }}>{formatOrderItems(viewOrder)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setIsViewOpen(false)} style={{ padding: '12px 18px', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {isReasonOpen && errorOrder && (
        <div style={pageStyles.overlay}>
          <div style={{ width: 'min(560px, 100%)', borderRadius: 24, background: '#fff', border: '1px solid rgba(248,113,113,0.25)', boxShadow: '0 30px 80px rgba(15,23,42,0.3)', padding: 28 }}>
            <span style={{ display: 'inline-flex', padding: '8px 12px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c', fontWeight: 800, fontSize: 12, marginBottom: 16 }}>ĐƠN BỊ TỪ CHỐI</span>
            <h3 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: 22 }}>Chi tiết lỗi đơn {errorOrder.order_no}</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b' }}>Xem lý do trả đơn và chọn cách xử lý tiếp theo.</p>
            <div style={{ background: '#fff1f2', padding: '16px', borderRadius: 18, marginBottom: 20, border: '1px solid #fecdd3', maxHeight: 240, overflowY: 'auto' }}>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#9f1239', lineHeight: 1.7 }}>{errorOrder.note || 'Không có ghi chú lỗi.'}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <button onClick={() => { setIsReasonOpen(false); openEdit(errorOrder); }} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #ea580c, #f97316)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>Sửa & Gửi lại</button>
              <button onClick={() => handleCancel(errorOrder)} style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 800 }}>Hủy đơn</button>
              <button onClick={() => setIsReasonOpen(false)} style={{ padding: '12px 16px', background: '#e2e8f0', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, color: '#0f172a' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
