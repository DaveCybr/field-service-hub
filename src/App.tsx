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

// Loading component to avoid repetition
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.loading) {
    return <LoadingSpinner />;
  }

  if (!auth.user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// Role-based route protection
type AllowedRole = 'superadmin' | 'admin' | 'manager' | 'technician' | 'cashier';

function RoleProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: AllowedRole[];
}) {
  const auth = useAuth();

  if (auth.loading) {
    return <LoadingSpinner />;
  }

  if (!auth.user) {
    return <Navigate to="/auth" replace />;
  }

  if (auth.userRole && !allowedRoles.includes(auth.userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function CustomerProtectedRoute({ children }: { children: React.ReactNode }) {
  const customerAuth = useCustomerAuth();

  if (customerAuth.loading) {
    return <LoadingSpinner />;
  }

  if (!customerAuth.user || !customerAuth.isCustomer) {
    return <Navigate to="/portal/login" replace />;
  }

  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const setup = useInitialSetup();

  if (setup.loading) {
    return <LoadingSpinner />;
  }

  if (setup.needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

function AuthRoute() {
  const setup = useInitialSetup();

  if (setup.loading) {
    return <LoadingSpinner />;
  }

  if (setup.needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  return <Auth />;
}

function SetupPage() {
  const setup = useInitialSetup();

  if (setup.loading) {
    return <LoadingSpinner />;
  }

  if (!setup.needsSetup) {
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
      <Route path="/jobs/new" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
            <NewJob />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/jobs/:id" element={<SetupRoute><ProtectedRoute><JobDetail /></ProtectedRoute></SetupRoute>} />
      <Route path="/technicians" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
            <Technicians />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/customers" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
            <Customers />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/units" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'technician']}>
            <Units />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/units/scan" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager', 'technician']}>
            <ScanUnit />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/inventory" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
            <Inventory />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/reports" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'manager']}>
            <Reports />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/users" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin']}>
            <UserManagement />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
      <Route path="/audit-logs" element={
        <SetupRoute>
          <RoleProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <AuditLogs />
          </RoleProtectedRoute>
        </SetupRoute>
      } />
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
