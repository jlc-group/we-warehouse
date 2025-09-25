import React from 'react';
import { DisabledComponent } from './DisabledComponents';

interface RoleSelectorProps {
  value?: string;
  onChange?: (value: string) => void;
  roles?: any[];
}

export const RoleSelector = ({ value, onChange, roles }: RoleSelectorProps) => {
  return <DisabledComponent name="Role Selector" />;
};