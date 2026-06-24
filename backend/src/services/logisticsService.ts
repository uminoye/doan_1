import { prisma } from '../models/prisma';

export class LogisticsService {
  async getAll(params?: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const requests = await prisma.deliveryRequest.findMany({
      skip,
      take: limit,
      where,
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

    const total = await prisma.deliveryRequest.count({ where });

    return {
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async receiveOrder(salesOrderId: string, receivedBy: string, note?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'submitted') throw new Error('Đơn hàng phải ở trạng thái đã gửi (submitted)');
    if (order.delivery) throw new Error('Đơn đã được logistics tiếp nhận');

    await prisma.deliveryRequest.create({
      data: {
        salesOrderId,
        receivedBy,
        receivedAt: new Date(),
        note,
        status: 'received',
      },
    });

    await prisma.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'logistics_received' } });
    return prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
        delivery: true,
        outboundNote: true,
      },
    });
  }

  async forwardToWarehouse(salesOrderId: string, note?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'logistics_received') throw new Error('Đơn phải ở trạng thái logistics đã tiếp nhận');

    if (order.delivery) {
      await prisma.deliveryRequest.update({
        where: { salesOrderId },
        data: { status: 'forwarded', note: note || order.delivery.note || undefined },
      });
    }

    await prisma.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'warehouse_processing' } });
    return prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: {
        customer: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
        delivery: true,
        outboundNote: true,
      },
    });
  }

  async rejectOrder(salesOrderId: string, note: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (!['submitted', 'logistics_received'].includes(order.status)) {
      throw new Error('Không thể từ chối đơn ở trạng thái này');
    }
    await prisma.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'cancelled' } });
    if (order.delivery) {
      await prisma.deliveryRequest.update({
        where: { salesOrderId },
        data: { status: 'cancelled', note },
      });
    }
    return { message: 'Đã từ chối đơn hàng' };
  }

  async getById(id: string) {
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
  }
}
