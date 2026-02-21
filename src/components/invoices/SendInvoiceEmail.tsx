import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Check } from "lucide-react";

interface SendInvoiceEmailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  customerEmail?: string;
  invoiceUrl?: string;
}

export function SendInvoiceEmail({
  open,
  onOpenChange,
  invoiceNumber,
  customerEmail,
  invoiceUrl,
}: SendInvoiceEmailProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const subject = `Faktur ${invoiceNumber}`;
  const body = `Yth. Pelanggan,

Berikut kami lampirkan faktur ${invoiceNumber} yang dapat diakses melalui tautan berikut:

${invoiceUrl || window.location.href}

Jika ada pertanyaan, jangan ragu untuk menghubungi kami.

Terima kasih atas kepercayaan Anda.

Hormat kami,
Tim REKAMTEKNIK`;

  const mailtoLink = `mailto:${customerEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(
      `Kepada: ${customerEmail || "[Email Pelanggan]"}\nSubjek: ${subject}\n\n${body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Tersalin",
      description: "Isi email telah disalin ke clipboard",
    });
  };

  const handleOpenEmail = () => {
    window.location.href = mailtoLink;
    toast({
      title: "Membuka Aplikasi Email",
      description: "Aplikasi email default Anda akan terbuka",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Kirim Faktur via Email
          </DialogTitle>
          <DialogDescription>
            Pilih cara pengiriman untuk {invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pratinjau Email */}
          <div className="space-y-2">
            <Label>Pratinjau Email</Label>
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p>
                <strong>Kepada:</strong> {customerEmail || "[Email Pelanggan]"}
              </p>
              <p>
                <strong>Subjek:</strong> {subject}
              </p>
              <div className="border-t pt-2 mt-2">
                <pre className="whitespace-pre-wrap font-sans text-xs">
                  {body}
                </pre>
              </div>
            </div>
          </div>

          {/* Aksi */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pilih cara pengiriman:
            </p>

            <Button
              className="w-full"
              onClick={handleOpenEmail}
              disabled={!customerEmail}
            >
              <Mail className="mr-2 h-4 w-4" />
              Buka di Aplikasi Email
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Tersalin!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Salin ke Clipboard
                </>
              )}
            </Button>
          </div>

          {!customerEmail && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium">⚠️ Email pelanggan tidak tersedia</p>
              <p className="text-xs mt-1">
                Tambahkan email pelanggan di halaman data pelanggan terlebih
                dahulu
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
