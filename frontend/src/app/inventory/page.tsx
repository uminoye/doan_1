'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, EmptyState, Spinner, Badge } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { reportService, warehouseService } from '@/services';
import { InventoryBalance } from '@/types';
import dayjs from 'dayjs';

const VND = new Intl.NumberFormat('vi-VN').format;

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'good' | 'defective'>('good');

  // Good inventory
  const [goodItems, setGoodItems] = useState<InventoryBalance[]>([]);
  const [goodLoading, setGoodLoading] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');

  // Defective inventory
  const [defectiveData, setDefectiveData] = useState<{ warehouse: any; items: InventoryBalance[] }>({ warehouse: null, items: [] });
  const [defectiveLoading, setDefectiveLoading] = useState(true);

  // Shared
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const fetchGood = useCallback(async () => {
    setGoodLoading(true);
    try {
      const [reportRes, wRes] = await Promise.all([
        reportService.getInventory({ warehouseId: warehouseId || undefined }),
        warehouseService.getAll(),
      ]);
      // Chỉ lấy kho thường (không phải kho lỗi)
      const allWarehouses = wRes.data || [];
      const goodWarehouseIds = allWarehouses
        .filter((w: any) => !w.isDefectiveWarehouse)
        .map((w: any) => w.id);

      const allItems: InventoryBalance[] = reportRes.data || [];
      const filtered = allItems.filter((b: InventoryBalance) =>
        !b.isDefective && goodWarehouseIds.includes(b.warehouseId)
      );
      setGoodItems(filtered);
      setWarehouses(allWarehouses.filter((w: any) => !w.isDefectiveWarehouse));
    } catch (e) { console.error(e); }
    finally { setGoodLoading(false); }
  }, [warehouseId, fetchTrigger]);

  const fetchDefective = useCallback(async () => {
    setDefectiveLoading(true);
    try {
      const res = await reportService.getDefectiveInventory();
      setDefectiveData(res.data || { warehouse: null, items: [] });
    } catch (e) { console.error(e); }
    finally { setDefectiveLoading(false); }
  }, [fetchTrigger]);

  useEffect(() => {
    if (activeTab === 'good') fetchGood();
    else fetchDefective();
  }, [activeTab, fetchGood, fetchDefective]);

  const handleRefresh = () => setFetchTrigger(n => n + 1);

  // Stats
  const goodStats = useMemo(() => {
    const total = goodItems.reduce((s, b) => s + b.onHandQty, 0);
    const available = goodItems.reduce((s, b) => s + b.availableQty, 0);
    const lowStock = goodItems.filter(b => b.availableQty < 20).length;
    const outOfStock = goodItems.filter(b => b.onHandQty === 0).length;
    return { total, available, lowStock, outOfStock, productCount: goodItems.length };
  }, [goodItems]);

  const defStats = useMemo(() => {
    const total = defectiveData.items.reduce((s, b) => s + b.onHandQty, 0);
    const productCount = defectiveData.items.length;
    return { total, productCount };
  }, [defectiveData]);

  // Group by warehouse for good tab
  const goodByWarehouse = useMemo(() => {
    const map = new Map<string, { warehouseName: string; items: InventoryBalance[] }>();
    for (const item of goodItems) {
      if (!map.has(item.warehouseId)) {
        map.set(item.warehouseId, { warehouseName: item.warehouseName, items: [] });
      }
      map.get(item.warehouseId)!.items.push(item);
    }
    return Array.from(map.entries()).map(([, v]) => v);
  }, [goodItems]);

  return (
    <AppLayout>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96) translateY(8px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>

      <div className="min-h-screen p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Kho hàng</h1>
            <p className="text-slate-500 mt-1">Theo dõi tồn kho hàng tốt và hàng lỗi theo thời gian thực.</p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            ↻ Làm mới
          </Button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('good')}
              className={`px-6 py-4 text-sm font-extrabold transition-all border-b-2 ${
                activeTab === 'good'
                  ? 'text-green-600 border-green-600 bg-green-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              ✅ Hàng Tốt ({goodStats.productCount})
            </button>
            <button
              onClick={() => setActiveTab('defective')}
              className={`px-6 py-4 text-sm font-extrabold transition-all border-b-2 ${
                activeTab === 'defective'
                  ? 'text-red-600 border-red-600 bg-red-50/50'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              🏭 Hàng Lỗi ({defStats.productCount})
            </button>
          </div>

          {/* GOOD TAB */}
          {activeTab === 'good' && (
            <div className="p-6 space-y-5">
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  label="Kho"
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                  options={[
                    { value: '', label: 'Tất cả kho' },
                    ...warehouses.map((w: any) => ({ value: w.id, label: w.name })),
                  ]}
                />
                <Button onClick={fetchGood}>Lọc</Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center p-4">
                  <p className="text-2xl font-black text-slate-800">{goodStats.productCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Sản phẩm có tồn</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl font-black text-green-600">{goodStats.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tổng tồn kho</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl font-black text-blue-600">{goodStats.available.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Khả dụng</p>
                </Card>
                <Card className="text-center p-4">
                  <div className="flex flex-col items-center gap-1">
                    {goodStats.outOfStock > 0 && (
                      <p className="text-2xl font-black text-red-500">{goodStats.outOfStock}</p>
                    )}
                    {goodStats.lowStock > 0 && (
                      <p className="text-2xl font-black text-amber-500">{goodStats.lowStock}</p>
                    )}
                    {goodStats.outOfStock === 0 && goodStats.lowStock === 0 && (
                      <p className="text-2xl font-black text-slate-400">0</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">Sắp hết / Hết hàng</p>
                  </div>
                </Card>
              </div>

              {/* Table */}
              {goodLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : goodItems.length === 0 ? (
                <EmptyState icon="🏬" message="Không có dữ liệu tồn kho hàng tốt" />
              ) : (
                <div className="space-y-6">
                  {goodByWarehouse.map(group => (
                    <div key={group.warehouseName} className="border border-slate-200 rounded-2xl overflow-hidden">
                      <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center gap-2">
                        <span className="text-green-600">🏭</span>
                        <span className="font-extrabold text-green-700 text-sm">{group.warehouseName}</span>
                        <span className="ml-auto text-xs text-green-500 font-semibold">{group.items.length} sản phẩm</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">SKU</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Sản phẩm</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Nhóm</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Đơn vị</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Tồn kho</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Khả dụng</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {group.items.map((b, idx) => (
                              <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                                <td className="px-4 py-2.5 font-mono font-medium text-blue-600">{b.productSku}</td>
                                <td className="px-4 py-2.5 font-medium text-slate-800">{b.productName}</td>
                                <td className="px-4 py-2.5"><Badge variant="default">{b.category || '-'}</Badge></td>
                                <td className="px-4 py-2.5 text-center text-slate-600">{b.unit}</td>
                                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{b.onHandQty.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-green-700">{b.availableQty.toLocaleString()}</td>
                                <td className="px-4 py-2.5 text-center">
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
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DEFECTIVE TAB */}
          {activeTab === 'defective' && (
            <div className="p-6 space-y-5">
              {/* Warehouse info */}
              {defectiveData.warehouse && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">🏭</div>
                  <div>
                    <p className="font-extrabold text-red-700">{defectiveData.warehouse.name}</p>
                    <p className="text-xs text-red-400 font-mono mt-0.5">{defectiveData.warehouse.warehouseCode} · {defectiveData.warehouse.location || '—'}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-2xl font-black text-red-600">{defStats.total.toLocaleString()}</p>
                    <p className="text-xs text-red-400">tổng tồn</p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="text-center p-4">
                  <p className="text-2xl font-black text-red-600">{defStats.productCount}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Sản phẩm lỗi</p>
                </Card>
                <Card className="text-center p-4">
                  <p className="text-2xl font-black text-red-600">{defStats.total.toLocaleString()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Tổng số lượng lỗi</p>
                </Card>
              </div>

              {/* Table */}
              {defectiveLoading ? (
                <div className="flex justify-center py-12"><Spinner /></div>
              ) : !defectiveData.items || defectiveData.items.length === 0 ? (
                <EmptyState icon="🏭" message="Kho hàng lỗi hiện đang trống" />
              ) : (
                <div className="border border-red-200 rounded-2xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center gap-2">
                    <span className="text-red-500">🏭</span>
                    <span className="font-extrabold text-red-600 text-sm">Danh sách hàng lỗi</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">SKU</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Sản phẩm</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Nhóm</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Đơn vị</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Tồn kho</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {defectiveData.items.map((b: any, idx: number) => (
                          <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-medium text-red-600">{b.productSku}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{b.productName}</td>
                            <td className="px-4 py-2.5"><Badge variant="default">{b.category || '-'}</Badge></td>
                            <td className="px-4 py-2.5 text-center text-slate-600">{b.unit}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-red-700">{b.onHandQty.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-center">
                              <Badge variant="danger">Hàng lỗi</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-red-50 border-t border-red-100">
                        <tr>
                          <td colSpan={4} className="px-4 py-2.5 text-right font-extrabold text-red-700 text-sm">TỔNG CỘNG:</td>
                          <td className="px-4 py-2.5 text-right font-black text-red-600 text-base">{defStats.total.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Info box */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                <strong>ℹ️ Lưu ý:</strong> Hàng lỗi được chuyển vào đây khi khách từ chối nhận với lý do <strong>"Lỗi do Nhà máy sản xuất"</strong> hoặc <strong>"Hư hỏng do Vận chuyển"</strong>. Hàng trong kho này <strong>không được tính vào tồn kho bán hàng</strong>.
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
