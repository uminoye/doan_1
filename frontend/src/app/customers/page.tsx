'use client';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { customerService } from '@/services';

const initialFormData = { customer_code: '', company_name: '', phone: '', address: '', contact_person: '' };

const styles = {
  page: { minHeight: '100vh', padding: '28px', background: 'radial-gradient(circle at top left, #eff6ff 0%, #f8fafc 38%, #f1f5f9 100%)', color: '#0f172a' },
  shell: { maxWidth: '1440px', margin: '0 auto' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' as const },
  heroTitle: { margin: 0, fontSize: '30px', lineHeight: 1.15, letterSpacing: '-0.04em' },
  heroSubtitle: { margin: '8px 0 0', maxWidth: '780px', color: '#64748b', lineHeight: 1.7, fontSize: '14px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px', marginBottom: '22px' },
  statCard: { position: 'relative' as const, overflow: 'hidden' as const, borderRadius: '22px', padding: '18px', background: '#fff', boxShadow: '0 12px 24px rgba(15,23,42,0.08)', border: '1px solid rgba(148,163,184,0.14)', minHeight: '108px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
  statIcon: { width: '44px', height: '44px', borderRadius: '14px', display: 'grid', placeItems: 'center', marginBottom: '12px', fontSize: '18px', color: '#fff', boxShadow: '0 12px 24px rgba(37,99,235,0.14)' },
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
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column' as const, gap: '8px' },
  label: { fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  input: { width: '100%', padding: '13px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', fontSize: '14px', boxSizing: 'border-box' as const },
  textareaLike: { gridColumn: '1 / -1' },
  actionsRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' as const, alignItems: 'center', marginTop: '4px', justifyContent: 'flex-end' as const },
  buttonPrimary: { padding: '13px 18px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: '0 14px 24px rgba(37,99,235,0.22)' },
  buttonGhost: { padding: '13px 18px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 800, cursor: 'pointer' },
  table: { width: '100%' as const, borderCollapse: 'separate' as const, borderSpacing: 0 },
  th: { textAlign: 'left' as const, padding: '14px 16px', fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#64748b', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '16px', borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' as const, color: '#0f172a' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: '#e0f2fe', color: '#0369a1', fontSize: '12px', fontWeight: 800 },
  deleteBtn: { width: '38px', height: '38px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 6px 14px rgba(239,68,68,0.06)' },
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(15, 23, 42, 0.58)', zIndex: 2147483647, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  modal: { width: 'min(760px, 100%)', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' as const, background: '#fff', borderRadius: '24px', boxShadow: '0 30px 80px rgba(15, 23, 42, 0.22)', border: '1px solid rgba(148,163,184,0.16)' },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [hoveredStat, setHoveredStat] = useState<string | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(initialFormData);

  const fetchCustomers = async () => {
    try { const res = await customerService.getAll(); setCustomers(res.data); }
    catch { alert('Lỗi tải danh sách khách hàng'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCustomers();
    setPageLoaded(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setPageLoaded(true)));
    window.addEventListener('pageshow', () => { setPageLoaded(false); requestAnimationFrame(() => requestAnimationFrame(() => setPageLoaded(true))); });
  }, []);

  const stats = useMemo(() => ({
    total: customers.length,
    withContact: customers.filter(item => item.contact_person).length,
    recent: customers.slice(0, 5).length,
  }), [customers]);

  const filteredCustomers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter(item =>
      [item.customer_code, item.company_name, item.contact_person, item.phone, item.address]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(keyword))
    );
  }, [customers, searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await customerService.create(formData);
      alert('Thêm khách hàng thành công!');
      closeForm(); fetchCustomers();
    } catch (err: any) { alert(err.response?.data?.message || 'Lỗi khi thêm khách hàng'); }
    finally { setSubmitting(false); }
  };

  const openForm = () => { setFormData(initialFormData); setIsFormOpen(true); requestAnimationFrame(() => setIsFormVisible(true)); };
  const closeForm = () => { setIsFormVisible(false); setTimeout(() => { setIsFormOpen(false); }, 220); };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa khách hàng này?')) {
      try { await customerService.delete(id); fetchCustomers(); }
      catch (err: any) { alert(err.response?.data?.message || 'Lỗi khi xóa'); }
    }
  };

  return (
    <div style={{ ...styles.page, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity 320ms ease, transform 320ms ease' }}>
      <div style={styles.shell}>
        {/* Hero */}
        <div style={{ ...styles.hero, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(14px)', transition: 'opacity 420ms ease 80ms, transform 420ms ease 80ms' }}>
          <div>
            <h2 style={styles.heroTitle}>Quản lý khách hàng</h2>
            <p style={styles.heroSubtitle}>Tập trung toàn bộ danh sách khách hàng trong một không gian làm việc trực quan, dễ theo dõi.</p>
          </div>
          <button type="button" onClick={openForm} style={styles.buttonPrimary}>+ Thêm Khách Hàng</button>
        </div>

        {/* Stats */}
        <div style={styles.statGrid}>
          {[
            { key: 'total', label: 'Tổng khách hàng', value: stats.total, desc: 'Quản lý danh mục khách hàng đang có trong hệ thống.', tone: 'statBlue', delay: '120ms' },
            { key: 'contact', label: 'Có Người Liên Hệ', value: stats.withContact, desc: 'Dữ liệu đủ thông tin để chăm sóc và xử lý đơn hàng.', tone: 'statAmber', delay: '220ms' },
            { key: 'recent', label: 'Mới hiển thị', value: stats.recent, desc: '5 bản ghi đầu tiên trong danh sách hiện tại.', tone: 'statEmerald', delay: '320ms' },
          ].map(item => {
            const isHovered = hoveredStat === item.key;
            return (
              <div key={item.key} onMouseEnter={() => setHoveredStat(item.key)} onMouseLeave={() => setHoveredStat(null)}
                style={{ ...styles.statCard, opacity: pageLoaded ? 1 : 0, transform: isHovered ? 'translateY(-4px)' : pageLoaded ? 'translateY(0)' : 'translateY(18px)', transition: `opacity 420ms ease ${item.delay}, transform 420ms ease ${item.delay}` }}>
                <div style={{ ...styles.statIcon, ...styles[item.tone as keyof typeof styles] }}>
                  <span style={{ fontSize: 18 }}>{item.key === 'total' ? '👥' : item.key === 'contact' ? '📞' : '🕐'}</span>
                </div>
                <p style={styles.statLabel}>{item.label}</p>
                <div style={styles.statValue}>{item.value}</div>
                <p style={styles.statDesc}>{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <section style={{ ...styles.card, opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity 460ms ease 180ms, transform 460ms ease 180ms' }}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Danh sách khách hàng</h3>
            <p style={styles.cardSubtitle}>Giao diện bảng rõ ràng, dễ quét thông tin và tối ưu cho thao tác quản trị hàng ngày.</p>
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', boxShadow: '0 8px 18px rgba(15,23,42,0.04)', maxWidth: 400 }}>
              <span style={{ color: '#64748b', fontSize: 18 }}>🔍</span>
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm mã, tên công ty, SĐT..." style={{ border: 'none', outline: 'none', width: '100%', fontSize: 14, background: 'transparent', color: '#0f172a' }} />
            </div>
          </div>
          <div style={{ ...styles.cardBody, padding: '20px 24px 24px' }}>
            {loading ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Đang tải dữ liệu...</p>
              : customers.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Chưa có khách hàng nào.</p>
              : filteredCustomers.length === 0 ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>Không tìm thấy khách hàng phù hợp.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ ...styles.table, minWidth: '1200px' }}>
                    <thead><tr>
                      <th style={{ ...styles.th, minWidth: '120px' }}>Mã KH</th>
                      <th style={{ ...styles.th, minWidth: '220px' }}>Tên công ty</th>
                      <th style={{ ...styles.th, minWidth: '160px' }}>Người liên hệ</th>
                      <th style={{ ...styles.th, minWidth: '140px' }}>SĐT</th>
                      <th style={{ ...styles.th, minWidth: '260px' }}>Địa chỉ</th>
                      <th style={{ ...styles.th, minWidth: '110px' }}>Hành động</th>
                    </tr></thead>
                    <tbody>
                      {filteredCustomers.map((item, index) => {
                        const isHovered = hoveredRowId === item.id;
                        return (
                          <tr key={item.id} onMouseEnter={() => setHoveredRowId(item.id)} onMouseLeave={() => setHoveredRowId(null)}
                            style={{ opacity: pageLoaded ? 1 : 0, transform: isHovered ? 'translateY(-2px)' : pageLoaded ? 'translateY(0)' : 'translateY(10px)',
                              background: isHovered ? '#f8fbff' : 'transparent',
                              boxShadow: isHovered ? '0 10px 24px rgba(15,23,42,0.06)' : 'none',
                              transition: `opacity 360ms ease ${120 + index * 70}ms, transform 180ms ease, background 180ms ease` }}>
                            <td style={styles.td}><span style={styles.badge}>{item.customer_code}</span></td>
                            <td style={styles.td}><div style={{ fontWeight: 800 }}>{item.company_name}</div></td>
                            <td style={styles.td}>{item.contact_person}</td>
                            <td style={styles.td}>{item.phone}</td>
                            <td style={styles.td}>{item.address}</td>
                            <td style={styles.td}>
                              <button onClick={() => handleDelete(item.id)} title="Xóa" style={{ ...styles.deleteBtn, transform: isHovered ? 'translateY(-1px)' : 'translateY(0)', transition: 'transform 180ms ease' }}>🗑️</button>
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
      {isFormOpen && (
        <div style={{ ...styles.overlay, background: isFormVisible ? 'rgba(15, 23, 42, 0.58)' : 'rgba(15, 23, 42, 0)' }} onClick={closeForm}>
          <div style={{ ...styles.modal, transform: isFormVisible ? 'scale(1)' : 'scale(0.97)', opacity: isFormVisible ? 1 : 0, transition: 'transform 220ms ease, opacity 220ms ease' }} onClick={e => e.stopPropagation()}>
            <div style={{ ...styles.cardHeader, display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <h3 style={styles.cardTitle}>Thêm khách hàng mới</h3>
                <p style={styles.cardSubtitle}>Nhập đầy đủ thông tin để đội sales, kho và vận hành có thể phối hợp liền mạch.</p>
              </div>
            </div>
            <div style={styles.cardBody}>
              <form onSubmit={handleSubmit} style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>Mã khách hàng *</label>
                  <input required name="customer_code" value={formData.customer_code} onChange={handleInputChange} placeholder="VD: KH003" style={styles.input} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Tên công ty *</label>
                  <input required name="company_name" value={formData.company_name} onChange={handleInputChange} placeholder="Tên doanh nghiệp..." style={styles.input} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Số điện thoại *</label>
                  <input required name="phone" value={formData.phone} onChange={handleInputChange} placeholder="090..." style={styles.input} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Người liên hệ *</label>
                  <input required name="contact_person" value={formData.contact_person} onChange={handleInputChange} placeholder="Người phụ trách mua hàng..." style={styles.input} />
                </div>
                <div style={{ ...styles.field, ...styles.textareaLike }}>
                  <label style={styles.label}>Địa chỉ *</label>
                  <input required name="address" value={formData.address} onChange={handleInputChange} placeholder="Địa chỉ trụ sở hoặc chi nhánh..." style={styles.input} />
                </div>
                <div style={{ ...styles.actionsRow, gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={closeForm} style={styles.buttonGhost}>Hủy</button>
                  <button type="submit" disabled={submitting} style={{ ...styles.buttonPrimary, opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Đang lưu...' : 'Lưu khách hàng'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
