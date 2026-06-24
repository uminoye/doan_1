import { stockOutboundRepo, salesOrderRepo, inventoryRepo } from '../repositories';
import { prisma } from '../models/prisma';

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
      stockOutboundRepo.findAll({ skip, take: limit, where }),
      stockOutboundRepo.count({ where }),
    ]);

    return {
      data: notes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const note = await stockOutboundRepo.findById(id);
    if (!note) throw new Error('Không tìm thấy phiếu xuất');
    return note;
  }

  async create(data: {
    salesOrderId: string;
    warehouseId: string;
    exportDate?: string;
    note?: string;
    createdById: string;
    items: { productId: string; quantity: number }[];
  }) {
    const order = await salesOrderRepo.findById(data.salesOrderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new Error('Đơn hàng phải ở trạng thái kho đang xử lý');
    }
    if (order.outboundNote) throw new Error('Đơn hàng đã có phiếu xuất kho');

    // Check stock availability
    for (const item of data.items) {
      const balance = await inventoryRepo.getBalance(data.warehouseId, item.productId);
      if (!balance || balance.onHandQty < item.quantity) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        throw new Error(`Sản phẩm "${product?.name || item.productId}" không đủ tồn kho`);
      }
    }

    const count = await stockOutboundRepo.count();
    const noteNo = `PX${String(count + 1).padStart(6, '0')}`;

    const note = await stockOutboundRepo.create({
      data: {
        noteNo,
        salesOrderId: data.salesOrderId,
        warehouseId: data.warehouseId,
        exportDate: data.exportDate ? new Date(data.exportDate) : new Date(),
        note: data.note,
        status: 'draft',
        createdById: data.createdById,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
    });

    return stockOutboundRepo.findById(note.id);
  }

  async confirm(id: string) {
    const note = await stockOutboundRepo.findById(id);
    if (!note) throw new Error('Không tìm thấy phiếu xuất');
    if (note.status !== 'draft') throw new Error('Phiếu xuất đã được xác nhận hoặc hủy');

    // Check stock again before confirming
    for (const item of note.items) {
      const balance = await inventoryRepo.getBalance(note.warehouseId, item.productId);
      if (!balance || balance.onHandQty < item.quantity) {
        throw new Error(`Sản phẩm "${item.product.name}" không đủ tồn kho để xuất`);
      }
    }

    // Transaction to update inventory
    await prisma.$transaction(async (tx) => {
      for (const item of note.items) {
        // Subtract balance
        await tx.inventoryBalance.update({
          where: { warehouseId_productId: { warehouseId: note.warehouseId, productId: item.productId } },
          data: { onHandQty: { decrement: item.quantity } },
        });

        // Create transaction record
        await tx.inventoryTransaction.create({
          data: {
            warehouseId: note.warehouseId,
            productId: item.productId,
            transactionType: 'OUT',
            quantity: item.quantity,
            referenceType: 'stock_outbound',
            referenceId: note.id,
            transactionDate: new Date(),
          },
        });
      }

      // Update note status
      await tx.stockOutboundNote.update({
        where: { id },
        data: { status: 'confirmed' },
      });

      // Update sales order status
      await tx.salesOrder.update({
        where: { id: note.salesOrderId },
        data: { status: 'completed' },
      });
    });

    return stockOutboundRepo.findById(id);
  }

  async cancel(id: string) {
    const note = await stockOutboundRepo.findById(id);
    if (!note) throw new Error('Không tìm thấy phiếu xuất');
    if (note.status !== 'draft') throw new Error('Chỉ có thể hủy phiếu ở trạng thái nháp');
    await stockOutboundRepo.update(id, { status: 'cancelled' });
    return { message: 'Hủy phiếu xuất thành công' };
  }

  async delete(id: string) {
    const note = await stockOutboundRepo.findById(id);
    if (!note) throw new Error('Không tìm thấy phiếu xuất');
    if (note.status !== 'draft') throw new Error('Chỉ có thể xóa phiếu ở trạng thái nháp');
    await stockOutboundRepo.delete(id);
    return { message: 'Xóa phiếu xuất thành công' };
  }
}
