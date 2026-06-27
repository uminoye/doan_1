'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { stockOutboundService, warehouseService, salesOrderService } from '@/services';
import {
  StockOutboundNote,
  Warehouse,
  SalesOrder,
  PaginatedResponse,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '@/types';
import dayjs from 'dayjs';

type TabKey = 'outbound' | 'pending';

const STATUS_STYLE = (status: string) => {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:               { bg: '#fef3c7', color: '#92400e', label: 'Chờ duyệt' },
    logistics_rejected:   { bg: '#fee2e2', color: '#b91c1c', label: 'Logistics từ chối' },
    warehouse_processing:  { bg: '#dbeafe', color: '#1d4ed8', label: 'Kho đang xuất' },
    warehouse_rejected:   { bg: '#fee2e2', color: '#b91c1c', label: 'Kho từ chối' },
    warehouse_delayed:    { bg: '#fef3c7', color: '#92400e', label: 'Dời ngày' },
    shipping:             { bg: '#f3e8ff', color: '#6b21a8', label: 'Đang giao' },
    completed:            { bg: '#d1fae5', color: '#047857', label: 'Hoàn thành' },
    returned:             { bg: '#fee2e2', color: '#b91c1c', label: 'Hoàn trả' },
    canceled:             { bg: '#f3f4f6', color: '#4b5563', label: 'Đã hủy' },
  };
  return map[status] || { bg: '#f3f4f6', color: '#374151', label: status || 'N/A' };
};

const WAREHOUSE_REJECT_REASONS = [
  'Hết hàng trong kho, cần đặt thêm từ nhà máy',
  'Sản phẩm bị lỗi từ nhà máy, chờ kiểm tra lại',
  'Thông tin đơn hàng không rõ ràng (thiếu địa chỉ giao hàng)',
  'Số lượng yêu cầu vượt quá tồn kho hiện tại',
  'Kho đang bảo trì, tạm ngừng xuất hàng',
  'Lý do khác (ghi rõ bên dưới)',
];

