/**
 * Scheduler Service
 * Scheduled tasks using node-cron
 */
import { POSyncService } from './poSyncService.js';

// Cron expression for every 6 hours: At minute 0 of hours 0, 6, 12, 18
const SYNC_SCHEDULE = '0 */6 * * *';

// Simple in-memory scheduler using setInterval
class SchedulerService {
    private intervalId: NodeJS.Timeout | null = null;
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

        this.isRunning = true;

        // Also run immediately on startup (optional - comment out if not needed)
        // this.runScheduledSync();

        console.log('✅ Scheduler started successfully');
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.isRunning = false;
            console.log('⏹️  Scheduler stopped');
        }
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
