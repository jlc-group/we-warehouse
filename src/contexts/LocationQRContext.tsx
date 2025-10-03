import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { locationQRService } from '@/services/locationQRService';

interface QRCode {
  id: string;
  location: string;
  qr_data: string;
  created_at: string;
}

interface LocationQRContextType {
  qrCodes: QRCode[];
  loading: boolean;
  error: Error | null;
  getQRByLocation: (location: string) => QRCode | undefined;
  generateQR: (location: string) => Promise<QRCode | null>;
  bulkGenerateQR: (locations: string[], items: any[]) => Promise<void>;
  refetch: () => Promise<void>;
}

const LocationQRContext = createContext<LocationQRContextType | undefined>(undefined);

export function LocationQRProvider({ children }: { children: ReactNode }) {
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQRCodes = useCallback(async () => {
    try {
      console.log('🔍 LocationQRContext: Fetching all QR codes...');
      setLoading(true);
      setError(null);

      const codes = await locationQRService.getAllQRCodes();
      setQRCodes(codes);

      console.log(`✅ LocationQRContext: Loaded ${codes.length} QR codes`);
    } catch (err) {
      console.error('❌ LocationQRContext: Error fetching QR codes:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchQRCodes();
  }, [fetchQRCodes]);

  const getQRByLocation = useCallback((location: string) => {
    return qrCodes.find(qr => qr.location === location);
  }, [qrCodes]);

  const generateQR = useCallback(async (location: string) => {
    try {
      const newQR = await locationQRService.generateQRCode(location);
      if (newQR) {
        setQRCodes(prev => [...prev, newQR]);
      }
      return newQR;
    } catch (err) {
      console.error('❌ Error generating QR:', err);
      return null;
    }
  }, []);

  const bulkGenerateQR = useCallback(async (locations: string[], items: any[]) => {
    try {
      console.log(`📦 Bulk generating ${locations.length} QR codes...`);
      const newCodes = await locationQRService.bulkGenerateQRCodes(locations, items);
      setQRCodes(prev => [...prev, ...newCodes]);
      console.log(`✅ Bulk generated ${newCodes.length} QR codes`);
    } catch (err) {
      console.error('❌ Error bulk generating QR codes:', err);
    }
  }, []);

  const value: LocationQRContextType = {
    qrCodes,
    loading,
    error,
    getQRByLocation,
    generateQR,
    bulkGenerateQR,
    refetch: fetchQRCodes
  };

  return (
    <LocationQRContext.Provider value={value}>
      {children}
    </LocationQRContext.Provider>
  );
}

export function useLocationQRContext() {
  const context = useContext(LocationQRContext);
  if (context === undefined) {
    throw new Error('useLocationQRContext must be used within a LocationQRProvider');
  }
  return context;
}
