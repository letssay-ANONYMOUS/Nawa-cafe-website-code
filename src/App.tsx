
import { Toaster } from "@/components/ui/toaster";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { RouteAwareCookieConsent } from "@/components/RouteAwareCookieConsent";
import PageViewTracker from "@/components/PageViewTracker";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ScrollRestoration from "@/components/ScrollRestoration";
import ImagePreloader from "@/components/ImagePreloader";
import Home from "./pages/Home";
import MenuPage from "./pages/MenuPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import CateringPage from "./pages/CateringPage";
import StorePage from "./pages/StorePage";
import LocationsPage from "./pages/LocationsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentPendingPage from "./pages/PaymentPendingPage";
import SharedPaymentPage from "./pages/SharedPaymentPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import KitchenDashboard from "./pages/KitchenDashboard";
import StaffLogin from "./pages/StaffLogin";
import KitchenAuthGate from "./components/KitchenAuthGate";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerSignup from "./pages/CustomerSignup";
import CustomerAccountPage from "./pages/CustomerAccountPage";
import CustomerAuthGate from "./components/CustomerAuthGate";
import { LocationTracker } from "./hooks/LocationTracker";

import NotFound from "./pages/NotFound";
import MenuItemDetail from "./pages/MenuItemDetail";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ProductDetail from "./pages/ProductDetail";
import MaintenanceGate from "./components/MaintenanceGate";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import TermsConditionsPage from "./pages/TermsConditionsPage";

// ⚡ MAINTENANCE MODE — set to false to re-enable the site
const MAINTENANCE_MODE = false;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
      gcTime: 30 * 60 * 1000,   // 30 minutes cache retention
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  if (MAINTENANCE_MODE) {
    return (
      <QueryClientProvider client={queryClient}>
        <AdminProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/staff/login" element={<StaffLogin />} />
                <Route path="/visitors" element={<AnalyticsDashboard />} />
                <Route path="*" element={<MaintenanceGate />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AdminProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider>
        <CustomerAuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <LocationTracker />
              <GoogleAnalytics />
              <PageViewTracker />
              <ScrollRestoration />
              <ImagePreloader />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/menu/:id" element={<MenuItemDetail />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/catering" element={<CateringPage />} />
                <Route path="/store" element={<StorePage />} />
                <Route path="/store/:id" element={<ProductDetail />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/payment-pending" element={<PaymentPendingPage />} />
                <Route path="/payment-success" element={<PaymentSuccessPage />} />
                <Route path="/pay/:id" element={<SharedPaymentPage />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/kitchen/*" element={<KitchenAuthGate><KitchenDashboard /></KitchenAuthGate>} />
                <Route path="/staff/login" element={<StaffLogin />} />
                <Route path="/login" element={<CustomerLogin />} />
                <Route path="/signup" element={<CustomerSignup />} />
                <Route path="/account" element={<CustomerAuthGate><CustomerAccountPage /></CustomerAuthGate>} />
                <Route path="/visitors" element={<AnalyticsDashboard />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />
                <Route path="/terms-conditions" element={<TermsConditionsPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <RouteAwareCookieConsent />
            </BrowserRouter>
          </TooltipProvider>
        </CartProvider>
        </CustomerAuthProvider>
      </AdminProvider>
    </QueryClientProvider>
  );
};

export default App;
