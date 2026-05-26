import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { CurrencyProvider } from "@/lib/currency";
import RequireAuth from "@/components/RequireAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RestaurantDetail from "./pages/RestaurantDetail";
import Favourites from "./pages/Favourites";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import Orders from "./pages/Orders";
import Addresses from "./pages/Addresses";
import OwnerDashboard from "./pages/OwnerDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";

const queryClient = new QueryClient();

function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let title = "Provender | Premium Food Delivery";
    if (path === "/auth") title = "Sign In - Provender";
    else if (path === "/forgot-password") title = "Forgot Password - Provender";
    else if (path === "/reset-password") title = "Reset Password - Provender";
    else if (path.startsWith("/restaurant/")) title = "Kitchen Details - Provender";
    else if (path === "/favourites") title = "My Favourites - Provender";
    else if (path === "/cart") title = "Shopping Cart - Provender";
    else if (path === "/checkout") title = "Checkout - Provender";
    else if (path.startsWith("/track/")) title = "Track Order - Provender";
    else if (path === "/orders") title = "My Orders - Provender";
    else if (path === "/addresses") title = "My Addresses - Provender";
    else if (path === "/owner") title = "Kitchen Dashboard - Provender";
    else if (path === "/delivery") title = "Delivery Dashboard - Provender";
    else if (path === "/admin") title = "Admin Panel - Provender";
    else if (path === "/not-found") title = "Page Not Found - Provender";

    document.title = title;
  }, [location]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      <TitleManager />
      <AuthProvider>
        <CurrencyProvider>
          <CartProvider>
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                <Route path="/favourites" element={<RequireAuth><Favourites /></RequireAuth>} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
                <Route path="/track/:id" element={<RequireAuth><OrderTracking /></RequireAuth>} />
                <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
                <Route path="/addresses" element={<RequireAuth><Addresses /></RequireAuth>} />
                <Route path="/owner" element={<RequireAuth role="owner"><OwnerDashboard /></RequireAuth>} />
                <Route path="/delivery" element={<RequireAuth role="delivery"><DeliveryDashboard /></RequireAuth>} />
                <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </CartProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;

