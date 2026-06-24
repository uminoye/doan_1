import { prisma } from '../models/prisma';

export class SalesOrderService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, search, status, customerId, startDate, endDate } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) where.orderDate.gte = new Date(startDate);
      if (endDate) where.orderDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        skip,
        take: limit,
        where,
        include: {
          customer: true,
          createdBy: { include: { role: true } },
          items: { include: { product: true } },
          delivery: true,
          outboundNote: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.salesOrder.count({ where }),
    ]);

    return { data: orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
        delivery: true,
        outboundNote: { include: { items: { include: { product: true } }, warehouse: true } },
      },
    });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    return order;
  }

  async create(data: {
    customerId: string;
    orderDate?: string;
    deliveryDate?: string;
    note?: string;
    createdById: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
  }) {
    const count = await prisma.salesOrder.count();
    const orderNo = `SO${String(count + 1).padStart(6, '0')}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerId: data.customerId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        note: data.note,
        status: 'draft',
        createdById: data.createdById,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice || 0,
          })),
        },
      },
    });

    return this.getById(order.id);
  }

  async update(id: string, data: {
    customerId?: string;
    deliveryDate?: string;
    note?: string;
    items?: { productId: string; quantity: number; unitPrice?: number }[];
  }) {
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'draft') throw new Error('Chỉ có thể sửa đơn ở trạng thái nháp');

    if (data.items) {
      await prisma.salesOrder.update({
        where: { id },
        data: {
          customerId: data.customerId,
          deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
          note: data.note,
          items: {
            deleteMany: {},
            create: data.items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice || 0 })),
          },
        },
      });
    } else {
      await prisma.salesOrder.update({
        where: { id },
        data: { customerId: data.customerId, deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined, note: data.note },
      });
    }

    return this.getById(id);
  }

  async submit(id: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'draft') throw new Error('Chỉ có thể gửi đơn ở trạng thái nháp');
    if (!order.items.length) throw new Error('Đơn hàng phải có ít nhất một sản phẩm');
    await prisma.salesOrder.update({ where: { id }, data: { status: 'submitted' } });
    return this.getById(id);
  }

  async cancel(id: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (['completed', 'cancelled'].includes(order.status)) throw new Error('Không thể hủy đơn ở trạng thái này');
    await prisma.salesOrder.update({ where: { id }, data: { status: 'cancelled' } });
    return { message: 'Hủy đơn hàng thành công' };
  }

  async delete(id: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'draft') throw new Error('Chỉ có thể xóa đơn ở trạng thái nháp');
    await prisma.salesOrder.delete({ where: { id } });
    return { message: 'Xóa đơn hàng thành công' };
  }
}
