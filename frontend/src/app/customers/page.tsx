'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { customerService } from '@/services';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState({ company_name: '', phone: '', address: '', contact_person: '' });

  const fetch = async () => {
    try { const r = await customerService.getAll(); setCustomers(r.data); }
    catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await customerService.create(form); alert('Thêm khách hàng thành công!'); setIsOpen(false); setForm({ company_name: '', phone: '', address: '', contact_person: '' }); fetch(); }
    catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try { await customerService.delete(deleteConfirm.id); alert('Xóa thành công!'); setDeleteConfirm(null); fetch(); }
    catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Khách hàng</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>{customers.length} khách hàng trong hệ thống</p>
          </div>
          <button onClick={() => setIsOpen(true)} style={{ padding: '12px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }}>
            + Thêm khách hàng
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Tên công ty</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Điện thoại</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Địa chỉ</th>
                  <th style={{ textAlign: 'left', padding: '14px 18px', color: '#475569', fontSize: 13 }}>Người liên hệ</th>
                  <th style={{ width: 90 }}></th>
                </tr></thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid #e2e8f0', background: '#fff' }}>
                      <td style={{ padding: '16px 18px', fontWeight: 700, color: '#0f172a' }}>{c.company_name || c.name}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{c.phone || '-'}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{c.address || '-'}</td>
                      <td style={{ padding: '16px 18px', color: '#334155' }}>{c.contact_person || '-'}</td>
                      <td style={{ padding: '16px 18px' }}>
                        <button onClick={() => setDeleteConfirm(c)} style={{ padding: '8px 14px', background: '#fff5f5', border: '1px solid #fee2e2', borderRadius: 10, color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Chưa có khách hàng nào.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: '#fff', padding: 30, borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
              <h3 style={{ color: '#16a34a', marginTop: 0 }}>Thêm khách hàng mới</h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Tên công ty *</label>
                  <input required placeholder="Công ty TNHH ABC" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Điện thoại</label>
                    <input placeholder="024-12345678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Người liên hệ</label>
                    <input placeholder="Nguyễn Văn A" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Địa chỉ</label>
                  <input placeholder="Hà Nội" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, outline: 'none', fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, height: 48, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}>Hủy</button>
                  <button type="submit" style={{ flex: 1, height: 48, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 12px 24px rgba(16,185,129,0.22)' }}>Lưu</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: '#fff', padding: 28, borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#b91c1c' }}>Xóa khách hàng</h3>
              <p style={{ color: '#334155', lineHeight: 1.6 }}>Xóa <strong>"{deleteConfirm.company_name}"</strong>?</p>
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
