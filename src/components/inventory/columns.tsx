// ================== INVENTORY ====================
// Location: src/components/inventory/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Phone, Mail, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock_threshold: number;
  image_url: string | null;
}

export interface ProductColumnActions {
  onViewDetails?: (product: Product) => void;
  onAdjustStock?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
}

export const createProductColumns = (
  actions?: ProductColumnActions,
): ColumnDef<Product>[] => {
  return [
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.sku}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-muted rounded" />
            )}
            <div>
              <p className="font-medium">{product.name}</p>
              <Badge variant="secondary" className="text-xs">
                {product.category}
              </Badge>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Stock
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        const status =
          product.stock === 0
            ? "out"
            : product.stock <= product.min_stock_threshold
              ? "low"
              : "ok";
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{product.stock}</span>
            <Badge
              className={
                status === "out"
                  ? "bg-red-100 text-red-800"
                  : status === "low"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
              }
            >
              {status === "out" ? "Out" : status === "low" ? "Low" : "OK"}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "sell_price",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4"
        >
          Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.original.sell_price;
        return (
          <span className="font-medium">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(price)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
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
                  if (actions?.onEdit) actions.onEdit(product);
                }}
              >
                Edit product
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onAdjustStock) actions.onAdjustStock(product);
                }}
              >
                Adjust stock
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewHistory) actions.onViewHistory(product);
                }}
              >
                View history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
