import { DisabledComponent } from './DisabledComponents';

interface CustomerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  customer?: any;
  onSave?: (customer: any) => void;
}

export default function CustomerModal({ isOpen, onClose, customer, onSave }: CustomerModalProps) {
  return <DisabledComponent name="Customer Modal" />;
}