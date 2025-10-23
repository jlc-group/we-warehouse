import { Router } from 'express';
import { StockController } from '../controllers/stockController.js';

const router = Router();

// Debug routes
router.get('/debug/tables', StockController.getTableList);
router.get('/debug/table-columns/:tableName', StockController.getTableColumns);
router.get('/debug/transfer-table', StockController.checkTransferTable);

// GET /api/stock/transfers - Get transfer documents from CSStkMove
router.get('/transfers', StockController.getTransferDocuments);

// GET /api/stock/stock-card/filters - Get filter options from CSSTOCKCARD
router.get('/stock-card/filters', StockController.getStockCardFilters);

// GET /api/stock/stock-card - Get stock movements from CSSTOCKCARD
router.get('/stock-card', StockController.getStockCard);

export default router;
