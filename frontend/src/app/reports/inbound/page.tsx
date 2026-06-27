'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, EmptyState, Spinner, Badge } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { reportService, warehouseService } from '@/services';
import dayjs from 'dayjs';

export default function InboundReportPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', warehouseId: '' });

  // Load warehouses once on mount
  useEffect(() => {
    warehouseService.getAll().then(res => setWarehouses(res.data || [])).catch(console.error);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getInbound({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        warehouseId: filters.warehouseId || undefined,
      });
      setData(res.data || []);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalIn = data.reduce((s, p) => s + p.totalIn, 0);
  const totalTx = data.reduce((s, p) => s + p.transactionCount, 0);
  const distinctProducts = new Set(data.map(p => p.productId)).size;

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Báo cáo Nhập Kho</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng hợp nhập kho theo thời gian và sản phẩm</p>
        </div>

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Input label="Từ ngày" type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
            <Input label="Đến ngày" type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
            <Select label="Kho" value={filters.warehouseId} onChange={e => setFilters({ ...filters, warehouseId: e.target.value })} options={[{ value: '', label: 'Tất cả kho' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]} />
            <Button onClick={() => fetchData()}>Lọc</Button>
            <Button variant="outline" onClick={() => setFilters({ startDate: '', endDate: '', warehouseId: '' })}>Xóa lọc</Button>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-green-600">{distinctProducts}</p>
            <p className="text-sm text-gray-500 mt-1">Sản phẩm nhập (distinct)</p>
          </Card>
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-blue-600">{totalTx}</p>
            <p className="text-sm text-gray-500 mt-1">Lần nhập kho</p>
          </Card>
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-green-700">{totalIn.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Tổng số lượng nhập</p>
          </Card>
        </div>

        <Card className="p-0">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data.length ? <EmptyState icon="📥" message="Không có dữ liệu nhập kho" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nhóm hàng</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kho</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tổng nhập</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Số lần nhập</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((p, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{p.productSku}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.productName}</td>
                      <td className="px-4 py-3"><Badge variant="default">{p.category || '-'}</Badge></td>
                      <td className="px-4 py-3 text-gray-600">{p.warehouseName}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{p.totalIn.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.transactionCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-green-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-base">{totalIn.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700">{totalTx}</td>
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
