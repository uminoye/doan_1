import { Router } from 'express';
import {
  productionReceiptController,
  salesOrderController,
  logisticsController,
  stockOutboundController,
  carrierController,
  notificationController,
  shipmentController,
} from '../controllers/transactionController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

// ===== Carriers =====
router.get('/carriers', carrierController.getAll);
router.get('/carriers/:id', carrierController.getById);
router.post('/carriers', authorize('admin', 'logistics'), carrierController.create);
router.put('/carriers/:id', authorize('admin', 'logistics'), carrierController.update);
router.delete('/carriers/:id', authorize('admin', 'logistics'), carrierController.delete);

// ===== Notifications =====
router.get('/notifications', notificationController.getAll);
router.get('/notifications/:id', notificationController.getById);
router.post('/notifications/:id/resolve', authorize('admin', 'logistics', 'warehouse'), notificationController.resolve);
router.delete('/notifications/:id', authorize('admin'), notificationController.delete);

// ===== Shipments =====
router.get('/shipments/tracking', authorize('admin', 'logistics'), shipmentController.getAllTracking);
router.get('/shipments/steps', shipmentController.getSteps);
router.get('/shipments/rejection-reasons', shipmentController.getRejectionReasons);
router.get('/shipments/:salesOrderId', shipmentController.getByOrderId);
router.post('/shipments', authorize('admin', 'logistics'), shipmentController.create);
router.post('/shipments/create-and-forward', authorize('admin', 'logistics'), shipmentController.createAndForward);
router.post('/shipments/:salesOrderId/simulate-delivery', authorize('admin', 'logistics'), shipmentController.simulateDelivery);
router.post('/shipments/:salesOrderId/advance', authorize('admin', 'logistics'), shipmentController.advanceStep);
router.post('/shipments/:salesOrderId/confirm-received', authorize('admin', 'logistics'), shipmentController.confirmReceived);
router.post('/shipments/:salesOrderId/customer-reject', authorize('admin', 'logistics'), shipmentController.customerReject);

// ===== Sales Orders
router.get('/sales-orders', salesOrderController.getAll);
router.get('/sales-orders/:id', salesOrderController.getById);
router.post('/sales-orders', authorize('admin', 'sales'), salesOrderController.create);
router.put('/sales-orders/:id', authorize('admin', 'sales'), salesOrderController.update);
router.post('/sales-orders/:id/process-logistics', authorize('admin', 'logistics'), salesOrderController.processLogistics);
router.post('/sales-orders/:id/report-issue', authorize('admin', 'warehouse'), salesOrderController.reportWarehouseIssue);
router.post('/sales-orders/:id/export', authorize('admin', 'warehouse'), salesOrderController.exportOrder);
router.post('/sales-orders/:id/confirm-delivery', authorize('admin', 'logistics'), salesOrderController.confirmDelivery);
router.post('/sales-orders/:id/return-inventory', authorize('admin', 'logistics'), salesOrderController.returnInventory);
router.post('/sales-orders/:id/warehouse-reject', authorize('admin', 'warehouse'), salesOrderController.warehouseReject);
router.post('/sales-orders/:id/warehouse-delay', authorize('admin', 'warehouse'), salesOrderController.warehouseDelay);
router.post('/sales-orders/:id/confirm-delay', authorize('admin', 'sales'), salesOrderController.confirmDelay);
router.post('/sales-orders/:id/resend-to-warehouse', authorize('admin', 'sales'), salesOrderController.resendToWarehouse);
router.post('/sales-orders/:id/recreate', authorize('admin', 'sales'), salesOrderController.recreateOrder);
router.delete('/sales-orders/:id', authorize('admin', 'sales'), salesOrderController.delete);

// Logistics
router.get('/logistics', authorize('admin', 'logistics'), logisticsController.getAll);
router.post('/logistics/forward', authorize('admin', 'logistics'), logisticsController.forwardToWarehouse);
router.post('/logistics/reject', authorize('admin', 'logistics'), logisticsController.rejectOrder);
router.post('/logistics/confirm-delivery', authorize('admin', 'logistics'), logisticsController.confirmDelivery);

// Stock Outbound
router.get('/stock-outbound', authorize('admin', 'warehouse'), stockOutboundController.getAll);
router.get('/stock-outbound/pending', authorize('admin', 'warehouse'), stockOutboundController.getPendingRequests);
router.get('/stock-outbound/:id', stockOutboundController.getById);
router.post('/stock-outbound', authorize('admin', 'warehouse'), stockOutboundController.create);
router.post('/stock-outbound/:salesOrderId/respond', authorize('admin', 'warehouse'), stockOutboundController.respondOutbound);
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
