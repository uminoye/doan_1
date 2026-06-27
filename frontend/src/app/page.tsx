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

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Dashboard</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>Tổng quan hệ thống kho hàng</p>
        </div>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18, marginBottom: 28 }}>
          {[
            { label: 'Tổng sản phẩm', value: data?.total_products ?? 0, icon: 'ri-box-3-line', bg: '#eff6ff', color: '#2563eb' },
            { label: 'Đơn hàng', value: data?.total_orders ?? 0, icon: 'ri-shopping-cart-2-line', bg: '#f0fdf4', color: '#16a34a' },
            { label: 'Chờ xử lý', value: data?.pending_orders ?? 0, icon: 'ri-time-line', bg: '#fff7ed', color: '#d97706' },
            { label: 'Sắp hết hàng', value: data?.low_stock_products ?? 0, icon: 'ri-alert-line', bg: '#fef2f2', color: '#dc2626' },
          ].map(stat => (
            <div key={stat.label} className="dashboard-hover-card" style={{ background: '#fff', borderRadius: 22, padding: 22, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0', borderTop: `4px solid ${stat.color}`, position: 'relative', overflow: 'hidden', cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: stat.bg, display: 'grid', placeItems: 'center', color: stat.color }}>
                  <i className={stat.icon} style={{ fontSize: 22 }} />
                </div>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</p>
              <p style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em' }}>{loading ? '...' : stat.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', borderRadius: 24, padding: 28, color: 'white', boxShadow: '0 24px 60px rgba(15,23,42,0.16)', marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Tổng quan hệ thống</h3>
              <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>Cập nhật theo thời gian thực từ cơ sở dữ liệu Neon PostgreSQL.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 28 }}>
                {[
                  { label: 'Đơn đã hoàn tất', value: data?.completed_orders ?? 0 },
                  { label: 'Tổng nhập kho', value: data?.monthly_inbound ?? 0 },
                  { label: 'Tổng xuất kho', value: data?.monthly_outbound ?? 0 },
                ].map(item => (
                  <div key={item.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16 }}>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{item.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{loading ? '...' : item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Tổng doanh thu</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#4ade80', letterSpacing: '-0.04em' }}>
                {loading ? '...' : `${fmt.format(data?.total_revenue ?? 0)} đ`}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Từ đơn hàng đã hoàn tất</div>
            </div>
          </div>
        </div>

        {/* Recent orders */}
        <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 20, color: '#0f172a' }}>Đơn hàng gần đây</h3>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Đang tải...</p>
          ) : data?.recent_orders?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recent_orders.map((o: any) => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: '#2563eb', fontSize: 14 }}>{o.order_no}</span>
                    <span style={{ color: '#64748b', fontSize: 13, marginLeft: 12 }}>{o.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{fmt.format(o.total)} đ</span>
                    <span style={{ padding: '5px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700 }}>{o.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>Chưa có đơn hàng nào.</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
