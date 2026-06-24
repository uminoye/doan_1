import { productionReceiptRepo, inventoryRepo } from '../repositories';
import { prisma } from '../models/prisma';

export class ProductionReceiptService {
  async getAll(params?: { page?: number; limit?: number; search?: string; status?: string; startDate?: string; endDate?: string }) {
    const { page = 1, limit = 20, search, status, startDate, endDate } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.receiptDate = {};
      if (startDate) where.receiptDate.gte = new Date(startDate);
      if (endDate) where.receiptDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [receipts, total] = await Promise.all([
      productionReceiptRepo.findAll({ skip, take: limit, where }),
      productionReceiptRepo.count({ where }),
    ]);

    return {
      data: receipts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const receipt = await productionReceiptRepo.findById(id);
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    return receipt;
  }

  async create(data: {
    warehouseId: string;
    receiptDate?: string;
    note?: string;
    createdById: string;
    items: { productId: string; quantity: number }[];
  }) {
    // Generate receipt number
    const count = await productionReceiptRepo.count();
    const receiptNo = `PN${String(count + 1).padStart(6, '0')}`;

    const receipt = await prisma.productionReceipt.create({
      data: {
        receiptNo,
        warehouseId: data.warehouseId,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : new Date(),
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
      include: {
        warehouse: true,
        items: { include: { product: true } },
        createdBy: { include: { role: true } },
      },
    });

    return receipt;
  }

  async confirm(id: string) {
    const receipt = await productionReceiptRepo.findById(id);
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    if (receipt.status !== 'draft') throw new Error('Phiếu nhập đã được xác nhận hoặc hủy');

    // Use transaction to update inventory
    await prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        // Update or create balance
        const current = await tx.inventoryBalance.findUnique({
          where: { warehouseId_productId: { warehouseId: receipt.warehouseId, productId: item.productId } },
        });
        if (current) {
          await tx.inventoryBalance.update({
            where: { warehouseId_productId: { warehouseId: receipt.warehouseId, productId: item.productId } },
            data: { onHandQty: current.onHandQty + item.quantity },
          });
        } else {
          await tx.inventoryBalance.create({
            data: { warehouseId: receipt.warehouseId, productId: item.productId, onHandQty: item.quantity },
          });
        }

        // Create transaction record
        await tx.inventoryTransaction.create({
          data: {
            warehouseId: receipt.warehouseId,
            productId: item.productId,
            transactionType: 'IN',
            quantity: item.quantity,
            referenceType: 'production_receipt',
            referenceId: receipt.id,
            transactionDate: new Date(),
          },
        });
      }

      await tx.productionReceipt.update({
        where: { id },
        data: { status: 'confirmed' },
      });
    });

    return productionReceiptRepo.findById(id);
  }

  async cancel(id: string) {
    const receipt = await productionReceiptRepo.findById(id);
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    if (receipt.status !== 'draft') throw new Error('Chỉ có thể hủy phiếu ở trạng thái nháp');
    await productionReceiptRepo.update(id, { status: 'cancelled' });
    return { message: 'Hủy phiếu nhập thành công' };
  }

  async delete(id: string) {
    const receipt = await productionReceiptRepo.findById(id);
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    if (receipt.status !== 'draft') throw new Error('Chỉ có thể xóa phiếu ở trạng thái nháp');
    await productionReceiptRepo.delete(id);
    return { message: 'Xóa phiếu nhập thành công' };
  }
}
