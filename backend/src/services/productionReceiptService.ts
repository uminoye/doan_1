import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';

export class ProductionReceiptService {
  async getAll(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
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
      prisma.productionReceipt.findMany({
        skip,
        take: limit,
        where,
        include: {
          warehouse: true,
          createdBy: { include: { role: true } },
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.productionReceipt.count({ where }),
    ]);

    return { data: receipts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const receipt = await prisma.productionReceipt.findUnique({
      where: { id },
      include: {
        warehouse: true,
        createdBy: { include: { role: true } },
        items: { include: { product: true } },
      },
    });
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    return receipt;
  }

  /** Kho tạo yêu cầu nhập hàng (PENDING) */
  async create(data: {
    warehouseId: string;
    receiptDate?: string;
    note?: string;
    createdById: string;
    items: { productId: string; quantity: number }[];
  }) {
    if (!data.items || data.items.length === 0) {
      throw new AppError(400, 'Phải có ít nhất một sản phẩm!');
    }

    const count = await prisma.productionReceipt.count();
    const receiptNo = `PN${String(count + 1).padStart(6, '0')}`;

    const receipt = await prisma.productionReceipt.create({
      data: {
        receiptNo,
        warehouseId: data.warehouseId,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : new Date(),
        note: data.note,
        status: 'PENDING',
        createdById: data.createdById,
        items: {
          create: data.items.map(item => ({ productId: item.productId, quantity: item.quantity })),
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

  /** Nhà máy phản hồi: accept (PROCESSING) hoặc reject (REJECTED) */
  async factoryRespond(data: {
    receiptId: string;
    action: 'accept' | 'reject';
    expectedDeliveryDate?: string;
    reason?: string;
    userName?: string;
  }) {
    const receipt = await prisma.productionReceipt.findUnique({ where: { id: data.receiptId } });
    if (!receipt) throw new AppError(404, 'Không tìm thấy phiếu');
    if (receipt.status !== 'PENDING') {
      throw new AppError(400, `Phiếu hiện đang ở trạng thái "${receipt.status}", không thể xử lý.`);
    }

    if (data.action === 'accept' && !data.expectedDeliveryDate) {
      throw new AppError(400, 'Vui lòng chọn ngày giao dự kiến trước khi duyệt.');
    }

    const newStatus = data.action === 'accept' ? 'PROCESSING' : 'REJECTED';
    const finalNote = `[NM Phản hồi]: ${data.reason || 'Không có lý do'} | Cũ: ${receipt.note || ''}`;

    await prisma.productionReceipt.update({
      where: { id: data.receiptId },
      data: {
        status: newStatus,
        receiptDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : receipt.receiptDate,
        note: finalNote,
        respondedBy: data.userName,
        respondedReason: data.reason,
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
      },
    });

    return {
      message: data.action === 'accept'
        ? 'Đã duyệt phiếu và hẹn ngày giao hàng!'
        : 'Đã từ chối yêu cầu nhập kho!',
      data: await this.getById(data.receiptId),
    };
  }

  /** Kho xác nhận đã nhận hàng (COMPLETED) — cộng tồn kho */
  async confirmReceipt(receiptId: string) {
    const receipt = await prisma.productionReceipt.findUnique({
      where: { id: receiptId },
      include: { items: true },
    });
    if (!receipt) throw new AppError(404, 'Không tìm thấy phiếu');
    if (receipt.status !== 'PROCESSING') {
      throw new AppError(400, 'Nhà máy chưa giao hoặc phiếu đã chốt!');
    }

    await prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        // Cộng tồn kho
        const bal = await tx.inventoryBalance.findUnique({
          where: { warehouseId_productId: { warehouseId: receipt.warehouseId, productId: item.productId } },
        });
        if (bal) {
          await tx.inventoryBalance.update({
            where: { warehouseId_productId: { warehouseId: receipt.warehouseId, productId: item.productId } },
            data: { onHandQty: { increment: item.quantity } },
          });
        } else {
          await tx.inventoryBalance.create({
            data: {
              warehouseId: receipt.warehouseId,
              productId: item.productId,
              onHandQty: item.quantity,
            },
          });
        }

        // Ghi lịch sử
        await tx.inventoryTransaction.create({
          data: {
            warehouseId: receipt.warehouseId,
            productId: item.productId,
            transactionType: 'IN',
            quantity: item.quantity,
            referenceType: 'production_receipt',
            referenceId: receiptId,
          },
        });
      }

      await tx.productionReceipt.update({
        where: { id: receiptId },
        data: { status: 'COMPLETED' },
      });
    });

    return { message: 'Đã nhận hàng và cộng tồn kho!', data: await this.getById(receiptId) };
  }

  async cancel(id: string) {
    const receipt = await prisma.productionReceipt.findUnique({ where: { id } });
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    if (receipt.status !== 'PENDING') throw new AppError(400, 'Chỉ có thể hủy phiếu ở trạng thái PENDING');
    await prisma.productionReceipt.update({ where: { id }, data: { status: 'REJECTED' } });
    return { message: 'Hủy phiếu nhập thành công' };
  }

  async delete(id: string) {
    const receipt = await prisma.productionReceipt.findUnique({ where: { id } });
    if (!receipt) throw new Error('Không tìm thấy phiếu nhập');
    if (receipt.status !== 'PENDING') throw new AppError(400, 'Chỉ có thể xóa phiếu ở trạng thái PENDING');
    await prisma.productionReceipt.delete({ where: { id } });
    return { message: 'Xóa phiếu nhập thành công' };
  }
}
