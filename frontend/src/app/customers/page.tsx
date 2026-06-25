'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { customerService } from '@/services';
import { Customer, PaginatedResponse } from '@/types';

export default function CustomersPage() {
  const [data, setData] = useState<PaginatedResponse<Customer> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customerCode: '', name: '', phone: '', address: '', contactPerson: '' });
  const [error, setError] = useState('');

  const generateNextCode = useCallback(async (): Promise<string> => {
    try {
      const res = await customerService.getAll({ page: 1, limit: 1000 });
      const codes = res.data.data.map((c: Customer) => {
        const m = c.customerCode.match(/KH-(\d+)/);
        return m ? parseInt(m[1]) : 0;
      });
      const maxNum = codes.length ? Math.max(...codes) : 0;
      return `KH-${String(maxNum + 1).padStart(4, '0')}`;
    } catch {
      return `KH-0001`;
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerService.getAll({ page, limit: 15, search: search || undefined });
      setData(res.data);
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = async () => {
    setEditItem(null);
    setError('');
    const nextCode = await generateNextCode();
    setForm({ customerCode: nextCode, name: '', phone: '', address: '', contactPerson: '' });
    setShowModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditItem(c);
    setForm({ customerCode: c.customerCode, name: c.name, phone: c.phone || '', address: c.address || '', contactPerson: c.contactPerson || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = { customerCode: form.customerCode, name: form.name, phone: form.phone || undefined, address: form.address || undefined, contactPerson: form.contactPerson || undefined };
      if (editItem) await customerService.update(editItem.id, payload);
      else await customerService.create(payload);
      setShowModal(false); fetchData();
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi lưu dữ liệu'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa?')) return;
    try { await customerService.delete(id); fetchData(); }
    catch (e: any) { alert(e.response?.data?.error || 'Lỗi xóa dữ liệu'); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý Khách hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách khách hàng mua hàng</p>
        </div>

        <Card className="p-0">
          {/* Card Header - Search + Add Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <Input
                placeholder="Tìm kiếm..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={openCreate}>+ Thêm mới</Button>
          </div>

          {/* Table */}
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="👥" message="Chưa có khách hàng nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã KH</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên khách hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Điện thoại</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Địa chỉ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người LH</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{c.customerCode}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600">{c.phone || '-'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{c.address || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{c.contactPerson || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Sửa</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-500 hover:bg-red-50">Xóa</Button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa khách hàng' : 'Thêm khách hàng'}>
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mã khách hàng"
              value={form.customerCode}
              onChange={e => setForm({ ...form, customerCode: e.target.value })}
              required
              disabled={!editItem}
            />
            <Input label="Tên khách hàng" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <Input label="Điện thoại" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <Input label="Địa chỉ" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <Input label="Người liên hệ" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Lưu thay đổi' : 'Thêm mới'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
