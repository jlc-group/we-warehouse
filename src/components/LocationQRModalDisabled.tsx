import React from 'react';
import { DisabledComponent } from './DisabledComponent';

interface LocationQRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: string;
}

export const LocationQRModal = ({ open, onOpenChange }: LocationQRModalProps) => {
  return <DisabledComponent name="LocationQRModal" />;
};