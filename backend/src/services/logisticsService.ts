import { deliveryRequestRepo, salesOrderRepo } from '../repositories';

export class LogisticsService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const { page = 1, limit = 20, status } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;

    const requests = await deliveryRequestRepo.findAll({ skip, take: limit, where });
    const all = await deliveryRequestRepo.findAll({ where });

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total: all.length,
        totalPages: Math.ceil(all.length / limit),
      },
    };
  }

  async receiveOrder(salesOrderId: string, receivedBy: string, note?: string) {
    const order = await salesOrderRepo.findById(salesOrderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'submitted') throw new Error('Đơn hàng phải ở trạng thái đã gửi (submitted)');
    if (order.delivery) throw new Error('Đơn đã được logistics tiếp nhận');

    await deliveryRequestRepo.upsert(salesOrderId, {
      receivedBy,
      receivedAt: new Date(),
      note,
      status: 'received',
    });

    await salesOrderRepo.update(salesOrderId, { status: 'logistics_received' });
    return salesOrderRepo.findById(salesOrderId);
  }

  async forwardToWarehouse(salesOrderId: string, note?: string) {
    const order = await salesOrderRepo.findById(salesOrderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'logistics_received') throw new Error('Đơn phải ở trạng thái logistics đã tiếp nhận');

    const delivery = order.delivery;
    if (delivery) {
      await deliveryRequestRepo.upsert(salesOrderId, {
        status: 'forwarded',
        note: note || delivery.note,
      });
    }

    await salesOrderRepo.update(salesOrderId, { status: 'warehouse_processing' });
    return salesOrderRepo.findById(salesOrderId);
  }

  async rejectOrder(salesOrderId: string, note: string) {
    const order = await salesOrderRepo.findById(salesOrderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (!['submitted', 'logistics_received'].includes(order.status)) {
      throw new Error('Không thể từ chối đơn ở trạng thái này');
    }
    await salesOrderRepo.update(salesOrderId, { status: 'cancelled' });
    if (order.delivery) {
      await deliveryRequestRepo.upsert(salesOrderId, { status: 'cancelled', note });
    }
    return { message: 'Đã từ chối đơn hàng' };
  }

  async getById(id: string) {
    return deliveryRequestRepo.findById(id);
  }
}
