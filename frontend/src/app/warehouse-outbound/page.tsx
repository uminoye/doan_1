'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { stockOutboundService, warehouseService } from '@/services';
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
    warehouse_processing: { bg: '#dbeafe', color: '#1d4ed8', label: 'Kho đang xuất' },
    warehouse_rejected:  { bg: '#fee2e2', color: '#b91c1c', label: 'Kho từ chối' },
    warehouse_delayed:   { bg: '#fef3c7', color: '#92400e', label: 'Dời ngày' },
    shipping:            { bg: '#f3e8ff', color: '#6b21a8', label: 'Đang giao' },
    logistics_review:    { bg: '#ede9fe', color: '#6d28d9', label: 'Logistics duyệt' },
    returned:            { bg: '#fee2e2', color: '#b91c1c', label: 'Hoàn trả' },
    completed:           { bg: '#d1fae5', color: '#047857', label: 'Hoàn thành' },
    canceled:            { bg: '#f3f4f6', color: '#4b5563', label: 'Đã hủy' },
  };
  return map[status] || { bg: '#f3f4f6', color: '#374151', label: status || 'N/A' };
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'warehouse_processing', label: 'Kho đang xuất' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'logistics_review', label: 'Logistics duyệt' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'returned', label: 'Bị từ chối' },
  { value: 'canceled', label: 'Đã hủy' },
];

