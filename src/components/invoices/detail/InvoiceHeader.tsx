import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Printer, Pencil, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { getStatusBadge, getPaymentBadge } from "@/lib/utils/badges";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";
import { SendInvoiceEmail } from "../SendInvoiceEmail";
import { DeleteInvoiceDialog } from "../DeleteInvoiceDialog";
import { InvoiceStatusActions } from "../InvoiceStatusActions";

interface InvoiceHeaderProps {
  invoice: Invoice;
  canEdit: boolean;
  // onStatusChange: (newStatus: string) => void;
  onPrint: () => void;
  onRefresh: () => void;
}

export function InvoiceHeader({
  invoice,
  canEdit,
  // onStatusChange,
  onRefresh,
  onPrint,
}: InvoiceHeaderProps) {
  const { goBack } = useNavigateWithParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we have query params to preserve
  const hasParams = location.search.length > 0;

  // Dialogs state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            title={hasParams ? "Back to filtered list" : "Back to invoices"}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {invoice.invoice_number}
              </h1>
              {getStatusBadge(invoice.status)}
              {getPaymentBadge(invoice.payment_status)}
            </div>
            <p className="text-muted-foreground mt-1">
              {invoice.customer?.name} •{" "}
              {format(new Date(invoice.invoice_date), "PPP")}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Print Button */}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {/* Send Email Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          {/* Edit Button - Only for admins */}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {/* Delete Button - Only for admins */}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <InvoiceStatusActions invoice={invoice} onStatusChanged={onRefresh} />
          ;
        </div>
      </div>

      {/* Email Dialog */}
      <SendInvoiceEmail
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        invoiceNumber={invoice.invoice_number}
        customerEmail={invoice.customer?.email}
        invoiceUrl={window.location.href}
      />

      {/* Delete Dialog */}
      <DeleteInvoiceDialog
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}

// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Separator } from "@/components/ui/separator";
// import { ArrowLeft, Edit, Printer, MoreVertical } from "lucide-react";
// import { useLocation, useNavigate } from "react-router-dom";
// import { InvoiceStatusActions } from "@/components/invoices/InvoiceStatusActions";
// import { formatCurrency } from "@/lib/utils/currency";
// import { formatDate } from "@fullcalendar/core/index.js";
// import { Invoice } from "@/hooks/invoices/useInvoiceDetail";
// import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";

// interface InvoiceHeaderProps {
//   invoice: Invoice;
//   onRefresh: () => void;
// }

// export function InvoiceHeader({ invoice, onRefresh }: InvoiceHeaderProps) {
//   const { goBack } = useNavigateWithParams();
//   const navigate = useNavigate();
//   const location = useLocation();

//   // Check if we have query params to preserve
//   const hasParams = location.search.length > 0;

//   const getStatusColor = (status: string) => {
//     const colors: Record<string, string> = {
//       draft: "gray",
//       pending: "yellow",
//       assigned: "blue",
//       in_progress: "purple",
//       completed: "emerald",
//       paid: "green",
//       closed: "slate",
//       cancelled: "red",
//     };
//     return colors[status] || "gray";
//   };

//   const getStatusLabel = (status: string) => {
//     const labels: Record<string, string> = {
//       draft: "Draft",
//       pending: "Pending",
//       assigned: "Assigned",
//       in_progress: "In Progress",
//       completed: "Completed",
//       paid: "Paid",
//       closed: "Closed",
//       cancelled: "Cancelled",
//     };
//     return labels[status] || status;
//   };

//   const getPaymentStatusColor = (status: string) => {
//     const colors: Record<string, string> = {
//       unpaid: "red",
//       partial: "amber",
//       paid: "emerald",
//     };
//     return colors[status] || "gray";
//   };

//   const getPaymentStatusLabel = (status: string) => {
//     const labels: Record<string, string> = {
//       unpaid: "Unpaid",
//       partial: "Partial",
//       paid: "Paid",
//     };
//     return labels[status] || status;
//   };

//   return (
//     <>
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={goBack}
//             title={hasParams ? "Back to filtered list" : "Back to invoices"}
//           >
//             <ArrowLeft className="h-5 w-5" />
//           </Button>

//           <div>
//             <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
//             <p className="text-sm text-muted-foreground">
//               {formatDate(invoice.invoice_date)}
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           {/* Secondary Actions */}
//           <Button variant="outline" size="sm">
//             <Edit className="h-4 w-4 mr-2" />
//             Edit
//           </Button>
//           <Button variant="outline" size="sm">
//             <Printer className="h-4 w-4 mr-2" />
//             Print
//           </Button>

//           {/* ⭐ PRIMARY ACTION: Status Actions */}
//           <InvoiceStatusActions invoice={invoice} onStatusChanged={onRefresh} />
//         </div>
//       </div>

//       <Separator className="my-4" />

//       {/* Bottom Row: Status Badges + Customer + Amount */}
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           {/* Status Badge */}
//           <div className="flex items-center gap-2">
//             <span className="text-sm text-muted-foreground">Status:</span>
//             <Badge variant={getStatusColor(invoice.status) as any}>
//               {getStatusLabel(invoice.status)}
//             </Badge>
//           </div>

//           {/* Payment Status Badge */}
//           <div className="flex items-center gap-2">
//             <span className="text-sm text-muted-foreground">Payment:</span>
//             <Badge
//               variant={getPaymentStatusColor(invoice.payment_status) as any}
//             >
//               {getPaymentStatusLabel(invoice.payment_status)}
//             </Badge>
//           </div>

//           {/* Customer */}
//           <div className="text-sm">
//             <span className="text-muted-foreground">Customer: </span>
//             <span className="font-medium">{invoice.customer.name}</span>
//           </div>
//         </div>

//         {/* Grand Total */}
//         <div className="text-right">
//           <p className="text-sm text-muted-foreground">Grand Total</p>
//           <p className="text-2xl font-bold">
//             {formatCurrency(invoice.grand_total)}
//           </p>
//           {invoice.amount_paid > 0 && (
//             <p className="text-xs text-muted-foreground">
//               Paid: {formatCurrency(invoice.amount_paid)}
//             </p>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }
