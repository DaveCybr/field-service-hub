// ============================================
// KOLOM TABEL JOBS
// src/components/jobs/columns.tsx
// Definisi kolom untuk DataTable Jobs dengan action handlers
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
      label: "Belum Ditugaskan",
      className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    },
    assigned: {
      label: "Ditugaskan",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    in_progress: {
      label: "Sedang Dikerjakan",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    },
    completed: {
      label: "Selesai",
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    cancelled: {
      label: "Dibatalkan",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
  };

  const { label, className } = config[status] || config.pending;
  return <Badge className={className}>{label}</Badge>;
};

const getPriorityBadge = (priority: string) => {
  const priorityLabels: Record<string, string> = {
    low: "RENDAH",
    normal: "NORMAL",
    high: "TINGGI",
    urgent: "MENDESAK",
  };
  const config: Record<string, { className: string }> = {
    low: { className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
    normal: { className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    high: { className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
    urgent: { className: "bg-red-100 text-red-800 hover:bg-red-100" },
  };

  const { className } = config[priority] || config.normal;
  return (
    <Badge className={className}>
      {priorityLabels[priority] || priority.toUpperCase()}
    </Badge>
  );
};

// ✅ Factory function untuk membuat kolom dengan action handlers
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
            Judul Pekerjaan
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
            Faktur
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
      header: "Pelanggan",
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
            Jadwal
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
          <span className="text-sm text-muted-foreground">
            Belum dijadwalkan
          </span>
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
            Tim
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.original.team_count || 0;
        return count > 0 ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-600">{count} teknisi</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Belum ada tim</span>
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
            Prioritas
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
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
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
                Salin ID pekerjaan
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
                Lihat detail
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onManageTeam) {
                    actions.onManageTeam(job);
                  }
                }}
              >
                Kelola tim
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewInvoice) {
                    actions.onViewInvoice(job);
                  }
                }}
              >
                Lihat faktur
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};

// ✅ Export kolom default tanpa actions (untuk kompatibilitas mundur)
export const jobColumns = createJobColumns();
