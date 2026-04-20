import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, ArrowRightLeft, Package, AlertTriangle } from 'lucide-react';

interface UnitConverterProps {
    /** ชื่อหน่วยระดับ 1 (เช่น ลัง) */
    unit1Name?: string;
    /** ชื่อหน่วยระดับ 2 (เช่น กล่อง) */
    unit2Name?: string;
    /** ชื่อหน่วยระดับ 3 (เช่น ชิ้น) */
    unit3Name?: string;
    /** อัตรา: 1 หน่วย1 = X ชิ้น */
    unit1Rate?: number;
    /** อัตรา: 1 หน่วย2 = X ชิ้น */
    unit2Rate?: number;
    /** จำนวนเริ่มต้น (ชิ้น) */
    initialPieces?: number;
    /** แสดง warning ถ้ามีเศษ (เมื่อ location เป็น full_carton_only) */
    showRemainderWarning?: boolean;
    /** Compact mode สำหรับ inline display */
    compact?: boolean;
}

interface ConversionResult {
    unit1: number;
    unit2: number;
    unit3: number;
    totalPieces: number;
    hasRemainder: boolean;
    remainderPieces: number;
}

export function UnitConverter({
    unit1Name = 'ลัง',
    unit2Name = 'กล่อง',
    unit3Name = 'ชิ้น',
    unit1Rate = 0,
    unit2Rate = 0,
    initialPieces = 0,
    showRemainderWarning = false,
    compact = false
}: UnitConverterProps) {
    // Input values as strings to allow free editing
    const [inputUnit1, setInputUnit1] = useState<string>('');
    const [inputUnit2, setInputUnit2] = useState<string>('');
    const [inputUnit3, setInputUnit3] = useState<string>('');
    const [lastEdited, setLastEdited] = useState<'unit1' | 'unit2' | 'unit3' | null>(null);

    // Effective rate: pieces per unit1 = unit1Rate, pieces per unit2 = unit2Rate
    const piecesPerUnit1 = unit1Rate || 1;
    const piecesPerUnit2 = unit2Rate || 1;

    // Convert total pieces to breakdown
    const piecesToBreakdown = useCallback((totalPieces: number): ConversionResult => {
        if (totalPieces <= 0 || piecesPerUnit1 <= 0 || piecesPerUnit2 <= 0) {
            return { unit1: 0, unit2: 0, unit3: 0, totalPieces: 0, hasRemainder: false, remainderPieces: 0 };
        }

        let remaining = Math.floor(totalPieces);
        const u1 = Math.floor(remaining / piecesPerUnit1);
        remaining -= u1 * piecesPerUnit1;
        const u2 = Math.floor(remaining / piecesPerUnit2);
        remaining -= u2 * piecesPerUnit2;
        const u3 = remaining;

        // Remainder = pieces not fitting into full unit1
        const remainderPieces = totalPieces - (u1 * piecesPerUnit1);

        return {
            unit1: u1,
            unit2: u2,
            unit3: u3,
            totalPieces: Math.floor(totalPieces),
            hasRemainder: remainderPieces > 0,
            remainderPieces
        };
    }, [piecesPerUnit1, piecesPerUnit2]);

    // Calculate total pieces from inputs
    const calculateTotalPieces = useCallback((u1: number, u2: number, u3: number): number => {
        return (u1 * piecesPerUnit1) + (u2 * piecesPerUnit2) + u3;
    }, [piecesPerUnit1, piecesPerUnit2]);

    // Set initial values
    useEffect(() => {
        if (initialPieces > 0 && !lastEdited) {
            const breakdown = piecesToBreakdown(initialPieces);
            setInputUnit1(breakdown.unit1.toString());
            setInputUnit2(breakdown.unit2.toString());
            setInputUnit3(breakdown.unit3.toString());
        }
    }, [initialPieces, lastEdited, piecesToBreakdown]);

    // Handle unit1 (ลัง) input change
    const handleUnit1Change = useCallback((value: string) => {
        setInputUnit1(value);
        setLastEdited('unit1');
        const num = parseFloat(value) || 0;
        const totalPieces = calculateTotalPieces(num, parseFloat(inputUnit2) || 0, parseFloat(inputUnit3) || 0);
        // Don't recalculate other fields when typing directly
    }, [inputUnit2, inputUnit3, calculateTotalPieces]);

    // Handle unit2 (กล่อง) input change
    const handleUnit2Change = useCallback((value: string) => {
        setInputUnit2(value);
        setLastEdited('unit2');
    }, []);

    // Handle unit3 (ชิ้น) input change
    const handleUnit3Change = useCallback((value: string) => {
        setInputUnit3(value);
        setLastEdited('unit3');
    }, []);

    // Convert from pieces (auto-breakdown)
    const handleConvertFromPieces = useCallback(() => {
        const totalPieces = parseFloat(inputUnit3) || 0;
        if (totalPieces > 0) {
            const breakdown = piecesToBreakdown(totalPieces);
            setInputUnit1(breakdown.unit1.toString());
            setInputUnit2(breakdown.unit2.toString());
            setInputUnit3(breakdown.unit3.toString());
            setLastEdited('unit3');
        }
    }, [inputUnit3, piecesToBreakdown]);

    // Convert from unit1 (ลัง → ชิ้น)
    const handleConvertFromUnit1 = useCallback(() => {
        const u1 = parseFloat(inputUnit1) || 0;
        const totalPieces = u1 * piecesPerUnit1;
        const breakdown = piecesToBreakdown(totalPieces);
        setInputUnit1(breakdown.unit1.toString());
        setInputUnit2(breakdown.unit2.toString());
        setInputUnit3(breakdown.unit3.toString());
        setLastEdited('unit1');
    }, [inputUnit1, piecesPerUnit1, piecesToBreakdown]);

    // Convert from unit2 (กล่อง → ลัง + เศษ)
    const handleConvertFromUnit2 = useCallback(() => {
        const u2 = parseFloat(inputUnit2) || 0;
        const totalPieces = u2 * piecesPerUnit2;
        const breakdown = piecesToBreakdown(totalPieces);
        setInputUnit1(breakdown.unit1.toString());
        setInputUnit2(breakdown.unit2.toString());
        setInputUnit3(breakdown.unit3.toString());
        setLastEdited('unit2');
    }, [inputUnit2, piecesPerUnit2, piecesToBreakdown]);

    // Current computed values
    const currentTotal = useMemo(() => {
        return calculateTotalPieces(
            parseFloat(inputUnit1) || 0,
            parseFloat(inputUnit2) || 0,
            parseFloat(inputUnit3) || 0
        );
    }, [inputUnit1, inputUnit2, inputUnit3, calculateTotalPieces]);

    const currentBreakdown = useMemo(() => {
        return piecesToBreakdown(currentTotal);
    }, [currentTotal, piecesToBreakdown]);

    // Check if rates are configured
    const hasRates = unit1Rate > 0 && unit2Rate > 0;

    if (!hasRates) {
        return (
            <div className="text-xs text-gray-400 italic p-2">
                ⚠️ ไม่มีข้อมูลอัตราแปลงหน่วย
            </div>
        );
    }

    if (compact) {
        return (
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calculator className="h-3 w-3" />
                    <span>อัตรา: 1 {unit1Name} = {piecesPerUnit1} {unit3Name} | 1 {unit2Name} = {piecesPerUnit2} {unit3Name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <Input
                            type="number"
                            min="0"
                            value={inputUnit1}
                            onChange={(e) => handleUnit1Change(e.target.value)}
                            onBlur={handleConvertFromUnit1}
                            placeholder="0"
                            className="h-8 text-center text-sm"
                        />
                        <div className="text-xs text-center text-gray-500 mt-0.5">{unit1Name}</div>
                    </div>
                    <ArrowRightLeft className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                        <Input
                            type="number"
                            min="0"
                            value={inputUnit2}
                            onChange={(e) => handleUnit2Change(e.target.value)}
                            onBlur={handleConvertFromUnit2}
                            placeholder="0"
                            className="h-8 text-center text-sm"
                        />
                        <div className="text-xs text-center text-gray-500 mt-0.5">{unit2Name}</div>
                    </div>
                    <ArrowRightLeft className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                        <Input
                            type="number"
                            min="0"
                            value={inputUnit3}
                            onChange={(e) => handleUnit3Change(e.target.value)}
                            onBlur={handleConvertFromPieces}
                            placeholder="0"
                            className="h-8 text-center text-sm"
                        />
                        <div className="text-xs text-center text-gray-500 mt-0.5">{unit3Name}</div>
                    </div>
                </div>
                {currentTotal > 0 && (
                    <div className="text-center text-sm font-medium text-green-600">
                        = {currentTotal.toLocaleString()} {unit3Name}
                    </div>
                )}
                {showRemainderWarning && currentBreakdown.hasRemainder && currentTotal > 0 && (
                    <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded p-1.5">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                        <span>มีเศษ {currentBreakdown.remainderPieces} {unit3Name} (ไม่ครบ{unit1Name})</span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Card className="border-dashed border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                    <Calculator className="h-4 w-4" />
                    เครื่องคิดเลขหน่วยสินค้า
                </CardTitle>
                <div className="text-xs text-gray-500">
                    อัตรา: 1 {unit1Name} = {(piecesPerUnit1 / piecesPerUnit2).toFixed(0)} {unit2Name} = {piecesPerUnit1} {unit3Name} | 1 {unit2Name} = {piecesPerUnit2} {unit3Name}
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-3">
                {/* Input Fields */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <Label className="text-xs text-gray-600 mb-1 block">{unit1Name}</Label>
                        <Input
                            type="number"
                            min="0"
                            value={inputUnit1}
                            onChange={(e) => handleUnit1Change(e.target.value)}
                            onBlur={handleConvertFromUnit1}
                            placeholder="0"
                            className="text-center font-medium bg-white"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-gray-600 mb-1 block">{unit2Name}</Label>
                        <Input
                            type="number"
                            min="0"
                            value={inputUnit2}
                            onChange={(e) => handleUnit2Change(e.target.value)}
                            onBlur={handleConvertFromUnit2}
                            placeholder="0"
                            className="text-center font-medium bg-white"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-gray-600 mb-1 block">{unit3Name}</Label>
                        <Input
                            type="number"
                            min="0"
                            value={inputUnit3}
                            onChange={(e) => handleUnit3Change(e.target.value)}
                            onBlur={handleConvertFromPieces}
                            placeholder="0"
                            className="text-center font-medium bg-white"
                        />
                    </div>
                </div>

                {/* Summary */}
                {currentTotal > 0 && (
                    <div className="bg-white rounded-lg p-3 text-center space-y-1">
                        <div className="text-lg font-bold text-green-600">
                            = {currentTotal.toLocaleString()} {unit3Name}
                        </div>
                        <div className="text-sm text-gray-600">
                            {currentBreakdown.unit1 > 0 && `${currentBreakdown.unit1} ${unit1Name}`}
                            {currentBreakdown.unit2 > 0 && ` + ${currentBreakdown.unit2} ${unit2Name}`}
                            {currentBreakdown.unit3 > 0 && ` + ${currentBreakdown.unit3} ${unit3Name}`}
                        </div>
                    </div>
                )}

                {/* Remainder Warning */}
                {showRemainderWarning && currentBreakdown.hasRemainder && currentTotal > 0 && (
                    <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 rounded-lg p-3 border border-orange-200">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <div>
                            <span className="font-medium">มีเศษ!</span> {currentBreakdown.remainderPieces} {unit3Name} ไม่ครบ{unit1Name}
                            {showRemainderWarning && ' — ควรย้ายเศษไป location อื่น'}
                        </div>
                    </div>
                )}

                {/* Quick conversion hints */}
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => { setInputUnit3((piecesPerUnit1).toString()); handleConvertFromPieces(); }}>
                        {piecesPerUnit1} {unit3Name} = 1 {unit1Name}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => { setInputUnit3((piecesPerUnit2).toString()); handleConvertFromPieces(); }}>
                        {piecesPerUnit2} {unit3Name} = 1 {unit2Name}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-white cursor-pointer hover:bg-gray-50"
                        onClick={() => { setInputUnit3('4000'); }}>
                        ลอง 4000 {unit3Name}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );
}
