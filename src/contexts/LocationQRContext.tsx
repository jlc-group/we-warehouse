import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { locationQRService, LocationQRCode } from '@/services/locationQRService';

// Use the same interface from the service
interface LocationQRContextType {
  qrCodes: LocationQRCode[];
  loading: boolean;
  error: Error | null;
  getQRByLocation: (location: string) => LocationQRCode | undefined;
  generateQR: (location: string) => Promise<LocationQRCode | null>;
  bulkGenerateQR: (locations: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

const LocationQRContext = createContext<LocationQRContextType | undefined>(undefined);

export function LocationQRProvider({ children }: { children: ReactNode }) {
  const [qrCodes, setQRCodes] = useState<LocationQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQRCodes = useCallback(async () => {
    try {
      console.log('🔍 LocationQRContext: Fetching all QR codes...');
      setLoading(true);
      setError(null);

      const result = await locationQRService.getAllQRCodes();
      if (result.data) {
        setQRCodes(result.data);
        console.log(`✅ LocationQRContext: Loaded ${result.data.length} QR codes`);
      } else if (result.error) {
        throw new Error(result.error);
      }
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
      const result = await locationQRService.generateQRForLocation(location);
      if (result.data) {
        setQRCodes(prev => [...prev, result.data!]);
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('❌ Error generating QR:', err);
      return null;
    }
  }, []);

  const bulkGenerateQR = useCallback(async (locations: string[]) => {
    try {
      console.log(`📦 Bulk generating ${locations.length} QR codes...`);
      const result = await locationQRService.bulkGenerateQR(locations);
      if (result.data) {
        console.log(`✅ Bulk generated: ${result.data.successCount} successful, ${result.data.failedCount} failed`);
        // Refetch all QR codes after bulk generation
        await fetchQRCodes();
      }
    } catch (err) {
      console.error('❌ Error bulk generating QR codes:', err);
    }
  }, [fetchQRCodes]);

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
