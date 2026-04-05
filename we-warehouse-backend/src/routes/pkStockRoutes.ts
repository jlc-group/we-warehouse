import { Router } from 'express';
import { PkStockController } from '../controllers/pkStockController.js';

const router = Router();

// GET /api/pk-stock/summary — สรุปภาพรวมสต็อก PK
router.get('/summary', PkStockController.getSummary);

// GET /api/pk-stock/products — รายการสินค้า PK พร้อมสต็อก (?search=&limit=&offset=&order=)
router.get('/products', PkStockController.getProducts);

// GET /api/pk-stock/product/:skuCode — ข้อมูลสต็อกแยกตำแหน่งของสินค้า PK ตัวเดียว
router.get('/product/:skuCode', PkStockController.getProductDetail);

export default router;
