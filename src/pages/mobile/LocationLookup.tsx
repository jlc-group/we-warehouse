import React, { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScanner } from '@/hooks/mobile/useScanner';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { Search, Loader2, Package, ArrowRightLeft, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CameraQRScanner } from '@/components/mobile/CameraQRScanner';

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

    // Handle hardware scanner
    useScanner({
        onScan: (code) => {
            setQuery(code);
            handleSearch(code);
        }
    });

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
                // Fetch inventory in this location
                const { data: inventoryData, error: invError } = await localDb
                    .from('inventory_items')
                    .select('*')
                    .eq('location', locationData.location_code)
                    .gt('quantity_pieces', 0);

                if (invError) throw invError;

                setItems((inventoryData as any[]) || []);
                toast.success(`พบ ${inventoryData?.length || 0} รายการใน ${searchTerm}`);
            } else {
                // 2. If not location, try finding PRODUCT by SKU
                const { data: productInventory, error: prodError } = await localDb
                    .from('inventory_items')
                    .select('*')
                    .eq('sku', searchTerm)
                    .gt('quantity_pieces', 0);

                if (prodError || !productInventory || productInventory.length === 0) {
                    toast.error('ไม่พบ Location หรือ สินค้า');
                } else {
                    setItems(productInventory as any[]);
                    setLocationName(`สินค้า: ${searchTerm}`);
                    toast.success(`พบใน ${productInventory.length} ตำแหน่ง`);
                }
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'ค้นหาไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <MobileLayout title="ค้นหา Location" showBack={true}>
            {/* Camera QR Scanner */}
            <CameraQRScanner
                onScan={(code) => {
                    setQuery(code);
                    handleSearch(code);
                }}
                buttonText="📷 สแกน QR ด้วยกล้อง"
                modalTitle="📷 สแกน Location / SKU"
                modalHint="เล็งกล้องไปที่ QR Code ของ Location หรือ SKU"
                scannerId="qr-reader-lookup"
                buttonClassName="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            />

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-slate-400 text-xs">หรือพิมพ์</span>
                <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Search Input */}
            <div className="flex gap-2 mb-4">
                <Input
                    placeholder="พิมพ์ Location หรือ SKU"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                    className="text-base h-12 font-mono rounded-xl border-slate-200"
                    autoFocus
                />
                <Button
                    onClick={() => handleSearch(query)}
                    className="h-12 w-12 p-0 rounded-xl bg-violet-600 hover:bg-violet-700"
                >
                    <Search />
                </Button>
            </div>

            {loading && (
                <div className="flex flex-col items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                    <p className="mt-3 text-slate-400 text-sm">กำลังค้นหา...</p>
                </div>
            )}

            {!loading && locationName && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-5 w-5 text-violet-500" />
                        <h2 className="text-lg font-bold text-slate-800">{locationName}</h2>
                        <span className="text-xs text-slate-400 ml-auto">{items.length} รายการ</span>
                    </div>

                    <div className="space-y-2.5">
                        {items.map((item) => (
                            <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-3 flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm text-slate-800 truncate">{item.product_name}</h3>
                                        <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</p>

                                        <div className="flex gap-2 mt-2 text-sm">
                                            {item.unit_level1_quantity > 0 && (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-medium">
                                                    {item.unit_level1_quantity} {item.unit_level1_name || 'CTN'}
                                                </span>
                                            )}
                                            {item.unit_level3_quantity > 0 && (
                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-medium">
                                                    {item.unit_level3_quantity} {item.unit_level3_name || 'PCS'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Show location if we searched by SKU */}
                                        {locationName.startsWith('สินค้า') && (
                                            <div className="mt-2 text-xs font-bold bg-amber-50 text-amber-700 inline-block px-2 py-1 rounded-lg">
                                                📍 {item.location || 'ไม่ทราบ'}
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-10 w-10 p-0 rounded-xl ml-2 border-slate-200 hover:bg-blue-50"
                                        onClick={() => navigate(`/mobile/move?item=${item.id}`)}
                                    >
                                        <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="text-center py-10 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <Package className="h-12 w-12 mx-auto mb-2 text-slate-200" />
                                <p className="text-slate-400 font-medium">ตำแหน่งนี้ว่าง</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </MobileLayout>
    );
};

export default LocationLookup;
