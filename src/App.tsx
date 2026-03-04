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
import Invoices from "./pages/Invoices";
import NewInvoice from "./pages/NewInvoice";
import InvoiceDetail from "./pages/InvoiceDetail";
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
import EditInvoice from "./pages/EditInvoice";
import Jobs from "./pages/Jobs";
import JobsDetail from "./pages/JobsDetail";
import UnitDetail from "./pages/UnitDetail";
import CustomerDetail from "./pages/CustomerDetail";
import TechnicianTracking from "./pages/TechnicianTracking";

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.loading) return <LoadingSpinner />;
  if (!auth.user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

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
  if (auth.loading) return <LoadingSpinner />;
  if (!auth.user) return <Navigate to="/auth" replace />;
  if (auth.userRole && !allowedRoles.includes(auth.userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function SetupRoute({ children }: { children: React.ReactNode }) {
  const setup = useInitialSetup();
  if (setup.loading) return <LoadingSpinner />;
  if (setup.needsSetup) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}

function AuthRoute() {
  const setup = useInitialSetup();
  if (setup.loading) return <LoadingSpinner />;
  if (setup.needsSetup) return <Navigate to="/setup" replace />;
  return <Auth />;
}

function SetupPage() {
  const setup = useInitialSetup();
  if (setup.loading) return <LoadingSpinner />;
  if (!setup.needsSetup) return <Navigate to="/auth" replace />;
  return <InitialSetup />;
}

function StaffRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
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
      <Route
        path="/jobs"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["admin", "manager", "superadmin"]}
            >
              <Jobs />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["admin", "manager", "superadmin"]}
            >
              <JobsDetail />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
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
      <Route
        path="/invoices/:id/edit"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <EditInvoice />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
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
        path="/technician-tracking"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <TechnicianTracking />
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
        path="/customers/:id"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <CustomerDetail />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/units"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <Units />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/units/:id"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
            >
              <UnitDetail />
            </RoleProtectedRoute>
          </SetupRoute>
        }
      />
      <Route
        path="/units/scan"
        element={
          <SetupRoute>
            <RoleProtectedRoute
              allowedRoles={["superadmin", "admin", "manager"]}
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/v2">
        <Routes>
          <Route
            path="/*"
            element={
              <AuthProviders isCustomerPortal={false}>
                <StaffRoutes />
              </AuthProviders>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
