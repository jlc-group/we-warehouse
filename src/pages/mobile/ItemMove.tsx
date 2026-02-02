import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { transferPartialStock } from '@/services/transferService';
import { useAuth } from '@/contexts/AuthContextSimple';
import { recordMove } from '@/services/movementService';

const ItemMove = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const itemId = searchParams.get('item');
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [item, setItem] = useState<any>(null);
    const [targetLocation, setTargetLocation] = useState('');
    const [moveQty, setMoveQty] = useState<number>(0);

    // Scanner for target location
    useScanner({
        onScan: (code) => {
            // If we are on this page, scanning usually means scanning the TARGET location
            setTargetLocation(code);
        }
    });

    useEffect(() => {
        if (itemId) {
            loadItem(itemId);
        } else {
            toast.error('No item specified');
            navigate('/mobile/lookup');
        }
    }, [itemId]);

    const loadItem = async (id: string) => {
        try {
            const { data, error } = await localDb
                .from('inventory_items')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            setItem(data);
            setMoveQty(data.quantity_pieces); // Default to moving ALL
        } catch (error) {
            toast.error('Failed to load item');
            navigate('/mobile/lookup');
        } finally {
            setLoading(false);
        }
    };

    const handleMove = async () => {
        if (!targetLocation) {
            toast.error('Please scan or enter target location');
            return;
        }
        if (moveQty <= 0 || moveQty > (item?.quantity_pieces || 0)) {
            toast.error('Invalid quantity');
            return;
        }

        setSubmitting(true);
        try {
            const result = await transferPartialStock(
                item.id,
                targetLocation,
                moveQty,
                user
            );

            if (result.success) {
                // Record movement for tracking
                await recordMove(
                    item.sku || item.product_name,
                    item.product_name,
                    item.location,
                    targetLocation,
                    moveQty,
                    item.warehouse_id,
                    `Mobile move`,
                    user?.email
                );

                toast.success(`Moved to ${targetLocation}`);
                navigate('/mobile/lookup'); // Go back to lookup to verify or do next
            } else {
                toast.error(result.message || 'Move failed');
            }
        } catch (error: any) {
            toast.error('Exception during move');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <MobileLayout title="Move Item" showBack={true}>
            <Card className="mb-4 bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg">{item.product_name}</h3>
                    <div className="flex justify-between items-end mt-2">
                        <div>
                            <p className="text-sm text-gray-500">Current Location</p>
                            <p className="text-xl font-mono font-bold text-blue-800">{item.location}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Available</p>
                            <p className="text-xl font-bold">{item.quantity_pieces} <span className="text-sm font-normal">pcs</span></p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Quantity to Move (Pieces)</label>
                    <div className="flex gap-2">
                        <Button
                            variant={moveQty === item.quantity_pieces ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => setMoveQty(item.quantity_pieces)}
                        >
                            All ({item.quantity_pieces})
                        </Button>
                        <Input
                            type="number"
                            value={moveQty}
                            onChange={(e) => setMoveQty(parseInt(e.target.value) || 0)}
                            className="w-24 text-center font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-sm font-medium mb-1 block">Target Location (Scan)</label>
                    <div className="flex gap-2">
                        <Input
                            placeholder="Scan Location Barcode"
                            value={targetLocation}
                            onChange={(e) => setTargetLocation(e.target.value)}
                            className="text-lg h-12 border-blue-300"
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">💡 Tip: Use scanner or type manually</p>
                </div>

                <Button
                    className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700 mt-6"
                    onClick={handleMove}
                    disabled={submitting}
                >
                    {submitting ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                    Confirm Move
                </Button>
            </div>
        </MobileLayout>
    );
};

export default ItemMove;
