'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { reportService } from '@/services';

export default function WarehouseDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboard().then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <AppLayout>
      <div style={{ padding: '16px', background: '#f7fafc', minHeight: '100vh' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: '#0f172a', margin: 0, fontSize: 28 }}>Tổng Quan Kho</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b' }}>Tình trạng kho hàng hiện tại</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 18, marginBottom: 28 }}>
          {[
            { label: 'Tổng sản phẩm', value: data?.total_products ?? 0, bg: '#eff6ff', color: '#2563eb' },
            { label: 'Sắp hết hàng', value: data?.low_stock_products ?? 0, bg: '#fef2f2', color: '#dc2626' },
            { label: 'Nhập kho tháng', value: data?.monthly_inbound ?? 0, bg: '#ecfdf5', color: '#16a34a' },
            { label: 'Xuất kho tháng', value: data?.monthly_outbound ?? 0, bg: '#fff7ed', color: '#d97706' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 22, padding: 22, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>{loading ? '...' : s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.95))', borderRadius: 24, padding: 28, color: 'white', boxShadow: '0 24px 60px rgba(15,23,42,0.16)' }}>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Tổng quan kho hàng</h3>
          <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.7)' }}>Cập nhật tồn kho theo thời gian thực từ Neon PostgreSQL.</p>
        </div>
      </div>
    </AppLayout>
  );
}
