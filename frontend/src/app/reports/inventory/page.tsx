'use client';
import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, EmptyState, Spinner, Badge } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { reportService, warehouseService } from '@/services';
import { InventoryBalance } from '@/types';

export default function InventoryReportPage() {
  const [data, setData] = useState<InventoryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, wRes] = await Promise.all([
        reportService.getInventory({ warehouseId: warehouseId || undefined }),
        warehouseService.getAll(),
      ]);
      setData(reportRes.data);
      setWarehouses(wRes.data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  }, [warehouseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBalance = data.reduce((s, b) => s + b.onHandQty, 0);
  const totalAvailable = data.reduce((s, b) => s + b.availableQty, 0);
  const lowStock = data.filter(b => b.availableQty < 20);

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Báo cáo Tồn Kho</h1>
          <p className="text-sm text-gray-500 mt-1">Số lượng tồn kho hiện tại theo sản phẩm</p>
        </div>

        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <Select
              label="Kho"
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              options={[{ value: '', label: 'Tất cả kho' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]}
            />
            <Button onClick={() => fetchData()}>Lọc</Button>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-blue-600">{data.length}</p>
            <p className="text-sm text-gray-500 mt-1">Sản phẩm có tồn</p>
          </Card>
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-green-600">{totalBalance.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Tổng tồn kho</p>
          </Card>
          <Card className="text-center p-5">
            <p className="text-3xl font-bold text-yellow-600">{lowStock.length}</p>
            <p className="text-sm text-gray-500 mt-1">Sản phẩm sắp hết</p>
          </Card>
        </div>

        <Card className="p-0">
          {loading ? <div className="flex justify-center py-12"><Spinner /></div> : !data.length ? <EmptyState icon="🏬" message="Không có dữ liệu tồn kho" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Sản phẩm</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Kho</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nhóm</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Đơn vị</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tồn kho</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Khả dụng</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((b, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-medium text-blue-600">{b.productSku}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{b.productName}</td>
                      <td className="px-4 py-3 text-gray-600">{b.warehouseName}</td>
                      <td className="px-4 py-3"><Badge variant="default">{b.category || '-'}</Badge></td>
                      <td className="px-4 py-3 text-center text-gray-600">{b.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{b.onHandQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{b.availableQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {b.availableQty === 0 ? (
                          <Badge variant="danger">Hết hàng</Badge>
                        ) : b.availableQty < 20 ? (
                          <Badge variant="warning">Sắp hết</Badge>
                        ) : (
                          <Badge variant="success">Còn hàng</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-700">TỔNG CỘNG:</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800 text-base">{totalBalance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700 text-base">{totalAvailable.toLocaleString()}</td>
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
