import { Router } from 'express';
import {
  productionReceiptController,
  salesOrderController,
  logisticsController,
  stockOutboundController,
} from '../controllers/transactionController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

// Sales Orders
router.get('/sales-orders', salesOrderController.getAll);
router.get('/sales-orders/:id', salesOrderController.getById);
router.post('/sales-orders', authorize('admin', 'sales'), salesOrderController.create);
router.put('/sales-orders/:id', authorize('admin', 'sales'), salesOrderController.update);
router.post('/sales-orders/:id/submit', authorize('admin', 'sales'), salesOrderController.submit);
router.post('/sales-orders/:id/process-logistics', authorize('admin', 'logistics'), salesOrderController.processLogistics);
router.post('/sales-orders/:id/report-issue', authorize('admin', 'warehouse'), salesOrderController.reportWarehouseIssue);
router.post('/sales-orders/:id/export', authorize('admin', 'warehouse'), salesOrderController.exportOrder);
router.post('/sales-orders/:id/confirm-delivery', authorize('admin', 'logistics'), salesOrderController.confirmDelivery);
router.post('/sales-orders/:id/return-inventory', authorize('admin', 'logistics'), salesOrderController.returnInventory);
router.post('/sales-orders/:id/cancel', salesOrderController.cancel);
router.delete('/sales-orders/:id', authorize('admin', 'sales'), salesOrderController.delete);

// Logistics
router.get('/logistics', authorize('admin', 'logistics'), logisticsController.getAll);
router.post('/logistics/receive', authorize('admin', 'logistics'), logisticsController.receiveOrder);
router.post('/logistics/forward', authorize('admin', 'logistics'), logisticsController.forwardToWarehouse);
router.post('/logistics/reject', authorize('admin', 'logistics'), logisticsController.rejectOrder);
router.post('/logistics/confirm-delivery', authorize('admin', 'logistics'), logisticsController.confirmDelivery);

// Stock Outbound
router.get('/stock-outbound', authorize('admin', 'warehouse'), stockOutboundController.getAll);
router.get('/stock-outbound/pending', authorize('admin', 'warehouse'), stockOutboundController.getPendingRequests);
router.get('/stock-outbound/:id', stockOutboundController.getById);
router.post('/stock-outbound', authorize('admin', 'warehouse'), stockOutboundController.create);
router.post('/stock-outbound/:id/respond', authorize('admin', 'warehouse'), stockOutboundController.respondOutbound);
router.post('/stock-outbound/:id/cancel', authorize('admin', 'warehouse'), stockOutboundController.cancel);
router.delete('/stock-outbound/:id', authorize('admin', 'warehouse'), stockOutboundController.delete);

// Production Receipts (Nhà máy / Kho)
router.get('/production-receipts', authorize('admin', 'warehouse', 'factory'), productionReceiptController.getAll);
router.get('/production-receipts/:id', productionReceiptController.getById);
router.post('/production-receipts', authorize('admin', 'warehouse'), productionReceiptController.create);
router.post('/production-receipts/:id/factory-respond', authorize('admin', 'factory'), productionReceiptController.factoryRespond);
router.post('/production-receipts/:id/confirm', authorize('admin', 'warehouse'), productionReceiptController.confirmReceipt);
router.post('/production-receipts/:id/cancel', authorize('admin', 'warehouse'), productionReceiptController.cancel);
router.delete('/production-receipts/:id', authorize('admin', 'warehouse'), productionReceiptController.delete);

export default router;
