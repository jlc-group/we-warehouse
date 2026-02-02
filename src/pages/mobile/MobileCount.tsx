import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, ClipboardCheck, ScanLine, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';

const MobileCount = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Scan Location -> List Items -> Count Each
    const [step, setStep] = useState<'scan_location' | 'count_items'>('scan_location');
    const [location, setLocation] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Counting State
    const [activeItemIndex, setActiveItemIndex] = useState<number>(-1);
    const [countQty, setCountQty] = useState<number>(0);
    const [remarks, setRemarks] = useState('');

    useScanner({
        onScan: (code) => {
            if (activeItemIndex === -1) {
                // If not actively editing a quantity, assume location scan
                setLocation(code);
                handleLoadLocation(code);
            }
        }
    });

    const handleLoadLocation = async (locCode: string) => {
        if (!locCode) return;
        setLoading(true);
        try {
            // Check location exists from local database
            const { data: locData, error: locError } = await localDb
                .from('warehouse_locations')
                .select('location_code')
                .eq('location_code', locCode)
                .single();

            if (locError || !locData) throw new Error('Location not found');

            // Load Inventory from local database
            const { data: invData, error: invError } = await localDb
                .from('inventory_items')
                .select('*')
                .eq('location', locCode)
                .gt('quantity_pieces', 0); // Only active items

            if (invError) throw invError;

            // Transform for counting ui
            // We initialize 'counted_qty' with 0 for blind count, or system qty if guided (using blind for now)
            const countList = (invData || []).map((item: any) => ({
                ...item,
                counted_qty: null, // Null means not counted yet
                status: 'pending' // pending, counted
            }));

            setItems(countList);
            setStep('count_items');
            toast.success(`Location ${locCode} loaded`);
        } catch (e: any) {
            toast.error(e.message || 'Error loading location');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectForCount = (index: number) => {
        setActiveItemIndex(index);
        setCountQty(items[index].counted_qty || 0);
    };

    const handleSaveItemCount = () => {
        if (activeItemIndex === -1) return;

        const updatedItems = [...items];
        updatedItems[activeItemIndex] = {
            ...updatedItems[activeItemIndex],
            counted_qty: countQty,
            status: 'counted'
        };

        setItems(updatedItems);
        setActiveItemIndex(-1); // Back to list
        toast.success('Count saved');
    };

    const handleSubmitFinal = async () => {
        const uncounted = items.filter(i => i.status === 'pending');
        if (uncounted.length > 0) {
            toast('Warning: Some items not counted');
            // In strict mode, might block. Here we allow, assuming pending = missing?
            // For safety, let's just warn and require explicit action or assuming 0?
            // Simplest: User must count all or mark as 0.
            return;
        }

        setLoading(true);
        try {
            // In a real system, you create a "Cycle Count Session" record
            // Here, we'll simulate an adjustment or just log it

            // For each item, if Diff != 0, create adjustment
            let adjustments = 0;
            for (const item of items) {
                const diff = (item.counted_qty || 0) - item.quantity_pieces;
                if (diff !== 0) {
                    // Update inventory directly (Prototype style)
                    // Real world: Create Adjustment Transaction
                    await localDb.from('inventory_items')
                        .update({ quantity_pieces: item.counted_qty })
                        .eq('id', item.id);
                    adjustments++;
                }
            }

            toast.success(`Completed! ${adjustments} items adjusted.`);

            // Reset
            setStep('scan_location');
            setLocation('');
            setItems([]);
        } catch (e) {
            toast.error('Failed to submit count');
        } finally {
            setLoading(false);
        }
    };

    const activeItem = activeItemIndex !== -1 ? items[activeItemIndex] : null;

    return (
        <MobileLayout title="Cycle Count" showBack={true}>
            {step === 'scan_location' && (
                <div className="flex flex-col items-center justify-center p-4 py-10 space-y-4">
                    <ScanLine className="w-20 h-20 text-indigo-300" />
                    <h2 className="text-xl font-semibold">Scan Location</h2>
                    <div className="flex gap-2 w-full">
                        <Input
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="LOC-B01-S02"
                            className="text-center text-lg h-12 uppercase"
                            autoFocus
                        />
                        <Button onClick={() => handleLoadLocation(location)} className="h-12 w-12 p-0 bg-indigo-600 hover:bg-indigo-700">
                            <ClipboardCheck />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'count_items' && (
                <>
                    {/* Item List View */}
                    {!activeItem && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-indigo-50 p-3 rounded border border-indigo-100">
                                <span className="font-bold text-indigo-800">{location}</span>
                                <span className="text-xs text-indigo-600">{items.filter(i => i.status === 'counted').length}/{items.length} Counted</span>
                            </div>

                            <div className="space-y-2">
                                {items.map((item, index) => (
                                    <Card
                                        key={item.id}
                                        className={`cursor-pointer transition-colors ${item.status === 'counted' ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
                                        onClick={() => handleSelectForCount(index)}
                                    >
                                        <CardContent className="p-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm">{item.product_name}</p>
                                                <p className="text-xs text-gray-500">{item.sku}</p>
                                            </div>
                                            <div className="text-right">
                                                {item.status === 'counted' ? (
                                                    <span className="font-bold text-lg text-green-700">{item.counted_qty}</span>
                                                ) : (
                                                    <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-500">Count</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Button
                                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 h-12 text-lg"
                                onClick={handleSubmitFinal}
                                disabled={items.some(i => i.status === 'pending')}
                            >
                                <Save className="mr-2" /> Submit Count
                            </Button>
                        </div>
                    )}

                    {/* Active Counting View */}
                    {activeItem && (
                        <div className="space-y-4">
                            <Card className="bg-indigo-50 border-indigo-200">
                                <CardContent className="p-4 text-center">
                                    <h3 className="font-bold text-lg text-indigo-900">{activeItem.product_name}</h3>
                                    <p className="text-indigo-600">{activeItem.sku}</p>
                                </CardContent>
                            </Card>

                            <div className="flex flex-col items-center space-y-4 py-4">
                                <label className="text-sm font-bold text-gray-500">ACTUAL QUANTITY</label>
                                <div className="flex items-center gap-4 w-full px-8">
                                    <Button
                                        variant="outline"
                                        className="h-14 w-14 rounded-full text-2xl"
                                        onClick={() => setCountQty(Math.max(0, countQty - 1))}
                                    >-</Button>
                                    <Input
                                        type="number"
                                        value={countQty}
                                        onChange={(e) => setCountQty(Number(e.target.value))}
                                        className="text-center text-4xl font-bold h-20 border-2 border-indigo-200 focus:border-indigo-500"
                                        autoFocus
                                    />
                                    <Button
                                        variant="outline"
                                        className="h-14 w-14 rounded-full text-2xl"
                                        onClick={() => setCountQty(countQty + 1)}
                                    >+</Button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1 h-12" onClick={() => setActiveItemIndex(-1)}>Cancel</Button>
                                <Button className="flex-1 bg-indigo-600 h-12 hover:bg-indigo-700" onClick={handleSaveItemCount}>Confirm</Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </MobileLayout>
    );
};

export default MobileCount;
