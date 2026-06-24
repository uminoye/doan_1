import { prisma } from '../models/prisma';

export class ReportService {
  async getInventoryReport(params?: { warehouseId?: string; productId?: string }) {
    const { warehouseId, productId } = params || {};

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const balances = await prisma.inventoryBalance.findMany({
      where,
      include: { warehouse: true, product: true },
    });

    return balances.map(b => ({
      warehouseId: b.warehouseId,
      warehouseName: b.warehouse.name,
      warehouseCode: b.warehouse.warehouseCode,
      productId: b.productId,
      productSku: b.product.sku,
      productName: b.product.name,
      unit: b.product.unit,
      category: b.product.category,
      onHandQty: b.onHandQty,
      reservedQty: b.reservedQty,
      availableQty: b.onHandQty - b.reservedQty,
    }));
  }

  async getInboundReport(params?: { startDate?: string; endDate?: string; warehouseId?: string; productId?: string }) {
    const { startDate, endDate, warehouseId, productId } = params || {};

    const where: any = { transactionType: 'IN' };
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate + 'T23:59:59');
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where,
      include: { warehouse: true, product: true },
      orderBy: { transactionDate: 'desc' },
    });

    const productMap = new Map<string, any>();
    for (const t of transactions) {
      const key = t.productId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: t.productId,
          productSku: t.product.sku,
          productName: t.product.name,
          unit: t.product.unit,
          category: t.product.category,
          warehouseId: t.warehouseId,
          warehouseName: t.warehouse.name,
          totalIn: 0,
          transactions: [] as any[],
        });
      }
      const entry = productMap.get(key);
      entry.totalIn += t.quantity;
      entry.transactions.push({ date: t.transactionDate, quantity: t.quantity, referenceType: t.referenceType, referenceId: t.referenceId });
    }

    return Array.from(productMap.values()).map(p => ({ ...p, transactionCount: p.transactions.length }));
  }

  async getOutboundReport(params?: { startDate?: string; endDate?: string; warehouseId?: string; customerId?: string }) {
    const { startDate, endDate, warehouseId, customerId } = params || {};

    const where: any = { status: 'confirmed' };
    if (startDate || endDate) {
      where.exportDate = {};
      if (startDate) where.exportDate.gte = new Date(startDate);
      if (endDate) where.exportDate.lte = new Date(endDate + 'T23:59:59');
    }
    if (warehouseId) where.warehouseId = warehouseId;

    let notes = await prisma.stockOutboundNote.findMany({
      where,
      include: {
        warehouse: true,
        salesOrder: { include: { customer: true } },
        items: { include: { product: true } },
      },
      orderBy: { exportDate: 'desc' },
    });

    if (customerId) {
      notes = notes.filter(n => n.salesOrder.customerId === customerId);
    }

    return notes.map(n => ({
      noteId: n.id,
      noteNo: n.noteNo,
      exportDate: n.exportDate,
      warehouseId: n.warehouseId,
      warehouseName: n.warehouse.name,
      customerId: n.salesOrder.customerId,
      customerName: n.salesOrder.customer.name,
      customerCode: n.salesOrder.customer.customerCode,
      totalQuantity: n.items.reduce((s, i) => s + i.quantity, 0),
      items: n.items.map(i => ({
        productId: i.productId,
        productSku: i.product.sku,
        productName: i.product.name,
        unit: i.product.unit,
        quantity: i.quantity,
      })),
    }));
  }

  async getTransactionHistory(params?: {
    page?: number;
    limit?: number;
    warehouseId?: string;
    productId?: string;
    transactionType?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 50, warehouseId, productId, transactionType, startDate, endDate } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        skip,
        take: limit,
        where,
        include: { warehouse: true, product: true },
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      data: transactions.map(t => ({
        id: t.id,
        date: t.transactionDate,
        warehouseId: t.warehouseId,
        warehouseName: t.warehouse.name,
        productId: t.productId,
        productSku: t.product.sku,
        productName: t.product.name,
        type: t.transactionType,
        quantity: t.quantity,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        note: t.note,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDashboardStats() {
    const [
      totalProducts, totalCustomers, totalWarehouses, totalOrders,
      pendingOrders, completedOrders,
      totalInbound, totalOutbound, totalBalance,
      recentOrders, recentInbound,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.warehouse.count(),
      prisma.salesOrder.count(),
      prisma.salesOrder.count({ where: { status: { in: ['draft', 'submitted', 'logistics_received', 'warehouse_processing'] } } }),
      prisma.salesOrder.count({ where: { status: 'completed' } }),
      prisma.inventoryTransaction.aggregate({ where: { transactionType: 'IN' }, _sum: { quantity: true } }),
      prisma.inventoryTransaction.aggregate({ where: { transactionType: 'OUT' }, _sum: { quantity: true } }),
      prisma.inventoryBalance.aggregate({ _sum: { onHandQty: true } }),
      prisma.salesOrder.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: true, createdBy: true } }),
      prisma.productionReceipt.findMany({
        where: { status: 'confirmed' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { warehouse: true, items: { include: { product: true } } },
      }),
    ]);

    return {
      totals: {
        products: totalProducts,
        customers: totalCustomers,
        warehouses: totalWarehouses,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalInbound: totalInbound._sum.quantity || 0,
        totalOutbound: totalOutbound._sum.quantity || 0,
        totalBalance: totalBalance._sum.onHandQty || 0,
      },
      recentOrders: recentOrders.map(o => ({
        id: o.id, orderNo: o.orderNo, customerName: o.customer.name,
        status: o.status, orderDate: o.orderDate, createdBy: o.createdBy.fullName,
      })),
      recentInbound: recentInbound.map(r => ({
        id: r.id, receiptNo: r.receiptNo, warehouseName: r.warehouse.name,
        totalItems: r.items.reduce((s, i) => s + i.quantity, 0), receiptDate: r.receiptDate,
      })),
    };
  }
}
