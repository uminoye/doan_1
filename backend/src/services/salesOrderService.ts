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
    const count = await prisma.salesOrder.count();
    const orderNo = `SO${String(count + 1).padStart(6, '0')}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerId: data.customerId,
        orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
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
    expectedDeliveryDate?: string;
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
          expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
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
        data: { customerId: data.customerId, expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined, note: data.note },
      });
    }

    return this.getById(id);
  }

  async submit(id: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'draft') throw new Error('Chỉ có thể gửi đơn ở trạng thái nháp');
    if (!order.items.length) throw new Error('Đơn hàng phải có ít nhất một sản phẩm');
    await prisma.salesOrder.update({ where: { id }, data: { status: 'pending' } });
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
    if (order.status !== 'pending' && order.status !== 'submitted') {
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

  /** Kho báo lỗi (thiếu hàng, hẹn ngày...) → gửi về logistics */
  async reportWarehouseIssue(salesOrderId: string, issueNote: string) {
    const order = await prisma.salesOrder.findUnique({ where: { id: salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');

    const currentNote = order.note || '';
    const newNote = `[KHO BÁO LỖI]: ${issueNote} | Ghi chú cũ: ${currentNote}`;

    await prisma.salesOrder.update({
      where: { id: salesOrderId },
      data: { status: 'pending', note: newNote }, // quay về logistics xử lý
    });

    // Cập nhật delivery request
    await prisma.deliveryRequest.updateMany({
      where: { salesOrderId },
      data: { status: 'pending', note: `[KHO BÁO LỖI]: ${issueNote}` },
    });

    return { message: 'Đã báo lỗi và gửi về Logistics!' };
  }

  /** Xác nhận xuất kho (Kho bấm xuất → shipping) */
  async exportOrder(salesOrderId: string, warehouseId: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true, outboundNote: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new AppError(400, 'Đơn phải ở trạng thái kho đang xử lý');
    }
    if (!order.outboundNote) throw new AppError(400, 'Chưa tạo phiếu xuất kho cho đơn này');

    // Tạo stock outbound note + trừ tồn trong transaction
    const count = await prisma.stockOutboundNote.count();
    const noteNo = `PX${String(count + 1).padStart(6, '0')}`;

    await prisma.$transaction(async (tx) => {
      // Tạo phiếu xuất
      const note = await tx.stockOutboundNote.create({
        data: {
          noteNo,
          salesOrderId,
          warehouseId,
          exportDate: new Date(),
          status: 'pending',
          createdById: order.createdById,
        },
      });

      // Tạo chi tiết phiếu xuất từ items của đơn
      for (const item of order.items) {
        await tx.stockOutboundItem.create({
          data: { outboundNoteId: note.id, productId: item.productId, quantity: item.quantity },
        });

        // Trừ tồn kho
        const bal = await tx.inventoryBalance.findUnique({
          where: { warehouseId_productId: { warehouseId, productId: item.productId } },
        });
        if (bal) {
          await tx.inventoryBalance.update({
            where: { warehouseId_productId: { warehouseId, productId: item.productId } },
            data: { onHandQty: { decrement: item.quantity } },
          });
        }

        // Ghi lịch sử
        await tx.inventoryTransaction.create({
          data: {
            warehouseId,
            productId: item.productId,
            transactionType: 'OUT',
            quantity: item.quantity,
            referenceType: 'stock_outbound',
            referenceId: note.id,
          },
        });
      }

      // Cập nhật trạng thái đơn → shipping
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'shipping' },
      });

      // Cập nhật delivery request
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
      // ĐÃ xuất kho → hoàn trả tồn
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
      // CHƯA xuất kho → chỉ đổi trạng thái
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
}
