import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, PackageCheck, Search, CheckCircle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { recordShip } from '@/services/movementService';

interface PickItem {
    id: string;
    product_name: string;
    sku: string;
    quantity_to_pick: number;
    quantity_picked: number;
    location: string;
    status: 'pending' | 'picked';
}

const MobilePick = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [step, setStep] = useState<'scan_order' | 'pick_items'>('scan_order');
    const [orderNumber, setOrderNumber] = useState('');
    const [orderData, setOrderData] = useState<any>(null);
    const [pickList, setPickList] = useState<PickItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Active picking
    const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);
    const [scannedLocation, setScannedLocation] = useState('');
    const [pickedQty, setPickedQty] = useState(0);

    useScanner({
        onScan: (code) => {
            if (step === 'scan_order') {
                setOrderNumber(code);
                handleLoadOrder(code);
            } else if (activeItemIndex !== -1) {
                // We're in picking mode, scan should be location verification
                setScannedLocation(code);
            }
        }
    });

    const handleLoadOrder = async (orderId: string) => {
        if (!orderId) return;
        setLoading(true);
        try {
            // Find order from local database
            const { data: order, error } = await localDb
                .from('customer_orders')
                .select('*')
                .eq('order_number', orderId)
                .single();

            if (error) throw error;
            if (!order) throw new Error('Order not found');

            // Get order items from local database
            const { data: orderItems } = await localDb
                .from('order_items')
                .select('*')
                .eq('order_id', (order as any).id);

            // Transform order items to pick list with proper quantities
            // order_items already has location from when order was created
            const items: PickItem[] = [];

            for (const item of ((orderItems as any[]) || [])) {
                // Calculate total quantity to pick (L1*rate1 + L2*rate2 + L3)
                const l1Qty = item.ordered_quantity_level1 || 0;
                const l2Qty = item.ordered_quantity_level2 || 0;
                const l3Qty = item.ordered_quantity_level3 || 0;
                const totalQty = l1Qty + l2Qty + l3Qty; // หรือคำนวณเป็นชิ้นตาม rate

                let location = item.location;

                // If no location in order_item, try to find from inventory
                if (!location && item.sku) {
                    const { data: invItem } = await localDb
                        .from('inventory_items')
                        .select('location')
                        .eq('sku', item.sku)
                        .gt('quantity_pieces', 0)
                        .single();

                    location = invItem?.location || 'ไม่พบตำแหน่ง';
                }

                items.push({
                    id: item.id,
                    product_name: item.product_name || 'Unknown',
                    sku: item.sku || item.product_code,
                    quantity_to_pick: totalQty || item.quantity || 1,
                    quantity_picked: (item.picked_quantity_level1 || 0) + (item.picked_quantity_level2 || 0) + (item.picked_quantity_level3 || 0),
                    location: location || 'STAGING',
                    status: item.status === 'PICKED' ? 'picked' : 'pending'
                });
            }

            // Sort by location for optimized picking route (A->Z)
            items.sort((a, b) => a.location.localeCompare(b.location));

            setOrderData(order);
            setPickList(items);
            setStep('pick_items');
            toast.success(`Order ${orderId} loaded with ${items.length} items`);
        } catch (e: any) {
            toast.error(e.message || 'Error loading order');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectItem = (index: number) => {
        setActiveItemIndex(index);
        setPickedQty(pickList[index].quantity_to_pick);
        setScannedLocation('');
    };

    const handleConfirmPick = async () => {
        if (activeItemIndex === -1) return;

        const item = pickList[activeItemIndex];

        // Verify location (optional strict mode)
        if (scannedLocation && scannedLocation.toUpperCase() !== item.location.toUpperCase()) {
            toast.error(`Wrong location! Expected: ${item.location}`);
            return;
        }

        setLoading(true);
        try {
            // 1. Record movement for tracking
            await recordShip(
                item.sku,
                item.product_name,
                item.location,
                pickedQty,
                undefined, // warehouseId
                orderData?.id, // referenceId
                `Picked for order ${orderData?.order_number}`,
                user?.email
            );

            // 2. Update order_item status and picked quantities
            await localDb.from('order_items')
                .update({
                    picked_quantity_level3: pickedQty, // Store as pieces
                    status: 'PICKED',
                    picked_at: new Date().toISOString()
                })
                .eq('id', item.id);

            // 3. Update pick list UI
            const updated = [...pickList];
            updated[activeItemIndex] = {
                ...item,
                quantity_picked: pickedQty,
                status: 'picked'
            };
            setPickList(updated);
            setActiveItemIndex(-1);
            toast.success(`✅ Picked ${pickedQty} from ${item.location}`);

        } catch (e) {
            toast.error('Failed to record pick');
        } finally {
            setLoading(false);
        }
    };

    const handleCompletePicking = async () => {
        const unpicked = pickList.filter(i => i.status === 'pending');
        if (unpicked.length > 0) {
            toast.error(`${unpicked.length} items not picked yet`);
            return;
        }

        setLoading(true);
        try {
            // Update order status to "Picked" or "Ready to Ship"
            await localDb.from('customer_orders')
                .update({ status: 'READY_TO_SHIP' })
                .eq('id', orderData.id);

            toast.success('Picking complete! Order ready to ship.');

            // Reset
            setStep('scan_order');
            setOrderNumber('');
            setOrderData(null);
            setPickList([]);
        } catch (e) {
            toast.error('Failed to complete picking');
        } finally {
            setLoading(false);
        }
    };

    const activeItem = activeItemIndex !== -1 ? pickList[activeItemIndex] : null;

    return (
        <MobileLayout title="Outbound Pick" showBack={true}>
            {step === 'scan_order' && (
                <div className="flex flex-col items-center justify-center p-4 py-10 space-y-4">
                    <PackageCheck className="w-20 h-20 text-orange-300" />
                    <h2 className="text-xl font-semibold">Scan Order / Wave #</h2>
                    <div className="flex gap-2 w-full">
                        <Input
                            value={orderNumber}
                            onChange={e => setOrderNumber(e.target.value)}
                            placeholder="ORD-2024-XXXX"
                            className="text-center text-lg h-12 uppercase"
                            autoFocus
                        />
                        <Button onClick={() => handleLoadOrder(orderNumber)} className="h-12 w-12 p-0 bg-orange-500 hover:bg-orange-600">
                            <Search />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'pick_items' && (
                <>
                    {/* Item List View */}
                    {!activeItem && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-orange-50 p-3 rounded border border-orange-100">
                                <span className="font-bold text-orange-800">{orderData?.order_number}</span>
                                <span className="text-xs text-orange-600">
                                    {pickList.filter(i => i.status === 'picked').length}/{pickList.length} Picked
                                </span>
                            </div>

                            <div className="space-y-2">
                                {pickList.map((item, index) => (
                                    <Card
                                        key={item.id}
                                        className={`cursor-pointer transition-colors ${item.status === 'picked' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
                                        onClick={() => item.status !== 'picked' && handleSelectItem(index)}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-sm">{item.product_name}</p>
                                                    <p className="text-xs text-gray-500">{item.sku}</p>
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                                                        <MapPin className="h-3 w-3" />
                                                        <span className="font-mono">{item.location}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {item.status === 'picked' ? (
                                                        <span className="text-green-600 font-bold text-lg">✓ {item.quantity_picked}</span>
                                                    ) : (
                                                        <span className="font-bold text-lg">{item.quantity_to_pick}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Button
                                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 h-12 text-lg"
                                onClick={handleCompletePicking}
                                disabled={pickList.some(i => i.status === 'pending')}
                            >
                                <CheckCircle className="mr-2" /> Complete Picking
                            </Button>
                        </div>
                    )}

                    {/* Active Picking View */}
                    {activeItem && (
                        <div className="space-y-4">
                            <Card className="bg-orange-50 border-orange-200">
                                <CardContent className="p-4">
                                    <h3 className="font-bold text-lg text-orange-900">{activeItem.product_name}</h3>
                                    <p className="text-orange-600">{activeItem.sku}</p>
                                    <div className="mt-2 flex items-center gap-2 text-lg font-mono bg-white p-2 rounded border">
                                        <MapPin className="text-blue-500" />
                                        <span className="font-bold">{activeItem.location}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm font-bold mb-1 block">Scan Location (Optional)</label>
                                    <Input
                                        value={scannedLocation}
                                        onChange={e => setScannedLocation(e.target.value)}
                                        placeholder="Scan to verify"
                                        className="uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-bold mb-1 block">Quantity Picked</label>
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="outline"
                                            className="h-12 w-12 rounded-full text-xl"
                                            onClick={() => setPickedQty(Math.max(0, pickedQty - 1))}
                                        >-</Button>
                                        <Input
                                            type="number"
                                            value={pickedQty}
                                            onChange={(e) => setPickedQty(Number(e.target.value))}
                                            className="text-center text-3xl font-bold h-16 flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            className="h-12 w-12 rounded-full text-xl"
                                            onClick={() => setPickedQty(pickedQty + 1)}
                                        >+</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1 h-12" onClick={() => setActiveItemIndex(-1)}>Cancel</Button>
                                <Button className="flex-1 bg-orange-500 h-12 hover:bg-orange-600" onClick={handleConfirmPick}>
                                    <CheckCircle className="mr-2" /> Confirm Pick
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </MobileLayout>
    );
};

export default MobilePick;
