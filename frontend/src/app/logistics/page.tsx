'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { logisticsService } from '@/services';
import { DeliveryRequest, PaginatedResponse, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import dayjs from 'dayjs';

export default function LogisticsPage() {
  const [data, setData] = useState<PaginatedResponse<DeliveryRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailItem, setDetailItem] = useState<DeliveryRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'forward' | 'reject' | 'confirmDelivery'>('forward');
  const [actionTarget, setActionTarget] = useState<string>('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await logisticsService.getAll({ page, limit: 10, status: statusFilter || undefined });
      setData(res.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAction = (type: 'forward' | 'reject' | 'confirmDelivery', orderId: string, note = '') => {
    setActionType(type);
    setActionTarget(orderId);
    setActionNote(note);
    setError('');
    setShowActionModal(true);
  };

  const handleAction = async () => {
    setActionLoading(actionType + '_' + actionTarget);
    setError('');
    try {
      if (actionType === 'forward') {
        await logisticsService.forwardToWarehouse(actionTarget, actionNote || undefined);
      } else if (actionType === 'reject') {
        if (!actionNote) { setError('Vui lòng nhập lý do từ chối'); setActionLoading(null); return; }
        await logisticsService.rejectOrder(actionTarget, actionNote);
      } else if (actionType === 'confirmDelivery') {
        await logisticsService.confirmDelivery(actionTarget);
      }
      setShowActionModal(false);
      fetchData();
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi thao tác'); }
    finally { setActionLoading(null); }
  };

  const getActionTitle = () => {
    if (actionType === 'forward') return 'Chuyển đơn xuống Kho';
    if (actionType === 'reject') return 'Từ chối đơn hàng';
    return 'Xác nhận giao hàng thành công';
  };

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ tiếp nhận' },
    { value: 'warehouse_processing', label: 'Kho đang xử lý' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'returned', label: 'Hoàn trả' },
    { value: 'canceled', label: 'Đã hủy' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tiếp nhận & Giao hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Logistics: Duyệt đơn → Chuyển kho → Xác nhận giao hàng</p>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b flex items-center gap-3">
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} options={statusOptions} className="max-w-xs" />
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="🚚" message="Chưa có yêu cầu giao hàng nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày đặt</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày giao dự kiến</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(d => {
                    const order = d.salesOrder;
                    return (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono font-medium text-blue-600">{order?.orderNo}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{order?.customer?.name}</td>
                        <td className="px-4 py-3">{order ? dayjs(order.orderDate).format('DD/MM/YYYY') : '-'}</td>
                        <td className="px-4 py-3">{order?.expectedDeliveryDate ? dayjs(order.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}</td>
                        <td className="px-4 py-3 text-center">{order?.items.length || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order?.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                            {ORDER_STATUS_LABELS[order?.status || ''] || order?.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 flex-wrap">
                            <Button variant="ghost" size="sm" onClick={() => setDetailItem(d)}>Chi tiết</Button>
                            {order?.status === 'pending' && (
                              <>
                                <Button variant="primary" size="sm" onClick={() => openAction('forward', order.id, d.note || '')} loading={actionLoading === 'forward_' + order.id}>Duyệt &rarr; Kho</Button>
                                <Button variant="ghost" size="sm" onClick={() => openAction('reject', order.id)} className="text-red-500 hover:bg-red-50">Từ chối</Button>
                              </>
                            )}
                            {order?.status === 'shipping' && (
                              <Button variant="success" size="sm" onClick={() => openAction('confirmDelivery', order.id)} loading={actionLoading === 'confirmDelivery_' + order.id}>Đã giao</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data && <div className="p-4 border-t"><Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPageChange={setPage} /></div>}
        </Card>
      </div>

      {/* Action Modal */}
      <Modal open={showActionModal} onClose={() => setShowActionModal(false)} title={getActionTitle()} size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div className="bg-gray-50 p-3 rounded-lg border text-sm">
            <p><span className="text-gray-500">Mã đơn:</span> <span className="font-mono font-semibold ml-1">{actionTarget}</span></p>
          </div>
          {actionType !== 'confirmDelivery' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {actionType === 'reject' ? 'Lý do từ chối' : 'Ghi chú'} {actionType === 'reject' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={actionNote}
                onChange={e => setActionNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={actionType === 'reject' ? 'Nhập lý do từ chối...' : 'Ghi chú (tùy chọn)...'}
              />
            </div>
          )}
          {actionType === 'confirmDelivery' && (
            <p className="text-sm text-gray-600">Xác nhận đơn hàng đã giao thành công cho khách?</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowActionModal(false)}>Hủy</Button>
            <Button onClick={handleAction} loading={!!actionLoading}>
              {actionType === 'forward' ? 'Duyệt &amp; Chuyển Kho' : actionType === 'reject' ? 'Từ chối' : 'Xác nhận giao thành công'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết yêu cầu giao hàng" size="lg">
        {detailItem && detailItem.salesOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Mã đơn:</span> <span className="font-mono font-semibold text-blue-600 ml-1">{detailItem.salesOrder.orderNo}</span></div>
              <div><span className="text-gray-500">Khách hàng:</span> <span className="ml-1">{detailItem.salesOrder.customer?.name}</span></div>
              <div><span className="text-gray-500">SĐT:</span> <span className="ml-1">{detailItem.salesOrder.customer?.phone || '-'}</span></div>
              <div><span className="text-gray-500">Địa chỉ:</span> <span className="ml-1">{detailItem.salesOrder.customer?.address || '-'}</span></div>
              <div><span className="text-gray-500">Ngày giao dự kiến:</span> <span className="ml-1">{detailItem.salesOrder.expectedDeliveryDate ? dayjs(detailItem.salesOrder.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}</span></div>
              <div><span className="text-gray-500">Trạng thái:</span> <span className={`px-2 py-0.5 rounded text-xs ml-1 ${ORDER_STATUS_COLORS[detailItem.salesOrder.status]}`}>{ORDER_STATUS_LABELS[detailItem.salesOrder.status]}</span></div>
            </div>
            {detailItem.note && <div className="text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200"><span className="text-gray-500">Ghi chú:</span> <span className="ml-1">{detailItem.note}</span></div>}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailItem.salesOrder.items.map(i => (
                    <tr key={i.id}>
                      <td className="px-4 py-2 font-mono">{i.product?.sku}</td>
                      <td className="px-4 py-2">{i.product?.name}</td>
                      <td className="px-4 py-2 text-right font-semibold">{i.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end"><Button variant="outline" onClick={() => setDetailItem(null)}>Đóng</Button></div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
