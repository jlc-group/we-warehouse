import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, ArrowRight, CheckCircle2, Camera, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { transferPartialStock } from '@/services/transferService';
import { useAuth } from '@/contexts/AuthContextSimple';
import { recordMove } from '@/services/movementService';
import { Html5Qrcode } from 'html5-qrcode';

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

    // Camera QR Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

    // Scanner for target location
    useScanner({
        onScan: (code) => {
            // If we are on this page, scanning usually means scanning the TARGET location
            setTargetLocation(code);
        }
    });

    // Camera QR Scanner functions
    const startCameraScanner = async () => {
        setShowScanner(true);
        try {
            const scanner = new Html5Qrcode("qr-reader-move");
            setHtml5QrCode(scanner);

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    setTargetLocation(decodedText);
                    stopCameraScanner();
                    toast.success(`สแกนได้: ${decodedText}`);
                },
                () => { }
            );
        } catch (err) {
            console.error('Camera error:', err);
            toast.error('ไม่สามารถเปิดกล้องได้');
            setShowScanner(false);
        }
    };

    const stopCameraScanner = () => {
        if (html5QrCode) {
            html5QrCode.stop().catch(() => { });
            setHtml5QrCode(null);
        }
        setShowScanner(false);
    };

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
            {/* Camera QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    <div className="flex justify-between items-center p-4 bg-black text-white">
                        <span className="font-bold">📷 สแกน QR Location ปลายทาง</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={stopCameraScanner}
                            className="text-white hover:bg-white/20"
                        >
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div id="qr-reader-move" className="w-full max-w-sm bg-white rounded-lg overflow-hidden" />
                    </div>
                    <div className="p-4 text-center text-white text-sm">
                        เล็งกล้องไปที่ QR Code ของ Location ปลายทาง
                    </div>
                </div>
            )}

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
                    <label className="text-sm font-medium mb-1 block">Target Location</label>
                    {/* Camera Scanner Button */}
                    <Button
                        onClick={startCameraScanner}
                        className="w-full h-12 mb-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold shadow-lg"
                    >
                        <Camera className="h-5 w-5 mr-2" />
                        📷 สแกน QR ด้วยกล้อง
                    </Button>
                    <div className="flex gap-2">
                        <Input
                            placeholder="หรือพิมพ์ Location"
                            value={targetLocation}
                            onChange={(e) => setTargetLocation(e.target.value.toUpperCase())}
                            className="text-lg h-12 border-blue-300 font-mono"
                        />
                    </div>
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
