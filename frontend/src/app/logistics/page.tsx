'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import { logisticsService, salesOrderService } from '@/services';
import { SalesOrder, PaginatedResponse, ORDER_STATUS_LABELS } from '@/types';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { label: string; tone: string; description: string }> = {
  pending:            { label: 'Chờ điều phối',     tone: 'amber', description: 'Đơn mới từ Sales, sẵn sàng phân tuyến.' },
  warehouse_processing: { label: 'Kho đang xử lý',  tone: 'blue',  description: 'Đã điều phối, chờ kho soạn hàng và xuất tuyến.' },
  shipping:           { label: 'Đang giao hàng',  tone: 'purple', description: 'Hàng đã rời kho, đang trên đường đến tay khách.' },
  completed:           { label: 'Đã giao thành công', tone: 'green', description: 'Đơn đã hoàn tất giao nhận.' },
  returned:           { label: 'Hoàn trả / Bom hàng', tone: 'red',   description: 'Đơn bị hủy hoặc hoàn trả trong quá trình giao.' },
  canceled:           { label: 'Hủy đơn',           tone: 'red',   description: 'Đơn đã bị hủy.' },
};

const TONE: Record<string, { bg: string; text: string; border: string; bgBtn: string; shadow: string }> = {
  amber:  { bg: 'bg-amber-50',     text: 'text-amber-800',  border: 'border-amber-200',   bgBtn: 'bg-gradient-to-br from-amber-500 to-orange-400',   shadow: 'shadow-amber-200' },
  blue:   { bg: 'bg-blue-50',     text: 'text-blue-800',   border: 'border-blue-200',    bgBtn: 'bg-gradient-to-br from-blue-600 to-blue-400',       shadow: 'shadow-blue-200' },
  purple: { bg: 'bg-purple-50',   text: 'text-purple-800', border: 'border-purple-200', bgBtn: 'bg-gradient-to-br from-purple-600 to-pink-500', shadow: 'shadow-purple-200' },
  green:  { bg: 'bg-green-50',    text: 'text-green-800',  border: 'border-green-200',  bgBtn: 'bg-gradient-to-br from-green-600 to-emerald-500',   shadow: 'shadow-green-200' },
  red:    { bg: 'bg-red-50',      text: 'text-red-800',    border: 'border-red-200',    bgBtn: 'bg-gradient-to-br from-red-600 to-rose-500',       shadow: 'shadow-red-200' },
};

