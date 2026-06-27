import { Request, Response } from 'express';
import { ProductionReceiptService } from '../services/productionReceiptService';
import { SalesOrderService } from '../services/salesOrderService';
import { LogisticsService } from '../services/logisticsService';
import { StockOutboundService } from '../services/stockOutboundService';
import { ReportService } from '../services/reportService';
import { CarrierService } from '../services/carrierService';
import { NotificationService } from '../services/notificationService';
import { ShipmentService } from '../services/shipmentService';
import { asyncHandler } from '../middlewares/errorHandler';

const productionReceiptService = new ProductionReceiptService();
const salesOrderService = new SalesOrderService();
const logisticsService = new LogisticsService();
const stockOutboundService = new StockOutboundService();
const reportService = new ReportService();
const carrierService = new CarrierService();
const notificationService = new NotificationService();
const shipmentService = new ShipmentService();

// ===== Production Receipt =====
export const productionReceiptController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, status, startDate, endDate } = req.query;
    const result = await productionReceiptService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await productionReceiptService.create({ ...req.body, createdById: userId });
    res.status(201).json(result);
  }),
  confirm: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.confirmReceipt(String(req.params.id)));
  }),
  factoryRespond: asyncHandler(async (req: Request, res: Response) => {
    const userName = (req as any).user?.fullName || (req as any).user?.email;
    res.json(await productionReceiptService.factoryRespond({ ...req.body, userName }));
  }),
  confirmReceipt: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.confirmReceipt(String(req.params.id)));
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.cancel(String(req.params.id)));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.delete(String(req.params.id)));
  }),
};

// ===== Sales Order =====
export const salesOrderController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, search, status, customerId, startDate, endDate } = req.query;
    const result = await salesOrderService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
      status: status as string,
      customerId: customerId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await salesOrderService.create({ ...req.body, createdById: userId });
    res.status(201).json(result);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.update(String(req.params.id), req.body));
  }),
  processLogistics: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const { newStatus, note } = req.body;
    res.json(await salesOrderService.processLogistics({ salesOrderId: String(req.params.id), newStatus, note, userId }));
  }),
  reportWarehouseIssue: asyncHandler(async (req: Request, res: Response) => {
    const { issueNote } = req.body;
    res.json(await salesOrderService.reportWarehouseIssue(String(req.params.id), issueNote));
  }),
  exportOrder: asyncHandler(async (req: Request, res: Response) => {
    const { warehouseId } = req.body;
    res.json(await salesOrderService.exportOrder(String(req.params.id), warehouseId));
  }),
  confirmDelivery: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.confirmDelivery(String(req.params.id)));
  }),
  returnInventory: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.returnInventory(String(req.params.id)));
  }),
  warehouseReject: asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    res.json(await salesOrderService.warehouseReject(String(req.params.id), reason));
  }),
  warehouseDelay: asyncHandler(async (req: Request, res: Response) => {
    const { newExpectedDate } = req.body;
    res.json(await salesOrderService.warehouseDelay(String(req.params.id), newExpectedDate));
  }),
  confirmDelay: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.confirmDelay(String(req.params.id)));
  }),
  resendToWarehouse: asyncHandler(async (req: Request, res: Response) => {
    const { newExpectedDate } = req.body;
    res.json(await salesOrderService.resendToWarehouse(String(req.params.id), newExpectedDate));
  }),
  recreateOrder: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    res.status(201).json(await salesOrderService.recreateOrder(String(req.params.id), { ...req.body, createdById: userId }));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.delete(String(req.params.id)));
  }),
};

// ===== Logistics =====
export const logisticsController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status } = req.query;
    const result = await logisticsService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
    });
    res.json(result);
  }),
  receiveOrder: asyncHandler(async (req: Request, res: Response) => {
    const userName = (req as any).user?.fullName || (req as any).user?.email;
    const { salesOrderId, note } = req.body;
    res.json(await logisticsService.receiveOrder(salesOrderId, note, userName));
  }),
  forwardToWarehouse: asyncHandler(async (req: Request, res: Response) => {
    const userName = (req as any).user?.fullName || (req as any).user?.email;
    const { salesOrderId, note } = req.body;
    res.json(await logisticsService.forwardToWarehouse(salesOrderId, note, userName));
  }),
  rejectOrder: asyncHandler(async (req: Request, res: Response) => {
    const userName = (req as any).user?.fullName || (req as any).user?.email;
    const { salesOrderId, reason } = req.body;
    res.json(await logisticsService.rejectOrder(salesOrderId, reason, userName));
  }),
  confirmDelivery: asyncHandler(async (req: Request, res: Response) => {
    const { salesOrderId } = req.body;
    res.json(await logisticsService.confirmDelivery(salesOrderId));
  }),
};

