import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteInvoiceDialogProps {
  invoiceId: string;
  invoiceNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteInvoiceDialog({
  invoiceId,
  invoiceNumber,
  open,
  onOpenChange,
}: DeleteInvoiceDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete related records first (services and items - cascade should handle)
      await supabase
        .from("invoice_services")
        .delete()
        .eq("invoice_id", invoiceId);
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

      // Delete invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Invoice Deleted",
        description: `${invoiceNumber} has been deleted successfully`,
      });

      // Navigate back to invoice list
      navigate("/invoices");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error.message || "Failed to delete invoice",
      });
    } finally {
      setDeleting(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice{" "}
            <strong>{invoiceNumber}</strong>?
            <br />
            <br />
            This will also delete:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All services and products</li>
              <li>Related documents</li>
            </ul>
            <br />
            <span className="text-destructive font-medium">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Invoice
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
