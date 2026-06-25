'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Modal, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import { salesOrderService, customerService, productService } from '@/services';
import { SalesOrder, Customer, Product, PaginatedResponse, ORDER_STATUS_LABELS } from '@/types';
import dayjs from 'dayjs';

interface OrderItem { productId: string; quantity: number; unitPrice: number; product?: Product; }
interface FormItem { id?: string; product_id: string; quantity: number; unit_price: number; product?: Product; }

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending:     { label: 'Đang chờ duyệt', tone: 'warning' },
  returned:    { label: 'Bị từ chối', tone: 'danger' },
  warehouse_processing: { label: 'Kho đang xuất', tone: 'info' },
  shipping:    { label: 'Đang giao', tone: 'purple' },
  completed:   { label: 'Đã hoàn tất', tone: 'success' },
  logistics_review: { label: 'Kho báo lỗi', tone: 'purple' },
  canceled:    { label: 'Hủy đơn', tone: 'danger' },
};

const TONE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  warning: { bg: 'bg-amber-50',  text: 'text-amber-800',  border: 'border-amber-200' },
  danger:  { bg: 'bg-red-50',    text: 'text-red-800',    border: 'border-red-200' },
  info:    { bg: 'bg-blue-50',    text: 'text-blue-800',   border: 'border-blue-200' },
  success: { bg: 'bg-green-50',   text: 'text-green-800',  border: 'border-green-200' },
  purple:  { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
};

const VND = new Intl.NumberFormat('vi-VN').format;