function SkeletonRows({ cols = 8, rows = 6 }: { cols?: number; rows?: number }) {
  const widths = [120, 100, 140, 120, 90, 70, 80, 100];
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

export default function WarehouseOutboundPage() {
  // ── Tabs ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('outbound');

  // ── Outbound list ─────────────────────────────────────────────
  const [outboundData, setOutboundData] = useState<PaginatedResponse<StockOutboundNote> | null>(null);
  const [outboundPage, setOutboundPage] = useState(1);
  const [outboundLoading, setOutboundLoading] = useState(true);
  const [outboundSearch, setOutboundSearch] = useState('');
  const [outboundStatus, setOutboundStatus] = useState('');
  const [outboundWarehouse, setOutboundWarehouse] = useState('');

  // ── Pending list ─────────────────────────────────────────────
  const [pendingOrders, setPendingOrders] = useState<SalesOrder[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingStatus, setPendingStatus] = useState('');

  // ── Global refs ──────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // ── Modals ───────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState(false);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);

  // ── Current item ─────────────────────────────────────────────
  const [selectedNote, setSelectedNote] = useState<StockOutboundNote | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [orderDetailData, setOrderDetailData] = useState<SalesOrder | null>(null);

  // ── Forms ─────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({ warehouseId: '', exportDate: dayjs().format('YYYY-MM-DD'), note: '' });
  const [respondForm, setRespondForm] = useState({ action: 'reject' as 'reject' | 'delay', reason: '', expectedDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Load warehouses ────────────────────────────────────────────
  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseService.getAll();
      setWarehouses(res.data || []);
      if (res.data[0]) setCreateForm(f => ({ ...f, warehouseId: res.data[0].id }));
    } catch (e) { console.error(e); }
  }, []);

  // ── Load outbound list ─────────────────────────────────────────
  const loadOutbound = useCallback(async (showLoading = false) => {
    if (showLoading) setOutboundLoading(true);
    try {
      const res = await stockOutboundService.getAll({
        page: outboundPage,
        limit: 10,
        status: outboundStatus || undefined,
      });
      setOutboundData(res.data);
    } catch (e) { console.error(e); }
    finally { setOutboundLoading(false); }
  }, [outboundPage, outboundStatus]);

  // ── Load pending list ──────────────────────────────────────────
  const loadPending = useCallback(async (showLoading = false) => {
    if (showLoading) setPendingLoading(true);
    try {
      const res = await stockOutboundService.getPendingRequests();
      // Lọc hiển thị: warehouse_processing + warehouse_rejected + warehouse_delayed
      setPendingOrders(res.data || []);
    } catch (e) { console.error(e); }
    finally { setPendingLoading(false); }
  }, []);

  useEffect(() => { loadWarehouses(); }, [loadWarehouses]);
  useEffect(() => { loadOutbound(); }, [loadOutbound]);
  useEffect(() => { loadPending(); }, [loadPending]);

  // ── Helpers ───────────────────────────────────────────────────
  const totalQty = (items: any[]) => items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const filteredOutbound = (outboundData?.data ?? []).filter(n => {
    if (outboundSearch) {
      const q = outboundSearch.toLowerCase();
      if (!n.noteNo?.toLowerCase().includes(q) &&
          !n.salesOrder?.orderNo?.toLowerCase().includes(q) &&
          !n.salesOrder?.customer?.name?.toLowerCase().includes(q)) return false;
    }
    if (outboundWarehouse && n.warehouseId !== outboundWarehouse) return false;
    return true;
  });

  const filteredPending = (pendingOrders ?? []).filter(o => {
    if (pendingSearch) {
      const q = pendingSearch.toLowerCase();
      if (!o.orderNo?.toLowerCase().includes(q) &&
          !o.customer?.name?.toLowerCase().includes(q)) return false;
    }
    if (pendingStatus && o.status !== pendingStatus) return false;
    return true;
  });

  const openNoteDetail = (note: StockOutboundNote) => { setSelectedNote(note); setShowDetailModal(true); };
  const openOrderDetail = (order: SalesOrder) => { setOrderDetailData(order); setShowOrderDetailModal(true); };

  const openCreateForOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setCreateForm({ warehouseId: createForm.warehouseId || warehouses[0]?.id || '', exportDate: dayjs().format('YYYY-MM-DD'), note: '' });
    setError('');
    setShowCreateModal(true);
  };

  const openRespondForOrder = (order: SalesOrder) => {
    setSelectedOrder(order);
    setRespondForm({ action: 'reject', reason: '', expectedDate: '' });
    setError('');
    setShowRespondModal(true);
  };

  const handleCreate = async () => {
    if (!selectedOrder) { setError('Vui lòng chọn đơn hàng'); return; }
    if (!createForm.warehouseId) { setError('Vui lòng chọn kho xuất'); return; }
    setSaving(true); setError('');
    try {
      await stockOutboundService.create({
        salesOrderId: selectedOrder.id,
        warehouseId: createForm.warehouseId,
        exportDate: createForm.exportDate,
        note: createForm.note || undefined,
      });
      setShowCreateModal(false);
      loadPending(true);
      loadOutbound(true);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Lỗi tạo phiếu xuất');
    } finally { setSaving(false); }
  };

  const handleRespond = async () => {
    if (!selectedOrder) return;
    if (respondForm.action === 'delay' && !respondForm.expectedDate) { setError('Vui lòng chọn ngày dự kiến'); return; }
    if (respondForm.action === 'reject' && !respondForm.reason) { setError('Vui lòng nhập lý do từ chối'); return; }
    setSaving(true); setError('');
    try {
      await stockOutboundService.respondOutbound(selectedOrder.id, respondForm.action, respondForm.reason, respondForm.expectedDate);
      setShowRespondModal(false);
      loadPending(true);
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.message || 'Lỗi phản hồi');
    } finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <style>{`
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        @keyframes rowFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fade-row { animation: rowFadeIn 0.38s ease-out both; }
        .spin { animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="max-w-[1480px] mx-auto space-y-5">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Phiếu Xuất Kho</h1>
            <p className="text-sm text-slate-500 mt-0.5">Kho tiếp nhận đơn từ Logistics → Xuất kho → Giao hàng</p>
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
                activeTab === t.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════ TAB: PHIẾU XUẤT KHO ════════════════════════ */}
        {activeTab === 'outbound' && (
          <>
            {/* Filters */}
            <Card className="p-0">
              <div className="p-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Tìm mã phiếu, mã đơn, khách hàng..."
                    value={outboundSearch}
                    onChange={e => { setOutboundSearch(e.target.value); setOutboundPage(1); }}
                  />
                </div>
                <div className="w-44">
                  <Select value={outboundStatus} onChange={e => { setOutboundStatus(e.target.value); setOutboundPage(1); }} options={STATUS_FILTER_OPTIONS} />
                </div>
                <div className="w-44">
                  <Select
                    value={outboundWarehouse}
                    onChange={e => { setOutboundWarehouse(e.target.value); setOutboundPage(1); }}
                    options={[{ value: '', label: 'Tất cả kho' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => loadOutbound(true)} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                  Làm mới
                </Button>
              </div>

              {/* Table */}
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

        {/* ════════════════════════ TAB: ĐƠN CHỜ XỬ LÝ ════════════════════════ */}
        {activeTab === 'pending' && (
          <>
            {/* Stats cards */}
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

            {/* Filters */}
            <Card className="p-0">
              <div className="p-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Tìm mã đơn, khách hàng..."
                    value={pendingSearch}
                    onChange={e => { setPendingSearch(e.target.value); setPendingPage(1); }}
                  />
                </div>
                <div className="w-44">
                  <Select value={pendingStatus} onChange={e => { setPendingStatus(e.target.value); setPendingPage(1); }} options={STATUS_FILTER_OPTIONS} />
                </div>
                <Button variant="outline" size="sm" onClick={() => loadPending(true)} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                  Làm mới
                </Button>
              </div>

              {/* Table */}
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
                                {o.status === 'warehouse_processing' && (
                                  <>
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-7" onClick={() => openCreateForOrder(o)}>
                                      Chọn kho &amp; xuất
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs px-3 py-1.5 h-7" onClick={() => openRespondForOrder(o)}>
                                      Từ chối / Dời ngày
                                    </Button>
                                  </>
                                )}
                                {(o.status === 'warehouse_rejected' || o.status === 'warehouse_delayed') && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                                    style={{
                                      backgroundColor: o.status === 'warehouse_rejected' ? '#fee2e2' : '#fef3c7',
                                      color: o.status === 'warehouse_rejected' ? '#b91c1c' : '#92400e',
                                    }}>
                                    {o.status === 'warehouse_rejected' ? '⏳ Chờ Sale xử lý' : '⏳ Chờ Sale xác nhận'}
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

      {/* ════════════════════════ MODAL: CHI TIẾT PHIẾU XUẤT ════════════════════════ */}
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
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {['SKU','Sản phẩm','Số lượng xuất'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
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
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-right font-bold text-slate-700">Tổng cộng:</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">{totalQty(selectedNote.items)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end"><Button variant="outline" onClick={() => setShowDetailModal(false)}>Đóng</Button></div>
          </div>
        )}
      </Modal>

      {/* ════════════════════════ MODAL: TẠO PHIẾU XUẤT ════════════════════════ */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Tạo phiếu xuất kho" size="lg">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

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
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-right font-bold text-slate-700">Tổng cộng:</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">{totalQty(selectedOrder.items)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button onClick={handleCreate} loading={saving} disabled={!selectedOrder}>Tạo phiếu xuất</Button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════ MODAL: PHẢN HỒI TỪ KHO (TỪ CHỐI / DỜI NGÀY) ════════════════════════ */}
      {showRespondModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          style={{ animation: 'fadeIn 180ms ease-out' }}>
          <div className="bg-white rounded-3xl border border-red-200 w-full max-w-lg p-7 shadow-2xl"
            style={{ animation: 'scaleIn 220ms ease-out' }}>
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-extrabold mb-2">
                  KHO XỬ LÝ ĐƠN
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">Phản hồi từ kho</h3>
                <p className="text-sm text-slate-500 mt-1">Kho xử lý đơn {selectedOrder?.orderNo}</p>
              </div>
              <button onClick={() => setShowRespondModal(false)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all cursor-pointer flex-shrink-0">
                ×
              </button>
            </div>

            {selectedOrder && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm mb-5">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                  <span className="font-semibold text-slate-800">{selectedOrder.customer?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 mt-2 text-slate-600">
                  <div><span className="text-slate-500">Mã đơn:</span> <span className="font-mono font-semibold ml-1">{selectedOrder.orderNo}</span></div>
                  <div><span className="text-slate-500">Dự kiến:</span> <span className="ml-1">{selectedOrder.expectedDeliveryDate ? dayjs(selectedOrder.expectedDeliveryDate).format('DD/MM/YYYY') : '—'}</span></div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
                {error}
              </div>
            )}

            {/* Action tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
              {[
                { value: 'reject', label: 'Từ chối', desc: 'Báo Sale xem xét lại', color: 'bg-white text-red-700 shadow-sm' },
                { value: 'delay',  label: 'Dời ngày',  desc: 'Giao trong ngày khác', color: 'bg-white text-amber-700 shadow-sm' },
              ].map(a => (
                <button
                  key={a.value}
                  onClick={() => setRespondForm(f => ({ ...f, action: a.value as 'reject' | 'delay' }))}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all ${respondForm.action === a.value ? a.color : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <div>{a.label}</div>
                  <div className="text-xs font-normal opacity-70">{a.desc}</div>
                </button>
              ))}
            </div>

            {respondForm.action === 'reject' ? (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none"
                  rows={3}
                  placeholder="VD: Thiếu hàng trong kho, cần đặt thêm từ nhà máy..."
                  value={respondForm.reason}
                  onChange={e => setRespondForm(f => ({ ...f, reason: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Đơn sẽ chuyển trạng thái <strong className="text-red-600">"Kho từ chối"</strong>. Sale sẽ xem xét và sửa lại hoặc tạo lại đơn.
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Ngày giao mới <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={respondForm.expectedDate}
                  onChange={e => setRespondForm(f => ({ ...f, expectedDate: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Đơn sẽ chuyển trạng thái <strong className="text-amber-600">"Dời ngày"</strong>. Sale xác nhận dời ngày để kho giao lại.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowRespondModal(false)}>Hủy</Button>
              <Button
                onClick={handleRespond}
                loading={saving}
                className={respondForm.action === 'reject' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'}
              >
                {respondForm.action === 'reject' ? 'Từ chối đơn' : 'Xác nhận dời ngày'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════ MODAL: CHI TIẾT ĐƠN HÀNG (từ tab pending) ════════════════════════ */}
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
              {orderDetailData.note && <div className="col-span-3"><span className="text-slate-500">Ghi chú:</span> <span className="ml-1 text-slate-700">{orderDetailData.note}</span></div>}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {['SKU','Sản phẩm','Số lượng','Đơn giá','Thành tiền'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(orderDetailData.items ?? []).map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-blue-600">{item.product?.sku}</td>
                      <td className="px-4 py-2.5 text-slate-700">{item.product?.name}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{item.unitPrice ? dayjs().format('DD/MM/YYYY') && item.unitPrice.toLocaleString('vi-VN') + ' đ' : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                        {item.unitPrice ? (item.quantity * item.unitPrice).toLocaleString('vi-VN') + ' đ' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end"><Button variant="outline" onClick={() => setShowOrderDetailModal(false)}>Đóng</Button></div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
