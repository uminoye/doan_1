'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, Modal, Pagination, EmptyState, Spinner, ProductCard } from '@/components/ui/Misc';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { productService, warehouseService, categoryService } from '@/services';
import { Product, Warehouse, Category } from '@/types';

// ============ STOCK FILTER ============
type StockFilter = 'all' | 'low' | 'out';

const STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'low', label: 'Sắp hết' },
  { value: 'out', label: 'Hết hàng' },
];

// ============ PRODUCT FORM ============
interface ProductForm {
  sku: string;
  name: string;
  unit: string;
  category: string;
  imageUrl: string;
  salePrice: string;
  minStock: string;
  stockDistribution: Record<string, string>; // warehouseId -> qty string
  stockMode: 'all' | 'per_warehouse'; // 'all' = rải đầu tất cả kho
}

const defaultProductForm = (warehouses: Warehouse[]): ProductForm => ({
  sku: '',
  name: '',
  unit: 'cái',
  category: '',
  imageUrl: '',
  salePrice: '',
  minStock: '0',
  stockDistribution: Object.fromEntries(warehouses.map(w => [w.id, ''])),
  stockMode: 'all',
});

// ============ WAREHOUSE FORM ============
interface WarehouseForm {
  warehouseCode: string;
  name: string;
  location: string;
}

// ============ CATEGORY FORM ============
interface CategoryForm {
  categoryCode: string;
  name: string;
}

