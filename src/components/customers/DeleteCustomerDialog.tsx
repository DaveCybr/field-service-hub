import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    category: string;
  } | null;
  unitsCount?: number;
  invoicesCount?: number;
  onSuccess: () => void;
}

export function DeleteCustomerDialog({
  open,
  onOpenChange,
  customer,
  unitsCount = 0,
  invoicesCount = 0,
  onSuccess,
}: DeleteCustomerDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const hasHistory = unitsCount > 0 || invoicesCount > 0;

  const handleDelete = async () => {
    if (!customer) return;

    // Validation: Must type DELETE to confirm
    if (confirmText !== "DELETE") {
      toast({
        variant: "destructive",
        title: "Confirmation Required",
        description: 'Please type "DELETE" to confirm',
      });
      return;
    }

    setDeleting(true);

    try {
      if (hasHistory) {
        // Soft delete (blacklist) - don't actually delete customers with history
        const { error } = await supabase
          .from("customers")
          .update({
            blacklisted: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", customer.id);

        if (error) throw error;

        toast({
          title: "Customer Blacklisted",
          description: `${customer.name} has been blacklisted. Units and invoices preserved.`,
        });
      } else {
        // Hard delete - only if no history
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("id", customer.id);

        if (error) throw error;

        toast({
          title: "Customer Deleted",
          description: `${customer.name} has been permanently deleted`,
        });
      }

      setConfirmText("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete customer",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Customer?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            {hasHistory ? (
              <>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm font-medium text-amber-900">
                    ⚠️ This customer has history
                  </p>
                  <div className="text-xs text-amber-700 mt-2 space-y-1">
                    {unitsCount > 0 && (
                      <p>
                        • {unitsCount} unit{unitsCount > 1 ? "s" : ""}{" "}
                        registered
                      </p>
                    )}
                    {invoicesCount > 0 && (
                      <p>
                        • {invoicesCount} invoice{invoicesCount > 1 ? "s" : ""}{" "}
                        created
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-amber-700 mt-2">
                    The customer will be <strong>blacklisted</strong> instead of
                    deleted to preserve all history.
                  </p>
                </div>
                <p className="text-sm">You are about to blacklist:</p>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm font-medium text-red-900">
                    ⚠️ This action cannot be undone
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    The customer will be <strong>permanently deleted</strong>.
                  </p>
                </div>
                <p className="text-sm">You are about to delete:</p>
              </>
            )}

            <div className="rounded-lg bg-muted p-3">
              <p className="font-semibold">{customer.name}</p>
              <p className="text-sm text-muted-foreground">{customer.phone}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {customer.category} Customer
              </p>
            </div>

            {hasHistory && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
                <p className="font-medium mb-1">
                  What happens when blacklisted:
                </p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Customer cannot create new invoices</li>
                  <li>All units remain in the system</li>
                  <li>All invoice history preserved</li>
                  <li>Can be reactivated later if needed</li>
                </ul>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="confirm-delete" className="text-sm font-medium">
                Type <span className="font-mono font-bold">DELETE</span> to
                confirm:
              </Label>
              <Input
                id="confirm-delete"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-mono"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={deleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || confirmText !== "DELETE"}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {hasHistory ? "Blacklisting..." : "Deleting..."}
              </>
            ) : hasHistory ? (
              "Blacklist Customer"
            ) : (
              "Delete Customer"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
