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
    { table: 'production_receipt_items', col: 'productId',      refTable: 'products',      name: 'production_receipt_items_productId_fkey' },
    { table: 'sales_order_items',        col: 'productId',      refTable: 'products',      name: 'sales_order_items_productId_fkey' },
    { table: 'stock_outbound_items',     col: 'productId',      refTable: 'products',      name: 'stock_outbound_items_productId_fkey' },
    { table: 'inventory_balances',       col: 'productId',      refTable: 'products',      name: 'inventory_balances_productId_fkey' },
    { table: 'inventory_transactions',   col: 'productId',      refTable: 'products',      name: 'inventory_transactions_productId_fkey' },
    { table: 'sales_order_items',        col: 'salesOrderId',   refTable: 'sales_orders',  name: 'sales_order_items_salesOrderId_fkey' },
    { table: 'delivery_requests',        col: 'salesOrderId',   refTable: 'sales_orders',  name: 'delivery_requests_salesOrderId_fkey' },
    { table: 'stock_outbound_notes',     col: 'salesOrderId',   refTable: 'sales_orders',  name: 'stock_outbound_notes_salesOrderId_fkey' },
    { table: 'stock_outbound_notes',     col: 'warehouseId',    refTable: 'warehouses',    name: 'stock_outbound_notes_warehouseId_fkey' },
    { table: 'inventory_balances',       col: 'warehouseId',    refTable: 'warehouses',    name: 'inventory_balances_warehouseId_fkey' },
    { table: 'inventory_transactions',   col: 'warehouseId',    refTable: 'warehouses',    name: 'inventory_transactions_warehouseId_fkey' },
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
