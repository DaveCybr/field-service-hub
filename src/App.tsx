import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CustomerAuthProvider, useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useInitialSetup } from "@/hooks/useInitialSetup";
import Auth from "./pages/Auth";
import InitialSetup from "./pages/InitialSetup";
import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import NewJob from "./pages/NewJob";
import JobDetail from "./pages/JobDetail";
import Technicians from "./pages/Technicians";
import Customers from "./pages/Customers";
import Units from "./pages/Units";
import ScanUnit from "./pages/ScanUnit";
import Inventory from "./pages/Inventory";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import AuditLogs from "./pages/AuditLogs";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
// Customer Portal
import CustomerLogin from "./pages/portal/CustomerLogin";
import CustomerDashboard from "./pages/portal/CustomerDashboard";
import CustomerJobs from "./pages/portal/CustomerJobs";
import CustomerJobDetail from "./pages/portal/CustomerJobDetail";
import CustomerHistory from "./pages/portal/CustomerHistory";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isCustomer, loading } = useCustomerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !isCustomer) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const { needsSetup, loading } = useInitialSetup();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function AuthRoute() {
  const { needsSetup, loading } = useInitialSetup();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return <Auth />;
}

function SetupPage() {
  const { needsSetup, loading } = useInitialSetup();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // If setup is not needed, redirect to auth
  if (!needsSetup) {
    return <Navigate to="/auth" replace />;
  }

  return <InitialSetup />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Initial Setup Route */}
      <Route path="/setup" element={<SetupPage />} />
      
      {/* Password Reset Routes (public) */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      
      {/* Staff Routes */}
      <Route path="/auth" element={<AuthRoute />} />
      <Route path="/" element={<SetupRoute><Navigate to="/dashboard" replace /></SetupRoute>} />
      <Route path="/dashboard" element={<SetupRoute><ProtectedRoute><Dashboard /></ProtectedRoute></SetupRoute>} />
      <Route path="/jobs" element={<SetupRoute><ProtectedRoute><Jobs /></ProtectedRoute></SetupRoute>} />
      <Route path="/jobs/new" element={<SetupRoute><ProtectedRoute><NewJob /></ProtectedRoute></SetupRoute>} />
      <Route path="/jobs/:id" element={<SetupRoute><ProtectedRoute><JobDetail /></ProtectedRoute></SetupRoute>} />
      <Route path="/technicians" element={<SetupRoute><ProtectedRoute><Technicians /></ProtectedRoute></SetupRoute>} />
      <Route path="/customers" element={<SetupRoute><ProtectedRoute><Customers /></ProtectedRoute></SetupRoute>} />
      <Route path="/units" element={<SetupRoute><ProtectedRoute><Units /></ProtectedRoute></SetupRoute>} />
      <Route path="/units/scan" element={<SetupRoute><ProtectedRoute><ScanUnit /></ProtectedRoute></SetupRoute>} />
      <Route path="/inventory" element={<SetupRoute><ProtectedRoute><Inventory /></ProtectedRoute></SetupRoute>} />
      <Route path="/reports" element={<SetupRoute><ProtectedRoute><Reports /></ProtectedRoute></SetupRoute>} />
      <Route path="/users" element={<SetupRoute><ProtectedRoute><UserManagement /></ProtectedRoute></SetupRoute>} />
      <Route path="/audit-logs" element={<SetupRoute><ProtectedRoute><AuditLogs /></ProtectedRoute></SetupRoute>} />
      <Route path="/settings" element={<SetupRoute><ProtectedRoute><Settings /></ProtectedRoute></SetupRoute>} />
      
      {/* Customer Portal Routes */}
      <Route path="/portal/login" element={<CustomerLogin />} />
      <Route path="/portal" element={<CustomerProtectedRoute><CustomerDashboard /></CustomerProtectedRoute>} />
      <Route path="/portal/jobs" element={<CustomerProtectedRoute><CustomerJobs /></CustomerProtectedRoute>} />
      <Route path="/portal/jobs/:id" element={<CustomerProtectedRoute><CustomerJobDetail /></CustomerProtectedRoute>} />
      <Route path="/portal/history" element={<CustomerProtectedRoute><CustomerHistory /></CustomerProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CustomerAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </CustomerAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