// ============ PAGE ============
export default function ProductsPage() {
  // --- Data ---
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // --- Filters ---
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // --- Modals ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productError, setProductError] = useState('');

  const [productForm, setProductForm] = useState<ProductForm>(defaultProductForm(warehouses));

  const [warehouseForm, setWarehouseForm] = useState<WarehouseForm>({ warehouseCode: '', name: '', location: '' });
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [warehouseError, setWarehouseError] = useState('');

  const [categoryForm, setCategoryForm] = useState<CategoryForm>({ categoryCode: '', name: '' });
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load warehouses once
  const loadWarehouses = useCallback(async () => {
    try {
      const res = await warehouseService.getAll();
      setWarehouses(res.data);
    } catch {}
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await categoryService.getAll();
      setCategories(res.data.map((c: Category) => c.name));
    } catch {}
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (stockFilter !== 'all') params.stockStatus = stockFilter;
      if (warehouseFilter) params.warehouseId = warehouseFilter;
      const res = await productService.getAll(params);
      setProducts(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
    } catch {}
    finally { setLoading(false); }
  }, [page, debouncedSearch, stockFilter, warehouseFilter]);

  useEffect(() => { loadWarehouses(); loadCategories(); }, [loadWarehouses, loadCategories]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Reset product form when warehouses change
  useEffect(() => {
    if (!showProductModal) return;
    setProductForm(prev => {
      if (Object.keys(prev.stockDistribution).length === warehouses.length) return prev;
      return {
        ...prev,
        stockDistribution: Object.fromEntries(warehouses.map(w => [w.id, prev.stockDistribution[w.id] ?? ''])),
      };
    });
  }, [warehouses, showProductModal]);

  const hasActiveFilters = debouncedSearch || stockFilter !== 'all' || warehouseFilter;

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStockFilter('all');
    setWarehouseFilter('');
    setPage(1);
  };

  // ---- Open modals ----
  const openCreateProduct = () => {
    setEditProduct(null);
    setProductForm(defaultProductForm(warehouses));
    setProductError('');
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditProduct(p);
    const dist: Record<string, string> = {};
    warehouses.forEach(w => {
      dist[w.id] = String(p.stockByWarehouse?.[w.id]?.onHandQty ?? '');
    });
    setProductForm({
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      category: p.category || '',
      imageUrl: p.imageUrl || '',
      salePrice: String(p.salePrice),
      minStock: String(p.minStock),
      stockDistribution: dist,
      stockMode: 'per_warehouse',
    });
    setProductError('');
    setShowProductModal(true);
  };

  const openCreateWarehouse = () => {
    setWarehouseForm({ warehouseCode: '', name: '', location: '' });
    setWarehouseError('');
    setShowWarehouseModal(true);
  };

  const openCreateCategory = () => {
    setCategoryForm({ categoryCode: '', name: '' });
    setCategoryError('');
    setShowCategoryModal(true);
  };

  // ---- Save product ----
  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) { setProductError('Tên sản phẩm không được để trống'); return; }
    if (!productForm.unit.trim()) { setProductError('Đơn vị không được để trống'); return; }
    setSavingProduct(true);
    setProductError('');
    try {
      const stockDist: Record<string, number> = {};
      if (productForm.stockMode === 'per_warehouse') {
        for (const [wid, qty] of Object.entries(productForm.stockDistribution)) {
          const n = parseInt(qty);
          if (!isNaN(n) && n > 0) stockDist[wid] = n;
        }
      }

      const payload: any = {
        name: productForm.name,
        unit: productForm.unit,
        category: productForm.category || undefined,
        imageUrl: productForm.imageUrl || undefined,
        salePrice: parseFloat(productForm.salePrice) || 0,
        minStock: parseInt(productForm.minStock) || 0,
        stockDistribution: stockDist,
      };
      if (!editProduct && !productForm.sku) {
        // auto SKU
      } else if (productForm.sku) {
        payload.sku = productForm.sku;
      }

      if (editProduct) {
        await productService.update(editProduct.id, {
          name: payload.name,
          unit: payload.unit,
          category: payload.category,
          imageUrl: payload.imageUrl,
          salePrice: payload.salePrice,
          minStock: payload.minStock,
        });
      } else {
        await productService.create(payload);
      }
      setShowProductModal(false);
      loadProducts();
    } catch (e: any) {
      setProductError(e.response?.data?.error || e.message || 'Lỗi lưu dữ liệu');
    } finally {
      setSavingProduct(false);
    }
  };

  // ---- Save warehouse ----
  const handleSaveWarehouse = async () => {
    if (!warehouseForm.name.trim()) { setWarehouseError('Tên kho không được để trống'); return; }
    setSavingWarehouse(true);
    setWarehouseError('');
    try {
      await warehouseService.create({
        name: warehouseForm.name,
        location: warehouseForm.location || undefined,
      });
      setShowWarehouseModal(false);
      await loadWarehouses();
    } catch (e: any) {
      setWarehouseError(e.response?.data?.error || e.message || 'Lỗi lưu kho');
    } finally {
      setSavingWarehouse(false);
    }
  };

  // ---- Save category ----
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) { setCategoryError('Tên danh mục không được để trống'); return; }
    setSavingCategory(true);
    setCategoryError('');
    try {
      await categoryService.create({
        categoryCode: categoryForm.categoryCode || undefined,
        name: categoryForm.name,
      });
      setShowCategoryModal(false);
      await loadCategories();
    } catch (e: any) {
      setCategoryError(e.response?.data?.error || e.message || 'Lỗi lưu danh mục');
    } finally {
      setSavingCategory(false);
    }
  };

  // ---- Delete product ----
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await productService.delete(id);
      loadProducts();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Lỗi xóa dữ liệu');
    }
  };

  // ---- Warehouse filter options ----
  const warehouseFilterOptions = useMemo(() => [
    { value: '', label: 'Tất cả kho' },
    ...warehouses.map(w => ({ value: w.id, label: w.name })),
  ], [warehouses]);

  // ---- Category options ----
  const categoryOptions = useMemo(() => [
    { value: '', label: '— Chọn danh mục —' },
    ...categories.map(c => ({ value: c, label: c })),
  ], [categories]);

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Quản lý Sản phẩm</h1>
            <p className="text-sm text-gray-500 mt-1">Danh mục sản phẩm trong hệ thống</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openCreateWarehouse}>+ Thêm kho</Button>
            <Button variant="outline" size="sm" onClick={openCreateCategory}>+ Thêm danh mục</Button>
            <Button onClick={openCreateProduct}>+ Thêm sản phẩm</Button>
          </div>
        </div>

        {/* ===== FILTER BAR ===== */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, mã SKU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Stock filter */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {STOCK_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setStockFilter(opt.value as StockFilter); setPage(1); }}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    stockFilter === opt.value
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Warehouse filter */}
            <Select
              options={warehouseFilterOptions}
              value={warehouseFilter}
              onChange={e => { setWarehouseFilter(e.target.value); setPage(1); }}
              className="min-w-[160px]"
            />

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
              >
                ✕ Xóa lọc
              </button>
            )}
          </div>
        </Card>

        {/* ===== PRODUCT GRID ===== */}
        <Card className="p-5">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : !products.length ? (
            <EmptyState icon="📦" message="Không tìm thấy sản phẩm nào" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onEdit={openEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ))}
              </div>
              {total > 0 && (
                <div className="mt-5">
                  <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ===== MODAL: THÊM / SỬA SẢN PHẨM ===== */}
      <Modal
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        size="lg"
      >
        <div className="space-y-5">
          {productError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{productError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Mã SKU"
              value={productForm.sku}
              onChange={e => setProductForm({ ...productForm, sku: e.target.value })}
              placeholder="Tự động tạo nếu để trống"
              disabled={!!editProduct}
              helper={!editProduct ? 'Để trống để tự động tạo mã' : ''}
            />
            <Input
              label="Tên sản phẩm"
              value={productForm.name}
              onChange={e => setProductForm({ ...productForm, name: e.target.value })}
              placeholder="VD: Bàn ghế văn phòng"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Danh mục"
              options={categoryOptions}
              value={productForm.category}
              onChange={e => setProductForm({ ...productForm, category: e.target.value })}
            />
            <Input
              label="Đơn vị"
              value={productForm.unit}
              onChange={e => setProductForm({ ...productForm, unit: e.target.value })}
              placeholder="VD: cái, bộ, hộp"
              required
            />
          </div>

          <Input
            label="Ảnh sản phẩm"
            value={productForm.imageUrl}
            onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })}
            placeholder="https://..."
            helper="Nhập URL hình ảnh sản phẩm"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Đơn giá (VNĐ)"
              type="number"
              value={productForm.salePrice}
              onChange={e => setProductForm({ ...productForm, salePrice: e.target.value })}
              placeholder="0"
            />
            <Input
              label="Tồn tối thiểu"
              type="number"
              value={productForm.minStock}
              onChange={e => setProductForm({ ...productForm, minStock: e.target.value })}
              placeholder="0"
              helper="Ít hơn sẽ báo động thiếu tồn"
            />
          </div>

          {/* Stock distribution */}
          {warehouses.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Phân bổ tồn kho ban đầu</p>
              <div className="space-y-2">
                {/* Stock mode toggle */}
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="stockMode"
                      checked={productForm.stockMode === 'all'}
                      onChange={() => setProductForm({ ...productForm, stockMode: 'all' })}
                      className="accent-blue-600"
                    />
                    Rải đầu tất cả kho
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="stockMode"
                      checked={productForm.stockMode === 'per_warehouse'}
                      onChange={() => setProductForm({ ...productForm, stockMode: 'per_warehouse' })}
                      className="accent-blue-600"
                    />
                    Cho mỗi kho
                  </label>
                </div>

                {productForm.stockMode === 'per_warehouse' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {warehouses.map(w => (
                      <div key={w.id} className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 w-32 truncate">{w.name}</label>
                        <input
                          type="number"
                          min="0"
                          value={productForm.stockDistribution[w.id] || ''}
                          onChange={e => setProductForm({
                            ...productForm,
                            stockDistribution: { ...productForm.stockDistribution, [w.id]: e.target.value },
                          })}
                          placeholder="0"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sản phẩm sẽ được phân bổ tồn kho khi nhập kho</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowProductModal(false)}>Hủy</Button>
            <Button onClick={handleSaveProduct} loading={savingProduct}>
              {editProduct ? 'Lưu thay đổi' : 'Thêm mới'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: THÊM KHO ===== */}
      <Modal open={showWarehouseModal} onClose={() => setShowWarehouseModal(false)} title="Thêm kho" size="md">
        <div className="space-y-4">
          {warehouseError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{warehouseError}</div>
          )}
          <Input
            label="Mã kho"
            value={warehouseForm.warehouseCode}
            onChange={e => setWarehouseForm({ ...warehouseForm, warehouseCode: e.target.value })}
            placeholder="Tự động tạo nếu để trống"
            helper="VD: KHO001"
          />
          <Input
            label="Tên kho"
            value={warehouseForm.name}
            onChange={e => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
            placeholder="VD: Kho Hà Nội"
            required
          />
          <Input
            label="Vị trí, địa chỉ kho"
            value={warehouseForm.location}
            onChange={e => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
            placeholder="VD: Quận Bắc Từ Liêm, Hà Nội"
          />
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowWarehouseModal(false)}>Hủy</Button>
            <Button onClick={handleSaveWarehouse} loading={savingWarehouse}>Thêm mới</Button>
          </div>
        </div>
      </Modal>

      {/* ===== MODAL: THÊM DANH MỤC ===== */}
      <Modal open={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Thêm danh mục" size="sm">
        <div className="space-y-4">
          {categoryError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{categoryError}</div>
          )}
          <Input
            label="Mã danh mục"
            value={categoryForm.categoryCode}
            onChange={e => setCategoryForm({ ...categoryForm, categoryCode: e.target.value })}
            placeholder="Tự động tạo nếu để trống"
            helper="VD: DM001"
          />
          <Input
            label="Tên danh mục"
            value={categoryForm.name}
            onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
            placeholder="VD: Nội thất"
            required
          />
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Hủy</Button>
            <Button onClick={handleSaveCategory} loading={savingCategory}>Thêm mới</Button>
          </div>
        </div>
      </Modal>

    </AppLayout>
  );
}
