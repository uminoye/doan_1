import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth';
import masterRoutes from './routes/master';
import transactionRoutes from './routes/transactions';
import reportRoutes from './routes/reports';

const app = express();

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

app.listen(config.port, () => {
  console.log(`🚀 WMS Backend running on port ${config.port}`);
  console.log(`📦 Environment: ${config.nodeEnv}`);
});

export default app;
