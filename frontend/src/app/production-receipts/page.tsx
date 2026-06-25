'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { productionReceiptService, warehouseService, productService } from '@/services';
import { ProductionReceipt, Warehouse, Product, PaginatedResponse, RECEIPT_STATUS_LABELS, RECEIPT_STATUS_COLORS } from '@/types';
import dayjs from 'dayjs';

interface ReceiptItem { productId: string; quantity: number; product?: Product; }

export default function ProductionReceiptsPage() {
  const [data, setData] = useState<PaginatedResponse<ProductionReceipt> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [detailItem, setDetailItem] = useState<ProductionReceipt | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ warehouseId: '', receiptDate: dayjs().format('YYYY-MM-DD'), note: '' });
  const [factoryForm, setFactoryForm] = useState({ action: 'accept' as 'accept' | 'reject', expectedDeliveryDate: '', reason: '' });
  const [items, setItems] = useState<ReceiptItem[]>([{ productId: '', quantity: 1 }]);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productionReceiptService.getAll({ page, limit: 10, status: statusFilter || undefined });
      setData(res.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadRefs = async () => {
    const [wRes, pRes] = await Promise.all([warehouseService.getAll(), productService.getAll({ limit: 100 })]);
    setWarehouses(wRes.data);
    setProducts(pRes.data.data || []);
    if (wRes.data[0]) setForm(f => ({ ...f, warehouseId: wRes.data[0].id }));
  };

  const openCreate = () => {
    loadRefs();
    setForm({ warehouseId: '', receiptDate: dayjs().format('YYYY-MM-DD'), note: '' });
    setItems([{ productId: '', quantity: 1 }]);
    setError('');
    setShowModal(true);
  };

  const openFactory = (r: ProductionReceipt) => {
    setDetailItem(r);
    setFactoryForm({ action: 'accept', expectedDeliveryDate: '', reason: '' });
    setError('');
    setShowFactoryModal(true);
  };

  const openDetail = (r: ProductionReceipt) => { setDetailItem(r); };

  const handleSave = async () => {
    setSaving(true); setError('');
    const validItems = items.filter(i => i.productId && i.quantity > 0);
    if (!form.warehouseId) { setError('Vui lòng chọn kho'); setSaving(false); return; }
    if (!validItems.length) { setError('Phải có ít nhất 1 sản phẩm'); setSaving(false); return; }
    try {
      await productionReceiptService.create({
        warehouseId: form.warehouseId,
        receiptDate: form.receiptDate,
        note: form.note || undefined,
        items: validItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });
      setShowModal(false);
      fetchData();
    } catch (e: any) { setError(e.response?.data?.error || e.response?.data?.message || 'Lỗi lưu dữ liệu'); }
    finally { setSaving(false); }
  };

  const handleFactory = async () => {
    if (!detailItem) return;
    if (factoryForm.action === 'accept' && !factoryForm.expectedDeliveryDate) {
      setError('Vui lòng chọn ngày giao dự kiến khi duyệt'); return;
    }
    if (factoryForm.action === 'reject' && !factoryForm.reason) {
      setError('Vui lòng nhập lý do từ chối'); return;
    }
    setActionLoading(detailItem.id);
    try {
      await productionReceiptService.factoryRespond({
        receiptId: detailItem.id,
        action: factoryForm.action,
        expectedDeliveryDate: factoryForm.action === 'accept' ? factoryForm.expectedDeliveryDate : undefined,
        reason: factoryForm.reason || undefined,
      });
      setShowFactoryModal(false);
      fetchData();
    } catch (e: any) { setError(e.response?.data?.error || e.response?.data?.message || 'Lỗi xử lý'); }
    finally { setActionLoading(null); }
  };

  const handleConfirmReceipt = async (id: string) => {
    if (!confirm('Xác nhận đã nhận hàng từ Nhà máy? Hệ thống sẽ cộng tồn kho.')) return;
    setActionLoading(id);
    try { await productionReceiptService.confirmReceipt(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || e.response?.data?.message || 'Lỗi xác nhận'); }
    finally { setActionLoading(null); }
  };

  const addItem = () => setItems([...items, { productId: '', quantity: 1 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    const updated = [...items];
    if (field === 'productId') updated[idx].productId = value as string;
    else updated[idx].quantity = value as number;
    setItems(updated);
  };

  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0);

  const statusOptions = [
    { value: '', label: 'Tất cả' },
    { value: 'PENDING', label: 'Chờ NM duyệt' },
    { value: 'PROCESSING', label: 'NM đang giao' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'REJECTED', label: 'NM từ chối' },
  ];

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Phiếu Nhập Kho</h1>
            <p className="text-sm text-gray-500 mt-1">Kho tạo yêu cầu → Nhà máy duyệt → Kho xác nhận nhận hàng</p>
          </div>
          <Button onClick={openCreate}>+ Tạo phiếu nhập</Button>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b flex items-center gap-3">
            <Select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} options={statusOptions} className="max-w-xs" />
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="📥" message="Chưa có phiếu nhập nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã phiếu</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày nhập</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tổng SL</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-green-600">{r.receiptNo}</td>
                      <td className="px-4 py-3">{dayjs(r.receiptDate).format('DD/MM/YYYY')}</td>
                      <td className="px-4 py-3">{r.warehouse?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.items.length} sản phẩm</td>
                      <td className="px-4 py-3 text-right font-semibold">{r.items.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${RECEIPT_STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {RECEIPT_STATUS_LABELS[r.status] || r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>Chi tiết</Button>
                          {r.status === 'PENDING' && (
                            <Button variant="primary" size="sm" onClick={() => openFactory(r)} loading={actionLoading === r.id}>NM phản hồi</Button>
                          )}
                          {r.status === 'PROCESSING' && (
                            <Button variant="success" size="sm" onClick={() => handleConfirmReceipt(r.id)} loading={actionLoading === r.id}>Nhận hàng</Button>
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
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Tạo phiếu nhập kho" size="xl">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Kho nhập" value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} options={warehouses.map(w => ({ value: w.id, label: w.name }))} placeholder="Chọn kho" required />
            <Input label="Ngày nhập" type="date" value={form.receiptDate} onChange={e => setForm({ ...form, receiptDate: e.target.value })} />
          </div>
          <Input label="Ghi chú" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú (tùy chọn)" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Chi tiết sản phẩm</label>
              <Button variant="outline" size="sm" onClick={addItem}>+ Thêm dòng</Button>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-1/2">Sản phẩm</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Số lượng</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">-- Chọn sản phẩm --</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2"><input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right" /></td>
                      <td className="px-3 py-2"><button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-lg">×</button></td>
                    </tr>
                  ))}
                </tbody>
                {items.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-3 py-2 text-right font-semibold text-gray-700">Tổng cộng:</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-800">{totalQty}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>Tạo phiếu nhập</Button>
          </div>
        </div>
      </Modal>

      {/* Factory Respond Modal */}
      <Modal open={showFactoryModal} onClose={() => setShowFactoryModal(false)} title="Nhà máy phản hồi phiếu nhập" size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <p className="text-sm"><span className="text-gray-500">Mã phiếu:</span> <span className="font-mono font-semibold ml-1">{detailItem?.receiptNo}</span></p>
            <p className="text-sm"><span className="text-gray-500">Kho nhận:</span> <span className="ml-1">{detailItem?.warehouse?.name}</span></p>
            <p className="text-sm"><span className="text-gray-500">Sản phẩm:</span> <span className="ml-1">{detailItem?.items.length} món</span></p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Hành động</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="factoryAction" value="accept" checked={factoryForm.action === 'accept'} onChange={() => setFactoryForm(f => ({ ...f, action: 'accept' }))} />
                <span className="text-sm font-medium text-green-700">Duyệt &amp; hẹn ngày giao</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="factoryAction" value="reject" checked={factoryForm.action === 'reject'} onChange={() => setFactoryForm(f => ({ ...f, action: 'reject' }))} />
                <span className="text-sm font-medium text-red-700">Từ chối</span>
              </label>
            </div>
          </div>
          {factoryForm.action === 'accept' ? (
            <Input label="Ngày giao dự kiến" type="date" value={factoryForm.expectedDeliveryDate} onChange={e => setFactoryForm(f => ({ ...f, expectedDeliveryDate: e.target.value }))} required />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối <span className="text-red-500">*</span></label>
              <textarea value={factoryForm.reason} onChange={e => setFactoryForm(f => ({ ...f, reason: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nhập lý do từ chối..." />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowFactoryModal(false)}>Hủy</Button>
            <Button onClick={handleFactory} loading={!!actionLoading}>{factoryForm.action === 'accept' ? 'Duyệt &amp; Hẹn ngày' : 'Từ chối'}</Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title="Chi tiết phiếu nhập" size="lg">
        {detailItem && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500">Mã phiếu:</span> <span className="font-mono font-semibold text-green-600 ml-1">{detailItem.receiptNo}</span></div>
              <div><span className="text-gray-500">Ngày nhập:</span> <span className="ml-1">{dayjs(detailItem.receiptDate).format('DD/MM/YYYY')}</span></div>
              <div><span className="text-gray-500">Kho:</span> <span className="ml-1">{detailItem.warehouse?.name}</span></div>
              <div><span className="text-gray-500">Trạng thái:</span> <span className={`px-2 py-0.5 rounded text-xs ml-1 ${RECEIPT_STATUS_COLORS[detailItem.status]}`}>{RECEIPT_STATUS_LABELS[detailItem.status]}</span></div>
              <div><span className="text-gray-500">Người tạo:</span> <span className="ml-1">{detailItem.createdBy?.fullName}</span></div>
              {(detailItem as any).respondedBy && <div><span className="text-gray-500">NM phản hồi:</span> <span className="ml-1">{(detailItem as any).respondedBy}</span></div>}
            </div>
            {detailItem.note && <div className="text-sm bg-gray-50 p-3 rounded-lg border"><span className="text-gray-500">Ghi chú:</span> <span className="ml-1">{detailItem.note}</span></div>}
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
