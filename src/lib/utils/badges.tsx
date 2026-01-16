import { Badge } from "@/components/ui/badge";

// Status badge configurations
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

// Payment status badge configurations
const paymentStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  unpaid: {
    label: "Unpaid",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
  partial: {
    label: "Partial",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  },
};

/**
 * Get status badge component
 */
/**
 * Get status badge component
 */
export function getStatusBadge(status: string) {
  const config = statusConfig[status] || {
    label: status,
    className: "bg-gray-100 text-gray-800",
  };

  return <Badge className={config.className}>{config.label}</Badge>;
}

/**
 * Get payment status badge component
 */
export function getPaymentBadge(paymentStatus: string) {
  const config = paymentStatusConfig[paymentStatus] || {
    label: paymentStatus,
    className: "bg-gray-100 text-gray-800",
  };

  return <Badge className={config.className}>{config.label}</Badge>;
}

/**
 * Get status color class (for use in custom components)
 */
export function getStatusColor(status: string): string {
  return statusConfig[status]?.className || "bg-gray-100 text-gray-800";
}

/**
 * Get payment status color class (for use in custom components)
 */
export function getPaymentStatusColor(paymentStatus: string): string {
  return (
    paymentStatusConfig[paymentStatus]?.className || "bg-gray-100 text-gray-800"
  );
}

/**
 * Get status label text only
 */
export function getStatusLabel(status: string): string {
  return statusConfig[status]?.label || status;
}

/**
 * Get payment status label text only
 */
export function getPaymentStatusLabel(paymentStatus: string): string {
  return paymentStatusConfig[paymentStatus]?.label || paymentStatus;
}
