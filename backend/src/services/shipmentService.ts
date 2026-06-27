import { prisma } from '../models/prisma';
import { AppError } from '../middlewares/errorHandler';
import { CarrierService } from './carrierService';
import { NotificationService } from './notificationService';

const carrierService = new CarrierService();
const notificationService = new NotificationService();

// Các bước giao hàng (demo, giả lập)
const SHIPMENT_STEPS = [
  { step: 0, label: 'Kho đang xử lý', description: 'Kho đóng gói và chuẩn bị hàng' },
  { step: 1, label: 'Đơn vị vận chuyển đã lấy hàng', description: 'Đơn vị vận chuyển nhận hàng thành công' },
  { step: 2, label: 'Đã đến kho khu vực', description: 'Hàng đã đến kho phân phối khu vực' },
  { step: 3, label: 'Đang trên đường giao đến bạn', description: 'Nhân viên giao hàng đang trên đường' },
  { step: 4, label: 'Giao thành công', description: 'Khách đã nhận hàng và thanh toán' },
];

const REJECTION_REASONS = [
  'Hàng lỗi không hoạt động (Do nhà máy)',
  'Hàng bể vỡ do vận chuyển',
  'Khách không lấy hàng',
];

export class ShipmentService {
  async createShipment(data: {
    salesOrderId: string;
    carrierId: string;
    trackingNo: string;
    shippingFee?: number;
  }) {
    const order = await prisma.salesOrder.findUnique({ where: { id: data.salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (order.status !== 'warehouse_processing') {
      throw new AppError(400, 'Đơn phải ở trạng thái kho đang xử lý');
    }

    const existing = await prisma.shipment.findUnique({ where: { salesOrderId: data.salesOrderId } });
    if (existing) throw new AppError(400, 'Đơn đã có lộ trình vận chuyển');

    const shipment = await prisma.shipment.create({
      data: {
        salesOrderId: data.salesOrderId,
        carrierId: data.carrierId,
        trackingNo: data.trackingNo,
        shippingFee: data.shippingFee || 0,
        currentStep: 0,
        status: 'warehouse_processing',
      },
      include: { carrier: true },
    });

    // Cập nhật deliveryRequest
    await prisma.deliveryRequest.updateMany({
      where: { salesOrderId: data.salesOrderId },
      data: { status: 'warehouse_processing' },
    });

    return shipment;
  }

  async getByOrderId(salesOrderId: string) {
    const s = await prisma.shipment.findUnique({
      where: { salesOrderId },
      include: { carrier: true, salesOrder: { include: { customer: true } } },
    });
    return s;
  }

  async getSteps() {
    return SHIPMENT_STEPS;
  }

  async getRejectionReasons() {
    return REJECTION_REASONS;
  }

  /**
   * Tiến bước vận chuyển (mỗi lần gọi sẽ tăng currentStep)
   * Bước 0→1→2→3→4 (warehouse→picked→regional→delivering→delivered)
   */
  async advanceStep(salesOrderId: string) {
    const shipment = await prisma.shipment.findUnique({ where: { salesOrderId } });
    if (!shipment) throw new AppError(404, 'Không tìm thấy lộ trình vận chuyển');

    if (shipment.currentStep >= 4) {
      return { message: 'Đơn đã giao thành công', shipment };
    }

    const nextStep = shipment.currentStep + 1;
    const stepData = SHIPMENT_STEPS.find(s => s.step === nextStep);
    const isCompleted = nextStep === 4;

    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          currentStep: nextStep,
          status: isCompleted ? 'completed' : 'shipping',
          completedAt: isCompleted ? new Date() : undefined,
        },
      });

      if (isCompleted) {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: 'completed', actualDeliveryDate: new Date() },
        });
        await tx.deliveryRequest.updateMany({
          where: { salesOrderId },
          data: { status: 'completed' },
        });
      } else {
        await tx.deliveryRequest.updateMany({
          where: { salesOrderId },
          data: { status: 'shipping' },
        });
      }
    });

    return { message: `Đã chuyển bước: ${stepData?.label}`, currentStep: nextStep };
  }

  /**
   * Khách từ chối — xử lý 3 lý do với logic tồn kho khác nhau:
   *
   * Lý do 1 "Hàng lỗi do nhà máy": cancelled_shipping_error → Kho hàng lỗi, KHÔNG cộng tồn
   * Lý do 2 "Hư hỏng do vận chuyển": cancelled_shipping_error → chỉ thông báo, KHÔNG cộng tồn
   * Lý do 3 "Khách đổi ý không nhận": cancelled → trả về kho gốc, CỘNG lại tồn
   */
  async customerReject(salesOrderId: string, reason: string) {
    const shipment = await prisma.shipment.findUnique({
      where: { salesOrderId },
      include: { salesOrder: { include: { outboundNote: true, items: true } } },
    });
    if (!shipment) throw new AppError(404, 'Không tìm thấy lộ trình vận chuyển');
    if (shipment.customerRejected) throw new AppError(400, 'Đơn đã được xử lý từ chối trước đó');

    // Chuẩn hóa lý do
    const REJECT_FACTORY   = 'Hàng lỗi do Nhà máy sản xuất';
    const REJECT_SHIP_DAMAGE = 'Hư hỏng do Vận chuyển';
    const REJECT_CHANGED_MIND = 'Khách đổi ý không nhận';

    let finalReason = reason;
    if (reason.includes('lỗi') || reason.includes('nhà máy') || reason.includes('factory')) {
      finalReason = REJECT_FACTORY;
    } else if (reason.includes('bể') || reason.includes('vỡ') || reason.includes('hư') || reason.includes('vận chuyển') || reason.includes('ship')) {
      finalReason = REJECT_SHIP_DAMAGE;
    } else {
      finalReason = REJECT_CHANGED_MIND;
    }

    await prisma.$transaction(async (tx) => {
      // Đánh dấu shipment thất bại
      await tx.shipment.update({
        where: { id: shipment.id },
        data: { customerRejected: true, rejectionReason: finalReason, status: 'failed' },
      });

      const order = shipment.salesOrder;
      const outboundNote = order.outboundNote;
      const warehouseId = outboundNote?.warehouseId;

      // ── LÝ DO 1: Khách đổi ý → trả về kho gốc + CỘNG tồn ──
      if (finalReason === REJECT_CHANGED_MIND) {
        if (warehouseId) {
          for (const item of order.items) {
            const bal = await tx.inventoryBalance.findUnique({
              where: { warehouseId_productId: { warehouseId, productId: item.productId } },
            });
            if (bal) {
              await tx.inventoryBalance.update({
                where: { warehouseId_productId: { warehouseId, productId: item.productId } },
                data: { onHandQty: { increment: item.quantity } },
              });
            } else {
              await tx.inventoryBalance.create({
                data: { warehouseId, productId: item.productId, onHandQty: item.quantity, reservedQty: 0 },
              });
            }
            await tx.inventoryTransaction.create({
              data: {
                warehouseId, productId: item.productId,
                transactionType: 'IN', quantity: item.quantity,
                referenceType: 'return', referenceId: salesOrderId,
                note: `Hoàn trả do khách đổi ý không nhận - Đơn ${order.orderNo}`,
              },
            });
          }
        }
        await tx.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'canceled' } });
        await tx.deliveryRequest.updateMany({ where: { salesOrderId }, data: { status: 'canceled' } });
        await notificationService.create({
          type: 'customer_rejected', orderId: salesOrderId, shipmentId: shipment.id,
          title: 'Khách đổi ý - Hoàn trả kho',
          message: `Đơn ${order.orderNo}: Khách đổi ý không nhận hàng. Hàng đã hoàn trả về kho gốc.`,
        });
      }

      // ── LÝ DO 2: Hư hỏng do vận chuyển → cancelled_shipping_error, KHÔNG cộng tồn ──
      else if (finalReason === REJECT_SHIP_DAMAGE) {
        await tx.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'canceled_shipping_error' } });
        await tx.deliveryRequest.updateMany({ where: { salesOrderId }, data: { status: 'canceled_shipping_error' } });
        await notificationService.create({
          type: 'compensation', orderId: salesOrderId, shipmentId: shipment.id,
          title: 'Yêu cầu bù hàng cho khách',
          message: `Đơn ${order.orderNo}: "${finalReason}". Cần bù hàng cho khách ngay.`,
        });
        await notificationService.create({
          type: 'carrier_damage', orderId: salesOrderId, shipmentId: shipment.id,
          title: 'Đòi bồi thường từ ĐVVC',
          message: `Đơn ${order.orderNo}: "${finalReason}" - Yêu cầu bồi thường từ đơn vị vận chuyển.`,
        });
      }

      // ── LÝ DO 3: Lỗi do Nhà máy → ghi nhận vào kho lỗi để theo dõi, KHÔNG cộng tồn bán hàng ──
      else {
        const defectiveWh = await tx.warehouse.findFirst({ where: { isDefectiveWarehouse: true } });
        if (defectiveWh) {
          // upsert để hiện trên trang /inventory/ (kho lỗi)
          // Trang tồn kho hàng tốt đã filter theo isDefectiveWarehouse nên không bị trùng
          for (const item of order.items) {
            await tx.inventoryBalance.upsert({
              where: { warehouseId_productId: { warehouseId: defectiveWh.id, productId: item.productId } },
              create: { warehouseId: defectiveWh.id, productId: item.productId, onHandQty: item.quantity, reservedQty: 0 },
              update: { onHandQty: { increment: item.quantity } },
            });
            await tx.inventoryTransaction.create({
              data: {
                warehouseId: defectiveWh.id, productId: item.productId,
                transactionType: 'IN', quantity: item.quantity,
                referenceType: 'defective', referenceId: salesOrderId,
                note: `Hàng lỗi (Nhà máy) - Đơn ${order.orderNo} bị từ chối.`,
              },
            });
          }
        }
        await tx.salesOrder.update({ where: { id: salesOrderId }, data: { status: 'canceled_shipping_error' } });
        await tx.deliveryRequest.updateMany({ where: { salesOrderId }, data: { status: 'canceled_shipping_error' } });
        await notificationService.create({
          type: 'customer_rejected', orderId: salesOrderId, shipmentId: shipment.id,
          title: 'Hàng lỗi - Chờ Kho xử lý',
          message: `Đơn ${order.orderNo}: "${finalReason}". Hàng đang chờ Kho xử lý / thanh lý.`,
        });
      }
    });

    return { message: 'Đã xử lý từ chối của khách', reason: finalReason };
  }

  /**
   * Xác nhận khách đã nhận hàng (Logistics bấm)
   */
  async confirmReceived(salesOrderId: string) {
    const shipment = await prisma.shipment.findUnique({ where: { salesOrderId } });
    if (!shipment) throw new AppError(404, 'Không tìm thấy lộ trình vận chuyển');

    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipment.id },
        data: { currentStep: 4, status: 'completed', completedAt: new Date() },
      });
      await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: 'completed', actualDeliveryDate: new Date() },
      });
      await tx.deliveryRequest.updateMany({
        where: { salesOrderId },
        data: { status: 'completed' },
      });
    });

    return { message: 'Xác nhận giao hàng thành công!' };
  }

  /**
   * Lấy tất cả shipment đang theo dõi
   */
  async getAllTracking(params?: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = params || {};
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        include: {
          carrier: true,
          salesOrder: { include: { customer: true, items: { include: { product: true } } } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.shipment.count({ where }),
    ]);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * GIAI ĐOẠN 2: Logistics điều phối — gộp 2 bước:
   * 1. forwardToWarehouse (đơn chuyển sang warehouse_processing)
   * 2. Tạo Shipment với carrier + trackingNo tự sinh + shippingFee
   */
  async createAndForward(data: {
    salesOrderId: string;
    carrierId: string;
    shippingFee?: number;
    note?: string;
    userName?: string;
  }) {
    const order = await prisma.salesOrder.findUnique({ where: { id: data.salesOrderId } });
    if (!order) throw new AppError(404, 'Không tìm thấy đơn hàng');
    if (!['pending', 'logistics_review'].includes(order.status)) {
      throw new AppError(400, 'Đơn phải ở trạng thái chờ duyệt hoặc logistics xem xét lại');
    }

    // Lấy carrier để sinh trackingNo
    const carrier = await prisma.carrier.findUnique({ where: { id: data.carrierId } });
    if (!carrier) throw new AppError(404, 'Không tìm thấy đơn vị vận chuyển');

    // Sinh trackingNo tự động: VTP-001234
    const count = await prisma.shipment.count({ where: { carrierId: data.carrierId } });
    const trackingNo = `${carrier.autoPrefix || carrier.code}-${String(count + 1).padStart(6, '0')}`;

    await prisma.$transaction(async (tx) => {
      // Bước 1: Upsert deliveryRequest + chuyển đơn sang warehouse_processing
      await tx.deliveryRequest.upsert({
        where: { salesOrderId: data.salesOrderId },
        create: {
          salesOrderId: data.salesOrderId,
          receivedBy: data.userName,
          receivedAt: new Date(),
          note: data.note,
          status: 'warehouse_processing',
        },
        update: {
          status: 'warehouse_processing',
          note: data.note,
          receivedAt: new Date(),
        },
      });

      await tx.salesOrder.update({
        where: { id: data.salesOrderId },
        data: { status: 'warehouse_processing' },
      });

      // Bước 2: Tạo shipment
      await tx.shipment.create({
        data: {
          salesOrderId: data.salesOrderId,
          carrierId: data.carrierId,
          trackingNo,
          shippingFee: data.shippingFee || 0,
          currentStep: 0,
          status: 'warehouse_processing',
        },
      });
    });

    return {
      message: 'Đã điều phối và tạo lộ trình vận chuyển thành công! Đơn đã chuyển sang kho xử lý.',
      trackingNo,
      carrier: carrier.name,
    };
  }

  /**
   * GIAI ĐOẠN 4: Simulation — Logistics bấm "Giao thử"
   * Logic:
   *  - step 0→1→2→3: luôn advanceStep bình thường
   *  - step 3→4: 80% thành công, 20% random KHÁCH TỪ CHỐI
   *    → 3 lý do ngẫu nhiên trong REJECTION_REASONS
   */
  async simulateDelivery(salesOrderId: string) {
    const shipment = await prisma.shipment.findUnique({ where: { salesOrderId } });
    if (!shipment) throw new AppError(404, 'Không tìm thấy lộ trình vận chuyển');
    if (shipment.status === 'completed') {
      return { message: 'Đơn đã giao thành công', currentStep: shipment.currentStep };
    }
    if (shipment.status === 'failed') {
      return { message: 'Đơn đã bị từ chối trước đó', currentStep: shipment.currentStep };
    }

    // Step 0→1→2→3: advance bình thường
    if (shipment.currentStep < 3) {
      return this.advanceStep(salesOrderId);
    }

    // Step 3→4: random 20% KHÁCH TỪ CHỐI
    const roll = Math.random();
    if (roll < 0.2) {
      const reasonIdx = Math.floor(Math.random() * REJECTION_REASONS.length);
      const reason = REJECTION_REASONS[reasonIdx];
      return this.customerReject(salesOrderId, reason);
    }

    // 80%: giao thành công
    return this.advanceStep(salesOrderId);
  }
}
