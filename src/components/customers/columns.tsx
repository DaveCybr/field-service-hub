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
  category: "retail" | "project";
  payment_terms_days: number | null;
  current_outstanding: number | null;
  blacklisted: boolean | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerColumnActions {
  onViewDetails?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onViewServices?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

const getCategoryBadge = (category: string) => {
  const config: Record<string, { label: string; className: string }> = {
    retail: {
      label: "Retail",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    project: {
      label: "Proyek",
      className: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    },
  };
  const { label, className } = config[category] || config.retail;
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
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Pelanggan
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
              {customer.blacklisted && (
                <Badge variant="destructive" className="text-xs">Blacklist</Badge>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Kategori
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => getCategoryBadge(row.original.category),
    },
    {
      accessorKey: "email",
      header: "Kontak",
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
      header: "Alamat",
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="max-w-[200px]">
            {customer.address ? (
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm truncate">{customer.address}</p>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "current_outstanding",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Outstanding
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.current_outstanding || 0;
        return <span className="font-medium">{formatCurrency(amount)}</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Terdaftar
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.created_at), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original;
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
                  actions?.onViewDetails?.(customer);
                }}
              >
                Lihat detail
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  actions?.onEdit?.(customer);
                }}
              >
                Edit pelanggan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  actions?.onViewServices?.(customer);
                }}
              >
                Lihat riwayat servis
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  actions?.onDelete?.(customer);
                }}
                className="text-red-600"
              >
                Hapus pelanggan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};

export const customerColumns = createCustomerColumns();
