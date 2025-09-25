import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextSimple";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ReactProfiler } from "@/debug/ReactProfiler";
import "@/debug/intervalDetector"; // CRITICAL: Import to activate interval monitoring
import "@/utils/databaseTest"; // Import database test utilities
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { LocationDetail } from "./pages/LocationDetail";
import SimpleAuth from "./pages/SimpleAuth";

// CRITICAL: Disable all auto-refetch to prevent refresh loops
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes - much longer
      retry: 0, // No retries to prevent loops
      refetchOnMount: false, // CRITICAL: Don't refetch on component mount
      refetchOnWindowFocus: false, // CRITICAL: Don't refetch on window focus
      refetchOnReconnect: false, // Don't refetch on network reconnect
      refetchInterval: false, // No automatic refetch intervals
      refetchIntervalInBackground: false, // No background refetch
    },
    mutations: {
      retry: 0, // No retries for mutations either
    },
  },
});

const App = () => (
  <ReactProfiler id="App">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <ReactProfiler id="AuthProvider">
            <AuthProvider>
              <ReactProfiler id="ProductsProvider">
                <ProductsProvider>
                  <ReactProfiler id="InventoryProvider">
                    <InventoryProvider>
                      <Routes>
                      <Route
                        path="/"
                        element={
                          <AuthGuard>
                            <ReactProfiler id="Index">
                              <Index />
                            </ReactProfiler>
                          </AuthGuard>
                        }
                      />
                      <Route path="/auth" element={<Auth />} />
              <Route path="/simple-auth" element={<SimpleAuth />} />
                      <Route
                        path="/location/:locationId"
                        element={
                          <AuthGuard>
                            <LocationDetail />
                          </AuthGuard>
                        }
                      />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                      </Routes>
                    </InventoryProvider>
                  </ReactProfiler>
                </ProductsProvider>
              </ReactProfiler>
            </AuthProvider>
          </ReactProfiler>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ReactProfiler>
);

export default App;
