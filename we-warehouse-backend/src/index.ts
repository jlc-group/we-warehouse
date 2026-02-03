console.log('DEBUG: Starting src/index.ts...');
import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import salesRoutes from './routes/salesRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import localRoutes from './routes/localRoutes.js';
import shipmentRoutes from './routes/shipmentRoutes.js';
import csmileRoutes from './routes/csmileRoutes.js';
import { SalesController } from './controllers/salesController.js';
import { getConnection } from './config/database.js';
import { testLocalConnection } from './config/localDatabase.js';
import { schedulerService } from './services/schedulerService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet()); // Security headers
app.use(corsMiddleware); // CORS configuration
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', SalesController.healthCheck);

// API Routes
app.use('/api/sales', salesRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/local', localRoutes);  // Local PostgreSQL routes for warehouse data
app.use('/api/shipments', shipmentRoutes);  // Shipment tracking routes
app.use('/api/csmile', csmileRoutes);  // Csmile integration routes (prepared)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'We-Warehouse Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      sales: '/api/sales',
      salesById: '/api/sales/:docno',
      salesItems: '/api/sales/:docno/items',
      salesSummary: '/api/sales/summary',
      topProducts: '/api/sales/top-products',
      customerSales: '/api/customers/:arcode/sales',
      packingList: '/api/sales/packing-list'
    },
    documentation: 'See EXTERNAL_SALES_GUIDE.md for full API documentation'
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  // Start server first
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.DB_DATABASE}`);
    console.log(`🌐 API endpoints available at http://localhost:${PORT}`);
    console.log(`\n📋 Available routes:`);
    console.log(`   GET  /health`);
    console.log(`   GET  /api/sales`);
    console.log(`   GET  /api/sales/packing-list`);
    console.log(`   GET  /api/sales/:docno`);
    console.log(`   GET  /api/sales/:docno/items`);
    console.log(`   GET  /api/stock/stock-card`);
    console.log(`   GET  /api/analytics/product-comparison`);
    console.log(`   GET  /api/analytics/customer-comparison`);
  });

  // Test database connection (non-blocking)
  console.log('\n🔌 Testing database connection...');
  try {
    await getConnection();
    console.log('✅ Database connected successfully!');
  } catch (error) {
    console.error('⚠️  Database connection failed (server still running):', error.message);
    console.log('💡 Server is ready to accept requests, but database queries will fail until connection is established.');
  }

  // Start PO Sync Scheduler (every 6 hours)
  console.log('\n⏰ Starting scheduled tasks...');
  schedulerService.start();
}

startServer();