// ===== Stock Outbound =====
export const stockOutboundController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, startDate, endDate } = req.query;
    const result = await stockOutboundService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.getById(String(req.params.id)));
  }),
  getPendingRequests: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await stockOutboundService.getPendingRequests());
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await stockOutboundService.create({ ...req.body, createdById: userId });
    res.status(201).json(result);
  }),
  respondOutbound: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.respondOutbound({
      salesOrderId: String(req.params.salesOrderId),
      action: req.body.action,
      reason: req.body.reason,
      expectedDate: req.body.expectedDate,
    }));
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.cancel(String(req.params.id)));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.delete(String(req.params.id)));
  }),
};

// ===== Reports =====
export const reportController = {
  getInventory: asyncHandler(async (req: Request, res: Response) => {
    const { warehouseId, productId } = req.query;
    res.json(await reportService.getInventoryReport({
      warehouseId: warehouseId as string,
      productId: productId as string,
    }));
  }),
  getDefectiveInventory: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await reportService.getDefectiveInventoryReport());
  }),
  getInbound: asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, warehouseId, productId } = req.query;
    res.json(await reportService.getInboundReport({
      startDate: startDate as string,
      endDate: endDate as string,
      warehouseId: warehouseId as string,
      productId: productId as string,
    }));
  }),
  getOutbound: asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, warehouseId, customerId } = req.query;
    res.json(await reportService.getOutboundReport({
      startDate: startDate as string,
      endDate: endDate as string,
      warehouseId: warehouseId as string,
      customerId: customerId as string,
    }));
  }),
  getTransactions: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, warehouseId, productId, transactionType, startDate, endDate } = req.query;
    res.json(await reportService.getTransactionHistory({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      warehouseId: warehouseId as string,
      productId: productId as string,
      transactionType: transactionType as string,
      startDate: startDate as string,
      endDate: endDate as string,
    }));
  }),
  getDashboard: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await reportService.getDashboardStats());
  }),
};

// ===== Carrier =====
export const carrierController = {
  getAll: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await carrierService.getAll());
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await carrierService.getById(String(req.params.id)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await carrierService.create(req.body));
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await carrierService.update(String(req.params.id), req.body));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await carrierService.delete(String(req.params.id)));
  }),
};

// ===== Notification =====
export const notificationController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, type, status } = req.query;
    res.json(await notificationService.getAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as string,
      status: status as string,
    }));
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationService.getById(String(req.params.id)));
  }),
  resolve: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationService.resolve(String(req.params.id)));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await notificationService.delete(String(req.params.id)));
  }),
};

// ===== Shipment =====
export const shipmentController = {
  getAllTracking: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status } = req.query;
    res.json(await shipmentService.getAllTracking({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as string,
    }));
  }),
  getSteps: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await shipmentService.getSteps());
  }),
  getRejectionReasons: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await shipmentService.getRejectionReasons());
  }),
  getByOrderId: asyncHandler(async (req: Request, res: Response) => {
    res.json(await shipmentService.getByOrderId(String(req.params.salesOrderId)));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await shipmentService.createShipment(req.body));
  }),
  createAndForward: asyncHandler(async (req: Request, res: Response) => {
    const userName = (req as any).user?.fullName || (req as any).user?.email;
    res.status(201).json(await shipmentService.createAndForward({ ...req.body, userName }));
  }),
  simulateDelivery: asyncHandler(async (req: Request, res: Response) => {
    res.json(await shipmentService.simulateDelivery(String(req.params.salesOrderId)));
  }),
  advanceStep: asyncHandler(async (req: Request, res: Response) => {
    res.json(await shipmentService.advanceStep(String(req.params.salesOrderId)));
  }),
  confirmReceived: asyncHandler(async (req: Request, res: Response) => {
    res.json(await shipmentService.confirmReceived(String(req.params.salesOrderId)));
  }),
  customerReject: asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    res.json(await shipmentService.customerReject(String(req.params.salesOrderId), reason));
  }),
};
