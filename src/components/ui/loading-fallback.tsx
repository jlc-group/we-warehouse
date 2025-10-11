import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const LoadingFallback = ({
  message = "กำลังโหลด...",
  showSkeleton = false
}: {
  message?: string;
  showSkeleton?: boolean;
}) => {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">{message}</p>
          {showSkeleton && (
            <div className="w-full space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ComponentLoadingFallback = ({ componentName }: { componentName: string }) => {
  return (
    <LoadingFallback
      message={`กำลังโหลด ${componentName}...`}
      showSkeleton={true}
    />
  );
};

export const SimpleLoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-muted-foreground">กำลังโหลด...</span>
    </div>
  );
};