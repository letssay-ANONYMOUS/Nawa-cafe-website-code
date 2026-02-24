
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { RouteAwareCookieConsent } from "@/components/RouteAwareCookieConsent";
import PageViewTracker from "@/components/PageViewTracker";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ScrollRestoration from "@/components/ScrollRestoration";
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
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import KitchenDashboard from "./pages/KitchenDashboard";
import StaffLogin from "./pages/StaffLogin";
import NotFound from "./pages/NotFound";
import MenuItemDetail from "./pages/MenuItemDetail";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ProductDetail from "./pages/ProductDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
      gcTime: 30 * 60 * 1000,   // 30 minutes cache retention
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <GoogleAnalytics />
            <PageViewTracker />
            <ScrollRestoration />
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
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/kitchen" element={<KitchenDashboard />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/visitors" element={<AnalyticsDashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <RouteAwareCookieConsent />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AdminProvider>
  </QueryClientProvider>
);

export default App;
