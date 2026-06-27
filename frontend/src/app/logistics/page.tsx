'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { logisticsService, salesOrderService, carrierService, shipmentService, notificationService } from '@/services';
import { SalesOrder, Notification } from '@/types';
import { SHIPMENT_STEP_LABELS } from '@/types';
import dayjs from 'dayjs';

const CARRIERS = [
  { id: '__xct__', name: 'Xe Công Ty (Nội bộ)', code: 'XCT', autoPrefix: 'XCT' },
  { id: '__ghtk__', name: 'Giao Hàng Tiết Kiệm', code: 'GHTK', autoPrefix: 'GHTK' },
  { id: '__vtp__', name: 'Viettel Post', code: 'VTP', autoPrefix: 'VTP' },
  { id: '__ge__', name: 'Grab Express', code: 'GE', autoPrefix: 'GE' },
  { id: '__ahm__', name: 'Ahamove', code: 'AHM', autoPrefix: 'AHM' },
];

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending:              { label: 'Chờ duyệt',            tone: 'amber' },
  logistics_review:    { label: 'Logistics xem xét lại', tone: 'orange' },
  warehouse_processing: { label: 'Kho đang xử lý',     tone: 'blue' },
  warehouse_rejected:  { label: 'Kho từ chối',         tone: 'red' },
  warehouse_delayed:   { label: 'Dời ngày',             tone: 'amber' },
  shipping:            { label: 'Đang giao hàng',       tone: 'purple' },
  completed:           { label: 'Đã giao thành công',   tone: 'green' },
  returned:            { label: 'Hoàn trả',               tone: 'red' },
  canceled:            { label: 'Hủy đơn',               tone: 'gray' },
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

// REJECTION REASONS
const REJECTION_REASONS = [
  'Địa chỉ giao hàng không đầy đủ hoặc không tìm thấy',
  'Khách hàng không liên lạc được / không có người nhận',
  'Sản phẩm yêu cầu không đúng với đơn đặt',
  'Khách hàng từ chối nhận hàng khi giao đến',
  'Đơn bị trùng lặp hoặc đã hủy trước đó',
  'Lý do khác (ghi rõ bên dưới)',
];

const REJECTION_NOTE = 'Vui lòng ghi rõ lý do từ chối để Sale xem xét và xử lý.';

