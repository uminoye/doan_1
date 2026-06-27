import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';

export type NotificationType = 'carrier_damage' | 'customer_rejected' | 'warehouse_reject' | 'compensation' | 'warehouse_delayed';

export class NotificationService {
  async getAll(params?: { page?: number; limit?: number; type?: string; status?: string }) {
    const { page = 1, limit = 20, type, status } = params || {};
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) throw new AppError(404, 'Không tìm thấy thông báo');
    return n;
  }

  async create(data: {
    type: NotificationType;
    orderId?: string;
    shipmentId?: string;
    title: string;
    message: string;
  }) {
    return prisma.notification.create({
      data: {
        type: data.type,
        orderId: data.orderId,
        shipmentId: data.shipmentId,
        title: data.title,
        message: data.message,
        status: 'pending',
      },
    });
  }

  async resolve(id: string) {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n) throw new AppError(404, 'Không tìm thấy thông báo');
    return prisma.notification.update({ where: { id }, data: { status: 'resolved' } });
  }

  async delete(id: string) {
    await prisma.notification.delete({ where: { id } });
    return { message: 'Đã xóa thông báo' };
  }

  async getByOrderId(orderId: string) {
    return prisma.notification.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
