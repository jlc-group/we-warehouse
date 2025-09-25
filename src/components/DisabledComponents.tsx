import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export const DisabledComponent = ({ name }: { name: string }) => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        {name} - ชั่วคราวปิดใช้งาน
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">
        ฟีเจอร์นี้ถูกปิดใช้งานชั่วคราวเพื่อแก้ไขปัญหา TypeScript
      </p>
    </CardContent>
  </Card>
);

export default DisabledComponent;