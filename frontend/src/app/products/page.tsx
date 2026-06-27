'use client';
import { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { productService, warehouseService } from '@/services';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [viewFilter, setViewFilter] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWHModalOpen, setIsWHModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [whName, setWhName] = useState('');
  const [whLocation, setWhLocation] = useState('');
  const skuRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ sku: '', name: '', sale_price: '', unit: 'Cái', category: '', image_url: '', min_stock: '50', initial_stock: '', warehouse_id: 'all' });

  const fetchData = async () => {
    try {
      const [p, w] = await Promise.all([productService.getAll(), warehouseService.getAll()]);
      setProducts(p.data);
      setWarehouses(w.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (isModalOpen) {
      const t = setTimeout(() => skuRef.current?.focus(), 80);
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsModalOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
    }
    return undefined;
  }, [isModalOpen]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ sku: '', name: '', sale_price: '', unit: 'Cái', category: '', image_url: '', min_stock: '50', initial_stock: '', warehouse_id: 'all' });
    setIsModalOpen(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({ sku: p.sku, name: p.name, sale_price: String(p.sale_price), unit: p.unit || 'Cái', category: p.category || '', image_url: p.image_url || '', min_stock: String(p.min_stock || 50), initial_stock: '', warehouse_id: warehouses[0]?.id || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...form, sale_price: parseFloat(form.sale_price) || 0, min_stock: parseInt(form.min_stock) || 50, initial_stock: form.initial_stock ? parseInt(form.initial_stock) : 0 };
      if (editingId) {
        await productService.update(editingId, payload);
        alert('Cập nhật thành công!');
      } else {
        await productService.create(payload);
        alert('Thêm sản phẩm thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await productService.delete(deleteConfirm.id);
      alert('Xóa thành công!');
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi khi xóa'); }
  };

  const handleAddWH = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await warehouseService.create({ name: whName, location: whLocation });
      alert('Thêm kho thành công!');
      setIsWHModalOpen(false); setWhName(''); setWhLocation('');
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi'); }
  };

  const parseBreakdown = (s: string) => (s || '').split(' | ').filter(Boolean).map(e => { const [n, q] = e.split(': '); return { name: n?.trim() || '', qty: Number(q) || 0 }; });

  const filtered = products.filter(p => {
    const search = searchText.trim().toLowerCase();
    const match = !search || [p.name, p.sku, p.category].some(v => String(v || '').toLowerCase().includes(search));
    if (!match) return false;
    if (filterMode === 'all') return true;
    const total = p.total_stock || 0;
    const min = p.min_stock || 50;
    if (filterMode === 'low-stock') return total > 0 && total < min;
    if (filterMode === 'out-stock') return total <= 0;
    return true;
  });

  const user = (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null);
  const canEdit = user?.role_id === 'admin' || user?.role_id === 'warehouse';

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 16 }}>
          <div>
            <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Quản lý sản phẩm</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b' }}>{products.length} sản phẩm trong hệ thống</p>
          </div>
          {canEdit && (
            <button onClick={openAdd} style={{ padding: '12px 18px', background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 10px 20px rgba(16,185,129,0.18)' }}>
              + Thêm sản phẩm
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ background: 'white', borderRadius: 18, padding: 16, boxShadow: '0 10px 30px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc', height: 46 }}>
              <i className="ri-search-line" style={{ color: '#94a3b8', fontSize: 16 }} />
              <input placeholder="Tìm theo tên, mã SKU..." value={searchText} onChange={e => setSearchText(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: '#334155', fontSize: 14 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['Tất cả', 'all'], ['Sắp hết', 'low-stock'], ['Hết hàng', 'out-stock']].map(([label, val]) => (
                <button key={val} onClick={() => setFilterMode(val as string)} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid transparent', background: filterMode === val ? '#10b981' : '#f8fafc', color: filterMode === val ? 'white' : '#334155', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
            <select value={viewFilter} onChange={e => setViewFilter(e.target.value)} style={{ width: '100%', height: 46, borderRadius: 12, border: '1px solid #e2e8f0', padding: '0 14px', background: '#fff', color: '#334155', fontSize: 14 }}>
              <option value="all">Tất cả kho</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {canEdit && (
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <button onClick={() => setIsWHModalOpen(true)} style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#6d28d9', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                + Thêm kho
              </button>
            </div>
          )}
        </div>

        {/* Product grid */}
        <div style={{ background: 'white', borderRadius: 22, padding: 18, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Đang tải...</p> : filtered.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>Không có sản phẩm nào.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 18 }}>
              {filtered.map(item => {
                const total = Number(item.total_stock || 0);
                const min = Number(item.min_stock || 50);
                const isLow = total > 0 && total < min;
                const isOut = total <= 0;
                return (
                  <div key={item.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 20px rgba(15,23,42,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 14px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{item.sku}</span>
                        <span style={{ fontSize: 12, padding: '6px 10px', borderRadius: 999, background: isOut ? '#fee2e2' : isLow ? '#ffedd5' : '#dcfce7', color: isOut ? '#b91c1c' : isLow ? '#c2410c' : '#166534', fontWeight: 700 }}>
                          {isOut ? 'Hết hàng' : isLow ? 'Sắp hết' : 'Còn hàng'}
                        </span>
                      </div>
                      <div onMouseEnter={() => setHoveredId(item.id)} onMouseLeave={() => setHoveredId(null)} style={{
                        aspectRatio: '1.25', background: item.image_url ? `url(${item.image_url}) center/cover no-repeat` : 'linear-gradient(180deg, #f8fafc, #eef2ff)',
                        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14, fontWeight: 600, marginBottom: 12, overflow: 'hidden',
                        transition: 'transform 220ms ease, box-shadow 220ms ease', transform: hoveredId === item.id ? 'scale(1.04)' : 'scale(1)',
                        boxShadow: hoveredId === item.id ? '0 14px 28px rgba(15, 23, 42, 0.12)' : 'none', cursor: item.image_url ? 'zoom-in' : 'default',
                      }}>
                        {!item.image_url && 'Hình sản phẩm'}
                      </div>
                      <h3 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 16, lineHeight: 1.4 }}>{item.name}</h3>
                      <div style={{ display: 'inline-flex', marginBottom: 10, padding: '5px 10px', borderRadius: 999, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700 }}>
                        {item.category || 'Chưa có danh mục'}
                      </div>
                    </div>
                    <div style={{ padding: '0 14px 14px', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 13, color: '#0f9d58', fontWeight: 800 }}>{new Intl.NumberFormat('vi-VN').format(item.sale_price)} đ</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>/{item.unit}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: isOut ? '#ef4444' : isLow ? '#f97316' : '#0f172a' }}>{total}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Tồn kho</div>
                        </div>
                      </div>
                      {canEdit && (
                        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                          <button onClick={() => openEdit(item)} style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Sửa</button>
                          <button onClick={() => setDeleteConfirm(item)} style={{ width: 40, height: 38, borderRadius: 10, border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer' }}>🗑</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add/Edit Product Modal */}
        {isModalOpen && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: 'white', padding: 30, borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 50px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ color: editingId ? '#d97706' : '#16a34a', marginTop: 0, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
                {editingId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Mã SKU *</label>
                    <input ref={skuRef} required placeholder="SP001" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value.toUpperCase() })} style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Đơn vị</label>
                    <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }}>
                      {['Cái', 'Bộ', 'Hộp', 'Kg', 'Lít'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Tên sản phẩm *</label>
                  <input required placeholder="" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Danh mục</label>
                  <input list="cat-list" placeholder="" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', padding: '12px 14px', boxSizing: 'border-box', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }} />
                  <datalist id="cat-list">
                    {['Ống thép', 'Phụ kiện', 'Van', 'Vật tư'].map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 15 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Đơn giá (đ)</label>
                    <input type="number" required placeholder="85000" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Tồn kho</label>
                    <input type="number" min="0" placeholder="0" value={form.initial_stock} onChange={e => setForm({ ...form, initial_stock: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Tồn tối thiểu</label>
                    <input type="number" min="0" placeholder="50" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }} />
                  </div>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Nhập vào kho</label>
                  <select value={form.warehouse_id} onChange={e => setForm({ ...form, warehouse_id: e.target.value })} style={{ width: '100%', padding: '12px 14px', border: '1px solid #dbe3ea', borderRadius: 12, background: '#fff', outline: 'none', fontSize: 14 }}>
                    <option value="all">Rải đều tất cả kho</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, height: 48, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: 14 }}>Hủy</button>
                  <button type="submit" style={{ flex: 1, height: 48, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 12px 24px rgba(16,185,129,0.22)', fontSize: 14 }}>
                    {editingId ? 'Lưu thay đổi' : 'Lưu sản phẩm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Warehouse Modal */}
        {isWHModalOpen && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: 'white', padding: 30, borderRadius: 16, width: '100%', maxWidth: 380, boxShadow: '0 20px 50px rgba(0,0,0,0.18)' }}>
              <h3 style={{ color: '#7c3aed', marginTop: 0 }}>Mở Kho Hàng Mới</h3>
              <form onSubmit={handleAddWH}>
                <input required placeholder="Tên kho (VD: Kho 3)" value={whName} onChange={e => setWhName(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 10, boxSizing: 'border-box', border: '1px solid #cbd5e0', borderRadius: 10 }} />
                <input placeholder="Vị trí / Địa chỉ" value={whLocation} onChange={e => setWhLocation(e.target.value)} style={{ width: '100%', padding: 12, marginBottom: 20, boxSizing: 'border-box', border: '1px solid #cbd5e0', borderRadius: 10 }} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" style={{ flex: 1, padding: 10, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>Lưu Kho</button>
                  <button type="button" onClick={() => setIsWHModalOpen(false)} style={{ flex: 1, padding: 10, background: '#edf2f7', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14 }}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {deleteConfirm && (
          <div className="modal-animate" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200, padding: 16 }}>
            <div className="modal-panel-animate" style={{ background: 'white', padding: 28, borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 50px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, color: '#b91c1c' }}>Xác nhận xóa sản phẩm</h3>
              <p style={{ color: '#334155', lineHeight: 1.6, marginBottom: 10 }}>
                Xóa <strong>"{deleteConfirm.name}"</strong> ({deleteConfirm.sku})?
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setDeleteConfirm(null)} style={{ flex: 1, height: 46, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', color: '#64748b', fontWeight: 700 }}>Hủy</button>
                <button type="button" onClick={handleDelete} style={{ flex: 1, height: 46, background: '#ef4444', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 700, boxShadow: '0 12px 24px rgba(239,68,68,0.22)' }}>Xóa</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
