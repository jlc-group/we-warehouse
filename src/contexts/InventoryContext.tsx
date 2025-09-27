import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
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

// IMPROVED: Reasonable throttling time for better UX
let lastFetchTime = 0;
let currentFetchPromise: Promise<any> | null = null;
const THROTTLE_TIME = 15000; // 15 seconds - prevent excessive re-fetching
let isInitialFetch = true; // Track initial fetch to allow one immediate call

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isStableLoaded, setIsStableLoaded] = useState(false);
  const { toast } = useToast();

  // CRITICAL: Stabilize fetchItems with useRef to prevent re-render loops
  const fetchItemsRef = useRef<() => Promise<any>>();

  fetchItemsRef.current = async () => {
    // Improved throttling with better logging
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    if (!isInitialFetch && timeSinceLastFetch < THROTTLE_TIME && currentFetchPromise) {
      console.log(`⏳ InventoryContext: fetchItems throttled - ${Math.ceil((THROTTLE_TIME - timeSinceLastFetch) / 1000)}s remaining`);
      return currentFetchPromise;
    }

    console.log(`🔄 InventoryContext: fetchItems called ${isInitialFetch ? '(initial)' : `(after ${Math.floor(timeSinceLastFetch / 1000)}s)`}`);
    lastFetchTime = now;
    isInitialFetch = false;
    setLoading(true);

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('location')
          .limit(500); // Increased from 300 to show more data

        if (error) throw error;

        const items = data || [];
        console.log(`✅ InventoryContext: Successfully loaded ${items.length} items from database`);

        setItems(items);
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
  };

  // CRITICAL: Stable callback reference that doesn't change
  const fetchItems = useCallback(() => {
    return fetchItemsRef.current?.();
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

  // DISABLED: Prevent any auto-fetching that might cause loops
  // useEffect(() => {
  //   let mounted = true;
  //   let isFirstRun = true;
  //   console.log('🔍 InventoryContext useEffect: Mount detected');
  //   const initFetch = async () => {
  //     if (mounted && isInitialFetch && isFirstRun) {
  //       isFirstRun = false;
  //       console.log('🚀 InventoryContext: Initial fetch triggered');
  //       await fetchItems();
  //     }
  //   };
  //   initFetch();
  //   return () => {
  //     console.log('🧹 InventoryContext useEffect: Cleanup triggered');
  //     mounted = false;
  //   };
  // }, []);

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