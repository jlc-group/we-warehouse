/**
 * Scheduler Service
 * Scheduled tasks using node-cron
 */
import { POSyncService } from './poSyncService.js';
import { getLocalPool } from '../config/localDatabase.js';

// Cron expression for every 6 hours: At minute 0 of hours 0, 6, 12, 18
const SYNC_SCHEDULE = '0 */6 * * *';

// Simple in-memory scheduler using setInterval
class SchedulerService {
    private intervalId: NodeJS.Timeout | null = null;
    private cleanupIntervalId: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start the scheduled PO sync
     * Runs every 6 hours (21600000 ms)
     */
    start() {
        if (this.isRunning) {
            console.log('⏰ Scheduler already running');
            return;
        }

        // Sync interval: 6 hours = 6 * 60 * 60 * 1000 = 21600000 ms
        const SIX_HOURS = 6 * 60 * 60 * 1000;

        console.log('⏰ Starting PO Sync Scheduler...');
        console.log(`📅 Schedule: Every 6 hours`);
        console.log(`⏱️  Next sync at: ${new Date(Date.now() + SIX_HOURS).toLocaleString('th-TH')}`);

        // Set up interval
        this.intervalId = setInterval(async () => {
            await this.runScheduledSync();
        }, SIX_HOURS);

        // Inventory cleanup job — รายชั่วโมง ลบ row qty=0/0/0 (safety net)
        const ONE_HOUR = 60 * 60 * 1000;
        this.cleanupIntervalId = setInterval(async () => {
            await this.runInventoryCleanup();
        }, ONE_HOUR);
        // Run once on startup ด้วย (กัน row ที่ค้างจากก่อนเปิดระบบ)
        this.runInventoryCleanup();

        this.isRunning = true;
        console.log('✅ Scheduler started — PO sync every 6h + inventory cleanup hourly');
    }

    /**
     * Hourly cleanup: ลบ row inventory_items ที่ qty ทั้ง 3 levels = 0
     * (safety net ในกรณี trigger พลาด หรือมี row ค้างจาก client เก่า)
     */
    async runInventoryCleanup() {
        try {
            const pool = getLocalPool();
            const result = await pool.query(`
                DELETE FROM inventory_items
                WHERE COALESCE(unit_level1_quantity, 0) = 0
                  AND COALESCE(unit_level2_quantity, 0) = 0
                  AND COALESCE(unit_level3_quantity, 0) = 0
                RETURNING id
            `);
            if (result.rowCount && result.rowCount > 0) {
                console.log(`🧹 [CLEANUP] Deleted ${result.rowCount} zero-qty inventory rows`);
            }
        } catch (error: any) {
            console.error('❌ Inventory cleanup failed:', error.message);
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
        this.isRunning = false;
        console.log('⏹️  Scheduler stopped');
    }

    /**
     * Run the scheduled PO sync
     */
    async runScheduledSync() {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🔄 [SCHEDULED] Starting PO sync at ${new Date().toLocaleString('th-TH')}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        try {
            const result = await POSyncService.syncAllPOs({
                // Default: last 7 days
            });

            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📊 Scheduled Sync Results:');
            console.log(`   ✅ Success: ${result.success}`);
            console.log(`   📦 New POs synced: ${result.synced}`);
            console.log(`   ❌ Errors: ${result.errors.length}`);

            if (result.errors.length > 0) {
                result.errors.forEach((err, i) => {
                    console.log(`   ⚠️  Error ${i + 1}: ${err}`);
                });
            }

            // Calculate next sync time
            const nextSync = new Date(Date.now() + 6 * 60 * 60 * 1000);
            console.log(`   ⏱️  Next sync: ${nextSync.toLocaleString('th-TH')}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        } catch (error: any) {
            console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('❌ Scheduled sync failed:', error.message);
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        }
    }

    /**
     * Get scheduler status
     */
    getStatus() {
        return {
            running: this.isRunning,
            schedule: 'Every 6 hours',
            nextRun: this.isRunning
                ? new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
                : null
        };
    }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
export default schedulerService;
