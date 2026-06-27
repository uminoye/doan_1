import { Router } from 'express';
import { reportController } from '../controllers/transactionController';
import { authenticate } from '../middlewares/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', reportController.getDashboard);
router.get('/inventory', reportController.getInventory);
router.get('/inventory/defective', reportController.getDefectiveInventory);
router.get('/inbound', reportController.getInbound);
router.get('/outbound', reportController.getOutbound);
router.get('/transactions', reportController.getTransactions);

export default router;
