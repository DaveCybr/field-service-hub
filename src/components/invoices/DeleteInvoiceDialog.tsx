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
      await supabase
        .from("invoice_services")
        .delete()
        .eq("invoice_id", invoiceId);
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;

      toast({
        title: "Faktur Dihapus",
        description: `${invoiceNumber} berhasil dihapus`,
      });

      navigate("/invoices");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menghapus",
        description: error.message || "Terjadi kesalahan saat menghapus faktur",
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
          <AlertDialogTitle>Hapus Faktur?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus faktur{" "}
            <strong>{invoiceNumber}</strong>?
            <br />
            <br />
            Data berikut juga akan ikut terhapus:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Semua layanan dan produk</li>
              <li>Dokumen terkait</li>
            </ul>
            <br />
            <span className="text-destructive font-medium">
              Tindakan ini tidak dapat dibatalkan.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Faktur
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
