import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';

export class StockOutboundService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const { page = 1, limit = 20, status, startDate, endDate } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.exportDate = {};
      if (startDate) where.exportDate.gte = new Date(startDate);
      if (endDate) where.exportDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [notes, total] = await Promise.all([
      prisma.stockOutboundNote.findMany({
        skip,
        take: limit,
        where,
        include: {
          warehouse: true,
          salesOrder: { include: { customer: true, items: { include: { product: true } } } },
          createdBy: { include: { role: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockOutboundNote.count({ where }),
    ]);

    return { data: notes, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const note = await prisma.stockOutboundNote.findUnique({
      where: { id },
      include: {
        warehouse: true,
        salesOrder: { include: { customer: true } },
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
    });
    if (!note) throw new Error('Không tìm thấy phiếu xuất');
    return note;
  }

  /** Lấy các đơn đang chờ xuất kho (warehouse_processing) */
  async getPendingRequests() {
    const orders = await prisma.salesOrder.findMany({
      where: {
        status: 'warehouse_processing',
      },
      include: {
        customer: true,
        items: { include: { product: true } },
        delivery: true,
        outboundNote: { include: { warehouse: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return orders;
  }

  /** Kho tạo phiếu xuất kho + trừ tồn */
  async create(data: {
    salesOrderId: string;
    warehouseId: string;
    exportDate?: string;
    note?: string;
    createdById: string;
  }) {
    const order = await prisma.salesOrder.findUnique({
      where: { id: data.salesOrderId },
      include: { items: true, outboundNote: true },
    });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new AppError(400, 'Đơn phải ở trạng thái kho đang xử lý');
    }
    if (order.outboundNote) throw new AppError(400, 'Đơn đã có phiếu xuất kho');

    // Kiểm tra tồn kho
    for (const item of order.items) {
      const bal = await prisma.inventoryBalance.findUnique({
        where: { warehouseId_productId: { warehouseId: data.warehouseId, productId: item.productId } },
      });
      if (!bal || bal.onHandQty < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        throw new AppError(400, `Sản phẩm "${product?.name}" chỉ còn ${bal?.onHandQty || 0} cái, không đủ xuất ${item.quantity} cái!`);
      }
    }

    const count = await prisma.stockOutboundNote.count();
    const noteNo = `PX${String(count + 1).padStart(6, '0')}`;

    await prisma.$transaction(async (tx) => {
      const note = await tx.stockOutboundNote.create({
        data: {
          noteNo,
          salesOrderId: data.salesOrderId,
          warehouseId: data.warehouseId,
          exportDate: data.exportDate ? new Date(data.exportDate) : new Date(),
          note: data.note,
          status: 'completed',
          createdById: data.createdById,
        },
      });

      for (const item of order.items) {
        await tx.stockOutboundItem.create({
          data: { outboundNoteId: note.id, productId: item.productId, quantity: item.quantity },
        });

        await tx.inventoryBalance.update({
          where: { warehouseId_productId: { warehouseId: data.warehouseId, productId: item.productId } },
          data: { onHandQty: { decrement: item.quantity } },
        });

        await tx.inventoryTransaction.create({
          data: {
            warehouseId: data.warehouseId,
            productId: item.productId,
            transactionType: 'OUT',
            quantity: item.quantity,
            referenceType: 'stock_outbound',
            referenceId: note.id,
          },
        });
      }

      await tx.salesOrder.update({
        where: { id: data.salesOrderId },
        data: { status: 'shipping' },
      });

      await tx.deliveryRequest.updateMany({
        where: { salesOrderId: data.salesOrderId },
        data: { status: 'shipping' },
      });
    });

    return { message: 'Xuất kho thành công! Đơn chuyển sang trạng thái Đang giao.' };
  }

  /** Kho từ chối / hẹn ngày (phản hồi lại cho logistics) */
  async respondOutbound(data: {
    salesOrderId: string;
    action: 'reject' | 'delay';
    reason?: string;
    expectedDate?: string;
  }) {
    const newStatus = data.action === 'reject' ? 'returned' : 'delayed';
    const notePrefix = data.action === 'reject' ? '[KHO TỪ CHỐI]' : '[KHO HẸN GIAO]';
    const finalNote = `${notePrefix}: ${data.reason || 'Không có lý do'}`;

    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: data.salesOrderId },
        data: { status: newStatus, note: finalNote },
      });

      await tx.deliveryRequest.updateMany({
        where: { salesOrderId: data.salesOrderId },
        data: {
          status: newStatus,
          note: finalNote,
        },
      });

      await tx.stockOutboundNote.updateMany({
        where: { salesOrderId: data.salesOrderId },
        data: {
          status: data.action === 'reject' ? 'rejected' : 'delayed',
          warehouseNote: data.reason,
        },
      });
    });

    return { message: 'Đã gửi phản hồi từ Kho thành công!' };
  }

  async cancel(id: string) {
    const note = await prisma.stockOutboundNote.findUnique({
      where: { id },
      include: { items: true, salesOrder: true },
    });
    if (!note) throw new AppError(404, 'Không tìm thấy phiếu xuất');
    if (note.status !== 'pending') throw new AppError(400, 'Chỉ có thể hủy phiếu ở trạng thái nháp');

    await prisma.$transaction(async (tx) => {
      // Hoàn tồn
      for (const item of note.items) {
        const bal = await tx.inventoryBalance.findUnique({
          where: { warehouseId_productId: { warehouseId: note.warehouseId, productId: item.productId } },
        });
        if (bal) {
          await tx.inventoryBalance.update({
            where: { warehouseId_productId: { warehouseId: note.warehouseId, productId: item.productId } },
            data: { onHandQty: { increment: item.quantity } },
          });
        }
      }

      await tx.stockOutboundNote.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      await tx.salesOrder.update({
        where: { id: note.salesOrderId },
        data: { status: 'warehouse_processing' },
      });
    });

    return { message: 'Hủy phiếu xuất thành công' };
  }

  async delete(id: string) {
    const note = await prisma.stockOutboundNote.findUnique({ where: { id } });
    if (!note) throw new AppError(404, 'Không tìm thấy phiếu xuất');
    if (note.status !== 'pending') throw new AppError(400, 'Chỉ có thể xóa phiếu ở trạng thái nháp');
    await prisma.stockOutboundNote.delete({ where: { id } });
    return { message: 'Xóa phiếu xuất thành công' };
  }
}
