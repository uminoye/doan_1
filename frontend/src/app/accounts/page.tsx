'use client';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { userService } from '@/services';

const roleMeta: Record<number, { name: string; short: string; color: string; bg: string; border: string }> = {
  1: { name: 'Ban Giám Đốc (Admin)', short: 'Admin', color: '#b42318', bg: '#fef3f2', border: '#fecdca' },
  2: { name: 'Kinh Doanh (Sales)', short: 'Sales', color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  3: { name: 'Giao Vận (Logistics)', short: 'Logistics', color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  4: { name: 'Thủ Kho', short: 'Kho', color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  5: { name: 'Nhà Máy', short: 'Nhà máy', color: '#6941c6', bg: '#f4f3ff', border: '#d9d6fe' },
};

const ROLE_OPTIONS = [
  { value: 1, label: 'Ban Giám Đốc (Admin)' },
  { value: 2, label: 'Kinh Doanh (Sales)' },
  { value: 3, label: 'Giao Vận (Logistics)' },
  { value: 4, label: 'Thủ Kho' },
  { value: 5, label: 'Nhà Máy' },
];

const styles = {
  page: { minHeight: '100vh', padding: '28px', background: 'radial-gradient(circle at top left, #eff6ff 0%, #f8fafc 38%, #f1f5f9 100%)', color: '#0f172a' },
  shell: { maxWidth: '1440px', margin: '0 auto' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' as const },
  heroTitle: { margin: 0, fontSize: '30px', lineHeight: 1.15, letterSpacing: '-0.04em' },
  heroSubtitle: { margin: '8px 0 0', maxWidth: '820px', color: '#64748b', lineHeight: 1.7, fontSize: '14px' },
  buttonPrimary: { padding: '13px 18px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 24px rgba(37,99,235,0.22)' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '22px' },
  statCard: { position: 'relative' as const, overflow: 'hidden' as const, borderRadius: '22px', padding: '18px', background: '#fff', boxShadow: '0 12px 24px rgba(15,23,42,0.08)', border: '1px solid rgba(148,163,184,0.14)', minHeight: '108px', willChange: 'transform, box-shadow' as const },
  statIcon: { width: '44px', height: '44px', borderRadius: '14px', display: 'grid', placeItems: 'center', marginBottom: '12px', fontSize: '18px', color: '#fff' },
  statBlue: { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' },
  statAmber: { background: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  statEmerald: { background: 'linear-gradient(135deg, #10b981, #059669)' },
  statLabel: { margin: 0, color: '#64748b', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
  statValue: { margin: '10px 0 0', fontSize: '30px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' },
  statDesc: { margin: '8px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.5 },
  card: { background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderRadius: '24px', border: '1px solid rgba(148,163,184,0.18)', boxShadow: '0 16px 40px rgba(15,23,42,0.08)' },
  cardHeader: { padding: '20px 20px 0' },
  cardBody: { padding: '20px' },
  cardTitle: { margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' },
  cardSubtitle: { margin: '8px 0 0', color: '#64748b', fontSize: '13px', lineHeight: 1.6 },
  table: { width: '100%', borderCollapse: 'separate' as const, borderSpacing: 0 },
  th: { textAlign: 'left' as const, padding: '14px 16px', fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' as const, color: '#0f172a' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15, 23, 42, 0.58)', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { width: 'min(760px, 100%)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' as const, background: '#fff', borderRadius: '24px', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.22)', border: '1px solid rgba(148,163,184,0.16)' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  input: { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const },
  select: { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: '14px', fontWeight: 700, boxSizing: 'border-box' as const },
  hint: { color: '#94a3b8', fontSize: '12px', marginTop: '-2px' },
  modalActions: { display: 'flex', gap: '12px', flexWrap: 'wrap' as const, justifyContent: 'flex-end' as const, gridColumn: '1 / -1', marginTop: '4px' },
};

export default function AccountsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role_id: 2 });

  const fetchUsers = async () => {
    try {
      const res = await userService.getAll();
      setUsers(res.data);
    } catch { alert('Lỗi tải danh sách tài khoản'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const enter = () => { setPageLoaded(false); requestAnimationFrame(() => requestAnimationFrame(() => setPageLoaded(true))); };
    fetchUsers(); enter();
    window.addEventListener('pageshow', enter);
    return () => window.removeEventListener('pageshow', enter);
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return users
      .filter(user => {
        const matchesRole = roleFilter === 'all' || String(user.role_id) === roleFilter;
        const email = (user.email || '').toLowerCase();
        const fullName = (user.full_name || '').toLowerCase();
        const matchesText = !keyword || email.includes(keyword) || fullName.includes(keyword);
        return matchesRole && matchesText;
      })
      .sort((a, b) => (a.role_id ?? 99) - (b.role_id ?? 99));
  }, [roleFilter, searchTerm, users]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => String(u.role_id) === '1').length,
    activeRoles: new Set(users.map(u => u.role_id)).size,
  }), [users]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ email: '', password: '', full_name: '', role_id: 2 });
    setIsModalOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  };

  const openEditModal = (user: any) => {
    setEditingId(user.id);
    setForm({ email: user.email || '', password: '', full_name: user.full_name || '', role_id: Number(user.role_id) || 2 });
    setIsModalOpen(true);
    requestAnimationFrame(() => setIsModalVisible(true));
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setTimeout(() => { setIsModalOpen(false); setEditingId(null); setForm({ email: '', password: '', full_name: '', role_id: 2 }); }, 220);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'role_id' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await userService.update(String(editingId), { full_name: form.full_name, role_id: String(form.role_id), ...(form.password ? { password: form.password } : {}) });
        alert('Cập nhật tài khoản thành công!');
      } else {
        await userService.create({ email: form.email, password: form.password, full_name: form.full_name, role_id: String(form.role_id) });
        alert('Tạo tài khoản mới thành công!');
      }
      closeModal(); fetchUsers();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi hệ thống!'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa tài khoản của ${name} không?`)) {
      try { await userService.delete(String(id)); alert('Đã xóa thành công!'); fetchUsers(); }
      catch (err: any) { alert(err.response?.data?.message || 'Lỗi khi xóa!'); }
    }
  };

  return (
    <div style={{ ...styles.page, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 320ms ease, transform 320ms ease' }}>
      <div style={styles.shell}>
        {/* Hero */}
        <div style={{ ...styles.hero, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity 420ms ease 80ms, transform 420ms ease 80ms' }}>
          <div>
            <h2 style={styles.heroTitle}>Quản lý tài khoản</h2>
            <p style={styles.heroSubtitle}>Giao diện quản trị hiện đại, rõ ràng và đồng bộ với phong cách dashboard hiện tại.</p>
          </div>
          <button type="button" onClick={openAddModal} style={styles.buttonPrimary}>+ Thêm tài khoản</button>
        </div>

        {/* Stats */}
        <div style={styles.statGrid}>
          {[
            { key: 'total', label: 'Tổng tài khoản', value: stats.total, desc: 'Toàn bộ người dùng trong hệ thống.', tone: 'statBlue', icon: '👥' },
            { key: 'admins', label: 'Quản trị viên', value: stats.admins, desc: 'Các tài khoản có quyền cao nhất.', tone: 'statAmber', icon: '🛡️' },
            { key: 'roles', label: 'Nhóm quyền', value: stats.activeRoles, desc: 'Số loại vai trò đang được sử dụng.', tone: 'statEmerald', icon: '⚙️' },
          ].map((item, index) => (
            <div key={item.key} onMouseEnter={() => setHoveredStat(item.key)} onMouseLeave={() => setHoveredStat(null)}
              style={{ ...styles.statCard, opacity: pageLoaded ? 1 : 0,
                transform: hoveredStat === item.key ? 'translateY(-5px) scale(1.01)' : pageLoaded ? 'translateY(0) scale(1)' : 'translateY(18px) scale(1)',
                transition: `opacity 420ms ease ${120 + index * 100}ms, transform 460ms cubic-bezier(0.22, 1, 0.36, 1)` }}>
              <div style={{ ...styles.statIcon, ...styles[item.tone as keyof typeof styles] }}>{item.icon}</div>
              <p style={styles.statLabel}>{item.label}</p>
              <div style={styles.statValue}>{item.value}</div>
              <p style={styles.statDesc}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <section style={{ ...styles.card, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 460ms ease 180ms, transform 460ms ease 180ms' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Danh sách tài khoản</h3>
            <p style={styles.cardSubtitle}>Bảng thông tin tối giản, dễ đọc và thao tác quản trị nhanh.</p>
            <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(240px, 0.7fr)', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm theo email, họ tên..." style={{ ...styles.input, paddingLeft: 42 }} />
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>🔽</span>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ ...styles.input, paddingLeft: 42 }}>
                  <option value="all">Tất cả vai trò</option>
                  <option value="1">Ban Giám Đốc (Admin)</option>
                  <option value="2">Kinh Doanh (Sales)</option>
                  <option value="3">Giao Vận (Logistics)</option>
                  <option value="4">Thủ Kho</option>
                  <option value="5">Nhà Máy</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ ...styles.cardBody, padding: '20px 24px 24px' }}>
            {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Đang tải dữ liệu...</p>
              : filteredUsers.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Không có tài khoản nào phù hợp.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ ...styles.table, minWidth: '1100px' }}>
                    <thead><tr>
                      <th style={{ ...styles.th, minWidth: '260px' }}>Email đăng nhập</th>
                      <th style={{ ...styles.th, minWidth: '220px' }}>Họ và tên</th>
                      <th style={{ ...styles.th, minWidth: '240px' }}>Chức vụ / Quyền</th>
                      <th style={{ ...styles.th, minWidth: '140px', textAlign: 'center' }}>Thao tác</th>
                    </tr></thead>
                    <tbody>
                      {filteredUsers.map((user, index) => {
                        const role = roleMeta[Number(user.role_id)] || { name: 'Chưa rõ', short: '?', color: '#475467', bg: '#f2f4f7', border: '#d0d5dd' };
                        return (
                          <tr key={user.id}
                            onMouseEnter={() => setHoveredRowId(user.id)} onMouseLeave={() => setHoveredRowId(null)}
                            style={{ opacity: pageLoaded ? 1 : 0, transform: hoveredRowId === user.id ? 'translateY(-2px)' : pageLoaded ? 'translateY(0)' : 'translateY(10px)',
                              background: hoveredRowId === user.id ? '#f8fbff' : 'transparent',
                              boxShadow: hoveredRowId === user.id ? '0 10px 24px rgba(15,23,42,0.06)' : 'none',
                              transition: `opacity 360ms ease ${120 + index * 70}ms, transform 180ms ease, background 180ms ease, box-shadow 180ms ease` }}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 800 }}>{user.email}</div>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>Tài khoản đăng nhập hệ thống</div>
                            </td>
                            <td style={styles.td}>{user.full_name}</td>
                            <td style={styles.td}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, color: role.color, background: role.bg, border: `1px solid ${role.border}` }}>
                                {role.short}
                              </span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
                                <button type="button" onClick={() => openEditModal(user)} title="Sửa" style={{ width: '38px', height: '38px', border: '1px solid #cbd5e1', background: '#fff', color: '#2563eb', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>✏️</button>
                                {String(user.role_id) !== '1' && (
                                  <button type="button" onClick={() => handleDelete(user.id, user.full_name)} title="Xóa" style={{ width: '38px', height: '38px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🗑️</button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </section>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ ...styles.overlay, background: isModalVisible ? 'rgba(15, 23, 42, 0.58)' : 'rgba(15, 23, 42, 0)' }} onClick={closeModal}>
          <div style={{ ...styles.modal, transform: isModalVisible ? 'scale(1)' : 'scale(0.97)', opacity: isModalVisible ? 1 : 0, transition: 'transform 220ms ease, opacity 220ms ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.cardHeader, display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ ...styles.cardTitle, marginBottom: 4 }}>{editingId ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}</h3>
                <p style={styles.cardSubtitle}>{editingId ? 'Cập nhật thông tin và phân quyền.' : 'Tạo tài khoản mới với email, họ tên và quyền phù hợp.'}</p>
              </div>
            </div>
            <div style={styles.cardBody}>
              <form onSubmit={handleSubmit} style={styles.formGrid}>
                {!editingId && (
                  <div style={styles.field}>
                    <label style={styles.label}>Email đăng nhập *</label>
                    <input required type="email" name="email" value={form.email} onChange={handleChange} placeholder="VD: nhanvien@congty.com" style={styles.input} />
                  </div>
                )}
                <div style={styles.field}>
                  <label style={styles.label}>Họ và tên *</label>
                  <input required name="full_name" value={form.full_name} onChange={handleChange} placeholder="VD: Nguyễn Văn A" style={styles.input} />
                </div>
                {!editingId && (
                  <div style={styles.field}>
                    <label style={styles.label}>Mật khẩu *</label>
                    <input required={!editingId} type="password" name="password" value={form.password} onChange={handleChange} placeholder={editingId ? 'Bỏ trống nếu không đổi' : 'Nhập mật khẩu...'} style={styles.input} />
                  </div>
                )}
                <div style={styles.field}>
                  <label style={styles.label}>Chức vụ / Phòng ban</label>
                  <select name="role_id" value={form.role_id} onChange={handleChange} style={styles.select}>
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                  <small style={{ ...styles.hint, color: roleMeta[form.role_id]?.color || '#94a3b8' }}>{roleMeta[form.role_id]?.name}</small>
                </div>
                {editingId && (
                  <div style={styles.field}>
                    <label style={styles.label}>Mật khẩu mới</label>
                    <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Bỏ trống nếu không đổi mật khẩu" style={styles.input} />
                  </div>
                )}
                <div style={styles.modalActions}>
                  <button type="button" onClick={closeModal} style={{ padding: '13px 18px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 800 }}>Hủy bỏ</button>
                  <button type="submit" disabled={submitting} style={{ ...styles.buttonPrimary, opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Tạo tài khoản'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
