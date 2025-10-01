import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RoleSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  roles?: any[];
}

export const RoleSelector = ({ value, onChange, roles }: RoleSelectorProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="เลือกบทบาท" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">ผู้ดูแลระบบ</SelectItem>
        <SelectItem value="warehouse">คลังสินค้า</SelectItem>
        <SelectItem value="sales">ขาย</SelectItem>
      </SelectContent>
    </Select>
  );
};