function Badge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, tone: 'warning' };
  const tone = TONE_STYLES[cfg.tone] || TONE_STYLES.warning;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold border ${tone.bg} ${tone.text} ${tone.border}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, color, children }: { label: string; value: number; color: string; children: React.ReactNode }) {
  return (
    <div className={`relative bg-gradient-to-b from-white to-slate-50 rounded-3xl p-5 shadow-md border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${color}`}
      style={{ minHeight: 104, borderTop: `4px solid var(--accent, #6366f1)` }}>
      <div className="flex items-center justify-center w-10 h-10 rounded-2xl mb-3 shadow-sm">{children}</div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
    </div>
  );
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
  const [errorOrder, setErrorOrder] = useState<SalesOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<SalesOrder | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const orderNoRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, cRes, pRes] = await Promise.all([
        salesOrderService.getAll({ limit: 200 }),
        customerService.getAll({ limit: 200 }),
        productService.getAll({ limit: 200 }),
      ]);
      setOrders(oRes.data.data || []);
      setTotal(oRes.data.pagination?.total || 0);
      setCustomers(cRes.data.data || []);
      setProducts(pRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isCreateOpen) {
      const t = setTimeout(() => orderNoRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [isCreateOpen, editingId]);

  const filtered = orders.filter(o => {
    const keyword = search.trim().toLowerCase();
    const text = [
      o.orderNo, o.customer?.name, o.expectedDeliveryDate, o.note,
      ...(o.items || []).flatMap(i => [i.product?.name, i.product?.sku]),
    ].filter(Boolean).join(' ').toLowerCase();
    const matchSearch = !keyword || text.includes(keyword);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    issues: orders.filter(o => ['returned', 'logistics_review'].includes(o.status)).length,
  };

  const openCreate = () => {
    setEditingId(null);
    setOrderNo('');
    setCustomerId(customers[0]?.id || '');
    setExpectedDate('');
    setNote('');
    setFormItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setFormError('');
    setIsCreateOpen(true);
  };

  const openEdit = async (o: SalesOrder) => {
    if (['warehouse_processing', 'shipping', 'completed', 'canceled'].includes(o.status)) {
      alert('Đơn đang trong trạng thái này nên không thể chỉnh sửa.'); return;
    }
    setEditingId(o.id);
    setOrderNo(o.orderNo);
    setCustomerId(o.customerId);
    setExpectedDate(o.expectedDeliveryDate ? dayjs(o.expectedDeliveryDate).format('YYYY-MM-DD') : '');
    setNote(o.note || '');
    setFormItems(o.items.map(i => ({
      id: i.id,
      product_id: i.productId,
      quantity: i.quantity,
      unit_price: Number(i.unitPrice),
      product: i.product,
    })));
    setFormError('');
    setIsCreateOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCreate = () => { setIsCreateOpen(false); setEditingId(null); };

  const addItem = () => setFormItems([...formItems, { product_id: '', quantity: 1, unit_price: 0 }]);

  const updateItem = (idx: number, field: string, value: string | number) => {
    const next = [...formItems];
    if (field === 'product_id') {
      next[idx].product_id = value as string;
      const p = products.find(p => p.id === value);
      if (p) next[idx].unit_price = Number(p.salePrice);
    } else if (field === 'quantity') {
      next[idx].quantity = Math.max(1, Number(value) || 1);
    }
    setFormItems(next);
  };

  const removeItem = (idx: number) => setFormItems(formItems.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const validItems = formItems.filter(i => i.product_id && i.quantity > 0);
    if (!customerId) { setFormError('Vui lòng chọn khách hàng'); return; }
    if (!validItems.length) { setFormError('Phải có ít nhất 1 sản phẩm'); return; }
    setSaving(true); setFormError('');
    try {
      if (editingId) {
        await salesOrderService.update(editingId, {
          customerId,
          expectedDeliveryDate: expectedDate || undefined,
          note: note || undefined,
          items: validItems.map(i => ({ productId: i.product_id, quantity: i.quantity, unitPrice: i.unit_price })),
        });
        alert('Cập nhật thành công!');
      } else {
        await salesOrderService.create({
          customerId,
          expectedDeliveryDate: expectedDate || undefined,
          note: note || undefined,
          items: validItems.map(i => ({ productId: i.product_id, quantity: i.quantity, unitPrice: i.unit_price })),
        });
        alert('Tạo đơn hàng thành công!');
      }
      closeCreate();
      fetchData();
    } catch (e: any) {
      setFormError(e.response?.data?.error || e.response?.data?.message || 'Lỗi lưu dữ liệu');
    } finally { setSaving(false); }
  };

  const handleDelete = async (o: SalesOrder) => {
    if (['warehouse_processing', 'shipping', 'completed', 'canceled'].includes(o.status)) {
      alert('Đơn đang ở trạng thái này nên không thể xóa.'); return;
    }
    if (!confirm('Xác nhận xóa vĩnh viễn đơn hàng này?')) return;
    setActionLoading(o.id);
    try {
      await salesOrderService.delete(o.id);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi xóa đơn'); }
    finally { setActionLoading(null); }
  };

  const handleCancelOrder = async (o: SalesOrder) => {
    if (!confirm('Xác nhận hủy đơn hàng này?')) return;
    setActionLoading(o.id);
    try {
      await salesOrderService.returnInventory(o.id);
      alert('Đã hủy đơn thành công!');
      setErrorOrder(null);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi hủy đơn'); }
    finally { setActionLoading(null); }
  };

  const totalAmount = formItems.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0);

  return (
    <AppLayout>
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ letterSpacing: '-0.03em' }}>Quản lý đơn hàng</h1>
              <p className="text-slate-500 mt-1">Theo dõi, chỉnh sửa và xử lý đơn hàng trong một giao diện gọn gàng.</p>
            </div>
            <button
              onClick={openCreate}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 text-white font-extrabold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              style={{ boxShadow: '0 14px 28px rgba(37,99,235,0.22)' }}
            >
              + Tạo đơn hàng
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div
              style={{ '--accent': '#2563eb' } as React.CSSProperties}
              className="relative bg-white/90 backdrop-blur rounded-3xl p-5 shadow-md border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              onMouseEnter={() => setHoveredStat('total')}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Tổng đơn</p>
              <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{stats.total}</p>
            </div>
            <div
              style={{ '--accent': '#f59e0b' } as React.CSSProperties}
              className="relative bg-white/90 backdrop-blur rounded-3xl p-5 shadow-md border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              onMouseEnter={() => setHoveredStat('pending')}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/></svg>
              </div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Chờ duyệt</p>
              <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{stats.pending}</p>
            </div>
            <div
              style={{ '--accent': '#16a34a' } as React.CSSProperties}
              className="relative bg-white/90 backdrop-blur rounded-3xl p-5 shadow-md border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              onMouseEnter={() => setHoveredStat('completed')}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-3 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M20 7 10 17l-5-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Đã hoàn tất</p>
              <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{stats.completed}</p>
            </div>
            <div
              style={{ '--accent': '#dc2626' } as React.CSSProperties}
              className="relative bg-white/90 backdrop-blur rounded-3xl p-5 shadow-md border border-slate-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl"
              onMouseEnter={() => setHoveredStat('issues')}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-3 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="m10.29 4.86-7.43 12.8A2 2 0 0 0 4.58 21h14.84a2 2 0 0 0 1.72-3.34l-7.43-12.8a2 2 0 0 0-3.44 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
              </div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Đơn lỗi</p>
              <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{stats.issues}</p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg border border-slate-200 overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-64">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Đang chờ duyệt</option>
                  <option value="returned">Bị từ chối</option>
                  <option value="warehouse_processing">Kho đang xuất</option>
                  <option value="shipping">Đang giao</option>
                  <option value="completed">Đã hoàn tất</option>
                  <option value="logistics_review">Kho báo lỗi</option>
                  <option value="canceled">Hủy đơn</option>
                </select>
                <div className="flex items-center px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-600">
                  {filtered.length} / {orders.length} đơn
                </div>
                <button
                  onClick={() => { setSearch(''); setStatusFilter('all'); }}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Xóa lọc
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Mã đơn</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Ngày giao dự kiến</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-16"><Spinner /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-16 text-slate-400">Chưa có đơn hàng nào</td></tr>
                  ) : filtered.map(o => {
                    const isPending = o.status === 'pending';
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors duration-150"
                      >
                        <td className="px-5 py-4 font-mono font-black text-blue-600 text-sm">{o.orderNo}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                            <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                              {o.customer?.name?.[0] || '?'}
                            </span>
                            {o.customer?.name || '-'}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-sm hidden md:table-cell">
                          {o.expectedDeliveryDate ? dayjs(o.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}
                        </td>
                        <td className="px-5 py-4"><Badge status={o.status} /></td>
                        <td className="px-5 py-4">
                          {o.status === 'completed' ? (
                            <button onClick={() => setViewOrder(o)} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                            </button>
                          ) : o.status === 'canceled' ? (
                            <button onClick={() => setCancelOrder(o)} className="w-9 h-9 rounded-xl border border-red-200 bg-gradient-to-br from-pink-50 to-red-50 flex items-center justify-center text-red-600 shadow-sm">
                              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                            </button>
                          ) : o.status === 'returned' ? (
                            <button
                              onClick={() => { setErrorOrder(o); }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all"
                            >
                              Xem lỗi & xử lý
                            </button>
                          ) : isPending ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEdit(o)}
                                className="w-9 h-9 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M4 20h4l10.5-10.5a1.8 1.8 0 0 0 0-2.55l-1.45-1.45a1.8 1.8 0 0 0-2.55 0L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M13.5 6.5 17.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                              </button>
                              <button
                                onClick={() => handleDelete(o)}
                                className="w-9 h-9 rounded-xl border border-red-200 bg-gradient-to-br from-pink-50 to-red-50 text-red-600 flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M5 7h14M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7M8 7l.7 12.2A1.8 1.8 0 0 0 10.5 21h3a1.8 1.8 0 0 0 1.8-1.8L16 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setViewOrder(o)} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                              <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ===== CREATE / EDIT MODAL ===== */}
        {isCreateOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ animation: 'fadeIn 180ms ease-out' }}>
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl"
              style={{ animation: 'scaleIn 220ms ease-out' }}>
              {/* Modal Header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
                <div>
                  <p className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Quản lý đơn hàng</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">
                    {editingId ? `Chỉnh sửa đơn ${orderNo}` : 'Tạo đơn hàng mới'}
                  </h3>
                </div>
                <button onClick={closeCreate} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 font-black text-xl hover:bg-slate-50 transition-all cursor-pointer">
                  ×
                </button>
              </div>

              <div className="p-7">
                {formError && (
                  <div className="mb-5 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                    {formError}
                  </div>
                )}
                <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
                  {/* Form fields */}
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-2">Mã đơn hàng</label>
                      <input
                        ref={orderNoRef}
                        value={orderNo}
                        onChange={e => setOrderNo(e.target.value)}
                        disabled={!!editingId}
                        placeholder="VD: SO-2026-001"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-2">Khách hàng</label>
                      <select
                        required
                        value={customerId}
                        onChange={e => setCustomerId(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all cursor-pointer"
                      >
                        <option value="">-- Chọn khách hàng --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-700 mb-2">Ngày giao dự kiến</label>
                      <input
                        type="date"
                        value={expectedDate}
                        onChange={e => setExpectedDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">Ghi chú / Địa chỉ giao hàng</label>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={2}
                      placeholder="Địa chỉ giao hàng, thông tin bổ sung..."
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all resize-none"
                    />
                  </div>

                  {/* Products table */}
                  <div className="rounded-2xl border border-slate-200 overflow-hidden mb-6">
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
                      <div>
                        <p className="font-extrabold text-slate-900">Danh sách sản phẩm</p>
                        <p className="text-xs text-slate-500 mt-0.5">Chọn sản phẩm, số lượng và xem thành tiền ngay bên dưới.</p>
                      </div>
                      <button
                        type="button"
                        onClick={addItem}
                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 text-white text-sm font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                        style={{ boxShadow: '0 14px 30px rgba(37,99,235,0.22)' }}
                      >
                        + Thêm sản phẩm
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white border-b border-slate-100">
                            <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Sản phẩm</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase w-36">Số lượng</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase w-44">Đơn giá</th>
                            <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase w-44">Thành tiền</th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formItems.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Chưa có sản phẩm nào. Hãy thêm sản phẩm để bắt đầu.</td></tr>
                          ) : formItems.map((item, idx) => {
                            const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                            return (
                              <tr key={idx} className="border-t border-slate-100">
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-50 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm">
                                      <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M4 7.5V16.5L12 20l8-3.5V7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
                                    </div>
                                    <select
                                      value={item.product_id}
                                      onChange={e => updateItem(idx, 'product_id', e.target.value)}
                                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer"
                                    >
                                      <option value="">-- Chọn sản phẩm --</option>
                                      {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>)}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                      className="w-full px-3 py-2 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 text-right outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">SL</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 font-bold text-slate-900">{VND(item.unit_price)} đ</td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-green-50 text-green-800 font-extrabold text-sm border border-green-200">
                                    {VND(lineTotal)} đ
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeItem(idx)}
                                    className="w-9 h-9 rounded-xl border border-red-200 bg-pink-50 text-red-500 font-black text-base hover:bg-red-100 transition-all"
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {formItems.length > 0 && (
                          <tfoot className="bg-slate-50 border-t border-slate-200">
                            <tr>
                              <td colSpan={3} className="px-5 py-3 text-right font-extrabold text-slate-700 text-sm">Tổng cộng:</td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-green-100 to-emerald-50 text-green-800 font-black text-base border border-green-300">
                                  {VND(totalAmount)} đ
                                </span>
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-wrap">
                    <button
                      type="submit"
                      disabled={saving}
                      className={`px-5 py-3 rounded-2xl font-extrabold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer ${
                        editingId
                          ? 'bg-gradient-to-r from-orange-600 to-orange-400'
                          : 'bg-gradient-to-r from-teal-600 to-emerald-500'
                      }`}
                      style={{ boxShadow: editingId ? '0 14px 30px rgba(234,88,12,0.18)' : '0 14px 30px rgba(15,118,110,0.18)' }}
                    >
                      {saving && <Spinner size="sm" />}
                      {editingId ? 'Lưu & Gửi lại' : 'Gửi đơn cho Logistics'}
                    </button>
                    {editingId && (
                      <button type="button" onClick={closeCreate} className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
                        Hủy chỉnh sửa
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===== VIEW ORDER MODAL ===== */}
        <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Chi tiết đơn ${viewOrder?.orderNo}`} size="xl">
          {viewOrder && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 mb-2">Khách hàng</p>
                  <p className="font-extrabold text-slate-900">{viewOrder.customer?.name || '-'}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 mb-2">Ngày giao dự kiến</p>
                  <p className="font-extrabold text-slate-900">{viewOrder.expectedDeliveryDate ? dayjs(viewOrder.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 mb-2">Trạng thái</p>
                  <Badge status={viewOrder.status} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500 mb-2">Tổng tiền</p>
                  <p className="font-black text-xl text-blue-600">{VND(viewOrder.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0))} đ</p>
                </div>
              </div>
              {viewOrder.note && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-500 mb-2">Ghi chú</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewOrder.note}</p>
                </div>
              )}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">SKU</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Sản phẩm</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">SL</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Đơn giá</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewOrder.items.map(i => (
                      <tr key={i.id}>
                        <td className="px-4 py-3 font-mono text-blue-600 text-xs">{i.product?.sku}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{i.product?.name}</td>
                        <td className="px-4 py-3 text-right font-bold">{i.quantity}</td>
                        <td className="px-4 py-3 text-right">{VND(Number(i.unitPrice))} đ</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900">{VND(i.quantity * Number(i.unitPrice))} đ</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-extrabold text-slate-700">Tổng cộng:</td>
                      <td className="px-4 py-3 text-right font-black text-blue-600">{VND(viewOrder.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0))} đ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewOrder(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ===== ERROR / REASON MODAL ===== */}
        {errorOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ animation: 'fadeIn 180ms ease-out' }}>
            <div className="bg-white rounded-3xl border border-red-200 w-full max-w-lg p-7 shadow-2xl"
              style={{ animation: 'scaleIn 220ms ease-out' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">ĐƠN BỊ TỪ CHỐI</span>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Chi tiết lỗi đơn {errorOrder.orderNo}</h3>
              <p className="text-sm text-slate-500 mb-4">Xem lý do trả đơn và chọn cách xử lý tiếp theo.</p>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 max-h-60 overflow-y-auto">
                <p className="text-sm text-red-800 whitespace-pre-wrap font-medium">{errorOrder.note || 'Không có ghi chú lỗi.'}</p>
              </div>
              <div className="flex justify-between gap-3 flex-wrap">
                <Button variant="outline" onClick={() => setErrorOrder(null)}>Đóng</Button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(errorOrder)}
                    className="px-4 py-2 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-bold hover:bg-red-50 transition-all cursor-pointer"
                  >
                    Xóa vĩnh viễn
                  </button>
                  <button
                    onClick={() => openEdit(errorOrder)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 text-white text-sm font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Sửa &amp; Gửi lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== CANCEL REASON MODAL ===== */}
        {cancelOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ animation: 'fadeIn 180ms ease-out' }}>
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl"
              style={{ animation: 'scaleIn 220ms ease-out' }}>
              <div className="px-7 py-5 bg-gradient-to-b from-pink-50 to-white border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold mb-3">ĐƠN ĐÃ HỦY</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Lý do hủy đơn {cancelOrder.orderNo}</h3>
                  <p className="text-sm text-slate-500 mt-1">Xem chi tiết vì sao đơn này bị hủy.</p>
                </div>
                <button onClick={() => setCancelOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 font-black text-xl hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
                  ×
                </button>
              </div>
              <div className="p-7 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-500 mb-2">Khách hàng</p>
                    <p className="font-extrabold text-slate-900">{cancelOrder.customer?.name || '-'}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-500 mb-2">Ngày hủy</p>
                    <p className="font-extrabold text-slate-900">{cancelOrder.updatedAt ? dayjs(cancelOrder.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}</p>
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-red-600 mb-2">Lý do hủy</p>
                  <p className="text-sm text-red-800 whitespace-pre-wrap font-medium">{cancelOrder.note || 'Không có ghi chú hủy.'}</p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setCancelOrder(null)} className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-400 text-white font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer">
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        `}</style>
      </div>
    </AppLayout>
  );
}
