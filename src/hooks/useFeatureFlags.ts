import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeatureFlags {
  billClearing: boolean;
  orderStatusHistory: boolean;
  clearingBatches: boolean;
  billClearingPermissions: boolean;
}

const DEFAULT_FEATURES: FeatureFlags = {
  billClearing: false,
  orderStatusHistory: false,
  clearingBatches: false,
  billClearingPermissions: false,
};

// Check if bill clearing tables exist by trying to query them
async function checkBillClearingTables(): Promise<Partial<FeatureFlags>> {
  const features: Partial<FeatureFlags> = {};

  try {
    // Check if bill_clearing_permissions table exists
    const { error: permissionsError } = await supabase
      .from('bill_clearing_permissions')
      .select('id')
      .limit(1);

    features.billClearingPermissions = !permissionsError;
  } catch (error) {
    features.billClearingPermissions = false;
  }

  try {
    // Check if order_status_history table exists
    const { error: historyError } = await supabase
      .from('order_status_history')
      .select('id')
      .limit(1);

    features.orderStatusHistory = !historyError;
  } catch (error) {
    features.orderStatusHistory = false;
  }

  try {
    // Check if clearing_batches table exists
    const { error: batchesError } = await supabase
      .from('clearing_batches')
      .select('id')
      .limit(1);

    features.clearingBatches = !batchesError;
  } catch (error) {
    features.clearingBatches = false;
  }

  try {
    // Check if clearable_orders_view exists
    const { error: viewError } = await supabase
      .from('clearable_orders_view')
      .select('id')
      .limit(1);

    features.billClearing = !viewError;
  } catch (error) {
    features.billClearing = false;
  }

  return features;
}

// Check if the customer_orders table has bill clearing columns
async function checkBillClearingColumns(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('customer_orders')
      .select('cleared_at, cleared_by, payment_status')
      .limit(1);

    // If no error, the columns exist
    return !error;
  } catch (error) {
    return false;
  }
}

export function useFeatureFlags() {
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES);
  const [isLoading, setIsLoading] = useState(false); // CRITICAL: No loading to prevent renders
  const [hasNewColumns, setHasNewColumns] = useState(false);

  // CRITICAL: DISABLE ALL FEATURE FLAG QUERIES TO PREVENT 404 RE-RENDER LOOPS
  useEffect(() => {
    console.log('🚫 useFeatureFlags: Auto-check DISABLED to prevent 404 re-render loops');

    // Set static defaults immediately without any queries
    setFeatures(DEFAULT_FEATURES);
    setIsLoading(false);
    setHasNewColumns(false);

    console.log('Feature flags determined (static):', DEFAULT_FEATURES);
    console.log('Has bill clearing columns:', false);

    // DISABLED QUERIES - they cause 404 errors and re-render loops:
    // const checkFeatures = async () => {
    //   try {
    //     setIsLoading(true);
    //     const tableFeatures = await checkBillClearingTables();
    //     const hasColumns = await checkBillClearingColumns();
    //     setHasNewColumns(hasColumns);
    //     const finalFeatures: FeatureFlags = {
    //       ...DEFAULT_FEATURES,
    //       ...tableFeatures,
    //       billClearing: hasColumns || tableFeatures.billClearing || false,
    //     };
    //     setFeatures(finalFeatures);
    //     console.log('Feature flags determined:', finalFeatures);
    //     console.log('Has bill clearing columns:', hasColumns);
    //   } catch (error) {
    //     console.error('Error checking feature flags:', error);
    //     setFeatures(DEFAULT_FEATURES);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // checkFeatures();
  }, []);

  return {
    features,
    isLoading,
    hasNewColumns,
    isFallbackMode: !features.billClearing && !features.orderStatusHistory,
    // CRITICAL: DISABLE MANUAL REFRESH TO PREVENT TRIGGERING 404 QUERIES
    refresh: async () => {
      console.log('🚫 useFeatureFlags.refresh: DISABLED to prevent 404 queries');
      // No-op function to prevent triggering 404 queries
      return;
    }
  };
}