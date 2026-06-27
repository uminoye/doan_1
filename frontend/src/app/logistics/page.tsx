'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { logisticsService, carrierService, shipmentService, notificationService } from '@/services';
import { Notification, Carrier, Shipment } from '@/types';
import { SHIPMENT_STEP_LABELS } from '@/types';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { label: string; tone: string }> = {
  pending:              { label: 'Chờ duyệt',             tone: 'amber' },
  logistics_review:    { label: 'Logistics xem xét lại', tone: 'orange' },
  warehouse_processing: { label: 'Kho đang xử lý',      tone: 'blue' },
  warehouse_rejected:  { label: 'Kho từ chối',          tone: 'red' },
  warehouse_delayed:   { label: 'Dời ngày',              tone: 'amber' },
  shipping:           { label: 'Đang giao hàng',         tone: 'purple' },
  completed:          { label: 'Đã giao thành công',     tone: 'green' },
  returned:           { label: 'Hoàn trả',                tone: 'red' },
  canceled:           { label: 'Hủy đơn',                tone: 'gray' },
  canceled_shipping_error: { label: 'Lỗi vận chuyển',    tone: 'red' },
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

const REJECTION_REASONS = [
  'Khách không nhận hàng',
  'Hư hỏng do Vận chuyển',
];

const REJECTION_MESSAGES: Record<string, { title: string; body: string }> = {
  'Khách không nhận hàng': {
    title: '⚠️ Khách không nhận hàng',
    body: 'Hàng sẽ được trả về kho gốc. Tồn kho sẽ được cộng lại.',
  },
  'Hư hỏng do Vận chuyển': {
    title: '🚨 Hư hỏng do Vận chuyển',
    body: 'Yêu cầu ĐVVC đền bù và chuẩn bị đơn bù hàng cho khách. KHÔNG cộng lại tồn kho.',
  },
};

const REJECTION_NOTE = 'Vui lòng ghi rõ lý do từ chối để Sale xem xét và xử lý.';

// ── Progress stepper component ──────────────────────────────────────
function ShipmentProgressBar({ currentStep, total = 5, disabled = false, isSimulating = false, simulatingPhase = '' }: { currentStep: number; total?: number; disabled?: boolean; isSimulating?: boolean; simulatingPhase?: string }) {
  const steps = [0, 1, 2, 3, 4];
  const labels = ['Kho đang xử lý', 'ĐVVC lấy hàng', 'Đến kho khu vực', 'Đang giao', 'Thành công'];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const done = s < currentStep;
          const active = s === currentStep;
          const failed = currentStep === -1;
          const color = disabled
            ? 'bg-gray-300 border-gray-300 text-gray-400'
            : done
              ? 'bg-green-500 border-green-500 text-white'
              : active
                ? failed
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-100 border-gray-200 text-gray-400';
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-black flex-shrink-0 transition-all ${color} shadow-sm`}>
                {done ? '✓' : active ? (failed ? '✗' : '●') : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full transition-all ${done ? 'bg-green-400' : disabled ? 'bg-gray-200' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-0.5">
        {labels.map((l, i) => (
          <span key={i} className={`text-[10px] font-semibold text-center ${i === currentStep && !disabled ? 'text-blue-600 font-bold' : 'text-slate-400'}`} style={{ maxWidth: '60px' }}>
            {l}
          </span>
        ))}
      </div>
      {isSimulating && simulatingPhase && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold animate-pulse">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDuration: '0.6s' }} />
            {simulatingPhase}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Tracking modal ─────────────────────────────────────────────────
function TrackingModal({
  order,
  shipment,
  carriers,
  onClose,
  onAdvance,
  onSimulate,
  onConfirm,
  onReject,
  onAddCarrier,
  saving,
  rejectReason,
  setRejectReason,
  rejectNote,
  setRejectNote,
  detailStep,
  setDetailStep,
  totalAmount,
  // Simulation state from parent
  simulationStep,
  isSimulating,
  simulatingPhase,
  // Rejection warning modal
  showRejectWarning,
  rejectWarningReason,
  onConfirmReject,
  onCancelReject,
}: {
  order: any;
  shipment: Shipment;
  carriers: Carrier[];
  onClose: () => void;
  onAdvance: () => void;
  onSimulate: () => void;
  onConfirm: () => void;
  onReject: (reason: string) => void;
  onAddCarrier: (name: string, code: string) => void;
  saving: boolean;
  rejectReason: string;
  setRejectReason: (r: string) => void;
  rejectNote: string;
  setRejectNote: (n: string) => void;
  detailStep: 'view' | 'reject';
  setDetailStep: (s: 'view' | 'reject') => void;
  totalAmount: (items: any[]) => number;
  simulationStep?: number;
  isSimulating?: boolean;
  simulatingPhase?: string;
  showRejectWarning?: boolean;
  rejectWarningReason?: string;
  onConfirmReject?: () => void;
  onCancelReject?: () => void;
}) {
  const isCompleted = shipment.status === 'completed';
  const isFailed = shipment.status === 'failed';
  const isShipping = shipment.status === 'shipping';
  const isWarehouseProcessing = shipment.status === 'warehouse_processing';

  // Auto simulation display: use simulationStep if simulating, otherwise use shipment.currentStep
  const displayStep = isSimulating ? simulationStep! : (isFailed ? -1 : shipment.currentStep);
  const step = displayStep;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ animation: 'fadeIn 180ms ease-out' }}>
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
        style={{ animation: 'scaleIn 220ms ease-out' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-extrabold">THEO DÕI VẬN CHUYỂN</span>
              <StatusBadge status={shipment.status} />
            </div>
            <h2 className="text-xl font-black text-slate-900">{order?.orderNo}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{order?.customer?.name}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all flex-shrink-0 cursor-pointer">
            ×
          </button>
        </div>

        <div className="px-7 py-5 space-y-5">

          {/* Thông tin vận chuyển */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-slate-500 mb-1">ĐVVC</p>
              <p className="font-semibold text-slate-800 text-sm">{shipment.carrier?.name || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-slate-500 mb-1">Mã vận đơn</p>
              <p className="font-mono font-bold text-blue-600 text-sm">{shipment.trackingNo || '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-slate-500 mb-1">Phí ship</p>
              <p className="font-semibold text-slate-800 text-sm">{shipment.shippingFee ? VND(shipment.shippingFee) + ' đ' : '—'}</p>
            </div>
          </div>

          {/* Thanh tiến trình — YÊU CẦU 1: Ẩn khi warehouse_processing */}
          {isWarehouseProcessing && !isSimulating ? (
            /* Box chờ kho xuất hàng — Tuyệt đối không cho thao tác */
            <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-2 opacity-70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">⏳</span>
                </div>
                <span className="font-extrabold text-gray-500 text-base">Đang chờ Kho xuất hàng...</span>
              </div>
              <p className="text-xs text-gray-400 text-center">Kho đang đóng gói và bàn giao cho ĐVVC. Logistics không thể thao tác ở bước này.</p>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <ShipmentProgressBar
                currentStep={step}
                disabled={isWarehouseProcessing && !isSimulating}
                isSimulating={isSimulating}
                simulatingPhase={simulatingPhase}
              />
            </div>
          )}

          {/* Bảng sản phẩm */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sản phẩm trong đơn</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Sản phẩm</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">SL</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order?.items || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-800 text-sm">{item.product?.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{item.product?.sku}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700">{VND(item.quantity * Number(item.unitPrice || 0))} đ</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-right font-extrabold text-slate-700">Tổng cộng:</td>
                    <td className="px-4 py-2.5 text-right font-black text-blue-600">{VND(totalAmount(order?.items))} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Rejection detail */}
          {isFailed && shipment.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-xs font-bold text-red-600 mb-1">LÝ DO KHÁCH TỪ CHỐI</p>
              <p className="text-sm text-red-700 font-semibold">{shipment.rejectionReason}</p>
              <p className="text-xs text-red-500 mt-1">Trạng thái: Hàng đã được xử lý theo quy trình hoàn trả / kho hàng lỗi.</p>
            </div>
          )}

          {/* Hành động theo step */}
          {!isCompleted && !isFailed && !isWarehouseProcessing && (
            <div className="space-y-3">

              {/* Step 1–2: Tiến bước (Logistics có thể bấm tiến thủ công) */}
              {step >= 1 && step <= 2 && !isSimulating && (
                <div className="flex gap-3">
                  <button
                    onClick={onAdvance}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                    Tiến bước → {SHIPMENT_STEP_LABELS[(step + 1) as keyof typeof SHIPMENT_STEP_LABELS]}
                  </button>
                </div>
              )}

              {/* Step 3: ✅ Nhận + ❌ Từ chối — YÊU CẦU 3 */}
              {step === 3 && !isSimulating && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700 text-center">
                    📦 Hàng đang trên đường giao — Hãy chờ khách xác nhận
                  </div>
                  <div className="flex gap-3">
                    {/* ✅ Khách nhận hàng */}
                    <button
                      onClick={onConfirm}
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <span className="text-2xl">✅</span>}
                      <span>Khách nhận hàng</span>
                    </button>
                    {/* ❌ Khách từ chối */}
                    <button
                      onClick={() => { setDetailStep('reject'); setRejectReason(''); setRejectNote(''); }}
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      <span className="text-2xl">❌</span>
                      <span>Khách từ chối</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 (simulation done): ✅ Xác nhận giao + ❌ Từ chối */}
              {step === 4 && isSimulating && (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 text-center font-semibold">
                    ✓ Đã giao tới nơi — Logistics xác nhận kết quả
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onConfirm}
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <span className="text-2xl">✅</span>}
                      <span>Khách nhận hàng</span>
                    </button>
                    <button
                      onClick={() => { setDetailStep('reject'); setRejectReason(''); setRejectNote(''); }}
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      <span className="text-2xl">❌</span>
                      <span>Khách từ chối</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 (completed, not simulating): nút Demo lại */}
              {step === 4 && !isSimulating && !isCompleted && !isFailed && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 text-center">
                    ✓ Đơn đã giao tới nơi — Logistics xác nhận kết quả
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={onConfirm}
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      {saving ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" /> : <span className="text-2xl">✅</span>}
                      <span>Khách nhận hàng</span>
                    </button>
                    <button
                      onClick={() => { setDetailStep('reject'); setRejectReason(''); setRejectNote(''); }}
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-base shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex flex-col items-center gap-1 disabled:opacity-60 cursor-pointer"
                    >
                      <span className="text-2xl">❌</span>
                      <span>Khách từ chối</span>
                    </button>
                  </div>
                  {/* YÊU CẦU 2: Nút Demo lại để chạy simulation thủ công */}
                  <button
                    onClick={onSimulate}
                    disabled={saving}
                    className="w-full py-2.5 rounded-xl bg-white border-2 border-dashed border-purple-300 text-purple-600 font-bold text-sm hover:bg-purple-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    🔄 Demo lại từ đầu
                  </button>
                </div>
              )}

              <p className="text-xs text-center text-slate-400">
                Bước {step + 1}/5 — {SHIPMENT_STEP_LABELS[step as keyof typeof SHIPMENT_STEP_LABELS] || '—'}
              </p>

              {/* Reject reason picker — YÊU CẦU 3: Modal 3 lý do */}
              {detailStep === 'reject' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-slate-700">Chọn lý do khách từ chối:</p>
                  <div className="space-y-2">
                    {REJECTION_REASONS.map(r => (
                      <button key={r} onClick={() => setRejectReason(r)}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                          rejectReason === r ? 'border-red-400 bg-red-50 shadow-sm' : 'border-slate-200 bg-white hover:border-red-300'
                        }`}>
                        <span className={`text-sm font-semibold ${rejectReason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</span>
                      </button>
                    ))}
                  </div>
                  {rejectReason && REJECTION_MESSAGES[rejectReason] && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <p className="text-amber-700 font-semibold text-sm">{REJECTION_MESSAGES[rejectReason].body}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setDetailStep('view')}
                      className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer">
                      ← Quay lại
                    </button>
                    <button
                      onClick={() => onReject(rejectReason)}
                      disabled={!rejectReason || saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                      Xác nhận từ chối
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOÀN THÀNH: Khách đã trả tiền / Hoàn hàng */}
          {isCompleted && (            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-center">
                <p className="text-green-700 font-extrabold text-lg">✓ Giao hàng thành công!</p>
                <p className="text-green-600 text-sm mt-1">Cảm ơn quý khách đã mua sắm tại WMS.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onConfirm}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-green-600 to-green-500 text-white font-extrabold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  💰 Khách đã trả tiền
                </button>
                <button
                  onClick={() => { setDetailStep('reject'); setRejectReason(''); setRejectNote(''); }}
                  className="py-3.5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-extrabold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  ↩ Khách hoàn hàng
                </button>
              </div>
              {detailStep === 'reject' && (
                <div className="space-y-4">
                  <p className="text-sm font-bold text-red-700">Chọn lý do hoàn hàng:</p>
                  <div className="space-y-2">
                    {REJECTION_REASONS.map(r => (
                      <button key={r} onClick={() => setRejectReason(r)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          rejectReason === r ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-red-300'
                        }`}>
                        <span className={`text-sm font-semibold ${rejectReason === r ? 'text-red-700' : 'text-slate-700'}`}>{r}</span>
                      </button>
                    ))}
                  </div>
                  {(rejectReason === REJECTION_NOTE || rejectReason.includes('khác')) && (
                    <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-red-200 resize-none"
                      placeholder="Mô tả chi tiết..." />
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setDetailStep('view')}
                      className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 cursor-pointer">
                      ← Quay lại
                    </button>
                    <button
                      onClick={() => onReject(rejectReason)}
                      disabled={!rejectReason || saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                      Xác nhận hoàn hàng
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isFailed && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-center">
              <p className="text-red-700 font-extrabold text-lg">✗ Giao hàng thất bại</p>
              <p className="text-red-600 text-sm mt-1">Xem lý do từ chối ở trên. Hệ thống đã tự xử lý theo quy trình.</p>
            </div>
          )}

          {/* YÊU CẦU 3: Warning Modal cho 3 lý do từ chối */}
          {showRejectWarning && rejectWarningReason && REJECTION_MESSAGES[rejectWarningReason] && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl px-5 py-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div>
                  <p className="font-extrabold text-red-700 text-base">{REJECTION_MESSAGES[rejectWarningReason].title}</p>
                  <p className="text-red-600 text-sm mt-1">{REJECTION_MESSAGES[rejectWarningReason].body}</p>
                </div>
              </div>
              <div className="bg-white border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-red-500 mb-1">LÝ DO ĐÃ CHỌN</p>
                <p className="text-red-700 font-semibold text-sm">{rejectWarningReason}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onCancelReject}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
                >
                  ← Hủy bỏ
                </button>
                <button
                  onClick={onConfirmReject}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                >
                  {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : null}
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function LogisticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'tracking' | 'notifications'>('pending');
  const [search, setSearch] = useState('');

  // Modal chi tiết đơn (pending tab)
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailStep, setDetailStep] = useState<'view' | 'reject' | 'confirm'>('view');

  // Modal tracking (tracking tab)
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [trackingShipment, setTrackingShipment] = useState<Shipment | null>(null);
  const [trackingStep, setTrackingStep] = useState<'view' | 'reject'>('view');
  const [trackingRejectReason, setTrackingRejectReason] = useState('');
  const [trackingRejectNote, setTrackingRejectNote] = useState('');

  // Từ chối logistics
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  // Xác nhận điều phối
  const [selectedCarrierId, setSelectedCarrierId] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  // Thêm ĐVVC mới
  const [showAddCarrier, setShowAddCarrier] = useState(false);
  const [newCarrierName, setNewCarrierName] = useState('');
  const [newCarrierCode, setNewCarrierCode] = useState('');
  const [addCarrierSaving, setAddCarrierSaving] = useState(false);

  // YÊU CẦU 2: Simulation state (Frontend-only auto-stepper)
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simulatingPhase, setSimulatingPhase] = useState('');

  // YÊU CẦU 3: Rejection warning modal
  const [showRejectWarning, setShowRejectWarning] = useState(false);
  const [rejectWarningReason, setRejectWarningReason] = useState('');

  // Modal thông báo
  const [notifModal, setNotifModal] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // YÊU CẦU 2: Auto-start simulation khi shipment chuyển sang shipping (sau khi kho xuất hàng)
  // Dùng ref để không trigger lại khi polling reload lại trackingShipment
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (!trackingShipment || !trackingOrder) return;
    if (trackingShipment.status === 'shipping' && !isSimulating && trackingShipment.currentStep < 4) {
      if (hasAutoStartedRef.current) return; // Đã auto-start rồi, không chạy lại
      const timer = setTimeout(() => {
        hasAutoStartedRef.current = true;
        setSimulationStep(1);
        setIsSimulating(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingShipment?.status, trackingShipment?.currentStep, trackingOrder?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, nRes, sRes, cRes] = await Promise.all([
        logisticsService.getAll({ limit: 200 }),
        notificationService.getAll({ limit: 50 }),
        shipmentService.getAllTracking({ limit: 200 }),
        carrierService.getAll(),
      ]);
      // Backend trả trực tiếp SalesOrder[] (không còn wrap trong DeliveryRequest)
      const rawOrders: any[] = oRes.data?.data || [];
      setOrders(rawOrders);
      setNotifications(nRes.data?.data || []);
      setShipments(sRes.data?.data || []);
      const dbC = (cRes.data || []) as Carrier[];
      setCarriers(dbC);
      if (dbC.length > 0 && !selectedCarrierId) setSelectedCarrierId(dbC[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [selectedCarrierId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    intervalRef.current = setInterval(() => fetchData(), 8000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const pendingOrders = useMemo(() =>
    orders.filter(o => ['pending', 'logistics_review'].includes(o.status)), [orders]);

  const allTracking = useMemo(() => {
    return shipments.map(s => ({
      shipment: s,
      order: s.salesOrder || orders.find(o => o.id === s.salesOrderId),
    })).filter(t => t.order);
  }, [shipments, orders]);

  const filteredPending = useMemo(() => {
    if (!search.trim()) return pendingOrders;
    const kw = search.toLowerCase();
    return pendingOrders.filter(o =>
      [o.orderNo, o.customer?.name, o.note].filter(Boolean).join(' ').toLowerCase().includes(kw)
    );
  }, [pendingOrders, search]);

  const stats = {
    pending: pendingOrders.length,
    tracking: allTracking.length,
    notif: notifications.filter(n => n.status === 'pending').length,
  };

  const totalAmount = (items: any[]) =>
    items?.reduce((s, i) => s + i.quantity * Number(i.unitPrice || 0), 0) ?? 0;
  const totalQty = (items: any[]) => items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  // ── Handlers ───────────────────────────────────────────────────

  const openDetail = (o: any) => {
    setDetailOrder(o);
    setDetailStep('view');
    setRejectReason('');
    setRejectNote('');
    const def = carriers[0];
    setSelectedCarrierId(def?.id || '');
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
    if (!detailOrder || !selectedCarrierId) { alert('Vui lòng chọn đơn vị vận chuyển'); return; }
    setSaving(true);
    try {
      // Gọi API gộp: forward sang kho + tạo shipment + sinh trackingNo
      await shipmentService.createAndForward({
        salesOrderId: detailOrder.id,
        carrierId: selectedCarrierId,
        shippingFee: shippingFee ? Number(shippingFee) : undefined,
        note: shippingFee ? `[GIAO VẬN] Phí: ${VND(Number(shippingFee))}đ` : undefined,
      });
      alert('Đã điều phối đơn sang kho xử lý! Mã vận đơn được tạo tự động.');
      setDetailOrder(null);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi điều phối'); }
    finally { setSaving(false); }
  };

  const handleOpenTracking = async (order: any) => {
    setTrackingOrder(order);
    setTrackingStep('view');
    setTrackingRejectReason('');
    setTrackingRejectNote('');
    setTrackingShipment(null);
    // Reset simulation state khi mở modal
    setIsSimulating(false);
    setSimulationStep(0);
    setSimulatingPhase('');
    setShowRejectWarning(false);
    setRejectWarningReason('');
    hasAutoStartedRef.current = false;
    try {
      const res = await shipmentService.getByOrderId(order.id);
      setTrackingShipment(res.data);
    } catch (_) {}
  };

  const handleAdvance = async () => {
    if (!trackingOrder) return;
    setSaving(true);
    try {
      const res = await shipmentService.advanceStep(trackingOrder.id);
      setTrackingShipment((prev: any) => ({ ...prev, currentStep: res.data.currentStep, status: res.data.currentStep === 4 ? 'completed' : 'shipping' }));
      alert(res.data.message);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setSaving(false); }
  };

  /* ── YÊU CẦU 2: useEffect Auto-Simulation (Frontend Demo 5 giây) ──
   * Giây 0:   "Đã xuất kho"  → step = 1
   * Giây 2.5: "Đang giao hàng" → step = 3
   * Giây 5:   "Đã giao tới nơi" → step = 4 (gọi API cập nhật real currentStep = 4)
   */
  useEffect(() => {
    if (!isSimulating || !trackingOrder) return;

    const phases = [
      { at: 0,    step: 1, label: '⏳ Đang chờ Kho xuất hàng...' },
      { at: 0,    step: 1, label: '✓ Đã xuất kho - ĐVVC nhận hàng' },
      { at: 2500, step: 3, label: '🚚 Đang giao hàng đến địa chỉ...' },
      { at: 5000, step: 4, label: '📦 Đã giao tới nơi - Chờ xác nhận' },
    ];

    // Immediately set step 1
    setSimulationStep(1);
    setSimulatingPhase('✓ Đã xuất kho - ĐVVC nhận hàng');

    const timers: NodeJS.Timeout[] = [];

    // At 2.5s: jump to step 3 "Đang giao hàng"
    timers.push(setTimeout(() => {
      setSimulationStep(3);
      setSimulatingPhase('🚚 Đang giao hàng đến địa chỉ...');
    }, 2500));

    // At 5s: jump to step 4 "Đã giao tới nơi" + call API to persist
    timers.push(setTimeout(async () => {
      setSimulationStep(4);
      setSimulatingPhase('📦 Đã giao tới nơi - Chờ xác nhận');
      setIsSimulating(false); // Stop simulation after reaching step 4

      // Gọi API simulateDelivery — tự động random 2 lý do từ chối ở bước cuối
      try {
        const res = await shipmentService.simulateDelivery(trackingOrder.id);
        setTrackingShipment((prev: any) => ({
          ...prev,
          currentStep: res.data?.currentStep ?? 4,
          status: res.data?.status ?? 'completed',
        }));
        fetchData();
      } catch (_) {}
    }, 5000));

    return () => { timers.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimulating, trackingOrder?.id]);

  const handleSimulate = async () => {
    if (!trackingOrder) return;
    // Reset về step 1 trước khi bắt đầu simulation
    setSimulationStep(1);
    setIsSimulating(true);
  };

  const handleConfirmReceived = async () => {
    if (!trackingOrder) return;
    setSaving(true);
    try {
      await shipmentService.confirmReceived(trackingOrder.id);
      setTrackingShipment((prev: any) => ({ ...prev, currentStep: 4, status: 'completed' }));
      alert('✓ Xác nhận giao hàng thành công!');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setSaving(false); }
  };

  const handleTrackingReject = async (reason: string) => {
    if (!trackingOrder || !reason) { alert('Vui lòng chọn lý do'); return; }
    // Hiện warning modal trước — YÊU CẦU 3
    setRejectWarningReason(reason);
    setShowRejectWarning(true);
  };

  /* ── YÊU CẦU 3: Confirm Reject — gọi API với reason đã chọn ── */
  const handleConfirmReject = async () => {
    if (!trackingOrder || !rejectWarningReason) return;
    setSaving(true);
    try {
      await shipmentService.customerReject(trackingOrder.id, rejectWarningReason);
      setTrackingShipment((prev: any) => ({ ...prev, status: 'failed', rejectionReason: rejectWarningReason }));
      setShowRejectWarning(false);
      setRejectWarningReason('');
      alert('Đã xử lý từ chối của khách!');
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setSaving(false); }
  };

  const handleCancelReject = () => {
    setShowRejectWarning(false);
    setRejectWarningReason('');
  };

  const handleAddCarrier = async () => {
    if (!newCarrierName.trim() || !newCarrierCode.trim()) { alert('Vui lòng nhập đầy đủ thông tin'); return; }
    setAddCarrierSaving(true);
    try {
      const res = await carrierService.create({ name: newCarrierName, code: newCarrierCode, autoPrefix: newCarrierCode.toUpperCase().slice(0, 3) });
      const c = res.data as Carrier;
      setCarriers(prev => [...prev, c]);
      setSelectedCarrierId(c.id);
      setShowAddCarrier(false);
      setNewCarrierName('');
      setNewCarrierCode('');
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi thêm ĐVVC'); }
    finally { setAddCarrierSaving(false); }
  };

  const handleResolveNotif = async (n: Notification) => {
    try { await notificationService.resolve(n.id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
  };

  return (
    <AppLayout>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>

      <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 via-slate-50 to-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tiếp nhận giao hàng</h1>
            <p className="text-slate-500 mt-1">Xem chi tiết đơn, điều phối vận chuyển hoặc theo dõi giao hàng.</p>
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
            <div>
              {loading ? (
                <div className="text-center py-16 text-slate-400">Đang tải...</div>
              ) : allTracking.length === 0 ? (
                <div className="text-center py-16 text-slate-400">Chưa có đơn nào đang vận chuyển.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {allTracking.map(({ shipment, order }) => (
                    <div key={shipment.id} className="flex items-center gap-4 px-6 py-4 hover:bg-purple-50/30 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm flex-shrink-0">
                        {order?.customer?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-blue-600 text-sm">{order?.orderNo}</span>
                          <StatusBadge status={shipment.status} />
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 truncate">{order?.customer?.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {shipment.carrier?.name} · {shipment.trackingNo}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <p className="text-xs text-slate-500">Bước {shipment.currentStep + 1}/5</p>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${shipment.status === 'completed' ? 'bg-green-500 w-full' : shipment.status === 'failed' ? 'bg-red-500 w-full' : 'bg-blue-500'}`}
                            style={{ width: `${(shipment.currentStep / 4) * 100}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenTracking(order)}
                        className="flex-shrink-0 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-50 hover:-translate-y-0.5 transition-all duration-150"
                      >
                        Chi tiết
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Step: view */}
            {detailStep === 'view' && (
              <div className="px-7 py-5 space-y-5">
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
                  <div className="overflow-x-auto">
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
                </div>

                {/* 2 nút hành động */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDetailStep('confirm')}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-extrabold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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

            {/* Step: reject */}
            {detailStep === 'reject' && (
              <div className="px-7 py-5 space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-700 mb-1">Chọn lý do từ chối <span className="text-red-500">*</span></p>
                  <p className="text-xs text-slate-500 mb-3">Thông tin sẽ được gửi lại cho Sale để xem xét và xử lý.</p>
                  <div className="space-y-2">
                    {REJECTION_REASONS.map(r => (
                      <button key={r} onClick={() => setRejectReason(r)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 ${
                          rejectReason === r ? 'border-red-400 bg-red-50 shadow-sm' : 'border-slate-200 bg-white hover:border-red-300'
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
                  <div className="space-y-2">
                    {carriers.map(c => (
                      <button key={c.id} onClick={() => setSelectedCarrierId(c.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          selectedCarrierId === c.id ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}>
                        <span className={`text-sm font-semibold ${selectedCarrierId === c.id ? 'text-blue-700' : 'text-slate-700'}`}>
                          {c.name} <span className="font-mono text-slate-400">({c.code})</span>
                        </span>
                        <span className="ml-2 text-xs text-slate-400">Mã: {c.autoPrefix}-XXXXXX</span>
                      </button>
                    ))}
                    <button onClick={() => setShowAddCarrier(true)}
                      className="w-full text-left px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all text-sm text-blue-600 font-semibold">
                      + Thêm đơn vị vận chuyển mới
                    </button>
                  </div>
                </div>

                {/* Thêm ĐVVC mới */}
                {showAddCarrier && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-blue-700 uppercase">Thêm Đơn vị Vận chuyển mới</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tên ĐVVC</label>
                        <input value={newCarrierName} onChange={e => setNewCarrierName(e.target.value)}
                          placeholder="VD: Giao Hàng Tiết Kiệm"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tiền tố SKU</label>
                        <input value={newCarrierCode} onChange={e => setNewCarrierCode(e.target.value.toUpperCase())}
                          placeholder="VD: GHTK"
                          maxLength={5}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 font-mono" />
                      </div>
                    </div>
                    <p className="text-xs text-blue-500">Mã vận đơn sẽ tự sinh: <span className="font-mono font-bold">{newCarrierCode.toUpperCase() || 'XXX'}-000001</span></p>
                    <div className="flex gap-2">
                      <button onClick={handleAddCarrier} disabled={addCarrierSaving}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 cursor-pointer">
                        {addCarrierSaving ? 'Đang thêm...' : '✓ Thêm'}
                      </button>
                      <button onClick={() => setShowAddCarrier(false)}
                        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 cursor-pointer">
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

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
                  <p className="text-xs text-slate-400 mt-1">Mã vận đơn sẽ được tạo tự động khi nhấn xác nhận điều phối.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
                  <strong>Kết quả:</strong> Đơn sẽ chuyển sang trạng thái <strong>"Kho đang xử lý"</strong>. Kho sẽ nhận đơn, xuất hàng và giao cho đơn vị vận chuyển. Mã vận đơn tự động sinh theo tiền tố ĐVVC.
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

      {/* ===== TRACKING MODAL ===== */}
      {trackingOrder && trackingShipment && (
        <TrackingModal
          order={trackingOrder}
          shipment={trackingShipment}
          carriers={carriers}
          onClose={() => { setTrackingOrder(null); setTrackingShipment(null); setIsSimulating(false); }}
          onAdvance={handleAdvance}
          onSimulate={handleSimulate}
          onConfirm={handleConfirmReceived}
          onReject={handleTrackingReject}
          onAddCarrier={(name, code) => { setNewCarrierName(name); setNewCarrierCode(code); setShowAddCarrier(true); }}
          saving={saving}
          rejectReason={trackingRejectReason}
          setRejectReason={setTrackingRejectReason}
          rejectNote={trackingRejectNote}
          setRejectNote={setTrackingRejectNote}
          detailStep={trackingStep}
          setDetailStep={setTrackingStep}
          totalAmount={totalAmount}
          simulationStep={simulationStep}
          isSimulating={isSimulating}
          simulatingPhase={simulatingPhase}
          showRejectWarning={showRejectWarning}
          rejectWarningReason={rejectWarningReason}
          onConfirmReject={handleConfirmReject}
          onCancelReject={handleCancelReject}
        />
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
    </AppLayout>
  );
}
