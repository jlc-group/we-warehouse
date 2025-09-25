import { DisabledComponent } from './DisabledComponents';

interface OrderDetailModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  order?: any;
}

export const OrderDetailModal = ({ isOpen, onClose, order }: OrderDetailModalProps) => {
  return <DisabledComponent name="Order Detail Modal" />;
};

export default OrderDetailModal;