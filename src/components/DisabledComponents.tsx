
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface DisabledComponentProps {
  name: string;
  reason?: string;
}

export function DisabledComponent({ name, reason = "Component is temporarily disabled" }: DisabledComponentProps) {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertCircle className="h-5 w-5" />
          {name} - Disabled
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-orange-600 text-sm">{reason}</p>
      </CardContent>
    </Card>
  );
}