import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'all' | 'fg' | 'pk' | 'custom';
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  disabled?: boolean;
}

export function FilterButton({
  isActive,
  onClick,
  children,
  variant = 'all',
  className,
  size = 'sm',
  disabled = false
}: FilterButtonProps) {
  // Standard color schemes for different variants
  const getVariantStyles = () => {
    if (!isActive) {
      return {
        variant: 'outline' as const,
        className: 'text-xs'
      };
    }

    switch (variant) {
      case 'fg':
        return {
          variant: 'default' as const,
          className: 'text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-300'
        };
      case 'pk':
        return {
          variant: 'default' as const,
          className: 'text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300'
        };
      case 'all':
      default:
        return {
          variant: 'default' as const,
          className: 'text-xs'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Button
      variant={styles.variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(styles.className, className)}
    >
      {children}
    </Button>
  );
}