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

// Production Receipts (Nhà máy)
router.get('/production-receipts', authorize('admin', 'factory'), productionReceiptController.getAll);
router.get('/production-receipts/:id', productionReceiptController.getById);
router.post('/production-receipts', authorize('admin', 'factory'), productionReceiptController.create);
router.post('/production-receipts/:id/confirm', authorize('admin', 'factory'), productionReceiptController.confirm);
router.post('/production-receipts/:id/cancel', authorize('admin', 'factory'), productionReceiptController.cancel);
router.delete('/production-receipts/:id', authorize('admin', 'factory'), productionReceiptController.delete);

// Sales Orders
router.get('/sales-orders', salesOrderController.getAll);
router.get('/sales-orders/:id', salesOrderController.getById);
router.post('/sales-orders', authorize('admin', 'sales'), salesOrderController.create);
router.put('/sales-orders/:id', authorize('admin', 'sales'), salesOrderController.update);
router.post('/sales-orders/:id/submit', authorize('admin', 'sales'), salesOrderController.submit);
router.post('/sales-orders/:id/cancel', salesOrderController.cancel);
router.delete('/sales-orders/:id', authorize('admin', 'sales'), salesOrderController.delete);

// Logistics
router.get('/logistics', authorize('admin', 'logistics'), logisticsController.getAll);
router.post('/logistics/receive', authorize('admin', 'logistics'), logisticsController.receiveOrder);
router.post('/logistics/forward', authorize('admin', 'logistics'), logisticsController.forwardToWarehouse);
router.post('/logistics/reject', authorize('admin', 'logistics'), logisticsController.rejectOrder);

// Stock Outbound
router.get('/stock-outbound', authorize('admin', 'warehouse'), stockOutboundController.getAll);
router.get('/stock-outbound/:id', stockOutboundController.getById);
router.post('/stock-outbound', authorize('admin', 'warehouse'), stockOutboundController.create);
router.post('/stock-outbound/:id/confirm', authorize('admin', 'warehouse'), stockOutboundController.confirm);
router.post('/stock-outbound/:id/cancel', authorize('admin', 'warehouse'), stockOutboundController.cancel);
router.delete('/stock-outbound/:id', authorize('admin', 'warehouse'), stockOutboundController.delete);

export default router;
