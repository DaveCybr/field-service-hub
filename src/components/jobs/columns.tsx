// ============================================
// JOBS TABLE COLUMNS
// src/components/jobs/columns.tsx
// Column definitions for Jobs DataTable with action handlers
// ============================================

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Users, Calendar, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export interface Job {
  id: string;
  invoice_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  service_address: string | null;
  created_at: string;
  invoice: {
    id: string;
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  unit: {
    unit_type: string;
    brand: string | null;
  } | null;
  team_count?: number;
}

export interface JobColumnActions {
  onViewDetails?: (job: Job) => void;
  onManageTeam?: (job: Job) => void;
  onViewInvoice?: (job: Job) => void;
  onCopyId?: (job: Job) => void;
}

const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; className: string }> = {
    pending: {
      label: "Unassigned",
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    },
    assigned: {
      label: "Assigned",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
  };

  const { label, className } = config[status] || config.pending;
  return <Badge className={className}>{label}</Badge>;
};

const getPriorityBadge = (priority: string) => {
  const config: Record<string, { className: string }> = {
    low: { className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
    normal: { className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    high: { className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
    urgent: { className: "bg-red-100 text-red-800 hover:bg-red-100" },
  };

  const { className } = config[priority] || config.normal;
  return <Badge className={className}>{priority.toUpperCase()}</Badge>;
};

// ✅ Factory function to create columns with action handlers
export const createJobColumns = (
  actions?: JobColumnActions,
): ColumnDef<Job>[] => {
  return [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Job Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div>
            <p className="font-medium">{job.title}</p>
            {job.unit && (
              <p className="text-sm text-muted-foreground">
                {job.unit.brand} {job.unit.unit_type}
              </p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "invoice_number",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Invoice
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <span className="font-mono text-sm">
            {row.original.invoice.invoice_number}
          </span>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
      cell: ({ row }) => {
        const customer = row.original.invoice.customer;
        return (
          <div>
            <p className="font-medium">{customer.name}</p>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "scheduled_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Scheduled
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.scheduled_date;
        return date ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(new Date(date), "dd MMM yyyy, HH:mm")}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Not scheduled</span>
        );
      },
    },
    {
      accessorKey: "team_count",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Team
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.original.team_count || 0;
        return count > 0 ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-600">
              {count} {count === 1 ? "technician" : "technicians"}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            No team assigned
          </span>
        );
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Priority
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => getPriorityBadge(row.original.priority),
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const job = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onCopyId) {
                    actions.onCopyId(job);
                  } else {
                    navigator.clipboard.writeText(job.id);
                  }
                }}
              >
                Copy job ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewDetails) {
                    actions.onViewDetails(job);
                  }
                }}
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onManageTeam) {
                    actions.onManageTeam(job);
                  }
                }}
              >
                Manage team
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewInvoice) {
                    actions.onViewInvoice(job);
                  }
                }}
              >
                View invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};

// ✅ Export default columns without actions (for backward compatibility)
export const jobColumns = createJobColumns();
