'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { reportService } from '@/services';

export default function SalesDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Dashboard Sales</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>Theo dõi đơn hàng và doanh số cá nhân</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 28 }}>
          {[
            { label: 'Đơn hàng của tôi', value: data?.total_orders ?? 0, bg: '#eff6ff', color: '#2563eb' },
            { label: 'Chờ duyệt', value: data?.pending_orders ?? 0, bg: '#fff7ed', color: '#d97706' },
            { label: 'Đã hoàn tất', value: data?.completed_orders ?? 0, bg: '#f0fdf4', color: '#16a34a' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 22, padding: 22, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{loading ? '...' : s.value}</div>
            </div>
          ))}
        </div>
        {data?.recent_orders?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 22, padding: 20, boxShadow: '0 14px 35px rgba(15,23,42,0.08)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 20, color: '#0f172a' }}>Đơn hàng gần đây</h3>
            {data.recent_orders.map((o: any) => (
              <div key={o.id} style={{ padding: '14px 16px', borderRadius: 14, border: '1px solid #e2e8f0', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{o.order_no}</span>
                <span style={{ color: '#64748b' }}>{o.customer_name}</span>
                <span style={{ padding: '4px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: 12 }}>{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
