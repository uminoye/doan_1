'use client';
import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, StatCard, Spinner, Badge } from '@/components/ui/Misc';
import { reportService } from '@/services';
import { DashboardStats, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types';
import dayjs from 'dayjs';

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportService.getDashboard()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!stats) return null;

  const { totals } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
          <p className="text-sm text-gray-500 mt-1">Cập nhật ngày {dayjs().format('DD/MM/YYYY')}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng sản phẩm" value={totals.products} icon="📦" color="blue" />
        <StatCard label="Khách hàng" value={totals.customers} icon="👥" color="purple" />
        <StatCard label="Kho hàng" value={totals.warehouses} icon="🏭" color="green" />
        <StatCard label="Tổng đơn hàng" value={totals.totalOrders} icon="🛒" color="gray" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Đơn đang xử lý" value={totals.pendingOrders} icon="⏳" color="yellow" />
        <StatCard label="Đơn hoàn thành" value={totals.completedOrders} icon="✅" color="green" />
        <StatCard label="Tổng nhập (số lượng)" value={(totals.totalInbound || 0).toLocaleString()} icon="📥" color="blue" />
        <StatCard label="Tổng xuất (số lượng)" value={(totals.totalOutbound || 0).toLocaleString()} icon="📤" color="red" />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card title="Đơn hàng gần đây" className="overflow-hidden">
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã đơn</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentOrders.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
                ) : stats.recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-blue-600">{order.orderNo}</td>
                    <td className="px-4 py-3 text-gray-700">{order.customerName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{dayjs(order.orderDate).format('DD/MM/YYYY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Inbound */}
        <Card title="Phiếu nhập gần đây" className="overflow-hidden">
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã phiếu</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kho</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tổng SL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày nhập</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentInbound.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Chưa có phiếu nhập nào</td></tr>
                ) : stats.recentInbound.map(receipt => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-green-600">{receipt.receiptNo}</td>
                    <td className="px-4 py-3 text-gray-700">{receipt.warehouseName}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{receipt.totalItems}</td>
                    <td className="px-4 py-3 text-gray-500">{dayjs(receipt.receiptDate).format('DD/MM/YYYY')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Inventory Summary */}
      <Card title="Tồn kho tổng hợp">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-3xl font-bold text-blue-600">{(totals.totalInbound || 0).toLocaleString()}</p>
            <p className="text-sm text-blue-500 mt-1">Tổng nhập</p>
          </div>
          <div className="p-4 bg-red-50 rounded-xl">
            <p className="text-3xl font-bold text-red-600">{(totals.totalOutbound || 0).toLocaleString()}</p>
            <p className="text-sm text-red-500 mt-1">Tổng xuất</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="text-3xl font-bold text-green-600">{(totals.totalBalance || 0).toLocaleString()}</p>
            <p className="text-sm text-green-500 mt-1">Tồn kho hiện tại</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardContent />
    </AppLayout>
  );
}
