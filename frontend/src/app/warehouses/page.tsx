'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { warehouseService } from '@/services';

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [form, setForm] = useState({ name: '', location: '' });

  const fetch = async () => {
    try {
      const r = await warehouseService.getAll();
      setWarehouses(r.data);
    } catch { alert('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', location: '' });
    setIsOpen(true);
  };

  const openEdit = (w: any) => {
    setEditingId(w.id);
    setForm({ name: w.name, location: w.location || '' });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await warehouseService.update(editingId, form);
        alert('Cập nhật thành công!');
      } else {
        await warehouseService.create(form);
        alert('Thêm kho thành công!');
      }
      setIsOpen(false);
      fetch();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await warehouseService.delete(deleteConfirm.id);
      alert('Xóa thành công!');
      setDeleteConfirm(null);
      fetch();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi xóa'); }
  };

  return (
    <AppLayout>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a' }}>Quản lý Kho hàng</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>{warehouses.length} kho trong hệ thống</p>
          </div>
          <button onClick={openAdd} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 8px 20px rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ri-add-line" style={{ fontSize: 18 }} />
            Thêm kho mới
          </button>
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 160, borderRadius: 18, background: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />)}
          </div>
        ) : warehouses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 18, border: '2px dashed #e2e8f0' }}>
            <i className="ri-government-line" style={{ fontSize: 48, color: '#cbd5e1', display: 'block', marginBottom: 16 }} />
            <p style={{ color: '#94a3b8', margin: 0, fontSize: 16 }}>Chưa có kho hàng nào</p>
            <button onClick={openAdd} style={{ marginTop: 16, padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>+ Thêm kho đầu tiên</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
            {warehouses.map(w => (
              <div key={w.id} style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 4px 20px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', transition: 'transform 180ms ease, box-shadow 180ms ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 30px rgba(15,23,42,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(15,23,42,0.06)'; }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 18px 0 80px', background: 'linear-gradient(135deg, #10b981, #059669)', opacity: 0.08 }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: '#ecfdf5', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <i className="ri-government-line" style={{ fontSize: 22, color: '#059669' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' }}>{w.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{w.warehouseCode || w.code || '—'}</p>
                  </div>
                </div>
                {w.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#64748b', fontSize: 13 }}>
                    <i className="ri-map-pin-line" style={{ fontSize: 16 }} />
                    <span>{w.location}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => openEdit(w)} style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <i className="ri-edit-line" style={{ fontSize: 15 }} /> Sửa
                  </button>
                  <button onClick={() => setDeleteConfirm(w)} style={{ width: 40, height: 38, borderRadius: 10, border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <i className="ri-delete-bin-line" style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Add/Edit */}
        {isOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
            <div style={{ background: '#fff', padding: 30, borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 800, color: editingId ? '#d97706' : '#10b981' }}>
                <i className={editingId ? 'ri-edit-line' : 'ri-add-circle-line'} style={{ marginRight: 8 }} />
                {editingId ? 'Chỉnh sửa kho' : 'Thêm kho mới'}
              </h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>Tên kho *</label>
                  <input required placeholder="VD: Kho Thành Phố" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 12, outline: 'none', fontSize: 14, color: '#0f172a' }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = '#10b981'} onBlur={e => (e.target as HTMLElement).style.borderColor = '#e2e8f0'} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 700, color: '#334155' }}>Vị trí / Địa chỉ</label>
                  <input placeholder="VD: 123 Nguyễn Trãi, Q1, TP.HCM" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: '1px solid #e2e8f0', borderRadius: 12, outline: 'none', fontSize: 14, color: '#0f172a' }}
                    onFocus={e => (e.target as HTMLElement).style.borderColor = '#10b981'} onBlur={e => (e.target as HTMLElement).style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <button type="button" onClick={() => setIsOpen(false)} style={{ flex: 1, height: 46, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: 14 }}>Hủy</button>
                  <button type="submit" style={{ flex: 1, height: 46, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 8px 20px rgba(16,185,129,0.25)' }}>
                    {editingId ? 'Lưu thay đổi' : 'Thêm kho'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: 16 }}>
            <div style={{ background: '#fff', padding: 30, borderRadius: 20, width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fef2f2', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <i className="ri-error-warning-line" style={{ fontSize: 24, color: '#ef4444' }} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Xác nhận xóa kho</h3>
              <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14, lineHeight: 1.6 }}>
                Xóa kho <strong style={{ color: '#0f172a' }}>"{deleteConfirm.name}"</strong>? Dữ liệu tồn kho liên quan có thể bị ảnh hưởng.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, height: 46, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}>Hủy</button>
                <button onClick={handleDelete} style={{ flex: 1, height: 46, background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 8px 20px rgba(239,68,68,0.25)' }}>Xóa kho</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </AppLayout>
  );
}
