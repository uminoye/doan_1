'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { logisticsService } from '@/services';
import { DeliveryRequest, PaginatedResponse, ORDER_STATUS_LABELS } from '@/types';
import dayjs from 'dayjs';

export default function LogisticsPage() {
  const [data, setData] = useState<PaginatedResponse<DeliveryRequest> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState<DeliveryRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ salesOrderId: '', note: '' });
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

  const handleReceive = async () => {
    if (!form.salesOrderId) { setError('Vui lòng nhập ID đơn hàng'); return; }
    setActionLoading('receive');
    try {
      await logisticsService.receiveOrder(form.salesOrderId, form.note || undefined);
      setShowModal(false);
      setForm({ salesOrderId: '', note: '' });
      setError('');
      fetchData();
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi tiếp nhận'); }
    finally { setActionLoading(null); }
  };

  const handleForward = async (salesOrderId: string) => {
    if (!confirm('Chuyển đơn hàng đến kho?')) return;
    setActionLoading(salesOrderId + '_forward');
    try {
      await logisticsService.forwardToWarehouse(salesOrderId);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setActionLoading(null); }
  };

  const handleReject = async (salesOrderId: string) => {
    const note = prompt('Lý do từ chối:');
    if (!note) return;
    setActionLoading(salesOrderId + '_reject');
    try {
      await logisticsService.rejectOrder(salesOrderId, note);
      fetchData();
    } catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setActionLoading(null); }
  };

  const openDetail = (d: DeliveryRequest) => setDetailItem(d);

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'pending', label: 'Chờ tiếp nhận' },
    { value: 'received', label: 'Đã tiếp nhận' },
    { value: 'forwarded', label: 'Đã chuyển kho' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Xử lý Logistics</h1>
            <p className="text-sm text-gray-500 mt-1">Tiếp nhận và kiểm tra đơn hàng từ Sales</p>
          </div>
          <Button onClick={() => { setError(''); setForm({ salesOrderId: '', note: '' }); setShowModal(true); }}>Tiếp nhận đơn</Button>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Đơn hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày giao</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái logistics</th>
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
                        <td className="px-4 py-3 text-gray-600">{order?.items.length} sản phẩm</td>
                        <td className="px-4 py-3">{order?.deliveryDate ? dayjs(order.deliveryDate).format('DD/MM/YYYY') : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`status-${d.status} px-2 py-0.5 rounded text-xs`}>
                            {d.status === 'pending' ? 'Chờ tiếp nhận' : d.status === 'received' ? 'Đã tiếp nhận' : d.status === 'forwarded' ? 'Đã chuyển kho' : 'Đã hủy'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDetail(d)}>Chi tiết</Button>
                            {order?.status === 'submitted' && d.status === 'pending' && (
                              <>
                                <Button variant="primary" size="sm" onClick={handleReceive} loading={actionLoading === 'receive'}>Tiếp nhận</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleReject(order.id)} className="text-red-500 hover:bg-red-50">Từ chối</Button>
                              </>
                            )}
                            {order?.status === 'logistics_received' && d.status === 'received' && (
                              <Button variant="success" size="sm" onClick={() => handleForward(order.id)} loading={actionLoading === order.id + '_forward'}>Chuyển kho</Button>
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

      {/* Receive Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tiếp nhận đơn hàng" size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <Input label="ID đơn hàng (Sales Order ID)" value={form.salesOrderId} onChange={e => setForm({ ...form, salesOrderId: e.target.value })} placeholder="Dán ID đơn hàng hoặc mã đơn (ví dụ: DH-2024-001) từ danh sách đơn" />
          <Input label="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú kiểm tra (tùy chọn)" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleReceive} loading={actionLoading === 'receive'}>Tiếp nhận</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết yêu cầu giao hàng" size="lg">
        {detailItem && detailItem.salesOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Mã đơn:</span> <span className="font-mono font-semibold text-blue-600 ml-1">{detailItem.salesOrder.orderNo}</span></div>
              <div><span className="text-gray-500">Khách hàng:</span> <span className="ml-1">{detailItem.salesOrder.customer?.name}</span></div>
              <div><span className="text-gray-500">Địa chỉ giao:</span> <span className="ml-1">{detailItem.salesOrder.customer?.address || '-'}</span></div>
              <div><span className="text-gray-500">Người liên hệ:</span> <span className="ml-1">{detailItem.salesOrder.customer?.contactPerson || '-'}</span></div>
              <div><span className="text-gray-500">Ngày giao:</span> <span className="ml-1">{detailItem.salesOrder.deliveryDate ? dayjs(detailItem.salesOrder.deliveryDate).format('DD/MM/YYYY') : '-'}</span></div>
              <div><span className="text-gray-500">Trạng thái đơn:</span> <span className={`status-${detailItem.salesOrder.status} px-2 py-0.5 rounded text-xs ml-1`}>{ORDER_STATUS_LABELS[detailItem.salesOrder.status]}</span></div>
            </div>
            {detailItem.salesOrder.note && <div className="text-sm"><span className="text-gray-500">Ghi chú:</span> <span className="ml-1">{detailItem.salesOrder.note}</span></div>}
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
