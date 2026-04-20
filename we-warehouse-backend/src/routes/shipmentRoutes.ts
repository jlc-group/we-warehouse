/**
 * Shipment Routes - API สำหรับจัดการสถานะการจัดส่ง
 */
import { Router, Request, Response } from 'express';
import { ShipmentService } from '../services/shipmentService.js';

const router = Router();

/**
 * GET /api/shipments - ดึงรายการ shipments
 * Query params: status, taxdate
 */
router.get('/', async (req: Request, res: Response) => {
    try {
        const { status, taxdate } = req.query;
        const shipments = await ShipmentService.getShipments(
            status as string | undefined,
            taxdate as string | undefined
        );
        res.json({ success: true, data: shipments });
    } catch (error: any) {
        console.error('❌ Error fetching shipments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments - สร้างหรืออัพเดท shipment
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { taxno, docno, taxdate, arcode, arname, total_amount, item_count } = req.body;

        if (!taxno || !docno || !taxdate || !arcode) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const shipment = await ShipmentService.upsertShipment({
            taxno, docno, taxdate, arcode, arname, total_amount, item_count
        });

        res.json({ success: true, data: shipment });
    } catch (error: any) {
        console.error('❌ Error creating shipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/pick - เปลี่ยนสถานะเป็น picked
 */
router.post('/pick', async (req: Request, res: Response) => {
    try {
        const { taxno, docno, picked_by } = req.body;

        if (!taxno || !docno) {
            return res.status(400).json({ success: false, error: 'Missing taxno or docno' });
        }

        const result = await ShipmentService.markAsPicked(taxno, docno, picked_by || 'system');

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error: any) {
        console.error('❌ Error picking shipment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/bulk-pick - หยิบหลายรายการพร้อมกัน
 */
router.post('/bulk-pick', async (req: Request, res: Response) => {
    try {
        const { items, picked_by } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array is required' });
        }

        const result = await ShipmentService.bulkPick(items, picked_by || 'system');

        res.json({
            success: true,
            ...result,
            message: `สำเร็จ ${result.success} รายการ, ไม่สำเร็จ ${result.failed} รายการ`
        });
    } catch (error: any) {
        console.error('❌ Error bulk picking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/ship - เปลี่ยนสถานะเป็น shipped
 */
router.post('/ship', async (req: Request, res: Response) => {
    try {
        const { taxno, docno } = req.body;

        if (!taxno || !docno) {
            return res.status(400).json({ success: false, error: 'Missing taxno or docno' });
        }

        const result = await ShipmentService.markAsShipped(taxno, docno);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error: any) {
        console.error('❌ Error shipping:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/bulk-ship - ส่งหลายรายการพร้อมกัน
 */
router.post('/bulk-ship', async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Items array is required' });
        }

        const result = await ShipmentService.bulkShip(items);

        res.json({
            success: true,
            ...result,
            message: `สำเร็จ ${result.success} รายการ, ไม่สำเร็จ ${result.failed} รายการ`
        });
    } catch (error: any) {
        console.error('❌ Error bulk shipping:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/confirm - ยืนยันรายการ
 */
router.post('/confirm', async (req: Request, res: Response) => {
    try {
        const { taxno, docno, confirmed_by } = req.body;

        if (!taxno || !docno) {
            return res.status(400).json({ success: false, error: 'Missing taxno or docno' });
        }

        const result = await ShipmentService.confirm(taxno, docno, confirmed_by || 'system');

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error: any) {
        console.error('❌ Error confirming:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/cancel - ยกเลิกรายการ
 */
router.post('/cancel', async (req: Request, res: Response) => {
    try {
        const { taxno, docno } = req.body;

        if (!taxno || !docno) {
            return res.status(400).json({ success: false, error: 'Missing taxno or docno' });
        }

        const result = await ShipmentService.cancel(taxno, docno);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error: any) {
        console.error('❌ Error cancelling:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== Task Assignment Routes ====================

/**
 * POST /api/shipments/assign - Assign orders to worker
 */
router.post('/assign', async (req: Request, res: Response) => {
    try {
        const { orderIds, workerEmail, priority } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, error: 'orderIds array is required' });
        }
        if (!workerEmail) {
            return res.status(400).json({ success: false, error: 'workerEmail is required' });
        }

        const result = await ShipmentService.assignToWorker(orderIds, workerEmail, priority || 'normal');
        res.json(result);
    } catch (error: any) {
        console.error('❌ Error assigning:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/shipments/my-tasks - Get tasks assigned to current worker
 */
router.get('/my-tasks', async (req: Request, res: Response) => {
    try {
        const workerEmail = req.query.email as string;

        if (!workerEmail) {
            return res.status(400).json({ success: false, error: 'email query param is required' });
        }

        const tasks = await ShipmentService.getMyTasks(workerEmail);
        res.json({ success: true, data: tasks });
    } catch (error: any) {
        console.error('❌ Error getting my tasks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/shipments/unassigned - Get all unassigned orders (admin)
 */
router.get('/unassigned', async (req: Request, res: Response) => {
    try {
        const orders = await ShipmentService.getUnassignedOrders();
        res.json({ success: true, data: orders });
    } catch (error: any) {
        console.error('❌ Error getting unassigned:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/shipments/assigned - Get all assigned orders (admin)
 */
router.get('/assigned', async (req: Request, res: Response) => {
    try {
        const orders = await ShipmentService.getAssignedOrders();
        res.json({ success: true, data: orders });
    } catch (error: any) {
        console.error('❌ Error getting assigned:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/start-picking - Start picking an order (mobile)
 */
router.post('/start-picking', async (req: Request, res: Response) => {
    try {
        const { orderId, workerEmail } = req.body;

        if (!orderId || !workerEmail) {
            return res.status(400).json({ success: false, error: 'orderId and workerEmail are required' });
        }

        const result = await ShipmentService.startPicking(orderId, workerEmail);
        res.json(result);
    } catch (error: any) {
        console.error('❌ Error starting picking:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/assign - Assign orders to a worker (admin)
 */
router.post('/assign', async (req: Request, res: Response) => {
    try {
        const { orderIds, workerEmail, priority } = req.body;

        if (!orderIds || !workerEmail) {
            return res.status(400).json({ success: false, error: 'orderIds and workerEmail are required' });
        }

        const result = await ShipmentService.assignToWorker(orderIds, workerEmail, priority || 'normal');
        res.json(result);
    } catch (error: any) {
        console.error('❌ Error assigning:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/shipments/unassign - Unassign an order (admin)
 */
router.post('/unassign', async (req: Request, res: Response) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({ success: false, error: 'orderId is required' });
        }

        const result = await ShipmentService.unassignOrder(orderId);
        res.json(result);
    } catch (error: any) {
        console.error('❌ Error unassigning:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/shipments/workers - Get list of workers (admin)
 */
router.get('/workers', async (req: Request, res: Response) => {
    try {
        const workers = await ShipmentService.getWorkersList();
        res.json({ success: true, data: workers });
    } catch (error: any) {
        console.error('❌ Error getting workers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
