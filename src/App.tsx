import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { AuthProviders } from "@/providers/AuthProviders";
import { useInitialSetup } from "@/hooks/useInitialSetup";
import Auth from "./pages/Auth";
import InitialSetup from "./pages/InitialSetup";
import Dashboard from "./pages/Dashboard";
// OLD: Jobs pages (deprecated - will be removed after testing)
import Jobs from "./pages/Jobs";
import NewJob from "./pages/NewJob";
import JobDetail from "./pages/JobDetail";
// NEW: Invoice pages
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice"; // TODO: Create this
import InvoiceDetail from "./pages/InvoiceDetail"; // TODO: Create this

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

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Staff Protected Routes
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
type AllowedRole =
  | "superadmin"
  | "admin"
  | "manager"
  | "technician"
  | "cashier";

function RoleProtectedRoute({
  children,
  allowedRoles,
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

// Customer Protected Routes
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

// Setup Route Check
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

// Staff Routes Component
function StaffRoutes() {
  return (
    <Routes>
      {/* Initial Setup Route */}
      <Route path="/setup" element={<SetupPage />} />

      {/* Password Reset Routes (public) */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Staff Auth */}
      <Route path="/auth" element={<AuthRoute />} />
      <Route
        path="/"
        element={
          <SetupRoute>
            <Navigate to="/dashboard" replace />
          </SetupRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <SetupRoute>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </SetupRoute>
        }
      />

      {/* ========================================= */}
      {/* NEW: Invoice Routes (New Structure)      */}
      {/* ========================================= */}
      <Route
        path="/invoices"
        element={
          <SetupRoute>
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          </SetupRoute>
        }
      />
      {/* TODO: Uncomment after creating these pages */}
      <Route
        path="/invoices/new"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager", "cashier"]}
            >
              <NewInvoice />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <SetupRoute>
            <ProtectedRoute>
              <InvoiceDetail />
            </ProtectedRoute>
          </SetupRoute>
        }
      />

      {/* ========================================= */}
      {/* OLD: Jobs Routes (DEPRECATED)            */}
      {/* Will be removed after Invoices is stable */}
      {/* ========================================= */}
      <Route
        path="/jobs"
        element={
          <SetupRoute>
            <ProtectedRoute>
              <Jobs />
            </ProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/jobs/new"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <NewJob />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <SetupRoute>
            <ProtectedRoute>
              <JobDetail />
            </ProtectedRoute>
          </SetupRoute>
        }
      />

      {/* Other Routes */}
      <Route
        path="/technicians"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <Technicians />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <Customers />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/units"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager", "technician"]}
            >
              <Units />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/units/scan"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager", "technician"]}
            >
              <ScanUnit />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <Inventory />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <Reports />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/users"
        element={
          <SetupRoute>
            <RoleProtectedRoute allowedRoles={["superadmin"]}>
              <UserManagement />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <SetupRoute>
            <RoleProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <AuditLogs />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <SetupRoute>
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          </SetupRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Customer Routes Component
function CustomerRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<CustomerLogin />} />
      <Route
        path="/"
        element={
          <CustomerProtectedRoute>
            <CustomerDashboard />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <CustomerProtectedRoute>
            <CustomerJobs />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <CustomerProtectedRoute>
            <CustomerJobDetail />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <CustomerProtectedRoute>
            <CustomerHistory />
          </CustomerProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}

// Main App Component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Staff Routes with AuthProvider */}
          <Route
            path="/*"
            element={
              <AuthProviders isCustomerPortal={false}>
                <StaffRoutes />
              </AuthProviders>
            }
          />

          {/* Customer Portal Routes with CustomerAuthProvider */}
          <Route
            path="/portal/*"
            element={
              <AuthProviders isCustomerPortal={true}>
                <CustomerRoutes />
              </AuthProviders>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
