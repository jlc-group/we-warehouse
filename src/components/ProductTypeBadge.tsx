import { Badge } from '@/components/ui/badge';
import { getProductType, getProductTypeDisplayName, PRODUCT_TYPES } from '@/data/sampleInventory';
import { Package, Box, Factory } from 'lucide-react';

interface ProductTypeBadgeProps {
  sku: string;
  className?: string;
  showIcon?: boolean;
  showFullName?: boolean;
  productType?: string; // Allow passing productType directly from database
}

export function ProductTypeBadge({
  sku,
  className = '',
  showIcon = false,
  showFullName = false,
  productType: propProductType
}: ProductTypeBadgeProps) {
  // Use passed productType or fallback to static data lookup
  const productType = propProductType || getProductType(sku);

  if (!productType) {
    return (
      <Badge variant="outline" className={`text-gray-500 ${className}`}>
        {showIcon && <Package className="h-3 w-3 mr-1" />}
        {showFullName ? 'ไม่ระบุประเภท' : 'N/A'}
      </Badge>
    );
  }

  const isFG = productType === 'FG';
  const isPK = productType === 'PK';
  const isRM = productType === 'RM';

  return (
    <Badge
      variant="outline"
      className={`
        ${isFG ? 'bg-green-50 text-green-700 border-green-200' : ''}
        ${isPK ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
        ${isRM ? 'bg-orange-50 text-orange-700 border-orange-200' : ''}
        ${className}
      `}
    >
      {showIcon && (
        <>
          {isFG && <Package className="h-3 w-3 mr-1" />}
          {isPK && <Box className="h-3 w-3 mr-1" />}
          {isRM && <Factory className="h-3 w-3 mr-1" />}
        </>
      )}
      {showFullName ? getProductTypeDisplayName(productType as any) : productType}
    </Badge>
  );
}

// ProductTypeFilter component for filtering
interface ProductTypeFilterProps {
  selectedTypes: string[];
  onTypeChange: (types: string[]) => void;
  className?: string;
}

export function ProductTypeFilter({ selectedTypes, onTypeChange, className = '' }: ProductTypeFilterProps) {
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  const isAllSelected = selectedTypes.length === 0;
  const isFGSelected = selectedTypes.includes('FG');
  const isPKSelected = selectedTypes.includes('PK');
  const isRMSelected = selectedTypes.includes('RM');

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <Badge
        variant={isAllSelected ? "default" : "outline"}
        className={`cursor-pointer hover:bg-gray-100 ${isAllSelected ? 'bg-gray-600 text-white' : ''}`}
        onClick={() => onTypeChange([])}
      >
        ทั้งหมด
      </Badge>
      <Badge
        variant={isFGSelected ? "default" : "outline"}
        className={`cursor-pointer hover:bg-green-100 ${
          isFGSelected ? 'bg-green-600 text-white' : 'text-green-700 border-green-200'
        }`}
        onClick={() => handleTypeToggle('FG')}
      >
        <Package className="h-3 w-3 mr-1" />
        FG (สินค้าสำเร็จรูป)
      </Badge>
      <Badge
        variant={isPKSelected ? "default" : "outline"}
        className={`cursor-pointer hover:bg-blue-100 ${
          isPKSelected ? 'bg-blue-600 text-white' : 'text-blue-700 border-blue-200'
        }`}
        onClick={() => handleTypeToggle('PK')}
      >
        <Box className="h-3 w-3 mr-1" />
        PK (วัสดุบรรจุภัณฑ์)
      </Badge>
      <Badge
        variant={isRMSelected ? "default" : "outline"}
        className={`cursor-pointer hover:bg-orange-100 ${
          isRMSelected ? 'bg-orange-600 text-white' : 'text-orange-700 border-orange-200'
        }`}
        onClick={() => handleTypeToggle('RM')}
      >
        <Factory className="h-3 w-3 mr-1" />
        RM (วัตถุดิบ)
      </Badge>
    </div>
  );
}