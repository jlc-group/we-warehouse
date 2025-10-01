import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, User, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomerSearch, useCreateCustomer, type Customer, type CreateCustomerData, formatCustomerDisplay } from '@/hooks/useCustomers';

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface NewCustomerFormData {
  name: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  credit_limit: string;
  payment_terms: string;
  notes: string;
}

const initialFormData: NewCustomerFormData = {
  name: '',
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  tax_id: '',
  credit_limit: '0',
  payment_terms: '30',
  notes: '',
};

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onCustomerSelect,
  className,
  placeholder = 'เลือกลูกค้า...',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState<NewCustomerFormData>(initialFormData);

  const { searchTerm, setSearchTerm, customers, isLoading } = useCustomerSearch();
  const createCustomerMutation = useCreateCustomer();

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setOpen(false);
  };

  const handleCreateCustomer = async () => {
    try {
      const customerData: CreateCustomerData = {
        name: newCustomerForm.name.trim(),
        company_name: newCustomerForm.company_name.trim() || undefined,
        contact_person: newCustomerForm.contact_person.trim() || undefined,
        phone: newCustomerForm.phone.trim() || undefined,
        email: newCustomerForm.email.trim() || undefined,
        address: newCustomerForm.address.trim() || undefined,
        tax_id: newCustomerForm.tax_id.trim() || undefined,
        credit_limit: parseFloat(newCustomerForm.credit_limit) || 0,
        payment_terms: parseInt(newCustomerForm.payment_terms) || 30,
        notes: newCustomerForm.notes.trim() || undefined,
      };

      const newCustomer = await createCustomerMutation.mutateAsync(customerData);

      // Select the newly created customer
      onCustomerSelect(newCustomer);

      // Reset form and close dialog
      setNewCustomerForm(initialFormData);
      setShowNewCustomerDialog(false);
      setOpen(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  const resetNewCustomerForm = () => {
    setNewCustomerForm(initialFormData);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor="customer-selector">ลูกค้า *</Label>

      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between"
              disabled={disabled}
            >
              {selectedCustomer ? (
                <span className="truncate">{formatCustomerDisplay(selectedCustomer)}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 max-h-[320px]">
            <Command>
              <CommandInput
                placeholder="ค้นหาลูกค้า..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandList className="max-h-[250px] overflow-y-auto">
                <CommandEmpty>
                  {isLoading ? 'กำลังค้นหา...' : 'ไม่พบลูกค้า'}
                </CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => handleCustomerSelect(customer)}
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 flex-shrink-0',
                            selectedCustomer?.id === customer.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-medium truncate">{customer.name}</span>
                          {customer.company_name && customer.company_name !== customer.name && (
                            <span className="text-sm text-muted-foreground truncate">{customer.company_name}</span>
                          )}
                          {customer.phone && (
                            <span className="text-xs text-muted-foreground">{customer.phone}</span>
                          )}
                        </div>
                      </div>
                      {customer.company_name && (
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" disabled={disabled}>
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                เพิ่มลูกค้าใหม่
              </DialogTitle>
              <DialogDescription>
                กรอกข้อมูลลูกค้าใหม่ ข้อมูลที่มี * จำเป็นต้องระบุ
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ชื่อลูกค้า */}
                <div className="space-y-2">
                  <Label htmlFor="customer-name">ชื่อลูกค้า *</Label>
                  <Input
                    id="customer-name"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ชื่อลูกค้า"
                    required
                  />
                </div>

                {/* ชื่อบริษัท */}
                <div className="space-y-2">
                  <Label htmlFor="company-name">ชื่อบริษัท</Label>
                  <Input
                    id="company-name"
                    value={newCustomerForm.company_name}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="ชื่อบริษัท/หน่วยงาน"
                  />
                </div>

                {/* ผู้ติดต่อ */}
                <div className="space-y-2">
                  <Label htmlFor="contact-person">ผู้ติดต่อ</Label>
                  <Input
                    id="contact-person"
                    value={newCustomerForm.contact_person}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, contact_person: e.target.value }))}
                    placeholder="ชื่อผู้ติดต่อ"
                  />
                </div>

                {/* เบอร์โทร */}
                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                  <Input
                    id="phone"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="08x-xxx-xxxx"
                  />
                </div>

                {/* อีเมล */}
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                  />
                </div>

                {/* เลขประจำตัวผู้เสียภาษี */}
                <div className="space-y-2">
                  <Label htmlFor="tax-id">เลขประจำตัวผู้เสียภาษี</Label>
                  <Input
                    id="tax-id"
                    value={newCustomerForm.tax_id}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, tax_id: e.target.value }))}
                    placeholder="1234567890123"
                  />
                </div>

                {/* วงเงินเครดิต */}
                <div className="space-y-2">
                  <Label htmlFor="credit-limit">วงเงินเครดิต (บาท)</Label>
                  <Input
                    id="credit-limit"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newCustomerForm.credit_limit}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, credit_limit: e.target.value }))}
                    placeholder="0"
                  />
                </div>

                {/* เงื่อนไขการชำระ */}
                <div className="space-y-2">
                  <Label htmlFor="payment-terms">เงื่อนไขการชำระ (วัน)</Label>
                  <Input
                    id="payment-terms"
                    type="number"
                    min="1"
                    value={newCustomerForm.payment_terms}
                    onChange={(e) => setNewCustomerForm(prev => ({ ...prev, payment_terms: e.target.value }))}
                    placeholder="30"
                  />
                </div>
              </div>

              {/* ที่อยู่ */}
              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่</Label>
                <Textarea
                  id="address"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="ที่อยู่สำหรับจัดส่งสินค้า"
                  rows={3}
                />
              </div>

              {/* หมายเหตุ */}
              <div className="space-y-2">
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea
                  id="notes"
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="หมายเหตุเพิ่มเติม"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetNewCustomerForm();
                  setShowNewCustomerDialog(false);
                }}
                disabled={createCustomerMutation.isPending}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleCreateCustomer}
                disabled={!newCustomerForm.name.trim() || createCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending ? 'กำลังสร้าง...' : 'สร้างลูกค้า'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Display selected customer info */}
      {selectedCustomer && (
        <Card className="mt-2">
          <CardContent className="pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  {selectedCustomer.company_name ? (
                    <Building2 className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  {selectedCustomer.name}
                </h4>
                <Badge variant="outline">
                  วงเงิน: {(selectedCustomer.credit_limit || 0).toLocaleString()} บาท
                </Badge>
              </div>

              {selectedCustomer.company_name && selectedCustomer.company_name !== selectedCustomer.name && (
                <p className="text-sm text-muted-foreground">{selectedCustomer.company_name}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                {selectedCustomer.contact_person && (
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{selectedCustomer.contact_person}</span>
                  </div>
                )}

                {selectedCustomer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span>{selectedCustomer.phone}</span>
                  </div>
                )}

                {selectedCustomer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">เครดิต:</span>
                  <span>{selectedCustomer.payment_terms || 30} วัน</span>
                </div>
              </div>

              {selectedCustomer.address && (
                <div className="mt-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-3 w-3 mt-0.5" />
                    <span className="text-muted-foreground">{selectedCustomer.address}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomerSelector;