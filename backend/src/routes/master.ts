import { Router } from 'express';
import { customerController, warehouseController, productController, categoryController } from '../controllers/masterController';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customers
router.get('/customers', customerController.getAll);
router.get('/customers/:id', customerController.getById);
router.post('/customers', authorize('admin', 'sales'), customerController.create);
router.put('/customers/:id', authorize('admin', 'sales'), customerController.update);
router.delete('/customers/:id', authorize('admin', 'sales'), customerController.delete);

// Warehouses
router.get('/warehouses', warehouseController.getAll);
router.get('/warehouses/:id', warehouseController.getById);
router.post('/warehouses', authorize('admin'), warehouseController.create);
router.put('/warehouses/:id', authorize('admin'), warehouseController.update);
router.delete('/warehouses/:id', authorize('admin'), warehouseController.delete);

// Products
router.get('/products', productController.getAll);
router.get('/products/:id', productController.getById);
router.post('/products', authorize('admin'), productController.create);
router.put('/products/:id', authorize('admin'), productController.update);
router.delete('/products/:id', authorize('admin'), productController.delete);
router.get('/products/categories/list', productController.getCategories);

// Categories
router.get('/categories', categoryController.getAll);
router.get('/categories/:id', categoryController.getById);
router.post('/categories', authorize('admin'), categoryController.create);
router.put('/categories/:id', authorize('admin'), categoryController.update);
router.delete('/categories/:id', authorize('admin'), categoryController.delete);

export default router;

