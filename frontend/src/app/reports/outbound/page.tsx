'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, EmptyState, Spinner, Badge } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { reportService, warehouseService, customerService } from '@/services';
import dayjs from 'dayjs';

export default function OutboundReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', warehouseId: '', customerId: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, wRes, cRes] = await Promise.all([
        reportService.getOutbound({ startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, warehouseId: filters.warehouseId || undefined, customerId: filters.customerId || undefined }),
        warehouseService.getAll(),
        customerService.getAll({ limit: 100 }),
      ]);
      setData(reportRes.data);
      setWarehouses(wRes.data);
      setCustomers(cRes.data.data || []);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalQty = data.reduce((s, n) => s + n.totalQuantity, 0);
  const totalOrders = data.length;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Báo cáo Xuất Kho</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng hợp xuất kho theo thời gian và khách hàng</p>
        </div>

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Từ ngày" type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
            <Input label="Đến ngày" type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
            <Select label="Kho" value={filters.warehouseId} onChange={e => setFilters({ ...filters, warehouseId: e.target.value })} options={[{ value: '', label: 'Tất cả kho' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]} />
            <Select label="Khách hàng" value={filters.customerId} onChange={e => setFilters({ ...filters, customerId: e.target.value })} options={[{ value: '', label: 'Tất cả KH' }, ...customers.map(c => ({ value: c.id, label: c.name }))]} />
            <Button onClick={() => fetchData()}>Lọc</Button>
            <Button variant="outline" onClick={() => setFilters({ startDate: '', endDate: '', warehouseId: '', customerId: '' })}>Xóa lọc</Button>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-red-600">{totalOrders}</p>
            <p className="text-sm text-gray-500 mt-1">Lần xuất kho</p>
          </Card>
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-blue-600">{data.reduce((s, n) => s + n.items.length, 0)}</p>
            <p className="text-sm text-gray-500 mt-1">Sản phẩm xuất</p>
          </Card>
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-red-700">{totalQty.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Tổng số lượng xuất</p>
          </Card>
        </div>

        <Card className="p-0">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data.length ? <EmptyState icon="📤" message="Không có dữ liệu xuất kho" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã phiếu</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày xuất</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tổng SL</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((n, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-red-600">{n.noteNo}</td>
                      <td className="px-4 py-3">{dayjs(n.exportDate).format('DD/MM/YYYY')}</td>
                      <td className="px-4 py-3">{n.warehouseName}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{n.customerName}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">{n.totalQuantity}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {n.items.map((item: any, i: number) => (
                            <div key={i} className="text-xs text-gray-600">
                              {item.productSku} - {item.productName}: <span className="font-medium">{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-red-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700 text-base">{totalQty.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
