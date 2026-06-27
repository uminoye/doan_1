'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { userService } from '@/services';

export default function AccountsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role_id: 'sales' });
  const roles = [
    { id: 'admin', label: 'Admin' },
    { id: 'sales', label: 'Sales' },
    { id: 'logistics', label: 'Logistics' },
    { id: 'warehouse', label: 'Warehouse' },
    { id: 'factory', label: 'Factory' },
  ];

  const fetch = async () => {
    try { const r = await userService.getAll(); setUsers(r.data); }
    catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await userService.update(editingId, { full_name: form.full_name, role_id: form.role_id, ...(form.password ? { password: form.password } : {}) });
        alert('Cập nhật thành công!');
      } else {
        await userService.create(form);
        alert('Tạo tài khoản thành công!');
      }
      setIsOpen(false); setEditingId(null); setForm({ email: '', password: '', full_name: '', role_id: 'sales' }); fetch();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const openEdit = (u: any) => {
    setEditingId(u.id); setForm({ email: u.email, password: '', full_name: u.full_name, role_id: u.role_id || u.role_name });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await userService.delete(deleteConfirm.id); alert('Xóa thành công!'); setDeleteConfirm(null); fetch(); }
    catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Quản lý tài khoản</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>{users.length} tài khoản trong hệ thống</p>
          </div>
          <button onClick={() => { setEditingId(null); setForm({ email: '', password: '', full_name: '', role_id: 'sales' }); setIsOpen(true); }} style={{ padding: '12px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>
            + Thêm tài khoản
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Họ tên</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Vai trò</th>
                  <th style={{ width: 160 }}></th>
                </tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      <td style={{ padding: '16px 18px', fontWeight: 700, color: '#0f172a' }}>{u.full_name}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{u.email}</td>
                      <td style={{ padding: '16px 18px' }}>
                        <span style={{ padding: '6px 12px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, fontSize: 12 }}>
                          {roles.find(r => r.id === (u.role_id || u.role_name))?.label || u.role_name || u.role_id}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(u)} style={{ padding: '8px 14px', background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 10, color: '#1d4ed8', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Sửa</button>
                          {u.role_id !== 'admin' && u.role_name !== 'admin' && (
                            <button onClick={() => setDeleteConfirm(u)} style={{ padding: '8px 14px', background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 10, color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Xóa</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
              <h3 style={{ color: editingId ? '#d97706' : '#16a34a', marginTop: 0 }}>{editingId ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}</h3>
              <form onSubmit={handleSubmit}>
                {!editingId && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Email *</label>
                      <input required type="email" placeholder="user@wms.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Mật khẩu *</label>
                      <input required type="password" placeholder="123456" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Họ tên *</label>
                  <input required placeholder="Nguyễn Văn A" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Vai trò</label>
                  <select value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }}>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, height: 48, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}>Hủy</button>
                  <button type="submit" style={{ flex: 1, height: 48, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>{editingId ? 'Lưu' : 'Tạo'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: '#fff', padding: 28, borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#b91c1c' }}>Xóa tài khoản</h3>
              <p style={{ color: '#334155' }}>Xóa tài khoản <strong>"{deleteConfirm.full_name}"</strong>?</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, height: 46, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Hủy</button>
                <button onClick={handleDelete} style={{ flex: 1, height: 46, background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>Xóa</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
