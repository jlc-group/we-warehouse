/**
 * Csmile Routes - API สำหรับเชื่อมต่อ Csmile
 */
import { Router, Request, Response } from 'express';
import { CsmileService } from '../services/csmileService.js';

const router = Router();

/**
 * GET /api/csmile/status - ตรวจสอบสถานะ Csmile integration
 */
router.get('/status', async (req: Request, res: Response) => {
    try {
        const enabled = CsmileService.isEnabled();
        const health = await CsmileService.healthCheck();

        res.json({
            success: true,
            data: {
                enabled,
                ...health,
                message: enabled
                    ? 'Csmile integration is configured'
                    : 'Csmile integration not configured - set CSMILE_API_KEY and CSMILE_ENABLED=true'
            }
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/csmile/sync - Sync shipped orders to Csmile
 */
router.post('/sync', async (req: Request, res: Response) => {
    try {
        const { taxdate } = req.body;

        if (!taxdate) {
            return res.status(400).json({
                success: false,
                error: 'taxdate is required'
            });
        }

        const result = await CsmileService.syncShippedOrders(taxdate);

        res.json({
            success: true,
            data: result,
            message: `Synced ${result.success} orders to Csmile${result.failed > 0 ? `, ${result.failed} failed` : ''}`
        });
    } catch (error: any) {
        console.error('❌ Error syncing to Csmile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/csmile/send - ส่ง shipment เดียวไป Csmile
 */
router.post('/send', async (req: Request, res: Response) => {
    try {
        const payload = req.body;

        if (!payload.taxno || !payload.docno) {
            return res.status(400).json({
                success: false,
                error: 'taxno and docno are required'
            });
        }

        const result = await CsmileService.sendShipment(payload);

        res.json({
            success: result.success,
            data: result,
            message: result.message || result.error
        });
    } catch (error: any) {
        console.error('❌ Error sending to Csmile:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
