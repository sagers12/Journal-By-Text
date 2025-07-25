
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Marketing from "./pages/Marketing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Journal from "./pages/Journal";
import Privacy from "./pages/Privacy";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import TrialExpired from "./pages/TrialExpired";
import { ResetPassword } from "./pages/ResetPassword";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionProtectedRoute } from "./components/SubscriptionProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Marketing />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/journal" element={
            <SubscriptionProtectedRoute>
              <Journal />
            </SubscriptionProtectedRoute>
          } />
          <Route path="/settings" element={
            <SubscriptionProtectedRoute>
              <Settings />
            </SubscriptionProtectedRoute>
          } />
          <Route path="/trial-expired" element={<TrialExpired />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
