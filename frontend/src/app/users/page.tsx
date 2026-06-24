'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner, Badge } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { userService } from '@/services';
import { User, PaginatedResponse } from '@/types';

export default function UsersPage() {
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', roleId: '', status: 'active' });
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, roleRes] = await Promise.all([
        userService.getAll({ page, limit: 15, search: search || undefined }),
        userService.getRoles(),
      ]);
      setData(userRes.data);
      setRoles(roleRes.data);
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditItem(null); setForm({ fullName: '', email: '', password: '', roleId: roles[0]?.id || '', status: 'active' }); setError(''); setShowModal(true); };
  const openEdit = (u: any) => { setEditItem(u); setForm({ fullName: u.fullName, email: u.email, password: '', roleId: u.roleId, status: u.status }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = { fullName: form.fullName, email: form.email, roleId: form.roleId, status: form.status, ...(form.password ? { password: form.password } : {}) };
      if (editItem) await userService.update(editItem.id, payload);
      else await userService.create({ ...payload, password: form.password || 'password123' });
      setShowModal(false); fetchData();
    } catch (e: any) { setError(e.response?.data?.error || 'Lỗi lưu dữ liệu'); }
    finally { setSaving(false); }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Người dùng</h1>
            <p className="text-sm text-gray-500 mt-1">Tài khoản và phân quyền người dùng</p>
          </div>
          <Button onClick={openCreate}>+ Thêm người dùng</Button>
        </div>

        <Card className="p-0">
          <div className="p-4 border-b flex items-center gap-3">
            <Input placeholder="Tìm kiếm..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="max-w-xs" />
          </div>
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data?.data.length ? <EmptyState icon="👤" message="Chưa có người dùng nào" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.data.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3"><Badge variant="purple">{u.roleName}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={u.status === 'active' ? 'success' : 'danger'}>{u.status === 'active' ? 'Hoạt động' : 'Tắt'}</Badge></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Sửa</Button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? 'Sửa người dùng' : 'Thêm người dùng'}>
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <Input label="Họ tên" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required disabled={!!editItem} />
          {!editItem && <Input label="Mật khẩu" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mặc định: password123" />}
          <Select label="Vai trò" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })} options={roles.map(r => ({ value: r.id, label: `${r.name} - ${r.description || ''}` }))} required />
          {editItem && <Select label="Trạng thái" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={[{ value: 'active', label: 'Hoạt động' }, { value: 'inactive', label: 'Tắt' }]} />}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Hủy</Button>
            <Button onClick={handleSave} loading={saving}>{editItem ? 'Lưu thay đổi' : 'Thêm mới'}</Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
