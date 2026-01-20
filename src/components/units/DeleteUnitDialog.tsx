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

interface DeleteUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: {
    id: string;
    qr_code: string;
    unit_type: string;
    brand: string | null;
    model: string | null;
  } | null;
  serviceCount?: number;
  onSuccess: () => void;
}

export function DeleteUnitDialog({
  open,
  onOpenChange,
  unit,
  serviceCount = 0,
  onSuccess,
}: DeleteUnitDialogProps) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDelete = async () => {
    if (!unit) return;

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
      // Check if unit has service history
      if (serviceCount > 0) {
        // Soft delete (archive) - don't actually delete units with history
        const { error } = await supabase
          .from("units")
          .update({
            status: "archived",
            updated_at: new Date().toISOString(),
          })
          .eq("id", unit.id);

        if (error) throw error;

        toast({
          title: "Unit Archived",
          description: `${unit.qr_code} has been archived. Service history preserved.`,
        });
      } else {
        // Hard delete - only if no service history
        const { error } = await supabase
          .from("units")
          .delete()
          .eq("id", unit.id);

        if (error) throw error;

        toast({
          title: "Unit Deleted",
          description: `${unit.qr_code} has been permanently deleted`,
        });
      }

      setConfirmText("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting unit:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete unit",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  if (!unit) return null;

  const unitName =
    [unit.brand, unit.model, unit.unit_type].filter(Boolean).join(" ") ||
    unit.qr_code;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Unit?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            {serviceCount > 0 ? (
              <>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm font-medium text-amber-900">
                    ⚠️ This unit has {serviceCount} service
                    {serviceCount > 1 ? "s" : ""} in history
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    The unit will be <strong>archived</strong> instead of
                    deleted to preserve service history.
                  </p>
                </div>
                <p className="text-sm">You are about to archive:</p>
              </>
            ) : (
              <>
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm font-medium text-red-900">
                    ⚠️ This action cannot be undone
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    The unit will be <strong>permanently deleted</strong>.
                  </p>
                </div>
                <p className="text-sm">You are about to delete:</p>
              </>
            )}

            <div className="rounded-lg bg-muted p-3 font-mono text-sm">
              <p className="font-semibold">{unit.qr_code}</p>
              <p className="text-muted-foreground">{unitName}</p>
            </div>

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
                {serviceCount > 0 ? "Archiving..." : "Deleting..."}
              </>
            ) : serviceCount > 0 ? (
              "Archive Unit"
            ) : (
              "Delete Unit"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
