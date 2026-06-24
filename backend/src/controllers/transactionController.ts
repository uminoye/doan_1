import { Request, Response } from 'express';
import { ProductionReceiptService } from '../services/productionReceiptService';
import { SalesOrderService } from '../services/salesOrderService';
import { LogisticsService } from '../services/logisticsService';
import { StockOutboundService } from '../services/stockOutboundService';
import { ReportService } from '../services/reportService';
import { asyncHandler } from '../middlewares/errorHandler';

const productionReceiptService = new ProductionReceiptService();
const salesOrderService = new SalesOrderService();
const logisticsService = new LogisticsService();
const stockOutboundService = new StockOutboundService();
const reportService = new ReportService();

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
    res.json(await productionReceiptService.getById(req.params.id));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await productionReceiptService.create({ ...req.body, createdById: userId });
    res.status(201).json(result);
  }),
  confirm: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.confirm(req.params.id));
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.cancel(req.params.id));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await productionReceiptService.delete(req.params.id));
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
    res.json(await salesOrderService.getById(req.params.id));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await salesOrderService.create({ ...req.body, createdById: userId });
    res.status(201).json(result);
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.update(req.params.id, req.body));
  }),
  submit: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.submit(req.params.id));
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.cancel(req.params.id));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await salesOrderService.delete(req.params.id));
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
    const userId = (req as any).user?.userId;
    const { salesOrderId, note } = req.body;
    res.json(await logisticsService.receiveOrder(salesOrderId, userId, note));
  }),
  forwardToWarehouse: asyncHandler(async (req: Request, res: Response) => {
    const { salesOrderId, note } = req.body;
    res.json(await logisticsService.forwardToWarehouse(salesOrderId, note));
  }),
  rejectOrder: asyncHandler(async (req: Request, res: Response) => {
    const { salesOrderId, note } = req.body;
    res.json(await logisticsService.rejectOrder(salesOrderId, note));
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
    res.json(await stockOutboundService.getById(req.params.id));
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;
    const result = await stockOutboundService.create({ ...req.body, createdById: userId });
    res.status(201).json(result);
  }),
  confirm: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.confirm(req.params.id));
  }),
  cancel: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.cancel(req.params.id));
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockOutboundService.delete(req.params.id));
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
