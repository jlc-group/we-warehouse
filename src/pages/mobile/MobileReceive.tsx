import React, { useState } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Loader2, PackagePlus, Search, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContextSimple';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';

const MobileReceive = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState<'scan_po' | 'process_item'>('scan_po');
    const [poNumber, setPoNumber] = useState('');
    const [poData, setPoData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Process Item State
    const [scanProduct, setScanProduct] = useState('');
    const [scanLocation, setScanLocation] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeItem, setActiveItem] = useState<any>(null);

    useScanner({
        onScan: (code) => {
            if (step === 'scan_po') {
                setPoNumber(code);
                handleLoadPO(code);
            } else {
                // Determine if product or location based on format or context
                // Simple heuristic: LOC usually starts with LOC or warehouse code
                if (code.toUpperCase().startsWith('LOC') || code.length < 5) {
                    setScanLocation(code);
                } else {
                    setScanProduct(code);
                    handleFindItemInPO(code);
                }
            }
        }
    });

    const handleLoadPO = async (po: string) => {
        if (!po) return;
        setLoading(true);
        try {
            // Find PO by number from local database
            const { data: receipt, error: receiptError } = await localDb
                .from('inbound_receipts')
                .select('*')
                .eq('document_number', po)
                .single();

            if (receiptError) throw receiptError;
            if (!receipt) throw new Error('PO not found');

            // Get items separately
            const { data: items, error: itemsError } = await localDb
                .from('inbound_receipt_items')
                .select('*')
                .eq('receipt_id', receipt.id);

            if (itemsError) throw itemsError;

            setPoData({ ...receipt, inbound_receipt_items: items || [] });
            setStep('process_item');
            toast.success('PO Loaded');
        } catch (e: any) {
            toast.error(e.message || 'Error loading PO');
        } finally {
            setLoading(false);
        }
    };

    const handleFindItemInPO = (skuOrCode: string) => {
        if (!poData) return;
        // Search in loaded items
        const item = poData.inbound_receipt_items.find((i: any) =>
            i.product_code === skuOrCode || i.product_name.includes(skuOrCode)
        );

        if (item) {
            setActiveItem(item);
            setQuantity(item.quantity_expected - (item.quantity_received || 0)); // Suggest remaining qty
            toast.success(`Product: ${item.product_name}`);
        } else {
            toast('Item not in this PO');
        }
    };

    const handleSubmitReceive = async () => {
        if (!activeItem || !scanLocation || quantity <= 0) {
            toast.error('Complete all fields');
            return;
        }

        setLoading(true);
        try {
            // Call Inbound Service or Insert directly
            // 1. Update receipt item
            const newReceived = (activeItem.quantity_received || 0) + quantity;
            await localDb.from('inbound_receipt_items')
                .update({ quantity_received: newReceived })
                .eq('id', activeItem.id);

            // 2. Create/Update Inventory
            // logic normally in backend trigger or service, doing simple insert for prototype
            // WARN: Real implementation needs robust transaction

            toast.success('Received successfully');

            // Reset for next item
            setScanProduct('');
            setQuantity(0);
            setActiveItem(null);
            // Keep location? maybe
        } catch (e) {
            toast.error('Receive failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout title="Inbound Receive" showBack={true}>
            {step === 'scan_po' && (
                <div className="flex flex-col items-center justify-center p-4 py-10 space-y-4">
                    <PackagePlus className="w-20 h-20 text-gray-300" />
                    <h2 className="text-xl font-semibold">Scan PO / Receipt #</h2>

                    {/* Camera QR Scanner */}
                    <div className="w-full">
                        <CameraQRScanner
                            onScan={(code) => {
                                setPoNumber(code);
                                handleLoadPO(code);
                            }}
                            buttonText="📷 สแกน QR ด้วยกล้อง"
                            modalTitle="📷 สแกน PO / Receipt"
                            modalHint="เล็งกล้องไปที่ QR Code ของ PO"
                            scannerId="qr-reader-receive"
                        />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px bg-gray-300" />
                        <span className="text-gray-500 text-sm">หรือพิมพ์</span>
                        <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    <div className="flex gap-2 w-full">
                        <Input
                            value={poNumber}
                            onChange={e => setPoNumber(e.target.value.toUpperCase())}
                            placeholder="PO-2024-XXXX"
                            className="text-center text-lg h-12 uppercase font-mono"
                        />
                        <Button onClick={() => handleLoadPO(poNumber)} className="h-12 w-12 p-0">
                            <Search />
                        </Button>
                    </div>
                </div>
            )}

            {step === 'process_item' && poData && (
                <div className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700 font-bold">RECEIPT</p>
                        <p className="text-lg font-bold">{poData.document_number}</p>
                    </div>

                    {!activeItem && (
                        <Card className="bg-orange-50 border-orange-200 animate-pulse">
                            <CardContent className="p-4 text-center text-orange-700">
                                🔔 Scan Product to Receive
                            </CardContent>
                        </Card>
                    )}

                    {activeItem && (
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg">{activeItem.product_name}</h3>
                                    <p className="text-sm text-gray-500">Exp: {activeItem.quantity_expected} | Rcv: {activeItem.quantity_received || 0}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold">QTY</label>
                                        <Input
                                            type="number"
                                            value={quantity}
                                            onChange={e => setQuantity(Number(e.target.value))}
                                            className="text-right text-lg font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold">LOC</label>
                                        <Input
                                            value={scanLocation}
                                            onChange={e => setScanLocation(e.target.value)}
                                            placeholder="Scan Loc"
                                            className="uppercase"
                                        />
                                    </div>
                                </div>
                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleSubmitReceive}>
                                    <CheckCircle className="mr-2" />
                                    Confirm Receive
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Pending Items</h4>
                        <div className="space-y-2">
                            {poData.inbound_receipt_items.map((i: any) => (
                                <div key={i.id} className="text-sm p-2 bg-white rounded shadow-sm flex justify-between">
                                    <span>{i.product_name}</span>
                                    <span className="font-mono">{i.quantity_received || 0}/{i.quantity_expected}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
};

export default MobileReceive;
