import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Plus, Settings, Search, Phone, Mail } from 'lucide-react';
import { useCustomers, useCustomerStats, getCustomerTypeLabel } from '@/hooks/useCustomer';
import { toast } from 'sonner';

interface CustomerSelectorProps {
  selectedCustomerId?: string;
  onCustomerChange: (customerId: string | undefined) => void;
  showAddButton?: boolean;
  showAllOption?: boolean;
  className?: string;
  onAddCustomer?: () => void;
}

function CustomerStatsDisplay({ customerId }: { customerId: string }) {
  const { data: stats, isLoading } = useCustomerStats(customerId);

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">กำลังโหลด...</span>;
  }

  if (!stats) return null;

  return (
    <div className="flex gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary" className="text-xs">
        {stats.totalOrders} ใบสั่งซื้อ
      </Badge>
      <Badge variant="outline" className="text-xs">
        ฿{stats.totalAmount.toLocaleString()}
      </Badge>
      {stats.activeOrders > 0 && (
        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
          {stats.activeOrders} ใช้งาน
        </Badge>
      )}
    </div>
  );
}

export function CustomerSelector({
  selectedCustomerId,
  onCustomerChange,
  showAddButton = false,
  showAllOption = true,
  className = '',
  onAddCustomer,
}: CustomerSelectorProps) {
  const { data: customers, isLoading, error } = useCustomers();
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onCustomerChange(undefined);
    } else {
      onCustomerChange(value);
    }
    setIsOpen(false);
  };

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  if (error) {
    console.error('Error loading customers:', error);
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <User className="h-4 w-4" />
        ไม่สามารถโหลดข้อมูลลูกค้าได้
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <Select
          value={selectedCustomerId || 'all'}
          onValueChange={handleValueChange}
          open={isOpen}
          onOpenChange={setIsOpen}
          disabled={isLoading}
        >
          <SelectTrigger className="w-[250px] h-8">
            <SelectValue placeholder="เลือกลูกค้า">
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                {selectedCustomer ? (
                  <span className="truncate">
                    {selectedCustomer.customer_name} ({selectedCustomer.customer_code})
                  </span>
                ) : (
                  'ลูกค้าทุกราย'
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {showAllOption && (
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>ลูกค้าทุกราย</span>
                </div>
              </SelectItem>
            )}

            {isLoading ? (
              <SelectItem value="loading" disabled>
                กำลังโหลด...
              </SelectItem>
            ) : (
              customers?.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <div className="flex flex-col gap-1 py-1 w-full">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">
                        {customer.customer_name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {customer.customer_code}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                        {getCustomerTypeLabel(customer.customer_type || 'RETAIL')}
                      </span>

                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}

                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                    </div>

                    <CustomerStatsDisplay customerId={customer.id} />
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Selected customer info */}
      {selectedCustomer && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs">
              {selectedCustomer.customer_code}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {getCustomerTypeLabel(selectedCustomer.customer_type || 'RETAIL')}
            </Badge>
            {selectedCustomer.is_active === false && (
              <Badge variant="destructive" className="text-xs">
                ไม่ใช้งาน
              </Badge>
            )}
          </div>
          <CustomerStatsDisplay customerId={selectedCustomer.id} />
        </div>
      )}

      {/* Action buttons */}
      {showAddButton && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onAddCustomer) {
                onAddCustomer();
              } else {
                toast.info('ฟีเจอร์เพิ่มลูกค้าใหม่ยังไม่พร้อมใช้งาน');
              }
            }}
            className="h-8 px-2"
            title="เพิ่มลูกค้าใหม่"
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              toast.info('ฟีเจอร์จัดการลูกค้ายังไม่พร้อมใช้งาน');
            }}
            className="h-8 px-2"
            title="จัดการลูกค้า"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Compact version for use in modals or tight spaces
export function CompactCustomerSelector({
  selectedCustomerId,
  onCustomerChange,
  showAllOption = true,
  placeholder = "เลือกลูกค้า"
}: Omit<CustomerSelectorProps, 'showAddButton' | 'className' | 'onAddCustomer'> & {
  placeholder?: string;
}) {
  const { data: customers, isLoading } = useCustomers();

  const handleValueChange = (value: string) => {
    if (value === 'all') {
      onCustomerChange(undefined);
    } else {
      onCustomerChange(value);
    }
  };

  return (
    <Select
      value={selectedCustomerId || 'all'}
      onValueChange={handleValueChange}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">ลูกค้าทุกราย</SelectItem>
        )}

        {isLoading ? (
          <SelectItem value="loading" disabled>
            กำลังโหลด...
          </SelectItem>
        ) : (
          customers?.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              <div className="flex items-center gap-2">
                <span>{customer.customer_name}</span>
                <Badge variant="outline" className="text-xs">
                  {customer.customer_code}
                </Badge>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

// Search-enabled customer selector for orders
export function CustomerSearchSelector({
  selectedCustomerId,
  onCustomerChange,
  placeholder = "ค้นหาและเลือกลูกค้า...",
}: {
  selectedCustomerId?: string;
  onCustomerChange: (customerId: string | undefined) => void;
  placeholder?: string;
}) {
  const { data: customers, isLoading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers?.filter(customer =>
    customer.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone && customer.phone.includes(searchTerm))
  ) || [];

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  return (
    <Select
      value={selectedCustomerId || ''}
      onValueChange={(value) => onCustomerChange(value || undefined)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {selectedCustomer && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{selectedCustomer.customer_name}</span>
              <Badge variant="outline" className="text-xs">
                {selectedCustomer.customer_code}
              </Badge>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="flex items-center border-b px-3 pb-2 mb-2">
          <Search className="h-4 w-4 mr-2 text-muted-foreground" />
          <input
            placeholder="ค้นหาลูกค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-sm"
          />
        </div>

        {isLoading ? (
          <SelectItem value="loading" disabled>
            กำลังโหลด...
          </SelectItem>
        ) : filteredCustomers.length === 0 ? (
          <SelectItem value="no-results" disabled>
            ไม่พบลูกค้าที่ค้นหา
          </SelectItem>
        ) : (
          filteredCustomers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              <div className="flex flex-col gap-1 py-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{customer.customer_name}</span>
                  <Badge variant="outline" className="text-xs">
                    {customer.customer_code}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {getCustomerTypeLabel(customer.customer_type || 'RETAIL')}
                  </span>
                  {customer.phone && (
                    <span>{customer.phone}</span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default CustomerSelector;