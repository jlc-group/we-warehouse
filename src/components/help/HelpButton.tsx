import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { HelpContent } from './HelpContent';

interface HelpButtonProps {
  topic?: string;
  variant?: 'desktop' | 'mobile';
}

export function HelpButton({ topic = 'overview', variant = 'desktop' }: HelpButtonProps) {
  const [currentTopic, setCurrentTopic] = useState(topic);
  const [open, setOpen] = useState(false);

  // Sync topic when prop changes
  if (topic !== currentTopic && !open) {
    setCurrentTopic(topic);
  }

  const handleNavigate = (newTopic: string) => {
    setCurrentTopic(newTopic);
  };

  if (variant === 'mobile') {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="flex items-center justify-center h-9 w-9 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="วิธีใช้งาน"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-2">
            <SheetTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              วิธีใช้งาน
            </SheetTitle>
          </SheetHeader>
          <HelpContent topic={currentTopic} onNavigate={handleNavigate} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg border border-slate-200 hover:bg-slate-100"
          aria-label="วิธีใช้งาน"
        >
          <HelpCircle className="h-4 w-4 text-slate-600" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            วิธีใช้งาน
          </SheetTitle>
        </SheetHeader>
        <HelpContent topic={currentTopic} onNavigate={handleNavigate} />
      </SheetContent>
    </Sheet>
  );
}
