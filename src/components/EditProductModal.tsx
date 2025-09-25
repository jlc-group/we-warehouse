import { DisabledComponent } from './DisabledComponents';

interface EditProductModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  product?: any;
  onSave?: (product: any) => void;
}

export const EditProductModal = ({ isOpen, onClose, product, onSave }: EditProductModalProps) => {
  return <DisabledComponent name="Edit Product Modal" />;
};