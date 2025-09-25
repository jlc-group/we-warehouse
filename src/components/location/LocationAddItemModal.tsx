import { DisabledComponent } from '../DisabledComponents';

interface LocationAddItemModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  location?: string;
  onSave?: (data: any) => void;
}

export const LocationAddItemModal = ({ isOpen, onClose, location, onSave }: LocationAddItemModalProps) => {
  return <DisabledComponent name="Location Add Item Modal" />;
};