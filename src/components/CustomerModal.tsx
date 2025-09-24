import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Building2, Phone, Mail, MapPin, CreditCard, Save, X, Plus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateCustomer, useUpdateCustomer, customerTypeOptions } from '@/hooks/useCustomer';
import type { Customer } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Schema สำหรับ validation
const customerSchema = z.object({
  customer_code: z.string()
    .min(1, 'กรุณาใส่รหัสลูกค้า')
    .max(50, 'รหัสลูกค้าต้องไม่เกิน 50 ตัวอักษร'),
  customer_name: z.string()
    .min(1, 'กรุณาใส่ชื่อลูกค้า')
    .max(255, 'ชื่อลูกค้าต้องไม่เกิน 255 ตัวอักษร'),
  customer_type: z.string(),
  contact_person: z.string().max(255, 'ชื่อผู้ติดต่อต้องไม่เกิน 255 ตัวอักษร').optional(),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง').optional().or(z.literal('')),
  phone: z.string().max(50, 'เบอร์โทรศัพท์ต้องไม่เกิน 50 ตัวอักษร').optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  district: z.string().max(100, 'อำเภอต้องไม่เกิน 100 ตัวอักษร').optional(),
  province: z.string().max(100, 'จังหวัดต้องไม่เกิน 100 ตัวอักษร').optional(),
  postal_code: z.string().max(20, 'รหัสไปรษณีย์ต้องไม่เกิน 20 ตัวอักษร').optional(),
  country: z.string().max(100, 'ประเทศต้องไม่เกิน 100 ตัวอักษร').optional(),
  tax_id: z.string().max(50, 'เลขที่ผู้เสียภาษีต้องไม่เกิน 50 ตัวอักษร').optional(),
  business_type: z.string().max(100, 'ประเภทธุรกิจต้องไม่เกิน 100 ตัวอักษร').optional(),
  credit_limit: z.number().min(0, 'วงเงินเครดิตต้องไม่ติดลบ').optional(),
  payment_terms: z.number().min(0, 'เงื่อนไขการชำระเงินต้องไม่ติดลบ').optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  mode?: 'create' | 'edit';
}

export function CustomerModal({
  isOpen,
  onClose,
  customer,
  mode = 'create'
}: CustomerModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: 'RETAIL',
      country: 'Thailand',
      credit_limit: 0,
      payment_terms: 30,
    }
  });

  // Reset form when modal opens/closes or customer changes
  useEffect(() => {
    if (isOpen) {
      if (customer && mode === 'edit') {
        // แก้ไขลูกค้า - ใส่ข้อมูลเดิม
        reset({
          customer_code: customer.customer_code,
          customer_name: customer.customer_name,
          customer_type: customer.customer_type || 'RETAIL',
          contact_person: customer.contact_person || '',
          email: customer.email || '',
          phone: customer.phone || '',
          address_line1: customer.address_line1 || '',
          address_line2: customer.address_line2 || '',
          district: customer.district || '',
          province: customer.province || '',
          postal_code: customer.postal_code || '',
          country: customer.country || 'Thailand',
          tax_id: customer.tax_id || '',
          business_type: customer.business_type || '',
          credit_limit: customer.credit_limit || 0,
          payment_terms: customer.payment_terms || 30,
          notes: customer.notes || '',
        });
        setTags(customer.tags || []);
      } else {
        // เพิ่มลูกค้าใหม่ - รีเซ็ตเป็นค่าเริ่มต้น
        reset({
          customer_code: '',
          customer_name: '',
          customer_type: 'RETAIL',
          contact_person: '',
          email: '',
          phone: '',
          address_line1: '',
          address_line2: '',
          district: '',
          province: '',
          postal_code: '',
          country: 'Thailand',
          tax_id: '',
          business_type: '',
          credit_limit: 0,
          payment_terms: 30,
          notes: '',
        });
        setTags([]);
      }
      setNewTag('');
    }
  }, [isOpen, customer, mode, reset]);

  // Auto-generate customer code for new customers
  useEffect(() => {
    if (mode === 'create' && isOpen) {
      const generateCustomerCode = () => {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `CUST${year}${month}${random}`;
      };

      setValue('customer_code', generateCustomerCode());
    }
  }, [mode, isOpen, setValue]);

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const customerData = {
        ...data,
        tags: tags.length > 0 ? tags : null,
        email: data.email || null,
        phone: data.phone || null,
        contact_person: data.contact_person || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        district: data.district || null,
        province: data.province || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        tax_id: data.tax_id || null,
        business_type: data.business_type || null,
        notes: data.notes || null,
      };

      if (mode === 'edit' && customer) {
        await updateCustomer.mutateAsync({
          customerId: customer.id,
          updates: customerData
        });
      } else {
        await createCustomer.mutateAsync(customerData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {mode === 'edit' ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `แก้ไขข้อมูลลูกค้า: ${customer?.customer_name}`
              : 'กรอกข้อมูลลูกค้าใหม่ในระบบ'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* ข้อมูลพื้นฐาน */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium">ข้อมูลพื้นฐาน</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer_code">รหัสลูกค้า *</Label>
                <Input
                  id="customer_code"
                  {...register('customer_code')}
                  placeholder="CUST001"
                  disabled={mode === 'edit'}
                />
                {errors.customer_code && (
                  <p className="text-sm text-red-600">{errors.customer_code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_type">ประเภทลูกค้า</Label>
                <Select
                  value={watch('customer_type')}
                  onValueChange={(value) => setValue('customer_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภทลูกค้า" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="customer_name">ชื่อลูกค้า *</Label>
                <Input
                  id="customer_name"
                  {...register('customer_name')}
                  placeholder="ชื่อบริษัท หรือ ชื่อบุคคล"
                />
                {errors.customer_name && (
                  <p className="text-sm text-red-600">{errors.customer_name.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ข้อมูลติดต่อ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone className="h-4 w-4 text-green-600" />
              <Label className="text-sm font-medium">ข้อมูลติดต่อ</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">ชื่อผู้ติดต่อ</Label>
                <Input
                  id="contact_person"
                  {...register('contact_person')}
                  placeholder="คุณสมชาย ใจดี"
                />
                {errors.contact_person && (
                  <p className="text-sm text-red-600">{errors.contact_person.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="02-123-4567 หรือ 08-111-2222"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="email">อีเมล</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@company.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* ที่อยู่ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-orange-600" />
              <Label className="text-sm font-medium">ที่อยู่</Label>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">ที่อยู่ บรรทัดที่ 1</Label>
                <Input
                  id="address_line1"
                  {...register('address_line1')}
                  placeholder="123 ถนนสุขุมวิท"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">ที่อยู่ บรรทัดที่ 2</Label>
                <Input
                  id="address_line2"
                  {...register('address_line2')}
                  placeholder="แขวงคลองตัน เขตคลองเตย"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="district">อำเภอ/เขต</Label>
                  <Input
                    id="district"
                    {...register('district')}
                    placeholder="คลองเตย"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">จังหวัด</Label>
                  <Input
                    id="province"
                    {...register('province')}
                    placeholder="กรุงเทพมหานคร"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postal_code">รหัสไปรษณีย์</Label>
                  <Input
                    id="postal_code"
                    {...register('postal_code')}
                    placeholder="10110"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">ประเทศ</Label>
                <Input
                  id="country"
                  {...register('country')}
                  placeholder="Thailand"
                />
              </div>
            </div>
          </div>

          {/* ข้อมูลธุรกิจ */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <Label className="text-sm font-medium">ข้อมูลธุรกิจ</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_id">เลขที่ผู้เสียภาษี</Label>
                <Input
                  id="tax_id"
                  {...register('tax_id')}
                  placeholder="1234567890123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_type">ประเภทธุรกิจ</Label>
                <Input
                  id="business_type"
                  {...register('business_type')}
                  placeholder="ค้าปลีก, ค้าส่ง, ผลิต"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit_limit">วงเงินเครดิต (บาท)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('credit_limit', { valueAsNumber: true })}
                  placeholder="100000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">เงื่อนไขการชำระเงิน (วัน)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  min="0"
                  {...register('payment_terms', { valueAsNumber: true })}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">ป้ายกำกับ (Tags)</Label>

            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="เพิ่มป้ายกำกับ..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* หมายเหตุ */}
          <div className="space-y-2">
            <Label htmlFor="notes">หมายเหตุ</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="หมายเหตุเพิ่มเติมเกี่ยวกับลูกค้า..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              ยกเลิก
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-pulse" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {mode === 'edit' ? 'อัปเดตข้อมูล' : 'เพิ่มลูกค้า'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerModal;