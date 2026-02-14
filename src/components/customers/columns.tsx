// ============================================
// CUSTOMERS TABLE COLUMNS
// src/components/customers/columns.tsx
// Column definitions for Customers DataTable
// ============================================

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowUpDown,
  MoreHorizontal,
  MapPin,
  Phone,
  Mail,
  Building2,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  company: string | null;
  customer_type: "individual" | "company" | null;
  created_at: string;
  total_services?: number;
  total_spent?: number;
  last_service_date?: string | null;
}

export interface CustomerColumnActions {
  onViewDetails?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onViewServices?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

const getCustomerTypeBadge = (type: string | null) => {
  if (!type) return <Badge variant="secondary">-</Badge>;

  const config: Record<
    string,
    { label: string; className: string; icon?: any }
  > = {
    individual: {
      label: "Individual",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    company: {
      label: "Company",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    },
  };

  const { label, className } = config[type] || config.individual;
  return <Badge className={className}>{label}</Badge>;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

export const createCustomerColumns = (
  actions?: CustomerColumnActions,
): ColumnDef<Customer>[] => {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Customer
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{customer.name}</p>
              {customer.company && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {customer.company}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "customer_type",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return getCustomerTypeBadge(row.original.customer_type);
      },
    },
    {
      accessorKey: "email",
      header: "Contact",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="space-y-1">
            {customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[200px]">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {!customer.email && !customer.phone && (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "address",
      header: "Location",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="max-w-[200px]">
            {customer.address || customer.city ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  {customer.address && (
                    <p className="truncate">{customer.address}</p>
                  )}
                  {customer.city && (
                    <p className="text-muted-foreground">{customer.city}</p>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "total_services",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Services
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const total = row.original.total_services || 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{total}</span>
            {total > 0 && actions?.onViewServices && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.onViewServices(row.original);
                }}
              >
                View
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "total_spent",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Total Spent
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = row.original.total_spent || 0;
        return <span className="font-medium">{formatCurrency(amount)}</span>;
      },
    },
    {
      accessorKey: "last_service_date",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Last Service
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.original.last_service_date;
        return date ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span>{format(new Date(date), "MMM dd, yyyy")}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Never</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Registered
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <span className="text-sm text-muted-foreground">
            {format(new Date(row.original.created_at), "MMM dd, yyyy")}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;

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
                  if (actions?.onViewDetails) {
                    actions.onViewDetails(customer);
                  }
                }}
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onEdit) {
                    actions.onEdit(customer);
                  }
                }}
              >
                Edit customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {customer.total_services && customer.total_services > 0 && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (actions?.onViewServices) {
                      actions.onViewServices(customer);
                    }
                  }}
                >
                  View service history
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onDelete) {
                    actions.onDelete(customer);
                  }
                }}
                className="text-red-600"
              >
                Delete customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};

export const customerColumns = createCustomerColumns();
