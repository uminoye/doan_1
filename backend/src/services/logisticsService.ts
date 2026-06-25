import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';

export class LogisticsService {
  async getAll(params?: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.deliveryRequest.findMany({
        skip,
        take: limit,
        where,
        include: {
          salesOrder: {
            include: {
              customer: true,
              createdBy: { include: { role: true } },
              items: { include: { product: true } },
              outboundNote: { include: { warehouse: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deliveryRequest.count({ where }),
    ]);

    return { data: requests, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const req = await prisma.deliveryRequest.findUnique({
      where: { id },
      include: {
        salesOrder: {
          include: {
            customer: true,
            createdBy: { include: { role: true } },
            items: { include: { product: true } },
            outboundNote: { include: { warehouse: true } },
          },
        },
      },
    });
    if (!req) throw new AppError(404, 'Không tìm thấy yêu cầu giao hàng');
    return req;
  }

  /** Logistics tiếp nhận đơn (chuyển submitted → pending) */
  async receiveOrder(salesOrderId: string, note?: string, userName?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'pending') {
      throw new AppError(400, 'Đơn hàng phải ở trạng thái pending (đã gửi)');
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.deliveryRequest.findUnique({ where: { salesOrderId } });
      if (existing) {
        await tx.deliveryRequest.update({
          where: { salesOrderId },
          data: { status: 'received', note, receivedBy: userName, receivedAt: new Date() },
        });
      } else {
        await tx.deliveryRequest.create({
          data: {
            salesOrderId,
            receivedBy: userName,
            receivedAt: new Date(),
            note,
            status: 'received',
          },
        });
      }

      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'pending' },
      });
    });

    return this.getDeliveryRequestByOrderId(salesOrderId);
  }

  /** Logistics chuyển đơn xuống kho */
  async forwardToWarehouse(salesOrderId: string, note?: string, userName?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'pending') {
      throw new AppError(400, 'Đơn phải ở trạng thái pending');
    }

    await prisma.$transaction(async (tx) => {
      await tx.deliveryRequest.upsert({
        where: { salesOrderId },
        create: {
          salesOrderId,
          receivedBy: userName,
          receivedAt: new Date(),
          note,
          status: 'warehouse_processing',
        },
        update: {
          status: 'warehouse_processing',
          note,
          receivedAt: new Date(),
        },
      });

      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'warehouse_processing' },
      });
    });

    return this.getDeliveryRequestByOrderId(salesOrderId);
  }

  /** Logistics từ chối đơn */
  async rejectOrder(salesOrderId: string, reason: string, userName?: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    await prisma.$transaction(async (tx) => {
      await tx.deliveryRequest.upsert({
        where: { salesOrderId },
        create: {
          salesOrderId,
          receivedBy: userName,
          receivedAt: new Date(),
          note: `[TỪ CHỐI]: ${reason}`,
          status: 'returned',
        },
        update: {
          status: 'returned',
          note: `[TỪ CHỐI]: ${reason}`,
          receivedAt: new Date(),
        },
      });

      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'returned', note: `[TỪ CHỐI]: ${reason}` },
      });
    });

    return { message: 'Đã từ chối đơn hàng!' };
  }

  /** Logistics xác nhận giao hàng thành công */
  async confirmDelivery(salesOrderId: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'shipping') {
      throw new AppError(400, 'Đơn phải ở trạng thái đang giao (shipping)');
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'completed', actualDeliveryDate: new Date() },
      });
      await tx.deliveryRequest.updateMany({
        where: { salesOrderId },
        data: { status: 'completed' },
      });
    });

    return { message: 'Xác nhận đơn hàng đã giao thành công!' };
  }

  private async getDeliveryRequestByOrderId(salesOrderId: string) {
    return prisma.deliveryRequest.findUnique({
      where: { salesOrderId },
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
