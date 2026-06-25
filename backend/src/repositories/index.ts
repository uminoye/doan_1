import { prisma } from '../models/prisma';
import { Prisma } from '@prisma/client';

export class BaseRepository<T> {
  constructor(protected model: any) {}

  async findAll(args?: any) {
    return this.model.findMany(args);
  }

  async findById(id: string, args?: any) {
    return this.model.findUnique({ where: { id }, ...args });
  }

  async create(data: any) {
    return this.model.create({ data });
  }

  async update(id: string, data: any) {
    return this.model.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.model.delete({ where: { id } });
  }

  async findFirst(args: any) {
    return this.model.findFirst(args);
  }
}

// ===== Role =====
export const roleRepository = new BaseRepository(prisma.role);

// ===== User =====
export const userRepository = new BaseRepository(prisma.user);

export const userRepo = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  },
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  },
  async findAll(args?: any) {
    return prisma.user.findMany({
      ...args,
      include: { role: true },
    });
  },
  async count(args?: any) {
    return prisma.user.count(args);
  },
};

// ===== Customer =====
export const customerRepo = {
  async findAll(args?: any) {
    return prisma.customer.findMany({ ...args, orderBy: { createdAt: 'desc' } });
  },
  async findById(id: string) {
    return prisma.customer.findUnique({ where: { id } });
  },
  async findByCode(code: string) {
    return prisma.customer.findUnique({ where: { customerCode: code } });
  },
  async create(data: any) {
    return prisma.customer.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.customer.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.customer.delete({ where: { id } });
  },
  async count(args?: any) {
    return prisma.customer.count(args);
  },
};

// ===== Warehouse =====
export const warehouseRepo = {
  async findAll() {
    return prisma.warehouse.findMany({ orderBy: { createdAt: 'desc' } });
  },
  async findById(id: string) {
    return prisma.warehouse.findUnique({ where: { id } });
  },
  async findByCode(code: string) {
    return prisma.warehouse.findUnique({ where: { warehouseCode: code } });
  },
  async create(data: any) {
    return prisma.warehouse.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.warehouse.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.warehouse.delete({ where: { id } });
  },
};

// ===== Category =====
export const categoryRepo = {
  async findAll() {
    return prisma.category.findMany({ orderBy: { createdAt: 'desc' } });
  },
  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  },
  async findByCode(code: string) {
    return prisma.category.findUnique({ where: { categoryCode: code } });
  },
  async create(data: any) {
    return prisma.category.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.category.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  },
  async count() {
    return prisma.category.count();
  },
};

// ===== Product =====
export const productRepo = {
  async findAll(args?: any) {
    return prisma.product.findMany({ ...args, orderBy: { createdAt: 'desc' } });
  },
  async findById(id: string) {
    return prisma.product.findUnique({ where: { id } });
  },
  async findBySku(sku: string) {
    return prisma.product.findUnique({ where: { sku } });
  },
  async create(data: any) {
    return prisma.product.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.product.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },
  async count(args?: any) {
    return prisma.product.count(args);
  },
  async findAllWithStock(args?: any) {
    return prisma.product.findMany({
      ...args,
      include: { inventoryBalances: { include: { warehouse: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },
};

// ===== Production Receipt =====
export const productionReceiptRepo = {
  async findAll(args?: any) {
    return prisma.productionReceipt.findMany({
      ...args,
      include: {
        warehouse: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  async findById(id: string) {
    return prisma.productionReceipt.findUnique({
      where: { id },
      include: {
        warehouse: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
    });
  },
  async create(data: any) {
    return prisma.productionReceipt.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.productionReceipt.update({ where: { id }, data });
  },
  async delete(id: string) {
    return prisma.productionReceipt.delete({ where: { id } });
  },
  async count(args?: any) {
    return prisma.productionReceipt.count(args);
  },
};

// ===== Sales Order =====
export const salesOrderRepo = {
  async findAll(args?: any) {
    return prisma.salesOrder.findMany({
      ...args,
      include: {
        customer: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
        delivery: true,
        outboundNote: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  async findById(id: string) {
    return prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
        delivery: true,
        outboundNote: { include: { items: { include: { product: true } }, warehouse: true } },
      },
    });
  },
  async create(data: any) {
    return prisma.salesOrder.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.salesOrder.update({ where: { id }, data });
  },
  async count(args?: any) {
    return prisma.salesOrder.count(args);
  },
};

// ===== Delivery Request =====
export const deliveryRequestRepo = {
  async findAll(args?: any) {
    return prisma.deliveryRequest.findMany({
      ...args,
      include: {
        salesOrder: {
          include: {
            customer: true,
            createdBy: { include: { role: true } },
            items: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  async findById(id: string) {
    return prisma.deliveryRequest.findUnique({
      where: { id },
      include: {
        salesOrder: {
          include: {
            customer: true,
            createdBy: { include: { role: true } },
            items: { include: { product: true } },
          },
        },
      },
    });
  },
  async upsert(salesOrderId: string, data: any) {
    return prisma.deliveryRequest.upsert({
      where: { salesOrderId },
      update: data,
      create: { salesOrderId, ...data },
    });
  },
};

// ===== Stock Outbound Note =====
export const stockOutboundRepo = {
  async findAll(args?: any) {
    return prisma.stockOutboundNote.findMany({
      ...args,
      include: {
        warehouse: true,
        salesOrder: { include: { customer: true } },
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  async findById(id: string) {
    return prisma.stockOutboundNote.findUnique({
      where: { id },
      include: {
        warehouse: true,
        salesOrder: { include: { customer: true } },
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
    });
  },
  async create(data: any) {
    return prisma.stockOutboundNote.create({ data });
  },
  async update(id: string, data: any) {
    return prisma.stockOutboundNote.update({ where: { id }, data });
  },
  async count(args?: any) {
    return prisma.stockOutboundNote.count(args);
  },
};

// ===== Inventory =====
export const inventoryRepo = {
  async getBalance(warehouseId: string, productId: string) {
    return prisma.inventoryBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });
  },

  async upsertBalance(warehouseId: string, productId: string, onHandQty: number) {
    return prisma.inventoryBalance.upsert({
      where: { warehouseId_productId: { warehouseId, productId } },
      update: { onHandQty },
      create: { warehouseId, productId, onHandQty },
    });
  },

  async addBalance(warehouseId: string, productId: string, qty: number) {
    const current = await this.getBalance(warehouseId, productId);
    if (current) {
      return prisma.inventoryBalance.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { onHandQty: current.onHandQty + qty },
      });
    } else {
      return this.upsertBalance(warehouseId, productId, qty);
    }
  },

  async subtractBalance(warehouseId: string, productId: string, qty: number) {
    const current = await this.getBalance(warehouseId, productId);
    if (current) {
      return prisma.inventoryBalance.update({
        where: { warehouseId_productId: { warehouseId, productId } },
        data: { onHandQty: Math.max(0, current.onHandQty - qty) },
      });
    }
  },

  async getAllBalances(args?: any) {
    return prisma.inventoryBalance.findMany({
      ...args,
      include: { warehouse: true, product: true },
    });
  },

  async getTransactions(args?: any) {
    return prisma.inventoryTransaction.findMany({
      ...args,
      include: { warehouse: true, product: true },
      orderBy: { transactionDate: 'desc' },
    });
  },

  async createTransaction(data: any) {
    return prisma.inventoryTransaction.create({ data });
  },
};
