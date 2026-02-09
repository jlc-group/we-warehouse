import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContextSimple";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { LocationQRProvider } from "@/contexts/LocationQRContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { LocationDetail } from "./pages/LocationDetail";
import SimpleAuth from "./pages/SimpleAuth";
import MobileMenu from "./pages/mobile/MobileMenu";
import LocationLookup from "./pages/mobile/LocationLookup";
import ItemMove from "./pages/mobile/ItemMove";
import MobileReceive from "@/pages/mobile/MobileReceive";
import MobileCount from "./pages/mobile/MobileCount";
import MobilePick from "./pages/mobile/MobilePick";
import LocationTasks from "./pages/mobile/LocationTasks";
import MyTasks from "./pages/mobile/MyTasks";
import AdminPage from "./pages/AdminPage";

// Development vs Production optimized query client configuration
const isDevelopment = import.meta.env.DEV;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isDevelopment ? 1000 * 60 * 5 : 1000 * 60 * 30, // 5 min dev, 30 min prod
      retry: isDevelopment ? 1 : 0, // Allow retries in development for better debugging
      refetchOnMount: isDevelopment ? 'always' : false, // Refetch in dev for fresh data
      refetchOnWindowFocus: isDevelopment ? true : false, // Enable in dev for debugging
      refetchOnReconnect: isDevelopment ? true : false, // Enable in dev for debugging
      refetchInterval: false, // No automatic refetch intervals
      refetchIntervalInBackground: false, // No background refetch
    },
    mutations: {
      retry: isDevelopment ? 1 : 0, // Allow mutation retries in development
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
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
            <AuthProvider>
              <ProductsProvider>
                <LocationQRProvider>
                  <InventoryProvider>
                    <Routes>
                      {/* หน้าหลักใหม่ พร้อม Sidebar */}
                      <Route
                        path="/"
                        element={
                          <AuthGuard>
                            <Dashboard />
                          </AuthGuard>
                        }
                      />
                      {/* หน้าเก่า (เก็บไว้ backup) */}
                      <Route
                        path="/old"
                        element={
                          <AuthGuard>
                            <Index />
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
                      {/* Mobile WMS Routes */}
                      <Route
                        path="/mobile"
                        element={
                          <AuthGuard>
                            <MobileMenu />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/lookup"
                        element={
                          <AuthGuard>
                            <LocationLookup />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/move"
                        element={
                          <AuthGuard>
                            <ItemMove />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/receive"
                        element={
                          <AuthGuard>
                            <MobileReceive />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/count"
                        element={
                          <AuthGuard>
                            <MobileCount />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/pick"
                        element={
                          <AuthGuard>
                            <MobilePick />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/tasks"
                        element={
                          <AuthGuard>
                            <LocationTasks />
                          </AuthGuard>
                        }
                      />
                      <Route
                        path="/mobile/my-tasks"
                        element={
                          <AuthGuard>
                            <MyTasks />
                          </AuthGuard>
                        }
                      />
                      {/* Admin Route */}
                      <Route
                        path="/admin"
                        element={
                          <AuthGuard requiredRole="ผู้ดูแลระบบ">
                            <AdminPage />
                          </AuthGuard>
                        }
                      />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </InventoryProvider>
                </LocationQRProvider>
              </ProductsProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
