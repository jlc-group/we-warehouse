import { DisabledComponent } from './DisabledComponents';

interface LocationTransferModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  sourceLocation?: string;
  targetLocation?: string;
  onTransfer?: (data: any) => void;
}

export const LocationTransferModal = ({ isOpen, onClose, sourceLocation, targetLocation, onTransfer }: LocationTransferModalProps) => {
  return <DisabledComponent name="Location Transfer Modal" />;
};