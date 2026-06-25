'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { salesOrderService, customerService, productService } from '@/services';
import { SalesOrder, Customer, Product, PaginatedResponse, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import dayjs from 'dayjs';

interface OrderItem { productId: string; quantity: number; unitPrice: number; product?: Product; }

export default function SalesOrdersPage() {
  const [data, setData] = useState<PaginatedResponse<SalesOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [detailItem, setDetailItem] = useState<SalesOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ customerId: '', orderDate: dayjs().format('YYYY-MM-DD'), expectedDeliveryDate: '', note: '' });
  const [items, setItems] = useState<OrderItem[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesOrderService.getAll({ page, limit: 10, status: statusFilter || undefined });
      setData(res.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadRefs = async () => {
    const [cRes, pRes] = await Promise.all([customerService.getAll({ limit: 100 }), productService.getAll({ limit: 100 })]);
    setCustomers(cRes.data.data || []);
    setProducts(pRes.data.data || []);
    if (cRes.data.data?.[0]) setForm(f => ({ ...f, customerId: cRes.data.data[0].id }));
  };

  const openCreate = () => {
    loadRefs();
    setForm({ customerId: '', orderDate: dayjs().format('YYYY-MM-DD'), expectedDeliveryDate: '', note: '' });
    setItems([{ productId: '', quantity: 1, unitPrice: 0 }]);
    setError('');
    setShowModal(true);
  };

  const openDetail = (o: SalesOrder) => { setDetailItem(o); };

  const handleSave = async () => {
    setSaving(true); setError('');
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (!form.customerId) { setError('Vui lòng chọn khách hàng'); setSaving(false); return; }
    if (!validItems.length) { setError('Phải có ít nhất 1 sản phẩm'); setSaving(false); return; }
    try {
      await salesOrderService.create({
        customerId: form.customerId,
        orderDate: form.orderDate,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        note: form.note || undefined,
        items: validItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      });
      setShowModal(false);
      fetchData();
    } catch (e: any) { setError(e.response?.data?.error || e.response?.data?.message || 'Lỗi lưu dữ liệu'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async (id: string) => {
    if (!confirm('Gửi đơn hàng đến Logistics?')) return;
    setActionLoading(id);
    try { await salesOrderService.submit(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Hủy đơn hàng?')) return;
    setActionLoading(id);
    try { await salesOrderService.cancel(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi'); }
    finally { setActionLoading(null); }
  };

  const addItem = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...items];
    if (field === 'productId') {
      updated[idx].productId = value as string;
      const p = products.find(p => p.id === value);
      if (p) updated[idx].unitPrice = Number(p.salePrice);
    } else if (field === 'quantity') updated[idx].quantity = value as number;
    else if (field === 'unitPrice') updated[idx].unitPrice = value as number;
    setItems(updated);
  };

  const totalAmount = items.reduce((s, i) => s + (i.quantity || 0) * (i.unitPrice || 0), 0);

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'draft', label: 'Nháp' },
    { value: 'pending', label: 'Chờ duyệt' },
    { value: 'warehouse_processing', label: 'Kho đang xử lý' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'returned', label: 'Hoàn trả' },
    { value: 'canceled', label: 'Đã hủy' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Đơn hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Sales tạo đơn → Logistics duyệt → Kho xuất → Giao hàng</p>
          </div>
          <Button onClick={openCreate}>+ Tạo đơn hàng</Button>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b flex items-center gap-3">
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} options={statusOptions} className="max-w-xs" />
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="🛒" message="Chưa có đơn hàng nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày đặt</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày giao</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{o.orderNo}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{o.customer?.name}</td>
                      <td className="px-4 py-3">{dayjs(o.orderDate).format('DD/MM/YYYY')}</td>
                      <td className="px-4 py-3">{o.expectedDeliveryDate ? dayjs(o.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}</td>
                      <td className="px-4 py-3 text-center">{o.items.length}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ORDER_STATUS_LABELS[o.status] || o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(o)}>Chi tiết</Button>
                          {o.status === 'draft' && (
                            <>
                              <Button variant="primary" size="sm" onClick={() => handleSubmit(o.id)} loading={actionLoading === o.id}>Gửi</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleCancel(o.id)} className="text-red-500 hover:bg-red-50">Hủy</Button>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tạo đơn hàng mới" size="xl">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <Select label="Khách hàng" value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} options={customers.map(c => ({ value: c.id, label: `${c.customerCode} - ${c.name}` }))} placeholder="Chọn khách hàng" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ngày đặt hàng" type="date" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} />
            <Input label="Ngày giao dự kiến" type="date" value={form.expectedDeliveryDate} onChange={e => setForm({ ...form, expectedDeliveryDate: e.target.value })} />
          </div>
          <Input label="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Chi tiết sản phẩm</label>
              <Button variant="outline" size="sm" onClick={addItem}>+ Thêm dòng</Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/3">Sản phẩm</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Số lượng</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Đơn giá</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Thành tiền</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">-- Chọn --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /></td>
                      <td className="px-3 py-2"><input type="number" min={0} value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /></td>
                      <td className="px-3 py-2 text-right font-medium">{((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()} đ</td>
                      <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Tổng cộng:</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-800">{totalAmount.toLocaleString()} đ</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>Tạo đơn hàng</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết đơn hàng" size="lg">
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Mã đơn:</span> <span className="font-mono font-semibold text-blue-600 ml-1">{detailItem.orderNo}</span></div>
              <div><span className="text-gray-500">Khách hàng:</span> <span className="ml-1">{detailItem.customer?.name}</span></div>
              <div><span className="text-gray-500">Trạng thái:</span> <span className={`px-2 py-0.5 rounded text-xs ml-1 ${ORDER_STATUS_COLORS[detailItem.status]}`}>{ORDER_STATUS_LABELS[detailItem.status]}</span></div>
              <div><span className="text-gray-500">Ngày đặt:</span> <span className="ml-1">{dayjs(detailItem.orderDate).format('DD/MM/YYYY')}</span></div>
              <div><span className="text-gray-500">Ngày giao:</span> <span className="ml-1">{detailItem.expectedDeliveryDate ? dayjs(detailItem.expectedDeliveryDate).format('DD/MM/YYYY') : '-'}</span></div>
              <div><span className="text-gray-500">Người tạo:</span> <span className="ml-1">{detailItem.createdBy?.fullName}</span></div>
            </div>
            {detailItem.note && <div className="text-sm bg-gray-50 p-3 rounded-lg border border-gray-200"><span className="text-gray-500">Ghi chú:</span> <span className="ml-1">{detailItem.note}</span></div>}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">SL</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Đơn giá</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {detailItem.items.map(i => (
                    <tr key={i.id}>
                      <td className="px-4 py-2 font-mono">{i.product?.sku}</td>
                      <td className="px-4 py-2">{i.product?.name}</td>
                      <td className="px-4 py-2 text-right">{i.quantity}</td>
                      <td className="px-4 py-2 text-right">{Number(i.unitPrice).toLocaleString()} đ</td>
                      <td className="px-4 py-2 text-right font-semibold">{Number(i.quantity * Number(i.unitPrice)).toLocaleString()} đ</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-bold">Tổng cộng:</td>
                    <td className="px-4 py-2 text-right font-bold">{detailItem.items.reduce((s, i) => s + i.quantity * Number(i.unitPrice), 0).toLocaleString()} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex justify-end"><Button variant="outline" onClick={() => setDetailItem(null)}>Đóng</Button></div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
