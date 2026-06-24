'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { stockOutboundService, warehouseService, salesOrderService } from '@/services';
import { StockOutboundNote, Warehouse, SalesOrder, PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

interface OutboundItem { productId: string; quantity: number; product?: any; }

export default function WarehouseOutboundPage() {
  const [data, setData] = useState<PaginatedResponse<StockOutboundNote> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState<StockOutboundNote | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ warehouseId: '', exportDate: dayjs().format('YYYY-MM-DD'), note: '' });
  const [items, setItems] = useState<OutboundItem[]>([]);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockOutboundService.getAll({ page, limit: 10 });
      setData(res.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadRefs = async () => {
    const [wRes, oRes] = await Promise.all([
      warehouseService.getAll(),
      salesOrderService.getAll({ status: 'warehouse_processing', limit: 100 }),
    ]);
    setWarehouses(wRes.data);
    setOrders(oRes.data.data || []);
    if (wRes.data[0]) setForm(f => ({ ...f, warehouseId: wRes.data[0].id }));
  };

  const openCreate = () => { loadRefs(); setForm({ warehouseId: '', exportDate: dayjs().format('YYYY-MM-DD'), note: '' }); setItems([]); setSelectedOrder(null); setError(''); setShowModal(true); };
  const openDetail = (n: StockOutboundNote) => setDetailItem(n);

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
      setItems(order.items.map(i => ({ productId: i.productId, quantity: i.quantity, product: i.product })));
    }
  };

  const handleSave = async () => {
    if (!selectedOrder) { setError('Vui lòng chọn đơn hàng'); setSaving(false); return; }
    if (!form.warehouseId) { setError('Vui lòng chọn kho'); setSaving(false); return; }
    setSaving(true); setError('');
    try {
      await stockOutboundService.create({
        salesOrderId: selectedOrder.id,
        warehouseId: form.warehouseId,
        exportDate: form.exportDate,
        note: form.note || undefined,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });
      setShowModal(false);
      fetchData();
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi lưu dữ liệu'); }
    finally { setSaving(false); }
  };

  const handleConfirm = async (id: string) => {
    if (!confirm('Xác nhận xuất kho? Hệ thống sẽ trừ tồn kho.')) return;
    setActionLoading(id);
    try { await stockOutboundService.confirm(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi xác nhận'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Hủy phiếu xuất?')) return;
    setActionLoading(id);
    try { await stockOutboundService.cancel(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setActionLoading(null); }
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Xuất Kho</h1>
            <p className="text-sm text-gray-500 mt-1">Tạo và xác nhận phiếu xuất kho</p>
          </div>
          <Button onClick={openCreate}>+ Tạo phiếu xuất</Button>
        </div>

        <Card className="p-0">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="📤" message="Chưa có phiếu xuất nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã phiếu</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày xuất</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tổng SL</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(n => (
                    <tr key={n.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-red-600">{n.noteNo}</td>
                      <td className="px-4 py-3 font-mono text-blue-600">{n.salesOrder?.orderNo}</td>
                      <td className="px-4 py-3">{n.salesOrder?.customer?.name}</td>
                      <td className="px-4 py-3">{n.warehouse?.name}</td>
                      <td className="px-4 py-3">{dayjs(n.exportDate).format('DD/MM/YYYY')}</td>
                      <td className="px-4 py-3 text-right font-semibold">{n.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`status-${n.status} px-2 py-0.5 rounded text-xs`}>
                          {n.status === 'draft' ? 'Nháp' : n.status === 'confirmed' ? 'Đã xuất' : 'Đã hủy'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(n)}>Chi tiết</Button>
                          {n.status === 'draft' && (
                            <>
                              <Button variant="success" size="sm" onClick={() => handleConfirm(n.id)} loading={actionLoading === n.id}>Xuất kho</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCancel(n.id)} className="text-red-500 hover:bg-red-50">Hủy</Button>
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
          {data && <div className="p-4 border-t"><Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} onPageChange={setPage} /></div>}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tạo phiếu xuất kho" size="xl">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <Select
            label="Đơn hàng (warehouse_processing)"
            value={selectedOrder?.id || ''}
            onChange={e => handleOrderSelect(e.target.value)}
            options={orders.map(o => ({ value: o.id, label: `${o.orderNo} - ${o.customer?.name}` }))}
            placeholder="-- Chọn đơn hàng --"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Kho xuất" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} options={warehouses.map(w => ({ value: w.id, label: w.name }))} required />
            <Input label="Ngày xuất" type="date" value={form.exportDate} onChange={e => setForm({ ...form, exportDate: e.target.value })} />
          </div>
          <Input label="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />

          {selectedOrder && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chi tiết sản phẩm xuất</label>
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
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-mono text-blue-600">{item.product?.sku}</td>
                        <td className="px-4 py-2">{item.product?.name}</td>
                        <td className="px-4 py-2 text-right font-semibold">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-right font-bold">Tổng cộng:</td>
                      <td className="px-4 py-2 text-right font-bold">{totalQty}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>Tạo phiếu xuất</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết phiếu xuất" size="lg">
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Mã phiếu:</span> <span className="font-mono font-semibold text-red-600 ml-1">{detailItem.noteNo}</span></div>
              <div><span className="text-gray-500">Mã đơn:</span> <span className="font-mono ml-1">{detailItem.salesOrder?.orderNo}</span></div>
              <div><span className="text-gray-500">Khách hàng:</span> <span className="ml-1">{detailItem.salesOrder?.customer?.name}</span></div>
              <div><span className="text-gray-500">Kho:</span> <span className="ml-1">{detailItem.warehouse?.name}</span></div>
              <div><span className="text-gray-500">Ngày xuất:</span> <span className="ml-1">{dayjs(detailItem.exportDate).format('DD/MM/YYYY')}</span></div>
              <div><span className="text-gray-500">Trạng thái:</span> <span className={`status-${detailItem.status} px-2 py-0.5 rounded text-xs ml-1`}>{detailItem.status === 'draft' ? 'Nháp' : detailItem.status === 'confirmed' ? 'Đã xuất' : 'Đã hủy'}</span></div>
            </div>
            {detailItem.note && <div className="text-sm"><span className="text-gray-500">Ghi chú:</span> <span className="ml-1">{detailItem.note}</span></div>}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Số lượng xuất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailItem.items.map(i => (
                    <tr key={i.id}>
                      <td className="px-4 py-2 font-mono text-blue-600">{i.product?.sku}</td>
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
