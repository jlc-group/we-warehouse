
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, AlertCircle } from 'lucide-react';

export function DisabledUserProfile() {
  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <User className="h-5 w-5" />
          <AlertCircle className="h-4 w-4" />
          User Profile - Disabled
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-orange-600 text-sm">User profile component is temporarily disabled</p>
      </CardContent>
    </Card>
  );
}