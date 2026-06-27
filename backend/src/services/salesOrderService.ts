import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';

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
    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { note: { contains: search, mode: 'insensitive' } },
      ];
    }
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
          outboundNote: { include: { warehouse: true } },
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
    expectedDeliveryDate?: string;
    note?: string;
    createdById: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new AppError(400, 'Đơn hàng phải có ít nhất một sản phẩm');
    }

    const count = await prisma.salesOrder.count();
    const orderNo = `SO${String(count + 1).padStart(6, '0')}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerId: data.customerId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        note: data.note,
        status: 'pending',
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
    expectedDeliveryDate?: string;
    note?: string;
    items?: { productId: string; quantity: number; unitPrice?: number }[];
  }) {
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (!['pending', 'logistics_rejected', 'warehouse_rejected', 'warehouse_delayed'].includes(order.status)) {
      throw new Error('Chỉ có thể sửa đơn ở trạng thái chờ duyệt hoặc bị từ chối / dời ngày');
    }
    if (!data.items || data.items.length === 0) {
      throw new AppError(400, 'Đơn hàng phải có ít nhất một sản phẩm');
    }

    if (data.items) {
      await prisma.salesOrder.update({
        where: { id },
        data: {
          customerId: data.customerId,
          expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
          note: data.note,
          status: 'pending',
          items: {
            deleteMany: {},
            create: data.items.map(item => ({ productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice || 0 })),
          },
        },
      });
    } else {
      await prisma.salesOrder.update({
        where: { id },
        data: {
          customerId: data.customerId,
          expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
          note: data.note,
          status: 'pending',
        },
      });
    }

    return this.getById(id);
  }

  async delete(id: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (!['pending', 'logistics_rejected', 'draft'].includes(order.status)) {
      throw new AppError(400, 'Chỉ có thể xóa đơn ở trạng thái nháp, chờ duyệt hoặc bị từ chối');
    }

    const oldOrderNo = order.orderNo;
    await prisma.salesOrder.delete({ where: { id } });

    return { message: `Đã xóa đơn ${oldOrderNo}. Có thể tạo đơn mới ngay.`, deletedOrderNo: oldOrderNo };
  }

  // ===== NGHIỆP VỤ MỚI (theo bài mẫu) =====

  /** Logistics xử lý đơn: duyệt → warehouse_processing | từ chối → returned */
  async processLogistics(data: {
    salesOrderId: string;
    newStatus: 'warehouse_processing' | 'returned' | 'canceled';
    note?: string;
    userId?: string;
  }) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: data.salesOrderId },
      include: { delivery: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'pending' && order.status !== 'logistics_review' && order.status !== 'submitted') {
      throw new AppError(400, `Không thể xử lý đơn ở trạng thái "${order.status}"`);
    }

    return prisma.$transaction(async (tx) => {
      const noteText = data.newStatus === 'returned'
        ? `[LOGISTICS TỪ CHỐI]: ${data.note || 'Không có lý do'}`
        : (data.note || '');

      await tx.salesOrder.update({
        where: { id: data.salesOrderId },
        data: { status: data.newStatus, note: noteText },
      });

      // Tạo delivery request khi chuyển xuống kho
      if (data.newStatus === 'warehouse_processing') {
        const existing = await tx.deliveryRequest.findUnique({ where: { salesOrderId: data.salesOrderId } });
        if (!existing) {
          await tx.deliveryRequest.create({
            data: {
              salesOrderId: data.salesOrderId,
              receivedBy: data.userId,
              receivedAt: new Date(),
              status: 'warehouse_processing',
              note: noteText,
            },
          });
        } else {
          await tx.deliveryRequest.update({
            where: { salesOrderId: data.salesOrderId },
            data: { status: 'warehouse_processing', note: noteText, receivedAt: new Date() },
          });
        }
      }

      return this.getById(data.salesOrderId);
    });
  }

  /** Kho báo lỗi (thiếu hàng, hẹn ngày...) → gửi về logistics để xem xét lại */
  async reportWarehouseIssue(salesOrderId: string, issueNote: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    const currentNote = order.note || '';
    const newNote = `[KHO BÁO LỖI]: ${issueNote} | Ghi chú cũ: ${currentNote}`;

    await prisma.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: 'logistics_review', note: newNote },
    });

    await prisma.deliveryRequest.updateMany({
      where: { salesOrderId },
      data: { status: 'logistics_review', note: `[KHO BÁO LỖI]: ${issueNote}` },
    });

    return { message: 'Đã báo lỗi và gửi về Logistics xem xét!' };
  }

  /** Xác nhận xuất kho (Kho bấm xuất → shipping) — chỉ cập nhật trạng thái, phiếu xuất đã được tạo bởi StockOutboundService.create() */
  async exportOrder(salesOrderId: string, warehouseId: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { outboundNote: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new AppError(400, 'Đơn phải ở trạng thái kho đang xử lý');
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'shipping' },
      });

      await tx.deliveryRequest.updateMany({
        where: { salesOrderId },
        data: { status: 'shipping' },
      });
    });

    return { message: 'Đã xuất kho, đơn chuyển sang trạng thái Đang giao!' };
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

  /** Hoàn kho / hủy đơn (bom hàng hoặc từ chối) */
  async returnInventory(salesOrderId: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true, outboundNote: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    if (order.outboundNote) {
      const warehouseId = order.outboundNote.warehouseId;
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const bal = await tx.inventoryBalance.findUnique({
            where: { warehouseId_productId: { warehouseId, productId: item.productId } },
          });
          if (bal) {
            await tx.inventoryBalance.update({
              where: { warehouseId_productId: { warehouseId, productId: item.productId } },
              data: { onHandQty: { increment: item.quantity } },
            });
          }
          await tx.inventoryTransaction.create({
            data: {
              warehouseId,
              productId: item.productId,
              transactionType: 'IN',
              quantity: item.quantity,
              referenceType: 'return',
              referenceId: salesOrderId,
            },
          });
        }
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: 'canceled', actualDeliveryDate: null },
        });
        await tx.deliveryRequest.updateMany({
          where: { salesOrderId },
          data: { status: 'canceled' },
        });
      });
      return { message: 'Bom hàng: đã hoàn trả tồn kho và hủy đơn!' };
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: 'returned', actualDeliveryDate: null },
        });
        await tx.deliveryRequest.updateMany({
          where: { salesOrderId },
          data: { status: 'returned' },
        });
      });
      return { message: 'Đơn hàng chuyển sang trạng thái hoàn trả!' };
    }
  }

  /** Kho từ chối đơn → Sale xem xét lại */
  async warehouseReject(salesOrderId: string, reason: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new AppError(400, 'Đơn phải ở trạng thái kho đang xử lý');
    }

    const note = `[KHO TỪ CHỐI]: ${reason}`;

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'warehouse_rejected', note },
      });
      await tx.deliveryRequest.updateMany({
        where: { salesOrderId },
        data: { status: 'warehouse_rejected', note },
      });
      await tx.stockOutboundNote.updateMany({
        where: { salesOrderId },
        data: { status: 'rejected', warehouseNote: reason },
      });
    });

    return { message: 'Kho đã từ chối đơn. Sale sẽ xem xét lại.' };
  }

  /** Kho dời ngày giao → Sale xác nhận hoặc tạo lại đơn */
  async warehouseDelay(salesOrderId: string, newExpectedDate: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new AppError(400, 'Đơn phải ở trạng thái kho đang xử lý');
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'warehouse_delayed', expectedDeliveryDate: new Date(newExpectedDate) },
      });
      await tx.deliveryRequest.updateMany({
        where: { salesOrderId },
        data: { status: 'warehouse_delayed' },
      });
      await tx.stockOutboundNote.updateMany({
        where: { salesOrderId },
        data: { status: 'delayed', warehouseNote: `Dời ngày giao đến ${newExpectedDate}` },
      });
    });

    return { message: `Đã dời ngày giao đến ${newExpectedDate}. Sale sẽ xác nhận hoặc tạo lại đơn.` };
  }

  /** Sale xác nhận dời ngày → đơn quay về pending để kho giao lại */
  async confirmDelay(salesOrderId: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_delayed') {
      throw new AppError(400, 'Đơn không ở trạng thái dời ngày');
    }

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'pending' },
      });
      await tx.deliveryRequest.updateMany({
        where: { salesOrderId },
        data: { status: 'pending' },
      });
      await tx.stockOutboundNote.updateMany({
        where: { salesOrderId },
        data: { status: 'pending' },
      });
    });

    return { message: 'Đơn đã quay về trạng thái chờ duyệt. Logistics sẽ xử lý lại.' };
  }

  /** Sale lập lại đơn (dùng lại mã đơn cũ đã bị xóa) */
  async recreateOrder(salesOrderId: string, data: {
    customerId: string;
    expectedDeliveryDate?: string;
    note?: string;
    createdById: string;
    items: { productId: string; quantity: number; unitPrice?: number }[];
  }) {
    const oldOrder = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!oldOrder) throw new AppError(404, 'Không tìm thấy đơn hàng gốc');
    if (!['warehouse_rejected'].includes(oldOrder.status)) {
      throw new AppError(400, 'Chỉ có thể lập lại đơn ở trạng thái bị kho từ chối');
    }
    if (!data.items || data.items.length === 0) {
      throw new AppError(400, 'Đơn hàng phải có ít nhất một sản phẩm');
    }

    const order = await prisma.salesOrder.create({
      data: {
        orderNo: oldOrder.orderNo, // reuse old code
        customerId: data.customerId,
        orderDate: new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
        note: data.note,
        status: 'pending',
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
}
