'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Button from '@/components/ui/Button';
import { logisticsService, salesOrderService, carrierService, shipmentService, notificationService } from '@/services';
import { SalesOrder, Carrier, Notification, PaginatedResponse } from '@/types';
import { SHIPMENT_STEP_LABELS, ORDER_STATUS_LABELS } from '@/types';
import dayjs from 'dayjs';

// Đơn vị vận chuyển mặc định (hard-code)
const CARRIERS_DEFAULT = [
  { id: '__xct__', name: 'Xe Công Ty (Nội bộ)', code: 'XCT', autoPrefix: 'XCT' },
  { id: '__ghtk__', name: 'Giao Hàng Tiết Kiệm', code: 'GHTK', autoPrefix: 'GHTK' },
  { id: '__vtp__', name: 'Viettel Post', code: 'VTP', autoPrefix: 'VTP' },
  { id: '__ge__', name: 'Grab Express', code: 'GE', autoPrefix: 'GE' },
  { id: '__ahm__', name: 'Ahamove', code: 'AHM', autoPrefix: 'AHM' },
];

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending:             { label: 'Chờ duyệt',           tone: 'amber' },
  logistics_review:     { label: 'Logistics xem xét lại', tone: 'orange' },
  warehouse_processing:  { label: 'Kho đang xử lý',     tone: 'blue' },
  warehouse_rejected:  { label: 'Kho từ chối',        tone: 'red' },
  warehouse_delayed:    { label: 'Dời ngày',            tone: 'amber' },
  shipping:             { label: 'Đang giao hàng',      tone: 'purple' },
  completed:            { label: 'Đã giao thành công',  tone: 'green' },
  returned:             { label: 'Hoàn trả',            tone: 'red' },
  canceled:             { label: 'Hủy đơn',            tone: 'gray' },
};

