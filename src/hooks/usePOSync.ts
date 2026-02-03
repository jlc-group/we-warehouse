/**
 * usePOSync Hook
 * Hook for syncing POs from JLC API to local database
 */
import { useState } from 'react';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';

interface SyncResult {
    success: boolean;
    synced: number;
    errors: string[];
    details: {
        po_number: string;
        status: 'created' | 'updated' | 'skipped' | 'error';
        message?: string;
    }[];
}

interface SyncParams {
    date_from?: string;
    date_to?: string;
    top?: number;
}

export function usePOSync() {
    const [syncing, setSyncing] = useState(false);
    const [lastResult, setLastResult] = useState<SyncResult | null>(null);

    const syncPOs = async (params: SyncParams = {}) => {
        setSyncing(true);
        try {
            // Default to last 7 days
            const now = new Date();
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(now.getDate() - 7);

            const syncParams = {
                date_from: params.date_from || sevenDaysAgo.toISOString().split('T')[0],
                date_to: params.date_to || now.toISOString().split('T')[0],
                top: params.top || 50
            };

            console.log('🔄 Starting PO sync...', syncParams);

            const response = await fetch(`${getBackendUrl()}/sync-po`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(syncParams)
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const result: SyncResult = await response.json();
            setLastResult(result);

            if (result.success) {
                if (result.synced > 0) {
                    toast.success(`✅ Sync สำเร็จ: ${result.synced} PO ใหม่`);
                } else {
                    toast('ℹ️ ไม่มี PO ใหม่');
                }
            } else {
                toast.error(`❌ Sync ล้มเหลว: ${result.errors[0] || 'Unknown error'}`);
            }

            return result;

        } catch (error: any) {
            console.error('❌ Sync error:', error);
            toast.error(`❌ Error: ${error.message}`);

            const errorResult: SyncResult = {
                success: false,
                synced: 0,
                errors: [error.message],
                details: []
            };
            setLastResult(errorResult);
            return errorResult;

        } finally {
            setSyncing(false);
        }
    };

    return {
        syncing,
        lastResult,
        syncPOs
    };
}

// Helper to get backend URL
function getBackendUrl(): string {
    return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3004/api/local';
}

export default usePOSync;
