import { prisma } from '../models/prisma';

export class CustomerService {
  async getAll(params?: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { customerCode: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ skip, take: limit, where, orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ]);

    return { data: customers, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    return customer;
  }

  async create(data: { customerCode: string; name: string; phone?: string; address?: string; contactPerson?: string }) {
    const existing = await prisma.customer.findUnique({ where: { customerCode: data.customerCode } });
    if (existing) throw new Error('Mã khách hàng đã tồn tại');
    return prisma.customer.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; phone: string; address: string; contactPerson: string }>) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    return prisma.customer.update({ where: { id }, data });
  }

  async delete(id: string) {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    await prisma.customer.delete({ where: { id } });
    return { message: 'Xóa khách hàng thành công' };
  }
}

export class WarehouseService {
  async getAll() {
    return prisma.warehouse.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new Error('Không tìm thấy kho');
    return warehouse;
  }

  async create(data: { warehouseCode: string; name: string; location?: string }) {
    const existing = await prisma.warehouse.findUnique({ where: { warehouseCode: data.warehouseCode } });
    if (existing) throw new Error('Mã kho đã tồn tại');
    return prisma.warehouse.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; location: string }>) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new Error('Không tìm thấy kho');
    return prisma.warehouse.update({ where: { id }, data });
  }

  async delete(id: string) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) throw new Error('Không tìm thấy kho');
    await prisma.warehouse.delete({ where: { id } });
    return { message: 'Xóa kho thành công' };
  }
}

export class ProductService {
  async getAll(params?: { page?: number; limit?: number; search?: string; category?: string }) {
    const { page = 1, limit = 20, search, category } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;

    const [products, total] = await Promise.all([
      prisma.product.findMany({ skip, take: limit, where, orderBy: { createdAt: 'desc' } }),
      prisma.product.count({ where }),
    ]);

    return { data: products, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    return product;
  }

  async create(data: { sku: string; name: string; unit?: string; category?: string; salePrice?: number }) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new Error('Mã SKU đã tồn tại');
    return prisma.product.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; unit: string; category: string; salePrice: number }>) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    return prisma.product.update({ where: { id }, data });
  }

  async delete(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new Error('Không tìm thấy sản phẩm');
    await prisma.product.delete({ where: { id } });
    return { message: 'Xóa sản phẩm thành công' };
  }

  async getCategories() {
    const products = await prisma.product.findMany({ select: { category: true } });
    return [...new Set(products.map(p => p.category).filter(Boolean))];
  }
}