function SkeletonRows({ cols = 7, rows = 6 }: { cols?: number; rows?: number }) {
  const widths = [120, 160, 100, 110, 70, 120, 90];
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <div style={{
                width: widths[j] ?? 100,
                height: 14,
                borderRadius: 6,
                background: 'linear-gradient(90deg, #f0f4f8 25%, #e2eaf2 50%, #f0f4f8 75%)',
                backgroundSize: '600px 100%',
                animation: 'shimmer 1.4s infinite linear',
              }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const VND = new Intl.NumberFormat('vi-VN').format;
const FMT_DATE = (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '—';

// ── Reject modal (Gửi về Sale + 3 lựa chọn) ────────────────────────
function WarehouseRejectModal({
  order,
  onClose,
  onSubmit,
  saving,
}: {
  order: SalesOrder;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  saving: boolean;
}) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const fullReason = reason === 'Lý do khác (ghi rõ bên dưới)' ? customReason.trim() : reason;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ animation: 'fadeIn 180ms ease-out' }}>
      <div className="bg-white rounded-3xl border border-red-200 w-full max-w-lg shadow-2xl"
        style={{ animation: 'scaleIn 220ms ease-out' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-red-100">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold mb-2">
              KHO TỪ CHỐI — BÁO SALE
            </span>
            <h3 className="text-xl font-black text-slate-900">{order.orderNo}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{order.customer?.name}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
            ×
          </button>
        </div>

        {/* Info */}
        <div className="px-7 py-4">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <span>Kho không thể xuất hàng. Lý do sẽ được gửi về cho <strong>Sale</strong> xem xét. Logistics sẽ thấy trạng thái "Kho từ chối".</span>
          </div>
        </div>

        {/* Reason */}
        <div className="px-7 pb-4 space-y-3">
          <p className="text-sm font-bold text-slate-700">Chọn lý do từ chối <span className="text-red-500">*</span></p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {WAREHOUSE_REJECT_REASONS.map(r => (
              <button key={r} onClick={() => setReason(r)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  reason === r ? 'border-red-400 bg-red-50 shadow-sm' : 'border-slate-200 bg-white hover:border-red-300'
                }`}>
                <span className={`text-sm font-medium ${reason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</span>
              </button>
            ))}
          </div>

          {reason === 'Lý do khác (ghi rõ bên dưới)' && (
            <textarea
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              rows={2}
              placeholder="VD: Nhà cung cấp giao trễ, chưa nhập kho..."
              className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 resize-none"
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-7 pb-7 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
          <Button
            onClick={() => onSubmit(fullReason)}
            disabled={!fullReason || saving}
            loading={saving}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Gửi từ chối về Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function WarehouseOutboundPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('outbound');

  // ── Outbound list ─────────────────────────────────────────────
  const [outboundData, setOutboundData] = useState<PaginatedResponse<StockOutboundNote> | null>(null);
  const [outboundPage, setOutboundPage] = useState(1);
  const [outboundLoading, setOutboundLoading] = useState(true);
  const [outboundSearch, setOutboundSearch] = useState('');
  const [outboundStatus, setOutboundStatus] = useState('');

  // ── Pending list ─────────────────────────────────────────────
  const [pendingOrders, setPendingOrders] = useState<SalesOrder[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState('');

  // ── Global ────────────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // ── Modals ───────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showSaleActionModal, setShowSaleActionModal] = useState(false);

  // ── Current items ────────────────────────────────────────────
  const [selectedNote, setSelectedNote] = useState<StockOutboundNote | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [orderDetailData, setOrderDetailData] = useState<SalesOrder | null>(null);

  // ── Forms ────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({ warehouseId: '', exportDate: dayjs().format('YYYY-MM-DD'), note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sale action modal
  const [saleAction, setSaleAction] = useState<'view' | 'delay'>('view');

  // ── Load data ─────────────────────────────────────────────────
  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseService.getAll();
      setWarehouses(res.data || []);
      if (res.data[0]) setCreateForm(f => ({ ...f, warehouseId: res.data[0].id }));
    } catch (e) { console.error(e); }
  }, []);

  const loadOutbound = useCallback(async (showLoading = false) => {
    if (showLoading) setOutboundLoading(true);
    try {
      const res = await stockOutboundService.getAll({ page: outboundPage, limit: 10, status: outboundStatus || undefined });
      setOutboundData(res.data);
    } catch (e) { console.error(e); }
    finally { setOutboundLoading(false); }
  }, [outboundPage, outboundStatus]);

  const loadPending = useCallback(async (showLoading = false) => {
    if (showLoading) setPendingLoading(true);
    try {
      const res = await stockOutboundService.getPendingRequests();
      setPendingOrders(res.data || []);
    } catch (e) { console.error(e); }
    finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { loadWarehouses(); }, [loadWarehouses]);
  useEffect(() => { loadOutbound(); }, [loadOutbound]);
  useEffect(() => { loadPending(); }, [loadPending]);

  // ── Helpers ───────────────────────────────────────────────────
  const totalQty = (items: any[]) => items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const totalAmount = (items: any[]) => items?.reduce((s, i) => s + i.quantity * Number(i.unitPrice || 0), 0) ?? 0;

  const filteredOutbound = (outboundData?.data ?? []).filter(n => {
    if (outboundSearch) {
      const q = outboundSearch.toLowerCase();
      if (!n.noteNo?.toLowerCase().includes(q) &&
          !n.salesOrder?.orderNo?.toLowerCase().includes(q) &&
          !n.salesOrder?.customer?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const filteredPending = (pendingOrders ?? []).filter(o => {
    if (pendingSearch) {
      const q = pendingSearch.toLowerCase();
      if (!o.orderNo?.toLowerCase().includes(q) && !o.customer?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openNoteDetail = (note: StockOutboundNote) => { setSelectedNote(note); setShowDetailModal(true); };
  const openOrderDetail = (order: SalesOrder) => { setOrderDetailData(order); setShowOrderDetailModal(true); };

  const openCreateForOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setCreateForm({ warehouseId: createForm.warehouseId || warehouses[0]?.id || '', exportDate: dayjs().format('YYYY-MM-DD'), note: '' });
    setError(''); setSuccessMsg('');
    setShowCreateModal(true);
  };

  const openRespondForOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setError(''); setSuccessMsg('');
    setShowRespondModal(true);
  };

  const openSaleActionModal = (order: SalesOrder) => {
    setSelectedOrder(order);
    setSaleAction('view');
    setError(''); setSuccessMsg('');
    setShowSaleActionModal(true);
  };

  // ── Handlers ──────────────────────────────────────────────────

  // Tạo phiếu xuất kho (hoàn tất xuất)
  const handleCreate = async () => {
    if (!selectedOrder) { setError('Vui lòng chọn đơn hàng'); return; }
    if (!createForm.warehouseId) { setError('Vui lòng chọn kho xuất'); return; }
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      await stockOutboundService.create({
        salesOrderId: selectedOrder.id,
        warehouseId: createForm.warehouseId,
        exportDate: createForm.exportDate,
        note: createForm.note || undefined,
      });
      setSuccessMsg('✓ Xuất kho thành công! Trừ tồn kho. Đơn chuyển sang Đang giao hàng.');
      setTimeout(() => {
        setShowCreateModal(false);
        loadPending(true);
        loadOutbound(true);
      }, 1800);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Lỗi tạo phiếu xuất');
    } finally { setSaving(false); }
  };

  // Kho từ chối đơn (gửi về Sale)
  const handleWarehouseReject = async (reason: string) => {
    if (!selectedOrder || !reason) return;
    setSaving(true); setError('');
    try {
      await stockOutboundService.respondOutbound(selectedOrder.id, 'reject', reason);
      setShowRespondModal(false);
      loadPending(true);
      alert(`Đã gửi từ chối về Sale.\n\nLý do: ${reason}\n\nTrạng thái đơn: "Kho từ chối" — Sale sẽ xử lý.`);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Lỗi gửi từ chối');
    } finally { setSaving(false); }
  };

  // Sale: Xóa đơn
  const handleSaleDelete = async () => {
    if (!selectedOrder) return;
    if (!confirm('Bạn có chắc muốn XÓA đơn hàng này? Hành động này không thể hoàn tác.')) return;
    setSaving(true);
    try {
      await salesOrderService.delete(selectedOrder.id);
      setShowSaleActionModal(false);
      loadPending(true);
      alert('✓ Đơn hàng đã được xóa thành công.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Lỗi xóa đơn');
    } finally { setSaving(false); }
  };

  // Sale: Dời ngày gửi thẳng về Kho (không qua Logistics)
  const handleSaleDelayToWarehouse = async (newDate: string) => {
    if (!selectedOrder || !newDate) return;
    setSaving(true);
    try {
      await salesOrderService.resendToWarehouse(selectedOrder.id, newDate);
      setShowSaleActionModal(false);
      loadPending(true);
      alert(`✓ Đã cập nhật ngày giao: ${FMT_DATE(newDate)}.\n\nĐơn gửi thẳng về Kho (không qua Logistics) để xác nhận giao lại.`);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Lỗi cập nhật dời ngày');
    } finally { setSaving(false); }
  };

  // Sale: Tạo đơn mới (chuyển Sale sang trang đơn hàng)
  const handleSaleRecreate = () => {
    setShowSaleActionModal(false);
    // Navigate to sales orders page with pre-filled customer
    window.location.href = `/sales-orders/?recreate=${selectedOrder?.customerId}`;
  };

  return (
    <AppLayout>
      <style>{`
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        @keyframes rowFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-row { animation: rowFadeIn 0.38s ease-out both; }
        .spin { animation: spin 0.7s linear infinite; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>

      <div className="max-w-[1480px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Phiếu Xuất Kho</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kho tiếp nhận đơn từ Logistics → Xuất kho (trừ tồn) → Giao hàng</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200 w-fit">
          {[
            { key: 'outbound', label: 'Phiếu xuất kho', icon: (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            )},
            { key: 'pending', label: 'Đơn chờ xử lý', icon: (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
            )},
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ TAB: PHIẾU XUẤT KHO ═══ */}
        {activeTab === 'outbound' && (
          <>
            <Card className="p-0">
              <div className="p-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Tìm mã phiếu, mã đơn, khách hàng..."
                    value={outboundSearch}
                    onChange={e => { setOutboundSearch(e.target.value); setOutboundPage(1); }}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => loadOutbound(true)} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                  Làm mới
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-t border-slate-100">
                    <tr>
                      {['Mã phiếu','Mã đơn','Khách hàng','Kho','Ngày xuất','Tổng SL','Trạng thái','Thao tác'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outboundLoading ? (
                      <SkeletonRows />
                    ) : filteredOutbound.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-14 text-slate-400"><EmptyState icon="📋" message="Chưa có phiếu xuất nào" /></td></tr>
                    ) : (
                      filteredOutbound.map((n, i) => {
                        const s = STATUS_STYLE(n.salesOrder?.status || '');
                        return (
                          <tr key={n.id} className="hover:bg-slate-50 fade-row" style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}>
                            <td className="px-4 py-3.5 font-mono font-semibold text-red-600 whitespace-nowrap">{n.noteNo}</td>
                            <td className="px-4 py-3.5 font-mono text-blue-600 whitespace-nowrap">{n.salesOrder?.orderNo}</td>
                            <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{n.salesOrder?.customer?.name}</td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{n.warehouse?.name}</td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{dayjs(n.exportDate).format('DD/MM/YYYY')}</td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">{totalQty(n.items)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                                {s.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <Button variant="ghost" size="sm" onClick={() => openNoteDetail(n)} className="text-slate-600 hover:bg-slate-100">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {outboundData && outboundData.pagination.totalPages > 1 && (
                <div className="p-4 border-t border-slate-100">
                  <Pagination
                    page={outboundPage}
                    totalPages={outboundData.pagination.totalPages}
                    total={outboundData.pagination.total}
                    onPageChange={p => { setOutboundPage(p); loadOutbound(true); }}
                  />
                </div>
              )}
            </Card>
          </>
        )}

        {/* ═══ TAB: ĐƠN CHỜ XỬ LÝ ═══ */}
        {activeTab === 'pending' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Tổng đơn', value: pendingOrders.length, bg: '#dbeafe', color: '#1d4ed8', icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg>
                )},
                { label: 'Kho đang xuất', value: pendingOrders.filter(o => o.status === 'warehouse_processing').length, bg: '#dbeafe', color: '#1d4ed8', icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd"/></svg>
                )},
                { label: 'Kho từ chối', value: pendingOrders.filter(o => o.status === 'warehouse_rejected').length, bg: '#fee2e2', color: '#b91c1c', icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                )},
                { label: 'Dời ngày giao', value: pendingOrders.filter(o => o.status === 'warehouse_delayed').length, bg: '#fef3c7', color: '#92400e', icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                )},
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-500">{s.label}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
                  </div>
                  <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <Card className="p-0">
              <div className="p-4">
                <Input
                  placeholder="Tìm mã đơn, khách hàng..."
                  value={pendingSearch}
                  onChange={e => { setPendingSearch(e.target.value); setPendingPage(1); }}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-t border-slate-100">
                    <tr>
                      {['Mã đơn','Khách hàng','Ngày đặt','Dự kiến giao','Tổng SL','Trạng thái','Thao tác'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingLoading ? (
                      <SkeletonRows cols={7} />
                    ) : filteredPending.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-14 text-slate-400"><EmptyState icon="📦" message="Không có đơn chờ xử lý" /></td></tr>
                    ) : (
                      filteredPending.map((o, i) => {
                        const s = STATUS_STYLE(o.status);
                        return (
                          <tr key={o.id} className="hover:bg-slate-50 fade-row" style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}>
                            <td className="px-4 py-3.5 font-mono text-blue-600 font-medium whitespace-nowrap">{o.orderNo}</td>
                            <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap">{o.customer?.name}</td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{dayjs(o.orderDate).format('DD/MM/YYYY')}</td>
                            <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{o.expectedDeliveryDate ? dayjs(o.expectedDeliveryDate).format('DD/MM/YYYY') : '—'}</td>
                            <td className="px-4 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">{totalQty(o.items)}</td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                                {s.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openOrderDetail(o)} className="text-slate-600 hover:bg-slate-100">
                                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                                </Button>

                                {/* warehouse_processing: Hoàn tất xuất kho / Từ chối */}
                                {o.status === 'warehouse_processing' && (
                                  <>
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-7" onClick={() => openCreateForOrder(o)}>
                                      ✓ Hoàn tất xuất kho
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-3 py-1.5 h-7" onClick={() => openRespondForOrder(o)}>
                                      Từ chối
                                    </Button>
                                  </>
                                )}

                                {/* warehouse_rejected: Sale xử lý (3 lựa chọn) */}
                                {o.status === 'warehouse_rejected' && (
                                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 h-7" onClick={() => openSaleActionModal(o)}>
                                    Sale xử lý
                                  </Button>
                                )}

                                {/* warehouse_delayed: Đang chờ Sale xác nhận */}
                                {(o.status === 'warehouse_delayed') && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    ⏳ Chờ Sale xác nhận
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* ═══ MODAL: CHI TIẾT PHIẾU XUẤT ═══ */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title="Chi tiết phiếu xuất" size="lg">
        {selectedNote && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-slate-500">Mã phiếu:</span> <span className="font-mono font-semibold text-red-600 ml-1">{selectedNote.noteNo}</span></div>
              <div><span className="text-slate-500">Mã đơn:</span> <span className="font-mono ml-1">{selectedNote.salesOrder?.orderNo}</span></div>
              <div><span className="text-slate-500">Khách hàng:</span> <span className="ml-1">{selectedNote.salesOrder?.customer?.name}</span></div>
              <div><span className="text-slate-500">Kho:</span> <span className="ml-1">{selectedNote.warehouse?.name}</span></div>
              <div><span className="text-slate-500">Ngày xuất:</span> <span className="ml-1">{dayjs(selectedNote.exportDate).format('DD/MM/YYYY')}</span></div>
              <div><span className="text-slate-500">Trạng thái:</span>
                <span className={`ml-1 inline-flex px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[selectedNote.salesOrder?.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                  {ORDER_STATUS_LABELS[selectedNote.salesOrder?.status || ''] || '-'}
                </span>
              </div>
            </div>
            {selectedNote.note && <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm"><span className="text-slate-500">Ghi chú:</span> <span className="ml-1 text-slate-700">{selectedNote.note}</span></div>}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>{['SKU','Sản phẩm','Số lượng xuất'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedNote.items ?? []).map(i => (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-blue-600">{i.product?.sku}</td>
                        <td className="px-4 py-2.5 text-slate-700">{i.product?.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{i.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr><td colSpan={2} className="px-4 py-2.5 text-right font-bold text-slate-700">Tổng cộng:</td><td className="px-4 py-2.5 text-right font-bold text-slate-900">{totalQty(selectedNote.items)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="flex justify-end"><Button variant="outline" onClick={() => setShowDetailModal(false)}>Đóng</Button></div>
          </div>
        )}
      </Modal>

      {/* ═══ MODAL: TẠO PHIẾU XUẤT (HOÀN TẤT XUẤT KHO) ═══ */}
      <Modal open={showCreateModal} onClose={() => !saving && setShowCreateModal(false)} title="Hoàn tất xuất kho" size="lg">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg font-semibold">{successMsg}</div>}

          {selectedOrder && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-600"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                <span className="font-semibold text-blue-900">Thông tin đơn hàng</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 text-blue-800">
                <div><span className="text-blue-600">Mã đơn:</span> <span className="font-mono font-semibold ml-1">{selectedOrder.orderNo}</span></div>
                <div><span className="text-blue-600">Khách hàng:</span> <span className="ml-1">{selectedOrder.customer?.name}</span></div>
                <div><span className="text-blue-600">Ngày đặt:</span> <span className="ml-1">{dayjs(selectedOrder.orderDate).format('DD/MM/YYYY')}</span></div>
                <div><span className="text-blue-600">Dự kiến giao:</span> <span className="ml-1">{selectedOrder.expectedDeliveryDate ? dayjs(selectedOrder.expectedDeliveryDate).format('DD/MM/YYYY') : '—'}</span></div>
              </div>
            </div>
          )}

          <Select
            label="Kho xuất"
            value={createForm.warehouseId}
            onChange={e => setCreateForm(f => ({ ...f, warehouseId: e.target.value }))}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            required
          />
          <Input label="Ngày xuất" type="date" value={createForm.exportDate} onChange={e => setCreateForm(f => ({ ...f, exportDate: e.target.value }))} />
          <Input label="Ghi chú" value={createForm.note} onChange={e => setCreateForm(f => ({ ...f, note: e.target.value }))} />

          {selectedOrder && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">Chi tiết đơn hàng</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>{['SKU','Sản phẩm','Số lượng'].map(h => <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedOrder.items ?? []).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-blue-600">{item.product?.sku}</td>
                        <td className="px-4 py-2.5 text-slate-700">{item.product?.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr><td colSpan={2} className="px-4 py-2.5 text-right font-bold text-slate-700">Tổng cộng:</td><td className="px-4 py-2.5 text-right font-bold text-slate-900">{totalQty(selectedOrder.items)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Inventory warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            <strong>⚠️ Lưu ý:</strong> Khi xác nhận xuất kho, hệ thống sẽ <strong>tự động trừ số lượng tồn kho</strong> trong kho đã chọn. Không thể hoàn tác.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={saving}>Hủy</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!!successMsg} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Đang xuất kho...' : '✓ Hoàn tất xuất kho'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ═══ MODAL: KHO TỪ CHỐI → GỬI VỀ SALE ═══ */}
      {showRespondModal && selectedOrder && (
        <WarehouseRejectModal
          order={selectedOrder}
          onClose={() => setShowRespondModal(false)}
          onSubmit={handleWarehouseReject}
          saving={saving}
        />
      )}

      {/* ═══ MODAL: SALE XỬ LÝ ĐƠN BỊ KHO TỪ CHỐI (3 LỰA CHỌN) ═══ */}
      {showSaleActionModal && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-amber-200 w-full max-w-lg shadow-2xl"
            style={{ animation: 'scaleIn 220ms ease-out' }}>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-amber-100">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold mb-2">
                  ĐƠN BỊ KHO TỪ CHỐI
                </span>
                <h3 className="text-xl font-black text-slate-900">{selectedOrder.orderNo}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{selectedOrder.customer?.name}</p>
              </div>
              <button onClick={() => setShowSaleActionModal(false)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
                ×
              </button>
            </div>

            {/* Rejection reason */}
            {selectedOrder.note && (
              <div className="px-7 py-4">
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <p className="text-xs font-bold text-red-600 mb-1">LÝ DO KHO TỪ CHỐI</p>
                  <p className="font-medium">{selectedOrder.note}</p>
                </div>
              </div>
            )}

            {error && <div className="px-7 pb-3"><div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div></div>}

            {/* 3 Choices */}
            {saleAction === 'view' && selectedOrder.status === 'warehouse_rejected' && (
              <div className="px-7 pb-7 space-y-4">
                <p className="text-sm font-bold text-slate-700">Chọn hành động xử lý:</p>

                {/* Lựa chọn 1: Xóa đơn */}
                <button onClick={handleSaleDelete} disabled={saving}
                  className="w-full text-left border-2 border-red-200 rounded-2xl p-4 hover:border-red-400 hover:bg-red-50 transition-all disabled:opacity-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-black flex-shrink-0">1</div>
                    <div>
                      <p className="font-extrabold text-red-700 text-sm">Xóa đơn hàng này</p>
                      <p className="text-xs text-red-500 mt-0.5">Đơn sẽ bị hủy hoàn toàn. Có thể tạo đơn mới cho khách.</p>
                    </div>
                  </div>
                </button>

                {/* Lựa chọn 2: Dời ngày gửi thẳng về Kho */}
                <button onClick={() => setSaleAction('delay')} disabled={saving}
                  className="w-full text-left border-2 border-amber-200 rounded-2xl p-4 hover:border-amber-400 hover:bg-amber-50 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-black flex-shrink-0">2</div>
                    <div>
                      <p className="font-extrabold text-amber-700 text-sm">Dời ngày giao — Gửi thẳng cho Kho</p>
                      <p className="text-xs text-amber-500 mt-0.5">Cập nhật ngày giao mới. Đơn gửi lại kho mà <strong>không qua Logistics</strong>. Kho sẽ xác nhận giao lại.</p>
                    </div>
                  </div>
                </button>

                {/* Lựa chọn 3: Tạo đơn mới */}
                <button onClick={handleSaleRecreate} disabled={saving}
                  className="w-full text-left border-2 border-blue-200 rounded-2xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black flex-shrink-0">3</div>
                    <div>
                      <p className="font-extrabold text-blue-700 text-sm">Tạo đơn mới</p>
                      <p className="text-xs text-blue-500 mt-0.5">Xóa đơn cũ và tạo đơn mới, quy trình bắt đầu lại từ đầu.</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Lựa chọn 2: Dời ngày form */}
            {saleAction === 'delay' && (
              <div className="px-7 pb-7 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  <strong>Lựa chọn 2:</strong> Cập nhật ngày giao mới. Đơn sẽ gửi thẳng về Kho (không qua Logistics) với trạng thái <strong>"Dời ngày"</strong>. Kho xác nhận lại để giao.
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Ngày giao dự kiến mới <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    value={dayjs().add(3, 'day').format('YYYY-MM-DD')}
                    onChange={e => {}}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setSaleAction('view')} className="flex-1">← Quay lại</Button>
                  <Button
                    onClick={() => handleSaleDelayToWarehouse(dayjs().add(3, 'day').format('YYYY-MM-DD'))}
                    loading={saving}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    Gửi dời ngày về Kho
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODAL: CHI TIẾT ĐƠN HÀNG ═══ */}
      <Modal open={showOrderDetailModal} onClose={() => setShowOrderDetailModal(false)} title="Chi tiết đơn hàng" size="lg">
        {orderDetailData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><span className="text-slate-500">Mã đơn:</span> <span className="font-mono font-semibold text-blue-600 ml-1">{orderDetailData.orderNo}</span></div>
              <div><span className="text-slate-500">Khách hàng:</span> <span className="ml-1">{orderDetailData.customer?.name}</span></div>
              <div><span className="text-slate-500">Ngày đặt:</span> <span className="ml-1">{dayjs(orderDetailData.orderDate).format('DD/MM/YYYY')}</span></div>
              <div><span className="text-slate-500">Dự kiến giao:</span> <span className="ml-1">{orderDetailData.expectedDeliveryDate ? dayjs(orderDetailData.expectedDeliveryDate).format('DD/MM/YYYY') : '—'}</span></div>
              <div><span className="text-slate-500">Trạng thái:</span>
                <span className={`ml-1 inline-flex px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[orderDetailData.status] || 'bg-gray-100 text-gray-600'}`}>
                  {ORDER_STATUS_LABELS[orderDetailData.status] || orderDetailData.status}
                </span>
              </div>
            </div>
            {orderDetailData.note && <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm"><span className="text-slate-500">Ghi chú:</span> <span className="ml-1 text-slate-700">{orderDetailData.note}</span></div>}

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>{['SKU','Sản phẩm','Số lượng','Đơn giá','Thành tiền'].map(h => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(orderDetailData.items ?? []).map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-mono text-blue-600">{item.product?.sku}</td>
                        <td className="px-4 py-2.5 text-slate-700">{item.product?.name}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-slate-600">{item.unitPrice ? VND(Number(item.unitPrice)) + ' đ' : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{item.unitPrice ? VND(item.quantity * Number(item.unitPrice)) + ' đ' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-2.5 text-right font-extrabold text-slate-700">Tổng cộng:</td>
                      <td className="px-4 py-2.5 text-right font-black text-blue-600">{VND(totalAmount(orderDetailData.items))} đ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Sale action button if warehouse rejected */}
            {orderDetailData.status === 'warehouse_rejected' && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowOrderDetailModal(false); }}>Đóng</Button>
                <Button onClick={() => { setShowOrderDetailModal(false); openSaleActionModal(orderDetailData); }} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Sale xử lý (3 lựa chọn)
                </Button>
              </div>
            )}
            {orderDetailData.status !== 'warehouse_rejected' && (
              <div className="flex justify-end"><Button variant="outline" onClick={() => setShowOrderDetailModal(false)}>Đóng</Button></div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
