/**
 * PIN Lock Component - ใช้รหัส PIN เพื่อเข้าถึงข้อมูลที่ละเอียดอ่อน
 */

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ========== TYPES ==========

interface PinLockProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  maxAttempts?: number;
}

interface PinGuardProps {
  children: React.ReactNode;
  protectedPages?: string[];
  currentPage?: string;
}

// ========== PIN STORAGE ==========

const PIN_STORAGE_KEY = 'we_warehouse_pin_hash';
const PIN_UNLOCK_KEY = 'we_warehouse_pin_unlocked';
const PIN_UNLOCK_EXPIRY = 30 * 60 * 1000; // 30 นาที

// Simple hash function (for demo - in production use bcrypt)
const hashPin = (pin: string): string => {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// ========== PIN LOCK COMPONENT ==========

export function PinLock({ 
  isOpen, 
  onSuccess, 
  onCancel, 
  title = 'ใส่รหัส PIN',
  description = 'กรุณาใส่รหัส PIN 4-6 หลักเพื่อเข้าถึงข้อมูลนี้',
  maxAttempts = 3
}: PinLockProps) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Check if PIN is set
      const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
      setIsSetupMode(!storedHash);
      setPin('');
      setConfirmPin('');
      setError('');
      setStep('enter');
      
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  const handlePinChange = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    
    if (step === 'enter') {
      setPin(numericValue);
    } else {
      setConfirmPin(numericValue);
    }
    setError('');
  };
  
  const handleSubmit = () => {
    if (isSetupMode) {
      if (step === 'enter') {
        if (pin.length < 4) {
          setError('รหัส PIN ต้องมีอย่างน้อย 4 หลัก');
          return;
        }
        setStep('confirm');
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }
      
      // Confirm step
      if (pin !== confirmPin) {
        setError('รหัส PIN ไม่ตรงกัน กรุณาลองใหม่');
        setPin('');
        setConfirmPin('');
        setStep('enter');
        return;
      }
      
      // Save PIN
      const hash = hashPin(pin);
      localStorage.setItem(PIN_STORAGE_KEY, hash);
      
      // Mark as unlocked
      localStorage.setItem(PIN_UNLOCK_KEY, JSON.stringify({
        unlocked: true,
        expiry: Date.now() + PIN_UNLOCK_EXPIRY
      }));
      
      onSuccess();
    } else {
      // Verify PIN
      const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
      const enteredHash = hashPin(pin);
      
      if (storedHash === enteredHash) {
        // Mark as unlocked
        localStorage.setItem(PIN_UNLOCK_KEY, JSON.stringify({
          unlocked: true,
          expiry: Date.now() + PIN_UNLOCK_EXPIRY
        }));
        
        setAttempts(0);
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= maxAttempts) {
          setError(`ใส่รหัสผิด ${maxAttempts} ครั้ง กรุณาลองใหม่ภายหลัง`);
          // Lock for 5 minutes
          setTimeout(() => setAttempts(0), 5 * 60 * 1000);
        } else {
          setError(`รหัส PIN ไม่ถูกต้อง (เหลืออีก ${maxAttempts - newAttempts} ครั้ง)`);
        }
        setPin('');
      }
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };
  
  const handleResetPin = () => {
    if (confirm('ต้องการรีเซ็ตรหัส PIN หรือไม่? คุณจะต้องตั้งรหัสใหม่')) {
      localStorage.removeItem(PIN_STORAGE_KEY);
      localStorage.removeItem(PIN_UNLOCK_KEY);
      setIsSetupMode(true);
      setPin('');
      setError('');
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            {isSetupMode ? 'ตั้งรหัส PIN' : title}
          </DialogTitle>
          <DialogDescription>
            {isSetupMode 
              ? step === 'enter'
                ? 'ตั้งรหัส PIN 4-6 หลักสำหรับป้องกันข้อมูลที่ละเอียดอ่อน'
                : 'ยืนยันรหัส PIN อีกครั้ง'
              : description
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* PIN Input */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full max-w-xs">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                value={step === 'enter' ? pin : confirmPin}
                onChange={(e) => handlePinChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={step === 'enter' ? 'ใส่ PIN...' : 'ยืนยัน PIN...'}
                className="pl-10 pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
                disabled={attempts >= maxAttempts}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* PIN Dots */}
            <div className="flex gap-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-colors ${
                    (step === 'enter' ? pin.length : confirmPin.length) > i
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                />
              ))}
            </div>
            
            {/* Step indicator for setup */}
            {isSetupMode && (
              <div className="flex gap-2 items-center text-sm text-gray-500">
                <span className={step === 'enter' ? 'text-blue-600 font-medium' : ''}>
                  1. ตั้งรหัส
                </span>
                <span>→</span>
                <span className={step === 'confirm' ? 'text-blue-600 font-medium' : ''}>
                  2. ยืนยัน
                </span>
              </div>
            )}
          </div>
          
          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mx-auto max-w-xs">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSubmit}
              disabled={(step === 'enter' ? pin.length : confirmPin.length) < 4 || attempts >= maxAttempts}
              className="w-full"
            >
              <Unlock className="h-4 w-4 mr-2" />
              {isSetupMode 
                ? step === 'enter' ? 'ถัดไป' : 'ยืนยันและตั้งรหัส'
                : 'ปลดล็อค'
              }
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                ยกเลิก
              </Button>
              {!isSetupMode && (
                <Button variant="ghost" onClick={handleResetPin} className="text-xs text-gray-500">
                  ลืมรหัส?
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== PIN GUARD COMPONENT ==========

const PROTECTED_PAGES = ['finance', 'financial', 'accounting', 'การเงิน'];

export function PinGuard({ children, protectedPages = PROTECTED_PAGES, currentPage }: PinGuardProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [showPinDialog, setShowPinDialog] = useState(false);
  
  useEffect(() => {
    // Check if current page is protected
    const isProtected = protectedPages.some(page => 
      currentPage?.toLowerCase().includes(page.toLowerCase())
    );
    
    if (!isProtected) {
      setIsLocked(false);
      return;
    }
    
    // Check if already unlocked
    const unlockData = localStorage.getItem(PIN_UNLOCK_KEY);
    if (unlockData) {
      try {
        const { unlocked, expiry } = JSON.parse(unlockData);
        if (unlocked && Date.now() < expiry) {
          setIsLocked(false);
          return;
        }
      } catch {
        // Invalid data, keep locked
      }
    }
    
    setIsLocked(true);
    setShowPinDialog(true);
  }, [currentPage, protectedPages]);
  
  const handleUnlock = () => {
    setIsLocked(false);
    setShowPinDialog(false);
  };
  
  const handleCancel = () => {
    setShowPinDialog(false);
    // Keep locked, user needs to go elsewhere
  };
  
  if (isLocked) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-gray-50 rounded-lg">
          <Lock className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            หน้านี้ต้องใส่รหัส PIN
          </h2>
          <p className="text-gray-500 mb-4">
            ข้อมูลทางการเงินต้องได้รับการป้องกัน
          </p>
          <Button onClick={() => setShowPinDialog(true)}>
            <Unlock className="h-4 w-4 mr-2" />
            ใส่รหัส PIN
          </Button>
        </div>
        
        <PinLock
          isOpen={showPinDialog}
          onSuccess={handleUnlock}
          onCancel={handleCancel}
          title="เข้าถึงข้อมูลการเงิน"
          description="กรุณาใส่รหัส PIN เพื่อดูข้อมูลทางการเงิน"
        />
      </>
    );
  }
  
  return <>{children}</>;
}

// ========== HOOK ==========

export function usePinLock() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const checkUnlock = () => {
    const unlockData = localStorage.getItem(PIN_UNLOCK_KEY);
    if (unlockData) {
      try {
        const { unlocked, expiry } = JSON.parse(unlockData);
        if (unlocked && Date.now() < expiry) {
          setIsUnlocked(true);
          return true;
        }
      } catch {
        // Invalid data
      }
    }
    setIsUnlocked(false);
    return false;
  };
  
  const lock = () => {
    localStorage.removeItem(PIN_UNLOCK_KEY);
    setIsUnlocked(false);
  };
  
  useEffect(() => {
    checkUnlock();
    
    // Recheck every minute
    const interval = setInterval(checkUnlock, 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  return {
    isUnlocked,
    checkUnlock,
    lock
  };
}

// ========== EXPORTS ==========

export default PinLock;




