/**
 * Shipment Service - Frontend client for shipment tracking
 * Uses ShipmentStatus state machine to prevent invalid transitions.
 */

import { getBackendRoot } from '@/lib/apiConfig';
import { type ShipmentStatus, canTransition } from '@/lib/shipmentStatus';

const BACKEND_URL = `${getBackendRoot()}/api`;

export interface ShipmentOrder {
    id: string;
    taxno: string;
    docno: string;
    taxdate: string;
    arcode: string;
    arname: string;
    total_amount: number;
    item_count: number;
    status: ShipmentStatus;
    assigned_to?: string;
    assigned_at?: string;
    picked_at?: string;
    shipped_at?: string;
    confirmed_at?: string;
    picked_by?: string;
    confirmed_by?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Validate state transition before sending to backend.
 * Throws if invalid — UI should catch and show toast.
 */
export function validateShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): void {
    if (!canTransition(from, to)) {
        throw new Error(
            `ไม่สามารถเปลี่ยนสถานะจาก "${from}" → "${to}" ได้ (ข้าม step)`
        );
    }
}

export interface ShipmentResponse {
    success: boolean;
    data?: ShipmentOrder[];
    message?: string;
    error?: string;
}

/**
 * ดึงรายการ shipments
 */
export async function getShipments(status?: string, taxdate?: string): Promise<ShipmentOrder[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (taxdate) params.append('taxdate', taxdate);

    const url = `${BACKEND_URL}/shipments?${params}`;
    const response = await fetch(url);
    const result: ShipmentResponse = await response.json();

    if (!result.success) {
        throw new Error(result.error || 'Failed to fetch shipments');
    }

    return result.data || [];
}

/**
 * สร้างหรืออัพเดท shipment
 */
export async function createShipment(data: {
    taxno: string;
    docno: string;
    taxdate: string;
    arcode: string;
    arname: string;
    total_amount?: number;
    item_count?: number;
}): Promise<ShipmentOrder> {
    const response = await fetch(`${BACKEND_URL}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || 'Failed to create shipment');
    }

    return result.data;
}

/**
 * หยิบสินค้า (pending → picked)
 */
export async function pickShipment(taxno: string, docno: string, picked_by?: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${BACKEND_URL}/shipments/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxno, docno, picked_by })
    });

    return response.json();
}

/**
 * หยิบหลายรายการ (bulk pick)
 */
export async function bulkPickShipments(items: { taxno: string; docno: string }[], picked_by?: string): Promise<{ success: boolean; success_count?: number; failed_count?: number; message?: string }> {
    const response = await fetch(`${BACKEND_URL}/shipments/bulk-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, picked_by })
    });

    return response.json();
}

/**
 * ส่งสินค้า (picked → shipped)
 */
export async function shipShipment(taxno: string, docno: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${BACKEND_URL}/shipments/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxno, docno })
    });

    return response.json();
}

/**
 * ส่งหลายรายการ (bulk ship)
 */
export async function bulkShipShipments(items: { taxno: string; docno: string }[]): Promise<{ success: boolean; success_count?: number; failed_count?: number; message?: string }> {
    const response = await fetch(`${BACKEND_URL}/shipments/bulk-ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
    });

    return response.json();
}

/**
 * ยืนยันรายการ
 */
export async function confirmShipment(taxno: string, docno: string, confirmed_by?: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${BACKEND_URL}/shipments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxno, docno, confirmed_by })
    });

    return response.json();
}

/**
 * ยกเลิกรายการ
 */
export async function cancelShipment(taxno: string, docno: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${BACKEND_URL}/shipments/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxno, docno })
    });

    return response.json();
}

/**
 * สร้าง shipments จาก packing orders แล้วหยิบทันที
 */
export async function createAndPickShipments(orders: Array<{
    taxno: string;
    docno: string;
    taxdate: string;
    arcode: string;
    arname: string;
    total_amount?: number;
    item_count?: number;
}>, picked_by?: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const order of orders) {
        try {
            // สร้าง shipment record
            await createShipment(order);

            // เปลี่ยนสถานะเป็น picked
            const result = await pickShipment(order.taxno, order.docno, picked_by);

            if (result.success) {
                success++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error('Error creating/picking shipment:', error);
            failed++;
        }
    }

    return { success, failed };
}

/**
 * Get list of workers for task assignment
 */
export async function getWorkersList(): Promise<{ email: string; full_name: string }[]> {
    const response = await fetch(`${BACKEND_URL}/shipments/workers`);
    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || 'Failed to fetch workers');
    }

    return result.data || [];
}

/**
 * Assign orders to a specific worker
 */
export async function assignOrdersToWorker(
    orders: Array<{
        taxno: string;
        docno: string;
        taxdate: string;
        arcode: string;
        arname: string;
        total_amount?: number;
        item_count?: number;
    }>,
    workerEmail: string,
    priority: string,
    assignedBy?: string
): Promise<{ success: boolean; assigned: number; message?: string }> {
    // First ensure orders exist in shipment_orders
    for (const order of orders) {
        try {
            await createShipment(order);
        } catch (error) {
            // Order may already exist, continue
        }
    }

    // Then assign to worker
    const orderIds = orders.map(o => o.docno);
    const response = await fetch(`${BACKEND_URL}/shipments/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderIds,
            workerEmail,
            priority
        })
    });

    return response.json();
}