const TONE_ICON: Record<string, string> = {
  amber:  'bg-gradient-to-br from-amber-400 to-orange-400',
  blue:   'bg-gradient-to-br from-blue-500 to-indigo-500',
  purple: 'bg-gradient-to-br from-purple-500 to-pink-500',
  green:  'bg-gradient-to-br from-green-500 to-emerald-500',
  red:    'bg-gradient-to-br from-red-500 to-rose-500',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, tone: 'amber', description: '' };
  const t = TONE[cfg.tone] || TONE.amber;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold border ${t.bg} ${t.text} ${t.border}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, desc, tone, onHover, hovered }: { label: string; value: number; desc: string; tone: string; onHover: (v: boolean) => void; hovered: boolean }) {
  const t = TONE_ICON[tone] || TONE_ICON.blue;
  const icons: Record<string, React.ReactNode> = {
    blue:   <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8"/><path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    amber:  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/></svg>,
    purple: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M13 6h5l3 3v5h-8V9l3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    green:  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M20 7 10 17l-5-5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    red:    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="m10.29 4.86-7.43 12.8A2 2 0 0 0 4.58 21h14.84a2 2 0 0 0 1.72-3.34l-7.43-12.8a2 2 0 0 0-3.44 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  };
  return (
    <div
      className={`relative bg-white/90 rounded-3xl p-5 shadow-md border border-slate-200 transition-all duration-200 cursor-default ${hovered ? '-translate-y-1 shadow-lg' : ''}`}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <div className={`w-11 h-11 rounded-2xl ${t} text-white flex items-center justify-center mb-3 shadow-md`}>
        {icons[tone]}
      </div>
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{desc}</p>
    </div>
  );
}

const VND = new Intl.NumberFormat('vi-VN').format;
const FMT_DATE = (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—';

const CARRIERS = [
  'Xe Công Ty (Nội bộ)', 'Giao Hàng Tiết Kiệm', 'Viettel Post',
  'Grab Express', 'Ahamove', 'J&T Express', 'GHN',
];

export default function LogisticsPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'tracking'>('pending');
  const [search, setSearch] = useState('');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [animateTable, setAnimateTable] = useState(true);

  const [assignOrder, setAssignOrder] = useState<SalesOrder | null>(null);
  const [rejectOrder, setRejectOrder] = useState<SalesOrder | null>(null);
  const [rejectAction, setRejectAction] = useState<'reject' | 'returned'>('reject');
  const [carrier, setCarrier] = useState('Xe Công Ty (Nội bộ)');
  const [trackingCode, setTrackingCode] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesOrderService.getAll({ limit: 200 });
      setOrders(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh mỗi 10 giây để thấy đơn mới từ Sales ngay
  useEffect(() => {
    const interval = setInterval(() => fetchData(), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setAnimateTable(false);
    const t = setTimeout(() => setAnimateTable(true), 60);
    return () => clearTimeout(t);
  }, [activeTab]);

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending' || o.status === 'submitted'), [orders]);
  const trackingOrders = useMemo(() => orders.filter(o =>
    ['warehouse_processing', 'shipping', 'completed', 'returned', 'canceled'].includes(o.status)), [orders]);

  const filtered = useMemo(() => {
    const base = activeTab === 'pending' ? pendingOrders : trackingOrders;
    if (!search.trim()) return base;
    const kw = search.trim().toLowerCase();
    return base.filter(o =>
      [o.orderNo, o.customer?.name, o.note, o.expectedDeliveryDate]
        .filter(Boolean).join(' ').toLowerCase().includes(kw));
  }, [activeTab, search, pendingOrders, trackingOrders]);

  const stats = {
    total: orders.length,
    pending: pendingOrders.length,
    tracking: trackingOrders.length,
    issues: orders.filter(o => ['returned', 'canceled'].includes(o.status)).length,
  };

  const handleAssign = async () => {
    if (!assignOrder) return;
    setSaving(true);
    try {
      const note = `[GIAO VẬN] ĐVVC: ${carrier}${trackingCode ? ` | Mã vận đơn: ${trackingCode}` : ''}${shippingFee ? ` | Phí: ${VND(Number(shippingFee))}đ` : ''}`;
      await logisticsService.forwardToWarehouse(assignOrder.id, note);
      alert('Đã điều phối đơn sang kho xử lý!');
      setAssignOrder(null);
      setCarrier('Xe Công Ty (Nội bộ)'); setTrackingCode(''); setShippingFee('');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi điều phối'); }
    finally { setSaving(false); }
  };

  const handleReject = async () => {
    if (!rejectOrder || !rejectReason.trim()) { alert('Vui lòng nhập lý do'); return; }
    setSaving(true);
    try {
      await logisticsService.rejectOrder(rejectOrder.id, rejectReason);
      alert('Đã cập nhật trạng thái!');
      setRejectOrder(null); setRejectReason('');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi hệ thống'); }
    finally { setSaving(false); }
  };

  const handleConfirmDelivery = async (id: string) => {
    if (!confirm('Xác nhận khách đã nhận hàng và thanh toán thành công?')) return;
    setActionLoading(id);
    try {
      await logisticsService.confirmDelivery(id);
      alert('Đã hoàn tất đơn hàng!');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi xác nhận giao hàng'); }
    finally { setActionLoading(null); }
  };

  return (
    <AppLayout>
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">

        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tiếp nhận giao hàng</h1>
          <p className="text-slate-500 mt-1">Quản lý đơn chờ điều phối, theo dõi vận chuyển và xử lý sự cố giao nhận.</p>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Tổng đơn" value={stats.total} desc="Tất cả đơn trong hệ thống." tone="blue" hovered={hoveredCard === 'total'} onHover={v => setHoveredCard(v ? 'total' : null)} />
          <StatCard label="Chờ điều phối" value={stats.pending} desc="Đơn mới cần logistics xử lý." tone="amber" hovered={hoveredCard === 'pending'} onHover={v => setHoveredCard(v ? 'pending' : null)} />
          <StatCard label="Đang theo dõi" value={stats.tracking} desc="Đơn đã bàn giao hoặc đã giao." tone="purple" hovered={hoveredCard === 'tracking'} onHover={v => setHoveredCard(v ? 'tracking' : null)} />
          <StatCard label="Sự cố / Hoàn trả" value={stats.issues} desc="Đơn phát sinh vấn đề giao nhận." tone="red" hovered={hoveredCard === 'issues'} onHover={v => setHoveredCard(v ? 'issues' : null)} />
        </div>

        {/* Quick Status Panel */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(['pending', 'warehouse_processing', 'shipping', 'completed', 'canceled'] as const).map(key => {
            const cfg = STATUS_CONFIG[key] || { label: key, tone: 'amber', description: '' };
            const t = TONE[cfg.tone] || TONE.amber;
            const iconBg = TONE_ICON[cfg.tone] || TONE_ICON.amber;
            const count = key === 'canceled'
              ? orders.filter(o => ['returned', 'canceled'].includes(o.status)).length
              : orders.filter(o => o.status === key).length;
            const iconMap: Record<string, React.ReactNode> = {
              pending: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/></svg>,
              warehouse_processing: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" stroke="currentColor" strokeWidth="1.8"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="currentColor" strokeWidth="1.8"/></svg>,
              shipping: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M13 6h5l3 3v5h-8V9l3-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
              completed: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M20 7 10 17l-5-5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
              canceled: <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="m10.29 4.86-7.43 12.8A2 2 0 0 0 4.58 21h14.84a2 2 0 0 0 1.72-3.34l-7.43-12.8a2 2 0 0 0-3.44 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
            };
            return (
              <div
                key={key}
                className={`relative bg-white/90 rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center gap-3 transition-all duration-200 ${hoveredCard === key ? '-translate-y-0.5 shadow-md' : ''}`}
                onMouseEnter={() => setHoveredCard(key)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className={`w-10 h-10 rounded-xl ${iconBg} text-white flex items-center justify-center shadow-sm flex-shrink-0`}>
                  {iconMap[key]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold text-slate-700 leading-tight">{cfg.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug hidden md:block">{cfg.description}</p>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-extrabold border ${t.bg} ${t.text} ${t.border}`}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Section */}
        <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Tabs + Search */}
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Tabs */}
              <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-5 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 ${
                    activeTab === 'pending'
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Chờ điều phối ({pendingOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('tracking')}
                  className={`px-5 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 ${
                    activeTab === 'tracking'
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Theo dõi giao hàng ({trackingOrders.length})
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-64">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo mã đơn, khách hàng, ghi chú..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
              </div>

              {search && (
                <button onClick={() => setSearch('')} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Mã đơn</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Khách hàng</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Ngày giao dự kiến</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                  <th className="text-center px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-16 text-slate-400">Đang tải dữ liệu...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16 text-slate-400">Không có dữ liệu phù hợp.</td></tr>
                ) : filtered.map((order, i) => {
                  const isHovered = hoveredRow === order.id;
                  const cfg = STATUS_CONFIG[order.status] || { label: order.status, tone: 'amber' };
                  const t = TONE[cfg.tone] || TONE.amber;
                  const delay = activeTab === 'tracking' ? `${i * 80}ms` : '0ms';
                  return (
                    <tr
                      key={order.id}
                      style={{
                        opacity: activeTab === 'tracking' ? (animateTable ? 1 : 0) : 1,
                        transform: activeTab === 'tracking'
                          ? animateTable ? 'translateY(0)' : 'translateY(12px) scale(0.97)'
                          : 'translateY(0)',
                        transition: `background-color 180ms ease, opacity 300ms ease ${delay}, transform 300ms ease ${delay}`,
                      }}
                      className={`border-b border-slate-100 cursor-default ${isHovered ? 'bg-blue-50/30' : ''}`}
                      onMouseEnter={() => setHoveredRow(order.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono font-black text-blue-600">{order.orderNo}</p>
                        <p className="text-xs text-slate-400 mt-1 hidden md:block">ID: {order.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {order.customer?.name?.[0] || '?'}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{order.customer?.name || '—'}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{order.note || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 hidden md:table-cell">{FMT_DATE(order.expectedDeliveryDate || '')}</td>
                      <td className="px-6 py-4"><StatusBadge status={order.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">

                          {/* Pending tab actions */}
                          {activeTab === 'pending' && (
                            <>
                              <button
                                onClick={() => setAssignOrder(order)}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white shadow-md transition-all duration-150 ${
                                  isHovered ? '-translate-y-0.5 shadow-lg' : ''
                                } bg-gradient-to-r from-blue-600 to-blue-400 hover:brightness-105`}
                                style={{ transition: 'transform 150ms ease, box-shadow 150ms ease, filter 150ms ease, opacity 150ms ease' }}
                              >
                                Điều phối xe
                              </button>
                              <button
                                onClick={() => { setRejectOrder(order); setRejectAction('reject'); setRejectReason(''); }}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold text-white shadow-md transition-all duration-150 ${
                                  isHovered ? '-translate-y-0.5 shadow-lg' : ''
                                } bg-gradient-to-r from-red-500 to-rose-500 hover:brightness-105`}
                                style={{ transition: 'transform 150ms ease, box-shadow 150ms ease, filter 150ms ease, opacity 150ms ease' }}
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {/* Tracking tab actions */}
                          {activeTab === 'tracking' && order.status === 'shipping' && (
                            <>
                              <button
                                onClick={() => handleConfirmDelivery(order.id)}
                                disabled={actionLoading === order.id}
                                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-green-600 to-emerald-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150 flex items-center gap-1.5"
                              >
                                {actionLoading === order.id && (
                                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>
                                )}
                                Đã nhận hàng
                              </button>
                              <button
                                onClick={() => { setRejectOrder(order); setRejectAction('returned'); setRejectReason(''); }}
                                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150 flex items-center gap-1.5"
                              >
                                Báo bom hàng
                              </button>
                            </>
                          )}

                          {activeTab === 'tracking' && order.status === 'warehouse_processing' && (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${t.bg} ${t.text} ${t.border}`}>
                              Đang chờ kho xuất hàng
                            </span>
                          )}

                          {activeTab === 'tracking' && order.status === 'completed' && (
                            <>
                              <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${t.bg} ${t.text} ${t.border}`}>
                                ✓ Đã hoàn tất
                              </span>
                              <button
                                onClick={() => { setRejectOrder(order); setRejectAction('returned'); setRejectReason(''); }}
                                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150"
                              >
                                Báo bom hàng
                              </button>
                            </>
                          )}

                          {activeTab === 'tracking' && ['returned', 'canceled'].includes(order.status) && (
                            <span className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${t.bg} ${t.text} ${t.border}`}>
                              Đơn đã đóng sự cố
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== ASSIGN MODAL ===== */}
        {assignOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ animation: 'fadeIn 180ms ease-out' }}>
            <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-7 shadow-2xl"
              style={{ animation: 'scaleIn 220ms ease-out' }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-extrabold text-blue-600 uppercase tracking-widest">Điều phối vận chuyển</p>
                  <h3 className="text-xl font-black text-slate-900 mt-1 tracking-tight">Phân tuyến cho đơn {assignOrder.orderNo}</h3>
                  <p className="text-sm text-slate-500 mt-1">Bổ sung đơn vị vận chuyển, tracking và phí dự tính trước khi chuyển sang kho.</p>
                </div>
                <button onClick={() => setAssignOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
                  ×
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                <p className="text-xs text-slate-500 font-bold">Mã đơn</p>
                <p className="font-black text-slate-900 mt-1">{assignOrder.orderNo}</p>
                <p className="text-sm text-slate-600 mt-2">{assignOrder.customer?.name || '—'}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">Đơn vị vận chuyển</label>
                  <select value={carrier} onChange={e => setCarrier(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all cursor-pointer">
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">Mã vận đơn</label>
                    <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="VD: GHTK123456"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-2">Phí ship (VNĐ)</label>
                    <input type="number" min="0" value={shippingFee} onChange={e => setShippingFee(e.target.value)} placeholder="VD: 35000"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAssign}
                  disabled={saving}
                  className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                  Lưu và chuyển kho
                </button>
                <button onClick={() => setAssignOrder(null)} className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== REJECT MODAL ===== */}
        {rejectOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            style={{ animation: 'fadeIn 180ms ease-out' }}>
            <div className="bg-white rounded-3xl border border-red-200 w-full max-w-lg p-7 shadow-2xl"
              style={{ animation: 'scaleIn 220ms ease-out' }}>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">CẢNH BÁO</span>
                  <h3 className="text-xl font-black text-slate-900 mt-3 tracking-tight">
                    {rejectAction === 'reject' ? 'Từ chối đơn hàng' : 'Báo cáo khách hoàn trả / bom hàng'}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Ghi nhận lý do xử lý sự cố để các bộ phận khác dễ theo dõi.</p>
                </div>
                <button onClick={() => setRejectOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
                  ×
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                <p className="text-xs text-slate-500 font-bold">Khách hàng</p>
                <p className="font-extrabold text-slate-900 mt-1">{rejectOrder.customer?.name || '—'}</p>
                <p className="font-mono font-black text-blue-600 mt-1">{rejectOrder.orderNo}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">
                    Lý do chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    rows={4}
                    placeholder={
                      rejectAction === 'reject'
                        ? 'Sai địa chỉ, không có tuyến giao, khách hủy đơn...'
                        : 'Gọi nhiều lần không nghe máy, hàng bị móp méo, khách từ chối nhận...'
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReject}
                  disabled={saving || !rejectReason.trim()}
                  className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                  Gửi báo cáo
                </button>
                <button onClick={() => setRejectOrder(null)} className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
                  Hủy
                </button>
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
