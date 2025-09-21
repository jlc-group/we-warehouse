import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface InventoryContextType {
  items: InventoryItem[];
  loading: boolean;
  connectionStatus: ConnectionStatus;
  isStableLoaded: boolean;
  refetch: () => Promise<void>;
  addItem: (itemData: any) => Promise<any>;
  updateItem: (id: string, updates: any) => Promise<any>;
  deleteItem: (id: string) => Promise<void>;
  retryConnection: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Simple throttling variables outside component to avoid re-renders
let lastFetchTime = 0;
let currentFetchPromise: Promise<any> | null = null;
const THROTTLE_TIME = 2000; // 2 seconds

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isStableLoaded, setIsStableLoaded] = useState(false);
  const { toast } = useToast();

  // Ultra-simplified fetch to fix performance issues
  const fetchItems = useCallback(async () => {
    // Prevent duplicate calls
    const now = Date.now();
    if (now - lastFetchTime < THROTTLE_TIME && currentFetchPromise) {
      return currentFetchPromise;
    }

    lastFetchTime = now;
    setLoading(true);

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('location')
          .limit(300); // Further reduced for performance

        if (error) throw error;

        setItems(data || []);
        setConnectionStatus('connected');
        setIsStableLoaded(true);
        
        return data;
      } catch (error) {
        console.error('Context fetch error:', error);
        setConnectionStatus('disconnected');
        return [];
      } finally {
        setLoading(false);
      }
    })();

    currentFetchPromise = fetchPromise;
    return fetchPromise;
  }, []);

  const addItem = useCallback(async (itemData: any) => {
    // Implementation here - same as useInventory but simplified
    return null;
  }, []);

  const updateItem = useCallback(async (id: string, updates: any) => {
    // Implementation here - same as useInventory but simplified
    return null;
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    // Implementation here - same as useInventory but simplified
  }, []);

  const retryConnection = useCallback(async () => {
    setConnectionStatus('connecting');
    await fetchItems();
  }, [fetchItems]);

  const refetch = useCallback(async () => {
    await fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo((): InventoryContextType => ({
    items,
    loading,
    connectionStatus,
    isStableLoaded,
    refetch,
    addItem,
    updateItem,
    deleteItem,
    retryConnection,
  }), [items, loading, connectionStatus, isStableLoaded, refetch, addItem, updateItem, deleteItem, retryConnection]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventoryContext(): InventoryContextType {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return context;
}