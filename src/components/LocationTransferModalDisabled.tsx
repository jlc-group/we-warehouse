import React from 'react';
import { DisabledComponent } from './DisabledComponent';

interface LocationTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLocation?: any;
}

export const LocationTransferModal = ({ open, onOpenChange }: LocationTransferModalProps) => {
  return <DisabledComponent name="LocationTransferModal" />;
};