const TONE: Record<string, { bg: string; text: string; border: string }> = {
  amber:  { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-800',    border: 'border-blue-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-800',  border: 'border-purple-200' },
  green:  { bg: 'bg-green-50',  text: 'text-green-800',   border: 'border-green-200' },
  red:    { bg: 'bg-red-50',    text: 'text-red-800',     border: 'border-red-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-800',  border: 'border-orange-200' },
  gray:   { bg: 'bg-gray-100',  text: 'text-gray-600',    border: 'border-gray-200' },
};

const VND = new Intl.NumberFormat('vi-VN').format;
const FMT_DATE = (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—';

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, tone: 'amber' };
  const t = TONE[cfg.tone] || TONE.amber;
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-extrabold border ${t.bg} ${t.text} ${t.border}`}>
      {cfg.label}
    </span>
  );
}

// Progress bar component
function ProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 0, label: 'Kho xử lý' },
    { n: 1, label: 'Lấy hàng' },
    { n: 2, label: 'Kho khu vực' },
    { n: 3, label: 'Đang giao' },
    { n: 4, label: 'Hoàn tất' },
  ];
  const pct = (currentStep / 4) * 100;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          {steps.map(s => (
            <div key={s.n} className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                currentStep >= s.n
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                {currentStep > s.n ? '✓' : s.n + 1}
              </div>
              <span className={`text-xs mt-1 font-medium ${currentStep >= s.n ? 'text-blue-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Thông báo notification badge
function NotificationBadge({ notifications }: { notifications: Notification[] }) {
  const pending = notifications.filter(n => n.status === 'pending').length;
  if (!pending) return null;
  return (
    <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black animate-pulse">
      {pending}
    </span>
  );
}

export default function LogisticsPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [carriers, setCarriers] = useState<any[]>(CARRIERS_DEFAULT);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'tracking' | 'notifications'>('pending');
  const [search, setSearch] = useState('');

  // Modal: Điều phối
  const [assignOrder, setAssignOrder] = useState<SalesOrder | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState('__xct__');
  const [trackingCode, setTrackingCode] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal: Tracking chi tiết
  const [trackingOrder, setTrackingOrder] = useState<SalesOrder | null>(null);
  const [shipmentData, setShipmentData] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Modal: Khách từ chối
  const [rejectingOrder, setRejectingOrder] = useState<SalesOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Modal: Notifications
  const [showNotifications, setShowNotifications] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, nRes] = await Promise.all([
        salesOrderService.getAll({ limit: 200 }),
        notificationService.getAll({ limit: 50 }),
      ]);
      setOrders(oRes.data.data || []);
      setNotifications(nRes.data.data || []);
      // Load carriers từ DB
      try {
        const cRes = await carrierService.getAll();
        const dbCarriers = cRes.data || [];
        if (dbCarriers.length > 0) setCarriers([...CARRIERS_DEFAULT, ...dbCarriers]);
      } catch (_) { /* fallback to default */ }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(), 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const pendingOrders = useMemo(() =>
    orders.filter(o => ['pending', 'logistics_review', 'warehouse_rejected', 'warehouse_delayed'].includes(o.status)),
    [orders]
  );
  const trackingOrders = useMemo(() =>
    orders.filter(o => ['warehouse_processing', 'shipping', 'completed', 'returned', 'canceled'].includes(o.status)),
    [orders]
  );

  const filtered = useMemo(() => {
    const base = activeTab === 'pending' ? pendingOrders : activeTab === 'tracking' ? trackingOrders : notifications;
    if (activeTab !== 'notifications' && !search.trim()) return base;
    if (activeTab === 'notifications') {
      if (!search.trim()) return notifications;
      return notifications.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.message.toLowerCase().includes(search.toLowerCase())
      );
    }
    const kw = search.trim().toLowerCase();
    return (base as SalesOrder[]).filter(o =>
      [o.orderNo, o.customer?.name, o.note, o.expectedDeliveryDate]
        .filter(Boolean).join(' ').toLowerCase().includes(kw)
    );
  }, [activeTab, search, pendingOrders, trackingOrders, notifications]);

  const stats = {
    total: orders.length,
    pending: pendingOrders.length,
    tracking: trackingOrders.length,
    issues: orders.filter(o => ['warehouse_rejected', 'warehouse_delayed', 'returned', 'canceled'].includes(o.status)).length,
    notifCount: notifications.filter(n => n.status === 'pending').length,
  };

  // ==== HANDLERS ====

  const handleAssign = async () => {
    if (!assignOrder) return;
    setSaving(true);
    try {
      const carrier = carriers.find(c => c.id === selectedCarrierId);
      const note = `[GIAO VẬN] ĐVVC: ${carrier?.name || selectedCarrierId}${trackingCode ? ` | Mã vận đơn: ${trackingCode}` : ''}${shippingFee ? ` | Phí: ${VND(Number(shippingFee))}đ` : ''}`;
      await logisticsService.forwardToWarehouse(assignOrder.id, note);
      alert('Đã điều phối đơn sang kho xử lý!');
      setAssignOrder(null);
      setTrackingCode(''); setShippingFee('');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi điều phối'); }
    finally { setSaving(false); }
  };

  const openTracking = async (order: SalesOrder) => {
    setTrackingOrder(order);
    setLoadingTracking(true);
    setShipmentData(null);
    try {
      const res = await shipmentService.getByOrderId(order.id);
      setShipmentData(res.data);
    } catch (_) { /* Chưa có shipment */ }
    finally { setLoadingTracking(false); }
  };

  const advanceShipment = async () => {
    if (!trackingOrder) return;
    setAdvancing(true);
    try {
      await shipmentService.advanceStep(trackingOrder.id);
      // Refresh shipment
      const res = await shipmentService.getByOrderId(trackingOrder.id);
      setShipmentData(res.data);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi tiến bước'); }
    finally { setAdvancing(false); }
  };

  const handleConfirmReceived = async () => {
    if (!trackingOrder) return;
    try {
      await shipmentService.confirmReceived(trackingOrder.id);
      alert('Xác nhận giao hàng thành công!');
      setTrackingOrder(null);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const handleCustomerReject = async () => {
    if (!rejectingOrder) return;
    if (!rejectReason) { alert('Vui lòng chọn lý do từ chối'); return; }
    setRejecting(true);
    try {
      await shipmentService.customerReject(rejectingOrder.id, rejectReason);
      alert('Đã xử lý từ chối của khách!');
      setRejectingOrder(null); setRejectReason('');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setRejecting(false); }
  };

  const handleResolveNotification = async (n: Notification) => {
    try {
      await notificationService.resolve(n.id);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const REJECTION_REASONS = [
    { key: 'Hàng lỗi không hoạt động (Do nhà máy)', label: 'Hàng lỗi không hoạt động', color: '#fee2e2', textColor: '#b91c1c', icon: '⚠' },
    { key: 'Hàng bể vỡ do vận chuyển', label: 'Hàng bể vỡ do vận chuyển', color: '#fef3c7', textColor: '#92400e', icon: '📦' },
    { key: 'Khách không lấy hàng', label: 'Khách không lấy hàng', color: '#dbeafe', textColor: '#1d4ed8', icon: '🚫' },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tiếp nhận giao hàng</h1>
            <p className="text-slate-500 mt-1">Quản lý đơn chờ điều phối, theo dõi vận chuyển và xử lý lỗi giao nhận.</p>
          </div>
          <button
            onClick={() => { setShowNotifications(true); setActiveTab('notifications'); }}
            className="relative px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Thông báo
            {stats.notifCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center animate-pulse">
                {stats.notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Chờ điều phối', value: stats.pending, tone: 'amber', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/></svg> },
            { label: 'Đang theo dõi', value: stats.tracking, tone: 'purple', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 6h5l3 3v5h-8V9l3-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg> },
            { label: 'Thông báo mới', value: stats.notifCount, tone: 'red', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: 'Sự cố / Hoàn trả', value: stats.issues, tone: 'red', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><path d="m10.29 4.86-7.43 12.8A2 2 0 0 0 4.58 21h14.84a2 2 0 0 0 1.72-3.34l-7.43-12.8a2 2 0 0 0-3.44 0Z" stroke="currentColor" strokeWidth="2"/></svg> },
          ].map((s, i) => {
            const t = TONE[s.tone] || TONE.amber;
            return (
              <div key={i} className={`relative bg-white/90 rounded-2xl p-5 shadow-md border border-slate-200 hover:-translate-y-1 hover:shadow-xl transition-all duration-200`}>
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${t.bg} ${t.text}`}>{s.icon}</div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
                {[
                  { key: 'pending', label: `Chờ điều phối (${pendingOrders.length})`, tab: 'pending' as const },
                  { key: 'tracking', label: `Theo dõi giao hàng (${trackingOrders.length})`, tab: 'tracking' as const },
                  { key: 'notifications', label: `Thông báo (${stats.notifCount})`, tab: 'notifications' as const },
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setActiveTab(t.tab); setShowNotifications(t.tab === 'notifications'); }}
                    className={`px-5 py-2 rounded-xl text-sm font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                      activeTab === t.tab
                        ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                    {t.key === 'notifications' && stats.notifCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center">{stats.notifCount}</span>
                    )}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 min-w-64">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo mã đơn, khách hàng, nội dung..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
              </div>
              {search && (
                <button onClick={() => setSearch('')} className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* === TAB: Notifications === */}
          {activeTab === 'notifications' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Loại</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Tiêu đề</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Nội dung</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Ngày</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-slate-500 uppercase">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-16 text-slate-400">Đang tải...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-16 text-slate-400">Không có thông báo nào.</td></tr>
                  ) : (filtered as Notification[]).map(n => (
                    <tr key={n.id} className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${n.status === 'pending' ? 'bg-red-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                          n.type === 'compensation' ? 'bg-red-50 text-red-700 border-red-200' :
                          n.type === 'carrier_damage' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          n.type === 'customer_rejected' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                          {n.type === 'compensation' ? 'Bù hàng' :
                           n.type === 'carrier_damage' ? 'Đòi bồi thường' :
                           n.type === 'customer_rejected' ? 'Khách từ chối' : 'Khác'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{n.title}</td>
                      <td className="px-6 py-4 text-slate-600 max-w-xs">{n.message}</td>
                      <td className="px-6 py-4 text-slate-500">{dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold ${
                          n.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {n.status === 'pending' ? '⏳ Chưa xử lý' : '✓ Đã xử lý'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {n.status === 'pending' && (
                          <button
                            onClick={() => handleResolveNotification(n)}
                            className="px-3 py-1.5 rounded-xl bg-green-600 text-white text-xs font-extrabold hover:bg-green-700 transition-all shadow-sm"
                          >
                            ✓ Đã xử lý
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* === TAB: Pending / Tracking === */}
          {activeTab !== 'notifications' && (
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
                  ) : (filtered as SalesOrder[]).map(order => (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-mono font-black text-blue-600">{order.orderNo}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
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

                          {/* Pending: Điều phối / Từ chối */}
                          {activeTab === 'pending' && ['pending', 'logistics_review'].includes(order.status) && (
                            <>
                              <button
                                onClick={() => setAssignOrder(order)}
                                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 to-blue-400 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150"
                              >
                                Điều phối
                              </button>
                              <button
                                onClick={() => alert('Nhấn nút Từ chối trên đơn Sale để từ chối')}
                                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150"
                              >
                                Từ chối
                              </button>
                            </>
                          )}

                          {/* Tracking: Xem tiến trình */}
                          {activeTab === 'tracking' && (
                            <>
                              <button
                                onClick={() => openTracking(order)}
                                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150"
                              >
                                🔍 Xem tiến trình
                              </button>
                              {order.status === 'shipping' && (
                                <button
                                  onClick={() => { setRejectingOrder(order); setRejectReason(''); }}
                                  className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-red-500 to-rose-500 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150"
                                >
                                  Khách từ chối
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL: ĐIỀU PHỐI ===== */}
      {assignOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-7 shadow-2xl"
            style={{ animation: 'scaleIn 220ms ease-out' }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold">BƯỚC TIẾP THEO</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Điều phối vận chuyển</h3>
                <p className="text-sm text-slate-500 mt-1">Chọn đơn vị vận chuyển trước khi chuyển kho</p>
              </div>
              <button onClick={() => setAssignOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
                ×
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-blue-600 font-semibold">Mã đơn:</span> <span className="font-mono font-black text-blue-700 ml-1">{assignOrder.orderNo}</span></div>
                <div><span className="text-blue-600 font-semibold">Khách hàng:</span> <span className="font-semibold text-slate-800 ml-1">{assignOrder.customer?.name}</span></div>
                <div><span className="text-blue-600 font-semibold">Dự kiến:</span> <span className="font-semibold text-slate-800 ml-1">{FMT_DATE(assignOrder.expectedDeliveryDate || '')}</span></div>
                <div><span className="text-blue-600 font-semibold">Tổng SL:</span> <span className="font-semibold text-slate-800 ml-1">{assignOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0}</span></div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-2">Đơn vị vận chuyển <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {carriers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCarrierId(c.id)}
                      className={`rounded-xl border-2 p-3 text-left transition-all duration-150 ${
                        selectedCarrierId === c.id
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {c.code}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">Mã vận đơn</label>
                  <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)}
                    placeholder="Tự sinh nếu để trống"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-2">Phí ship (VNĐ)</label>
                  <input type="number" min="0" value={shippingFee} onChange={e => setShippingFee(e.target.value)}
                    placeholder="VD: 35000"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleAssign} disabled={saving}
                className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-400 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
                {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                ✓ Xác nhận điều phối
              </button>
              <button onClick={() => setAssignOrder(null)} className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: THEO DÕI GIAO HÀNG ===== */}
      {trackingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-7 shadow-2xl"
            style={{ animation: 'scaleIn 220ms ease-out' }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold">THEO DÕI GIAO HÀNG</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Đơn {trackingOrder.orderNo}</h3>
                <p className="text-sm text-slate-500 mt-1">{trackingOrder.customer?.name}</p>
              </div>
              <button onClick={() => setTrackingOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
                ×
              </button>
            </div>

            {/* Carrier info */}
            {shipmentData && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-slate-500">ĐVVC:</span> <span className="font-semibold text-slate-800 ml-1">{shipmentData.carrier?.name || shipmentData.carrierId}</span></div>
                  <div><span className="text-slate-500">Mã vận đơn:</span> <span className="font-mono font-semibold text-blue-600 ml-1">{shipmentData.trackingNo || '—'}</span></div>
                  <div><span className="text-slate-500">Phí ship:</span> <span className="font-semibold text-slate-800 ml-1">{shipmentData.shippingFee ? VND(Number(shipmentData.shippingFee)) + 'đ' : '—'}</span></div>
                </div>
              </div>
            )}

            {/* Progress bar */}
            {shipmentData && (
              <div className="mb-5">
                <p className="text-xs font-extrabold text-slate-500 uppercase mb-3 tracking-widest">Tiến trình giao hàng</p>
                <ProgressBar currentStep={shipmentData.currentStep || 0} />
                <p className="text-sm text-slate-600 mt-3 text-center font-medium">
                  {SHIPMENT_STEP_LABELS[shipmentData.currentStep] || 'Bước 0'}
                </p>
              </div>
            )}

            {loadingTracking && <div className="text-center py-8 text-slate-400">Đang tải thông tin vận chuyển...</div>}
            {!loadingTracking && !shipmentData && (
              <div className="text-center py-8 text-slate-400">Chưa có thông tin vận chuyển cho đơn này.</div>
            )}

            {/* Customer rejected warning */}
            {shipmentData?.customerRejected && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5">
                <p className="text-sm font-extrabold text-red-700">⚠ KHÁCH TỪ CHỐI ĐƠN</p>
                <p className="text-sm text-red-600 mt-1">{shipmentData.rejectionReason}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              {shipmentData && !shipmentData.customerRejected && shipmentData.currentStep < 4 && shipmentData.status !== 'completed' && (
                <>
                  <button
                    onClick={advanceShipment}
                    disabled={advancing}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {advancing && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                    ▶ Tiến bước giao hàng
                  </button>
                  <button
                    onClick={handleConfirmReceived}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    ✓ Xác nhận đã giao thành công
                  </button>
                  <button
                    onClick={() => { setTrackingOrder(null); setRejectingOrder(trackingOrder); setRejectReason(''); }}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    ⚠ Khách từ chối
                  </button>
                </>
              )}

              {shipmentData?.currentStep === 4 && !shipmentData.customerRejected && (
                <div className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                  <p className="text-lg font-extrabold text-green-700">🎉 Giao hàng thành công!</p>
                  <p className="text-sm text-green-600 mt-1">Đơn đã hoàn tất. Cảm ơn bạn đã theo dõi.</p>
                </div>
              )}

              <button onClick={() => setTrackingOrder(null)} className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: KHÁCH TỪ CHỐI ===== */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-red-200 w-full max-w-lg p-7 shadow-2xl"
            style={{ animation: 'scaleIn 220ms ease-out' }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold">KHÁCH TỪ CHỐI NHẬN HÀNG</span>
                <h3 className="text-xl font-black text-slate-900 mt-2">Xử lý từ chối - {rejectingOrder.orderNo}</h3>
                <p className="text-sm text-slate-500 mt-1">Chọn lý do khách từ chối để hệ thống xử lý tự động</p>
              </div>
              <button onClick={() => setRejectingOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">
                ×
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {REJECTION_REASONS.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRejectReason(r.key)}
                  className={`w-full rounded-2xl border-2 p-4 text-left transition-all duration-150 ${
                    rejectReason === r.key
                      ? 'border-red-400 shadow-md'
                      : 'border-slate-200 bg-white hover:border-red-300'
                  }`}
                  style={{ backgroundColor: rejectReason === r.key ? r.color : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{r.icon}</span>
                    <div>
                      <p className="font-extrabold" style={{ color: r.textColor }}>{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.key === 'Hàng lỗi không hoạt động (Do nhà máy)' && '→ Hàng vào Kho Hàng Lỗi, không cộng tồn'}
                        {r.key === 'Hàng bể vỡ do vận chuyển' && '→ Gửi thông báo bù hàng + đòi bồi thường'}
                        {r.key === 'Khách không lấy hàng' && '→ Hoàn trả hàng về kho, cộng tồn lại'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {rejectReason && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 text-sm text-slate-600">
                <strong>Kết quả xử lý:</strong>
                <ul className="mt-2 space-y-1">
                  {rejectReason.includes('Hàng lỗi') && (
                    <li>• Hàng được chuyển vào <strong>Kho Hàng Lỗi - Phân Loại</strong></li>
                  )}
                  {rejectReason.includes('bể vỡ') && (
                    <>
                      <li>• Tạo thông báo <strong>"Yêu cầu bù hàng cho khách"</strong></li>
                      <li>• Tạo thông báo <strong>"Đòi bồi thường từ đơn vị vận chuyển"</strong></li>
                    </>
                  )}
                  {rejectReason.includes('Không lấy') && (
                    <>
                      <li>• Hàng được hoàn trả về <strong>kho ban đầu</strong></li>
                      <li>• <strong>Cộng lại số tồn kho</strong> cho sản phẩm</li>
                    </>
                  )}
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCustomerReject}
                disabled={rejecting || !rejectReason}
                className="flex-1 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {rejecting && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                ✓ Xác nhận từ chối
              </button>
              <button onClick={() => setRejectingOrder(null)} className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer">
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
    </AppLayout>
  );
}
