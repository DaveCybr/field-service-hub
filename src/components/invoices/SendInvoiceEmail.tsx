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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  const subject = `Invoice ${invoiceNumber}`;
  const body = `Dear Customer,

Please find your invoice ${invoiceNumber} at the link below:

${invoiceUrl || window.location.href}

If you have any questions, please contact us.

Best regards,
Your Company Name`;

  const mailtoLink = `mailto:${
    customerEmail || ""
  }?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(
      `To: ${
        customerEmail || "[Customer Email]"
      }\nSubject: ${subject}\n\n${body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Copied",
      description: "Email content copied to clipboard",
    });
  };

  const handleOpenEmail = () => {
    window.location.href = mailtoLink;
    toast({
      title: "Opening Email Client",
      description: "Your default email app will open",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invoice via Email
          </DialogTitle>
          <DialogDescription>
            Choose how to send {invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email Preview */}
          <div className="space-y-2">
            <Label>Email Preview</Label>
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p>
                <strong>To:</strong> {customerEmail || "[Customer Email]"}
              </p>
              <p>
                <strong>Subject:</strong> {subject}
              </p>
              <div className="border-t pt-2 mt-2">
                <pre className="whitespace-pre-wrap font-sans">{body}</pre>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Choose an option to send:
            </p>

            <Button
              className="w-full"
              onClick={handleOpenEmail}
              disabled={!customerEmail}
            >
              <Mail className="mr-2 h-4 w-4" />
              Open in Email Client
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopyToClipboard}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>

          {!customerEmail && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium">⚠️ No customer email</p>
              <p className="text-xs mt-1">
                Add customer email to enable direct send
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
