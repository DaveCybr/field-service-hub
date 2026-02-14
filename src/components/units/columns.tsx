// ================== UNITS ====================
// Location: src/components/units/columns.tsx

import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ColumnDef } from "@tanstack/react-table";

export interface Unit {
  id: string;
  qr_code: string;
  customer_id: string;
  customer_name: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  last_service_date: string | null;
  total_services: number;
  created_at: string;
}

export interface UnitColumnActions {
  onViewDetails?: (unit: Unit) => void;
  onShowQR?: (unit: Unit) => void;
  onViewHistory?: (unit: Unit) => void;
}

export const createUnitColumns = (
  actions?: UnitColumnActions,
): ColumnDef<Unit>[] => {
  return [
    {
      accessorKey: "qr_code",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          QR Code
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.qr_code}</span>
      ),
    },
    {
      accessorKey: "unit_type",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Unit Details
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const unit = row.original;
        return (
          <div>
            <p className="font-medium">{unit.unit_type}</p>
            <p className="text-sm text-muted-foreground">
              {[unit.brand, unit.model].filter(Boolean).join(" ") ||
                "No brand/model"}
              {unit.capacity && ` • ${unit.capacity}`}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.customer_name}</span>
      ),
    },
    {
      accessorKey: "warranty_expiry_date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Warranty
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.original.warranty_expiry_date;
        if (!date) return <span className="text-muted-foreground">-</span>;
        const isActive = new Date(date) > new Date();
        return (
          <Badge
            className={
              isActive
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }
          >
            {isActive ? "Active" : "Expired"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "total_services",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Services
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.total_services}</span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const unit = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onShowQR) actions.onShowQR(unit);
                }}
              >
                Show QR Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewDetails) actions.onViewDetails(unit);
                }}
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewHistory) actions.onViewHistory(unit);
                }}
              >
                View service history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