export default function LogisticsPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'tracking' | 'notifications'>('pending');
  const [search, setSearch] = useState('');

  // Modal chi tiết đơn + hành động
  const [detailOrder, setDetailOrder] = useState<SalesOrder | null>(null);
  const [detailStep, setDetailStep] = useState<'view' | 'reject' | 'confirm'>('view');

  // Từ chối
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  // Xác nhận điều phối
  const [selectedCarrierId, setSelectedCarrierId] = useState(CARRIERS[0].id);
  const [shippingFee, setShippingFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [carriers, setCarriers] = useState<any[]>(CARRIERS);

  // Modal thông báo
  const [notifModal, setNotifModal] = useState(false);

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
      try {
        const cRes = await carrierService.getAll();
        const dbC = (cRes.data || []) as any[];
        if (dbC.length > 0) setCarriers([...CARRIERS, ...dbC]);
      } catch (_) { /* use defaults */ }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(), 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const pendingOrders = useMemo(() =>
    orders.filter(o => ['pending', 'logistics_review'].includes(o.status)), [orders]);

  const trackingOrders = useMemo(() =>
    orders.filter(o => ['warehouse_processing', 'shipping', 'completed', 'returned', 'canceled', 'warehouse_rejected', 'warehouse_delayed'].includes(o.status)), [orders]);

  const filteredPending = useMemo(() => {
    if (!search.trim()) return pendingOrders;
    const kw = search.toLowerCase();
    return pendingOrders.filter(o =>
      [o.orderNo, o.customer?.name, o.note].filter(Boolean).join(' ').toLowerCase().includes(kw)
    );
  }, [pendingOrders, search]);

  const stats = {
    pending: pendingOrders.length,
    tracking: trackingOrders.length,
    notif: notifications.filter(n => n.status === 'pending').length,
  };

  // ==== HANDLERS ====

  const openDetail = (o: SalesOrder) => {
    setDetailOrder(o);
    setDetailStep('view');
    setRejectReason('');
    setRejectNote('');
    setSelectedCarrierId(CARRIERS[0].id);
    setShippingFee('');
  };

  const handleReject = async () => {
    if (!detailOrder || !rejectReason) { alert('Vui lòng chọn lý do từ chối'); return; }
    const note = rejectReason === REJECTION_NOTE ? rejectNote : rejectReason;
    if (!note.trim()) { alert('Vui lòng nhập lý do từ chối'); return; }
    setSaving(true);
    try {
      await logisticsService.rejectOrder(detailOrder.id, note);
      alert('Đã từ chối đơn! Sale sẽ xem xét lại.');
      setDetailOrder(null);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi hệ thống'); }
    finally { setSaving(false); }
  };

  const handleConfirmDispatch = async () => {
    if (!detailOrder) return;
    const carrier = carriers.find(c => c.id === selectedCarrierId) || CARRIERS[0];
    const note = `[GIAO VẬN] ĐVVC: ${carrier.name}${shippingFee ? ` | Phí: ${VND(Number(shippingFee))}đ` : ''}`;
    setSaving(true);
    try {
      await logisticsService.forwardToWarehouse(detailOrder.id, note);
      alert('Đã điều phối đơn sang kho xử lý!');
      setDetailOrder(null);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi điều phối'); }
    finally { setSaving(false); }
  };

  const handleResolveNotif = async (n: Notification) => {
    try {
      await notificationService.resolve(n.id);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  const totalAmount = (items: any[]) =>
    items?.reduce((s, i) => s + i.quantity * Number(i.unitPrice || 0), 0) ?? 0;

  const totalQty = (items: any[]) => items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  return (
    <AppLayout>
      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tiếp nhận giao hàng</h1>
            <p className="text-slate-500 mt-1">Xem chi tiết đơn, điều phối hoặc từ chối giao hàng.</p>
          </div>
          <button
            onClick={() => { setNotifModal(true); setActiveTab('notifications'); }}
            className="relative px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Thông báo
            {stats.notif > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center animate-pulse">
                {stats.notif}
              </span>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Chờ điều phối', value: stats.pending, t: 'amber', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/></svg> },
            { label: 'Đang theo dõi', value: stats.tracking, t: 'purple', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13 6h5l3 3v5h-8V9l3-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg> },
            { label: 'Thông báo mới', value: stats.notif, t: 'red', icon: <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
          ].map((s, i) => {
            const tone = TONE[s.t] || TONE.amber;
            return (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tone.bg} ${tone.text}`}>{s.icon}</div>
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{s.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{s.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100">
            {[
              { key: 'pending', label: `Chờ điều phối (${stats.pending})`, tab: 'pending' as const },
              { key: 'tracking', label: `Theo dõi giao hàng (${stats.tracking})`, tab: 'tracking' as const },
            ].map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.tab); setNotifModal(false); }}
                className={`px-6 py-4 text-sm font-extrabold transition-all border-b-2 ${
                  activeTab === t.tab && !notifModal
                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                    : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Pending list */}
          {activeTab === 'pending' && (
            <div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative max-w-md">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all" />
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="text-center py-16 text-slate-400">Đang tải...</div>
                ) : filteredPending.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">Không có đơn nào chờ điều phối.</div>
                ) : filteredPending.map(o => (
                  <div key={o.id} className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50/30 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm flex-shrink-0">
                      {o.customer?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-blue-600 text-sm">{o.orderNo}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 truncate">{o.customer?.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-sm font-semibold text-slate-800">{VND(totalAmount(o.items))}đ</p>
                      <p className="text-xs text-slate-400">{totalQty(o.items)} sản phẩm</p>
                    </div>
                    <div className="text-right flex-shrink-0 hidden md:block">
                      <p className="text-xs text-slate-500">{FMT_DATE(o.orderDate)}</p>
                      <p className="text-xs text-slate-400">{o.expectedDeliveryDate ? `→ ${FMT_DATE(o.expectedDeliveryDate)}` : '—'}</p>
                    </div>
                    <button
                      onClick={() => openDetail(o)}
                      className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white text-sm font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
                    >
                      Điều phối
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tracking list */}
          {activeTab === 'tracking' && (
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="text-center py-16 text-slate-400">Đang tải...</div>
              ) : trackingOrders.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Không có đơn nào đang theo dõi.</div>
              ) : trackingOrders.map(o => (
                <div key={o.id} className="flex items-center gap-4 px-6 py-4 hover:bg-purple-50/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm flex-shrink-0">
                    {o.customer?.name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-blue-600 text-sm">{o.orderNo}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 truncate">{o.customer?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">{VND(totalAmount(o.items))}đ</p>
                    <p className="text-xs text-slate-400">{totalQty(o.items)} sản phẩm</p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden md:block">
                    <p className="text-xs text-slate-500">{FMT_DATE(o.orderDate)}</p>
                  </div>
                  <button
                    onClick={() => openDetail(o)}
                    className="flex-shrink-0 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-150"
                  >
                    Chi tiết
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== MODAL CHI TIẾT ĐƠN HÀNG ===== */}
      {detailOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
            style={{ animation: 'scaleIn 220ms ease-out' }}>

            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-extrabold">CHI TIẾT ĐƠN HÀNG</span>
                  <StatusBadge status={detailOrder.status} />
                </div>
                <h2 className="text-xl font-black text-slate-900">{detailOrder.orderNo}</h2>
                <p className="text-sm text-slate-500 mt-0.5">{detailOrder.customer?.name} · {FMT_DATE(detailOrder.orderDate)}</p>
              </div>
              <button onClick={() => setDetailOrder(null)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all flex-shrink-0 cursor-pointer">
                ×
              </button>
            </div>

            {/* Step: view — chi tiết đơn */}
            {detailStep === 'view' && (
              <div className="px-7 py-5 space-y-5">

                {/* Thông tin chung */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Khách hàng', value: detailOrder.customer?.name },
                    { label: 'SĐT', value: detailOrder.customer?.phone || '—' },
                    { label: 'Ngày đặt', value: FMT_DATE(detailOrder.orderDate) },
                    { label: 'Dự kiến giao', value: detailOrder.expectedDeliveryDate ? FMT_DATE(detailOrder.expectedDeliveryDate) : '—' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-slate-500 mb-1">{item.label}</p>
                      <p className="font-semibold text-slate-800 text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Địa chỉ giao hàng */}
                {detailOrder.note && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-amber-600 mb-1">Địa chỉ / Ghi chú giao hàng</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{detailOrder.note}</p>
                  </div>
                )}

                {/* Bảng sản phẩm */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Danh sách sản phẩm</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Sản phẩm</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">SL</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Đơn giá</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailOrder.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{item.product?.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{item.product?.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{VND(Number(item.unitPrice || 0))}đ</td>
                          <td className="px-4 py-3 text-right font-extrabold text-slate-900">{VND(item.quantity * Number(item.unitPrice || 0))}đ</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right font-extrabold text-slate-700 text-sm">Tổng cộng:</td>
                        <td className="px-4 py-3 text-right font-black text-blue-600">{VND(totalAmount(detailOrder.items))}đ</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 2 nút hành động */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDetailStep('confirm')}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 9 9 9 9M4 12l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 2 2 2 2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ✓ Xác nhận điều phối
                  </button>
                  <button
                    onClick={() => setDetailStep('reject')}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5"><path d="M18.364 5.636a9 9 0 0 1 0 12.728M5.636 5.636a9 9 0 0 1 0 12.728M5.636 5.636L12 12m0 0l6.364-6.364M12 12l6.364 6.364" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ✗ Từ chối điều phối
                  </button>
                </div>
              </div>
            )}

            {/* Step: reject — lý do từ chối */}
            {detailStep === 'reject' && (
              <div className="px-7 py-5 space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-1">Chọn lý do từ chối <span className="text-red-500">*</span></p>
                  <p className="text-xs text-slate-500 mb-3">Thông tin sẽ được gửi lại cho Sale để xem xét và xử lý.</p>
                  <div className="space-y-2">
                    {REJECTION_REASONS.map(r => (
                      <button key={r} onClick={() => setRejectReason(r)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 ${
                          rejectReason === r
                            ? 'border-red-400 bg-red-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-red-300'
                        }`}>
                        <span className={`text-sm font-semibold ${rejectReason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(rejectReason === REJECTION_NOTE || rejectReason.includes('khác')) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Ghi chú thêm <span className="text-red-500">*</span></label>
                    <textarea
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                      rows={3}
                      placeholder="VD: Địa chỉ 123 Nguyễn Trãi, Q.1 nhưng không có ai nhận..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none transition-all"
                    />
                  </div>
                )}

                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <strong>Kết quả:</strong> Đơn sẽ chuyển về trạng thái <strong>"Bị từ chối"</strong>. Sale có thể sửa lại và gửi lại cho Logistics.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleReject}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                    ✓ Gửi từ chối về Sale
                  </button>
                  <button onClick={() => setDetailStep('view')} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
                    ← Quay lại
                  </button>
                </div>
              </div>
            )}

            {/* Step: confirm — chọn ĐVVC */}
            {detailStep === 'confirm' && (
              <div className="px-7 py-5 space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-1">Chọn đơn vị vận chuyển <span className="text-red-500">*</span></p>
                  <div className="relative">
                    <select
                      value={selectedCarrierId}
                      onChange={e => setSelectedCarrierId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all cursor-pointer appearance-none pr-10"
                    >
                      {carriers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Phí vận chuyển (VNĐ)</label>
                  <div className="relative">
                    <input
                      type="number" min="0" value={shippingFee}
                      onChange={e => setShippingFee(e.target.value)}
                      placeholder="VD: 35000"
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">đ</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Mã vận đơn sẽ được tạo tự động khi nhấn xác nhận.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                  <strong>Kết quả:</strong> Đơn sẽ chuyển sang trạng thái <strong>"Kho đang xử lý"</strong>. Kho sẽ nhận đơn và tiến hành đóng gói, xuất hàng.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirmDispatch}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {saving && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 16 0"/></svg>}
                    ✓ Xác nhận điều phối
                  </button>
                  <button onClick={() => setDetailStep('view')} className="px-5 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
                    ← Quay lại
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL THÔNG BÁO ===== */}
      {notifModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-3xl max-h-[88vh] overflow-hidden shadow-2xl flex flex-col"
            style={{ animation: 'scaleIn 220ms ease-out' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">Thông báo lỗi vận chuyển</h2>
              <button onClick={() => setNotifModal(false)} className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Không có thông báo nào.</div>
              ) : notifications.map(n => (
                <div key={n.id} className={`px-6 py-4 border-b border-slate-100 ${n.status === 'pending' ? 'bg-red-50/40' : 'bg-white'} hover:bg-blue-50/20 transition-colors`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold border ${
                          n.type === 'compensation' ? 'bg-red-100 text-red-700 border-red-200' :
                          n.type === 'carrier_damage' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {n.type === 'compensation' ? 'Bù hàng' : n.type === 'carrier_damage' ? 'Bồi thường' : 'Khác'}
                        </span>
                        <span className={`text-xs font-semibold ${n.status === 'pending' ? 'text-amber-600' : 'text-green-600'}`}>
                          {n.status === 'pending' ? '⏳ Chưa xử lý' : '✓ Đã xử lý'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{dayjs(n.createdAt).format('DD/MM/YYYY HH:mm')}</p>
                    </div>
                    {n.status === 'pending' && (
                      <button onClick={() => handleResolveNotif(n)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-extrabold hover:bg-green-700 transition-all shadow-sm cursor-pointer">
                        ✓ Xong
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
