// ============================================
// FILE 1: src/providers/AuthProviders.tsx
// ============================================
import { ReactNode } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";

interface AuthProvidersProps {
  children: ReactNode;
  isCustomerPortal?: boolean;
}

export function AuthProviders({
  children,
  isCustomerPortal = false,
}: AuthProvidersProps) {
  if (isCustomerPortal) {
    // Customer Portal: Only use CustomerAuthProvider
    return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
  }

  // Staff Portal: Only use AuthProvider
  return <AuthProvider>{children}</AuthProvider>;
}
