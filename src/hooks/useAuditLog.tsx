import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "view"
  | "assign"
  | "status_change"
  | "payment";

type EntityType =
  | "user"
  | "invoice"
  | "job"
  | "customer"
  | "unit"
  | "product"
  | "employee"
  | "inventory"
  | "technician";

interface AuditLogParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user, employee } = useAuth();

  const log = async ({
    action,
    entityType,
    entityId,
    oldData,
    newData,
  }: AuditLogParams) => {
    if (!user) return;

    try {
      await supabase.from("audit_logs").insert([
        {
          user_id: user.id,
          employee_id: employee?.id || null,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          old_data: (oldData as any) || null,
          new_data: (newData as any) || null,
          user_agent: navigator.userAgent,
        },
      ]);
    } catch (error) {
      console.error("Failed to create audit log:", error);
    }
  };

  return { log };
}
