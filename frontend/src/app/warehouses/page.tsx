'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { warehouseService } from '@/services';
import { Warehouse } from '@/types';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Warehouse | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ warehouseCode: '', name: '', location: '' });
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseService.getAll();
      setWarehouses(res.data);
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setForm({ warehouseCode: '', name: '', location: '' }); setError(''); setShowModal(true); };
  const openEdit = (w: Warehouse) => { setEditItem(w); setForm({ warehouseCode: w.warehouseCode, name: w.name, location: w.location || '' }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = { warehouseCode: form.warehouseCode || undefined, name: form.name, location: form.location || undefined };
      if (editItem) await warehouseService.update(editItem.id, payload);
      else await warehouseService.create(payload);
      setShowModal(false); fetchData();
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi lưu dữ liệu'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try { await warehouseService.delete(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi xóa dữ liệu'); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Kho hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Danh sách các kho lưu trữ hàng hóa</p>
          </div>
          <Button onClick={openCreate}>+ Thêm kho</Button>
        </div>

        {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !warehouses.length ? <EmptyState icon="🏭" message="Chưa có kho nào" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map(w => (
              <Card key={w.id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl">🏭</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{w.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{w.warehouseCode}</p>
                    <p className="text-sm text-gray-600 mt-1">{w.location || 'Chưa có địa điểm'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(w)}>Sửa</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)} className="text-red-500 hover:bg-red-50">Xóa</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa kho' : 'Thêm kho'}>
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          {editItem ? (
            <Input label="Mã kho" value={form.warehouseCode} disabled />
          ) : (
            <Input label="Mã kho" value={form.warehouseCode} onChange={e => setForm({ ...form, warehouseCode: e.target.value })} placeholder="Tự động tạo nếu để trống" helper="VD: KHO001" />
          )}
          <Input label="Tên kho" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Input label="Địa điểm" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Lưu thay đổi' : 'Thêm mới'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
