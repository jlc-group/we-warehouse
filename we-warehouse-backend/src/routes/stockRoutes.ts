import { Router } from 'express';
import { StockController } from '../controllers/stockController.js';

const router = Router();

// GET /api/stock/stock-card - Get stock movements from CSSTOCKCARD
router.get('/stock-card', StockController.getStockCard);

export default router;
