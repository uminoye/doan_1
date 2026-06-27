'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { reportService } from '@/services';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboard()
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = new Intl.NumberFormat('vi-VN');

  const cards = [
    { label: 'Tổng sản phẩm', value: data?.total_products ?? 0, icon: 'ri-box-3-line', bg: '#eff6ff', color: '#2563eb', shadow: 'rgba(37,99,235,0.15)' },
    { label: 'Khách hàng', value: data?.total_customers ?? 0, icon: 'ri-team-line', bg: '#f5f3ff', color: '#7c3aed', shadow: 'rgba(124,58,237,0.15)' },
    { label: 'Đơn hàng', value: data?.total_orders ?? 0, icon: 'ri-shopping-cart-2-line', bg: '#f0fdf4', color: '#16a34a', shadow: 'rgba(22,163,74,0.15)' },
    { label: 'Chờ xử lý', value: data?.pending_orders ?? 0, icon: 'ri-time-line', bg: '#fff7ed', color: '#d97706', shadow: 'rgba(217,119,6,0.15)' },
    { label: 'Kho hàng', value: data?.total_warehouses ?? 0, icon: 'ri-government-line', bg: '#fef2f2', color: '#dc2626', shadow: 'rgba(220,38,38,0.15)' },
    { label: 'Hoàn thành', value: data?.completed_orders ?? 0, icon: 'ri-checkbox-circle-line', bg: '#ecfdf5', color: '#059669', shadow: 'rgba(5,150,105,0.15)' },
  ];

  const statusColors: Record<string, string> = {
    pending: '#d97706', submitted: '#2563eb', logistics_received: '#7c3aed',
    warehouse_processing: '#ea580c', shipping: '#7c3aed', completed: '#16a34a',
    canceled: '#94a3b8', returned: '#dc2626',
  };

  return (
    <AppLayout>
      <div style={{ padding: '0', background: '#eef2f7', minHeight: 'calc(100vh - 64px)', fontFamily: 'Inter, system-ui, sans-serif' }}>

        {/* Welcome banner */}
        <div style={{ background: 'linear-gradient(135deg, #0F1C2E 0%, #1A2D45 60%, #0F3D2E 100%)', borderRadius: 20, padding: '28px 32px', marginBottom: 24, boxShadow: '0 8px 30px rgba(15,28,46,0.18)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, width: 280, height: '100%', background: 'rgba(16,185,129,0.08)', borderRadius: '0 20px 20px 0' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(16,185,129,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <i className="ri-dashboard-3-line" style={{ fontSize: 20, color: '#34d399' }} />
              <span style={{ fontSize: 13, color: '#34d399', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.1 }}>Tổng quan hệ thống</span>
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff' }}>Chào mừng bạn quay trở lại!</h2>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.65)', fontSize: 14, maxWidth: 560, lineHeight: 1.7 }}>
              Cập nhật dữ liệu theo thời gian thực từ hệ thống Neon PostgreSQL. Theo dõi mọi hoạt động kho hàng tại đây.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
              {[
                { icon: 'ri-arrow-up-circle-line', label: `${loading ? '...' : (data?.monthly_inbound ?? 0)} Nhập kho`, color: '#4ade80' },
                { icon: 'ri-arrow-down-circle-line', label: `${loading ? '...' : (data?.monthly_outbound ?? 0)} Xuất kho`, color: '#f87171' },
                { icon: 'ri-money-dollar-circle-line', label: `${loading ? '...' : fmt.format(data?.total_revenue ?? 0)} Doanh thu`, color: '#fbbf24' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 14px' }}>
                  <i className={item.icon} style={{ fontSize: 16, color: item.color }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 18, marginBottom: 24 }}>
          {cards.map((card, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 18, padding: '22px 22px 18px', boxShadow: '0 4px 20px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden', transition: 'transform 180ms ease, box-shadow 180ms ease', cursor: 'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${card.shadow}`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(15,23,42,0.06)'; }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: card.bg, display: 'grid', placeItems: 'center', marginBottom: 14 }}>
                <i className={card.icon} style={{ fontSize: 18, color: card.color }} />
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</p>
              <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {loading ? <span style={{ color: '#cbd5e1' }}>...</span> : card.value.toLocaleString('vi-VN')}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom grid: Recent orders + Inbound */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent Orders */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 4px 20px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ri-shopping-cart-2-line" style={{ fontSize: 18, color: '#0f172a' }} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Đơn hàng gần đây</h3>
              </div>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, background: '#ecfdf5', padding: '4px 12px', borderRadius: 999 }}>{loading ? '...' : data?.recent_orders?.length ?? 0} đơn</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 52, borderRadius: 12, background: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : data?.recent_orders?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recent_orders.map((o: any) => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: '1px solid #f1f5f9', background: '#fafbfc', transition: 'border-color 180ms', onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{o.order_no}</span>
                      <span style={{ color: '#64748b', fontSize: 13, marginLeft: 10 }}>{o.customer_name}</span>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{o.created_by ?? '—'}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{fmt.format(o.total ?? 0)} đ</span>
                      <span style={{ padding: '3px 10px', borderRadius: 999, background: '#f1f5f9', color: statusColors[o.status] ?? '#64748b', fontSize: 11, fontWeight: 700 }}>
                        {o.status_label ?? o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <i className="ri-inbox-line" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Chưa có đơn hàng nào</p>
              </div>
            )}
          </div>

          {/* Recent Inbound */}
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 4px 20px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ri-inbox-line" style={{ fontSize: 18, color: '#0f172a' }} />
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Phiếu nhập gần đây</h3>
              </div>
              <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700, background: '#ecfdf5', padding: '4px 12px', borderRadius: 999 }}>{loading ? '...' : data?.recent_inbound?.length ?? 0} phiếu</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} style={{ height: 52, borderRadius: 12, background: '#f1f5f9', animation: 'pulse 1.5s infinite' }} />)}
              </div>
            ) : data?.recent_inbound?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.recent_inbound.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: '1px solid #f1f5f9', background: '#fafbfc', transition: 'border-color 180ms', onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#f1f5f9' }}>
                    <div>
                      <span style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>{r.receipt_no}</span>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{r.warehouse_name}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{r.total_items} mặt hàng</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(r.receipt_date).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <i className="ri-file-list-3-line" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14 }}>Chưa có phiếu nhập nào</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
    </AppLayout>
  );
}
