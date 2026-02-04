import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Search, Loader2, Package, ArrowRightLeft, Camera, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

interface InventoryItem {
    id: string;
    product_name: string;
    sku: string;
    quantity_pieces: number;
    unit_level1_quantity: number;
    unit_level2_quantity: number;
    unit_level3_quantity: number;
    unit_level1_name: string;
    unit_level3_name: string;
    location?: string;
}

const LocationLookup = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [locationName, setLocationName] = useState<string | null>(null);
    const [items, setItems] = useState<InventoryItem[]>([]);

    // Camera QR Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);

    // Handle hardware scanner
    useScanner({
        onScan: (code) => {
            setQuery(code);
            handleSearch(code);
        }
    });

    // Camera QR Scanner functions
    const startCameraScanner = async () => {
        setShowScanner(true);
        try {
            const scanner = new Html5Qrcode("qr-reader-lookup");
            setHtml5QrCode(scanner);

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    // Success
                    setQuery(decodedText);
                    handleSearch(decodedText);
                    stopCameraScanner();
                    toast.success(`สแกนได้: ${decodedText}`);
                },
                (errorMessage) => {
                    // Ignore scan errors
                }
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

    const handleSearch = async (searchTerm: string) => {
        if (!searchTerm) return;
        setLoading(true);
        setItems([]);
        setLocationName(null);

        try {
            // 1. Try to find location first from local database
            const { data: locationData, error: locationError } = await localDb
                .from('warehouse_locations')
                .select('location_code')
                .eq('location_code', searchTerm)
                .single();

            if (locationData) {
                setLocationName(locationData.location_code);
                // Fetch inventory in this location from local database
                const { data: inventoryData, error: invError } = await localDb
                    .from('inventory_items')
                    .select('*')
                    .eq('location', locationData.location_code)
                    .gt('quantity_pieces', 0);

                if (invError) throw invError;

                setItems((inventoryData as any[]) || []);

                toast.success(`Found ${inventoryData?.length || 0} items in ${searchTerm}`);
            } else {
                // 2. If not location, try finding PRODUCT by SKU from local database
                const { data: productInventory, error: prodError } = await localDb
                    .from('inventory_items')
                    .select('*')
                    .eq('sku', searchTerm)
                    .gt('quantity_pieces', 0);

                if (prodError || !productInventory || productInventory.length === 0) {
                    toast.error('Location or Product not found');
                } else {
                    setItems(productInventory as any[]);
                    setLocationName(`Product: ${searchTerm}`);
                    toast.success(`Found in ${productInventory.length} locations`);
                }
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout title="Location Lookup" showBack={true}>
            {/* Camera QR Scanner Modal */}
            {showScanner && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    <div className="flex justify-between items-center p-4 bg-black text-white">
                        <span className="font-bold">📷 สแกน QR Code</span>
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
                        <div id="qr-reader-lookup" className="w-full max-w-sm bg-white rounded-lg overflow-hidden" />
                    </div>
                    <div className="p-4 text-center text-white text-sm">
                        เล็งกล้องไปที่ QR Code ของ Location หรือ SKU
                    </div>
                </div>
            )}

            {/* Camera Scan Button */}
            <Button
                onClick={startCameraScanner}
                className="w-full h-14 mb-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-lg shadow-lg"
            >
                <Camera className="h-6 w-6 mr-2" />
                📷 สแกน QR ด้วยกล้อง
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-300" />
                <span className="text-gray-500 text-sm">หรือพิมพ์</span>
                <div className="flex-1 h-px bg-gray-300" />
            </div>

            {/* Search Input */}
            <div className="flex gap-2 mb-4">
                <Input
                    placeholder="พิมพ์ Location หรือ SKU"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                    className="text-lg h-12 font-mono"
                    autoFocus
                />
                <Button onClick={() => handleSearch(query)} className="h-12 w-12 p-0">
                    <Search />
                </Button>
            </div>

            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!loading && locationName && (
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{locationName}</h2>

                    <div className="space-y-3">
                        {items.map((item) => (
                            <Card key={item.id} className="overflow-hidden">
                                <CardContent className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-sm">{item.product_name}</h3>
                                            <p className="text-xs text-gray-500 mb-1">SKU: {item.sku}</p>

                                            <div className="flex gap-2 mt-2 text-sm">
                                                {item.unit_level1_quantity > 0 && (
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                        {item.unit_level1_quantity} {item.unit_level1_name || 'CTN'}
                                                    </span>
                                                )}
                                                {item.unit_level3_quantity > 0 && (
                                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                                        {item.unit_level3_quantity} {item.unit_level3_name || 'PCS'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Show location if we searched by SKU */}
                                            {locationName.startsWith('Product') && (
                                                <div className="mt-2 text-xs font-bold bg-yellow-100 inline-block px-2 py-1 rounded">
                                                    Loc: {item.location || 'Unknown'}
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-10 w-10 p-0 rounded-full ml-2"
                                            onClick={() => navigate(`/mobile/move?item=${item.id}`)}
                                        >
                                            <ArrowRightLeft className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {items.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>Location is empty</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </MobileLayout>
    );
};

export default LocationLookup;
