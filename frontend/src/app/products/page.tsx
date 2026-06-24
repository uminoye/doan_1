'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Badge, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { productService } from '@/services';
import { Product, PaginatedResponse } from '@/types';
import dayjs from 'dayjs';

export default function ProductsPage() {
  const [data, setData] = useState<PaginatedResponse<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ sku: '', name: '', unit: 'hộp', category: '', salePrice: '' });
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productService.getAll({ page, limit: 15, search: search || undefined });
      setData(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditProduct(null); setForm({ sku: '', name: '', unit: 'hộp', category: '', salePrice: '' }); setError(''); setShowModal(true); };
  const openEdit = (p: Product) => { setEditProduct(p); setForm({ sku: p.sku, name: p.name, unit: p.unit, category: p.category || '', salePrice: String(p.salePrice) }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = { sku: form.sku, name: form.name, unit: form.unit, category: form.category || undefined, salePrice: parseFloat(form.salePrice) || 0 };
      if (editProduct) {
        await productService.update(editProduct.id, payload);
      } else {
        await productService.create(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Lỗi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await productService.delete(id);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Lỗi xóa dữ liệu');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Sản phẩm</h1>
            <p className="text-sm text-gray-500 mt-1">Danh mục sản phẩm trong hệ thống</p>
          </div>
          <Button onClick={openCreate}>+ Thêm sản phẩm</Button>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Input placeholder="Tìm kiếm sản phẩm..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          </div>

          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="📦" message="Chưa có sản phẩm nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nhóm hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Đơn vị</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Giá bán</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{p.sku}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                      <td className="px-4 py-3"><Badge variant="default">{p.category || '-'}</Badge></td>
                      <td className="px-4 py-3 text-gray-600">{p.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{Number(p.salePrice).toLocaleString()} đ</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Sửa</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50">Xóa</Button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <Input label="Mã SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU001" required disabled={!!editProduct} />
          <Input label="Tên sản phẩm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tên sản phẩm" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Đơn vị tính" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="hộp" />
            <Input label="Giá bán (VNĐ)" type="number" value={form.salePrice} onChange={e => setForm({ ...form, salePrice: e.target.value })} placeholder="0" />
          </div>
          <Input label="Nhóm hàng" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="VD: Bánh Trung Thu" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>{editProduct ? 'Lưu thay đổi' : 'Thêm mới'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
