import { Router } from 'express';
import { SalesController } from '../controllers/salesController.js';

const router = Router();

/**
 * Sales Order Routes
 */

// GET /api/sales/packing-list - Generate packing list (must be before /:docno)
router.get('/packing-list', SalesController.getPackingList);

// GET /api/sales - Get all sales orders with filters
router.get('/', SalesController.getSalesOrders);

// GET /api/sales/:docno - Get single sales order by document number
router.get('/:docno', SalesController.getSalesOrderById);

// GET /api/sales/:docno/items - Get line items for sales order
router.get('/:docno/items', SalesController.getSalesLineItems);

export default router;
