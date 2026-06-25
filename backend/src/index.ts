import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import { prisma } from './models/prisma';
import authRoutes from './routes/auth';
import masterRoutes from './routes/master';
import transactionRoutes from './routes/transactions';
import reportRoutes from './routes/reports';

const app = express();

// Auto-apply ON DELETE CASCADE to FK constraints on startup
async function applyCascadeConstraints() {
  const fks = [
    // Product-related (PascalCase = Prisma default for PostgreSQL)
    { table: 'ProductionReceiptItem',    col: 'productId',    refTable: 'Product',       name: 'ProductionReceiptItem_productId_fkey' },
    { table: 'SalesOrderItem',           col: 'productId',    refTable: 'Product',       name: 'SalesOrderItem_productId_fkey' },
    { table: 'StockOutboundItem',        col: 'productId',    refTable: 'Product',       name: 'StockOutboundItem_productId_fkey' },
    { table: 'InventoryBalance',         col: 'productId',    refTable: 'Product',       name: 'InventoryBalance_productId_fkey' },
    { table: 'InventoryTransaction',     col: 'productId',    refTable: 'Product',       name: 'InventoryTransaction_productId_fkey' },
    // SalesOrder-related
    { table: 'SalesOrderItem',           col: 'salesOrderId', refTable: 'SalesOrder',    name: 'SalesOrderItem_salesOrderId_fkey' },
    { table: 'DeliveryRequest',          col: 'salesOrderId', refTable: 'SalesOrder',    name: 'DeliveryRequest_salesOrderId_fkey' },
    { table: 'StockOutboundNote',        col: 'salesOrderId', refTable: 'SalesOrder',    name: 'StockOutboundNote_salesOrderId_fkey' },
    // Warehouse-related
    { table: 'StockOutboundNote',        col: 'warehouseId',  refTable: 'Warehouse',     name: 'StockOutboundNote_warehouseId_fkey' },
    { table: 'InventoryBalance',         col: 'warehouseId',  refTable: 'Warehouse',     name: 'InventoryBalance_warehouseId_fkey' },
    { table: 'InventoryTransaction',     col: 'warehouseId',  refTable: 'Warehouse',     name: 'InventoryTransaction_warehouseId_fkey' },
  ];

  for (const fk of fks) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "${fk.table}"
          DROP CONSTRAINT IF EXISTS "${fk.name}",
          ADD CONSTRAINT "${fk.name}"
            FOREIGN KEY ("${fk.col}") REFERENCES "${fk.refTable}"("id") ON DELETE CASCADE
      `);
      console.log(`✅ ${fk.table}.${fk.col} → ${fk.refTable}`);
    } catch (e: any) {
      // Skip silently — table name mismatch or already updated
    }
  }
}

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

// Error handler
app.use(errorHandler);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Không tìm thấy API endpoint' });
});

app.listen(config.port, async () => {
  await applyCascadeConstraints();
  console.log(`🚀 WMS Backend running on port ${config.port}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
});

export default app;
