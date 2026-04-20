/**
 * Shipment Status State Machine
 *
 * Defines allowed state transitions for shipment_orders.status to prevent
 * invalid updates (e.g. skipping pick step, reopening confirmed orders).
 *
 * Flow:
 *   pending → assigned → picking_in_progress → picked → shipped → confirmed
 *                                                                  ↑
 *                                                                (final)
 *
 *   Any state (except final) → cancelled
 */

export type ShipmentStatus =
    | 'pending'
    | 'assigned'
    | 'picking_in_progress'
    | 'picked'
    | 'shipped'
    | 'confirmed'
    | 'cancelled';

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
    pending: 'รอจัด',
    assigned: 'มอบหมายแล้ว',
    picking_in_progress: 'กำลังหยิบ',
    picked: 'หยิบแล้ว',
    shipped: 'ส่งแล้ว',
    confirmed: 'ยืนยันแล้ว',
    cancelled: 'ยกเลิก',
};

export const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, string> = {
    pending: 'bg-gray-100 text-gray-700',
    assigned: 'bg-blue-100 text-blue-700',
    picking_in_progress: 'bg-amber-100 text-amber-700',
    picked: 'bg-purple-100 text-purple-700',
    shipped: 'bg-green-100 text-green-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
};

/**
 * Valid state transitions. Each key lists the allowed next states.
 * Empty array = terminal state (no further transitions).
 */
export const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
    pending: ['assigned', 'cancelled'],
    assigned: ['picking_in_progress', 'cancelled'],
    picking_in_progress: ['picked', 'cancelled'],
    picked: ['shipped', 'cancelled'],
    shipped: ['confirmed', 'cancelled'],
    confirmed: [], // terminal
    cancelled: [], // terminal
};

/**
 * Check if a status transition is allowed.
 *
 * @example canTransition('pending', 'assigned')   // → true
 * @example canTransition('pending', 'shipped')    // → false (skip step)
 * @example canTransition('confirmed', 'pending')  // → false (reopen)
 */
export function canTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return Array.isArray(allowed) && allowed.includes(to);
}

/**
 * Assert a transition is valid, throw if not.
 * Use in services before UPDATE.
 */
export function assertTransition(from: ShipmentStatus, to: ShipmentStatus): void {
    if (!canTransition(from, to)) {
        throw new Error(
            `Invalid shipment status transition: ${from} → ${to}. ` +
            `Allowed: ${VALID_TRANSITIONS[from]?.join(', ') || '(none — terminal state)'}`
        );
    }
}

/**
 * Get next recommended action label for UI buttons.
 */
export function getNextActionLabel(status: ShipmentStatus): string | null {
    switch (status) {
        case 'pending': return 'มอบหมาย';
        case 'assigned': return 'เริ่มหยิบ';
        case 'picking_in_progress': return 'ยืนยันหยิบเสร็จ';
        case 'picked': return 'จัดส่ง';
        case 'shipped': return 'ยืนยันส่งถึง';
        default: return null;
    }
}

/**
 * Is this a terminal state (no more changes allowed)?
 */
export function isTerminalStatus(status: ShipmentStatus): boolean {
    return VALID_TRANSITIONS[status]?.length === 0;
}
