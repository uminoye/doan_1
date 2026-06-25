import { prisma } from '../models/prisma';
import { productRepo, inventoryRepo, warehouseRepo } from '../repositories';

export class ProductService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    warehouseId?: string;
    stockStatus?: 'all' | 'low' | 'out';
  }) {
    const { page = 1, limit = 20, search, category, warehouseId, stockStatus } = params || {};
    const skip = (page - 1) * limit;

    // Lấy tất cả warehouse để map
    const warehouses = await warehouseRepo.findAll();
    const warehouseMap: Record<string, any> = {};
    warehouses.forEach((w: any) => { warehouseMap[w.id] = w; });

    // Lấy products với inventory
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      productRepo.findAllWithStock({ skip, take: limit, where }),
      productRepo.count({ where }),
    ]);

    // Enrich with stock per warehouse
    let enriched = products.map((p: any) => {
      const stockByWarehouse: Record<string, any> = {};
      let totalOnHand = 0;
      let totalReserved = 0;

      for (const bal of p.inventoryBalances || []) {
        stockByWarehouse[bal.warehouseId] = {
          warehouseId: bal.warehouseId,
          warehouseName: bal.warehouse?.name || '',
          warehouseCode: bal.warehouse?.warehouseCode || '',
          onHandQty: bal.onHandQty,
          reservedQty: bal.reservedQty,
          availableQty: Math.max(0, bal.onHandQty - bal.reservedQty),
        };
        totalOnHand += bal.onHandQty;
        totalReserved += bal.reservedQty;
      }

      return {
        ...p,
        inventoryBalances: undefined,
        stockByWarehouse,
        totalOnHand,
        totalReserved,
        totalAvailable: Math.max(0, totalOnHand - totalReserved),
        isLowStock: totalOnHand > 0 && totalOnHand <= (p.minStock || 0),
        isOutOfStock: totalOnHand === 0,
      };
    });

    // Lọc theo warehouse + stock status
    if (warehouseId) {
      enriched = enriched.filter((p: any) => {
        const stock = p.stockByWarehouse[warehouseId];
        return stock && stock.onHandQty > 0;
      });
    }

    if (stockStatus === 'low') {
      enriched = enriched.filter((p: any) => p.isLowStock);
    } else if (stockStatus === 'out') {
      enriched = enriched.filter((p: any) => p.isOutOfStock);
    }

    return {
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const product = await productRepo.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    return product;
  }

  async create(data: {
    sku?: string;
    name: string;
    unit?: string;
    category?: string;
    imageUrl?: string;
    salePrice?: number;
    minStock?: number;
    stockDistribution?: Record<string, number>; // warehouseId -> qty
  }) {
    let sku = data.sku;
    if (!sku) {
      const count = await productRepo.count();
      sku = `SP${String(count + 1).padStart(4, '0')}`;
    }
    const existing = await productRepo.findBySku(sku);
    if (existing) throw new Error('Mã SKU đã tồn tại');

    const product = await productRepo.create({
      sku,
      name: data.name,
      unit: data.unit || 'cái',
      category: data.category || null,
      imageUrl: data.imageUrl || null,
      salePrice: data.salePrice || 0,
      minStock: data.minStock || 0,
    });

    // Tạo inventory balances cho từng kho
    if (data.stockDistribution) {
      for (const [warehouseId, qty] of Object.entries(data.stockDistribution)) {
        await inventoryRepo.upsertBalance(warehouseId, product.id, qty as number);
        if ((qty as number) > 0) {
          await inventoryRepo.createTransaction({
            warehouseId,
            productId: product.id,
            transactionType: 'IN',
            quantity: qty as number,
            referenceType: 'production_receipt',
            referenceId: product.id,
            note: 'Tạo sản phẩm ban đầu',
          });
        }
      }
    }

    return product;
  }

  async update(id: string, data: Partial<{
    name: string;
    unit: string;
    category: string;
    imageUrl: string;
    salePrice: number;
    minStock: number;
  }>, stockDistribution?: Record<string, number>) {
    const product = await productRepo.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    const updated = await productRepo.update(id, data);

    if (stockDistribution) {
      // Cập nhật tồn kho cho từng kho — xóa cũ rồi tạo mới
      const existing = await inventoryRepo.getAllBalances({
        where: { productId: id },
      });
      for (const bal of existing as any[]) {
        await prisma.inventoryBalance.delete({
          where: { warehouseId_productId: { warehouseId: bal.warehouseId, productId: id } },
        });
      }
      for (const [warehouseId, qty] of Object.entries(stockDistribution)) {
        await inventoryRepo.upsertBalance(warehouseId, id, qty as number);
      }
    }

    return updated;
  }

  async delete(id: string) {
    const product = await productRepo.findById(id);
    if (!product) throw new Error('Không tìm thấy sản phẩm');

    await prisma.$transaction([
      prisma.inventoryTransaction.deleteMany({ where: { productId: id } }),
      prisma.inventoryBalance.deleteMany({ where: { productId: id } }),
      prisma.stockOutboundItem.deleteMany({ where: { productId: id } }),
      prisma.salesOrderItem.deleteMany({ where: { productId: id } }),
      prisma.productionReceiptItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return { message: 'Xóa sản phẩm thành công' };
  }

  async getCategories() {
    return productRepo.findAll({ select: { category: true } });
  }
}
