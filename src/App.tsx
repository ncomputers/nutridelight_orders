import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OrderPage from "./pages/OrderPage";

const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const PurchaseLogin = lazy(() => import("./pages/PurchaseLogin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/order" replace />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/purchase/login" element={<PurchaseLogin />} />
            <Route path="/purchase" element={<AdminPanel mode="purchase" />} />
            <Route path="/admin" element={<AdminPanel mode="admin" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
