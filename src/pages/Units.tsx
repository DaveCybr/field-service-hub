import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  QrCode,
  Edit,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { EditUnitModal } from "@/components/units/EditUnitModal";
import { DeleteUnitDialog } from "@/components/units/DeleteUnitDialog";

interface Unit {
  id: string;
  qr_code: string;
  customer_id: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  created_at: string;
  customer: {
    id: string;
    name: string;
  };
}

interface Customer {
  id: string;
  name: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  from: number;
  to: number;
}

type SortField =
  | "qr_code"
  | "unit_type"
  | "brand"
  | "created_at"
  | "warranty_expiry_date";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export default function Units() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data state
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    itemsPerPage: 20,
    from: 0,
    to: 0,
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "created_at",
    order: "desc",
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showQRUnit, setShowQRUnit] = useState<Unit | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    searchQuery,
    selectedCustomer,
    selectedType,
    sortConfig, // Re-fetch when sort changes
  ]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("blacklisted", false)
      .order("name");
    if (data) setCustomers(data);
  };

  const fetchUnits = async () => {
    setLoading(true);
    try {
      // Calculate range for pagination
      const from = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const to = from + pagination.itemsPerPage - 1;

      // Build query
      let query = supabase.from("units").select(
        `
          *,
          customer:customers!units_customer_id_fkey (
            id,
            name
          )
        `,
        { count: "exact" },
      );

      // Apply filters
      if (searchQuery) {
        query = query.or(
          `qr_code.ilike.%${searchQuery}%,unit_type.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%`,
        );
      }

      if (selectedCustomer !== "all") {
        query = query.eq("customer_id", selectedCustomer);
      }

      if (selectedType !== "all") {
        query = query.eq("unit_type", selectedType);
      }

      // Apply sorting
      query = query.order(sortConfig.field, {
        ascending: sortConfig.order === "asc",
      });

      // Apply pagination
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      // Process data (handle array from join)
      const processedData =
        data?.map((unit) => ({
          ...unit,
          customer: Array.isArray(unit.customer)
            ? unit.customer[0]
            : unit.customer,
        })) || [];

      setUnits(processedData);

      // Update pagination info
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.itemsPerPage);

      setPagination((prev) => ({
        ...prev,
        totalPages,
        totalCount,
        from: totalCount > 0 ? from + 1 : 0,
        to: Math.min(from + pagination.itemsPerPage, totalCount),
      }));
    } catch (error: any) {
      console.error("Error fetching units:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load units",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
    // Reset to first page when sorting changes
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.order === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const handleItemsPerPageChange = (value: string) => {
    setPagination((prev) => ({
      ...prev,
      itemsPerPage: parseInt(value),
      currentPage: 1, // Reset to first page
    }));
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  const handleCustomerFilter = (value: string) => {
    setSelectedCustomer(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleTypeFilter = (value: string) => {
    setSelectedType(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleEditClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setEditModalOpen(true);
  };

  const handleDeleteClick = (unit: Unit) => {
    setSelectedUnit(unit);
    setDeleteDialogOpen(true);
  };

  const handleViewClick = (unit: Unit) => {
    navigate(`/units/${unit.id}`);
  };

  const handleEditSuccess = () => {
    fetchUnits();
  };

  const handleDeleteSuccess = () => {
    fetchUnits();
  };

  const handleDownloadQR = (unit: Unit) => {
    const svg = document.getElementById(`qr-${unit.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 350;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 20, 200, 200);

        ctx.fillStyle = "black";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(unit.qr_code, 150, 250);
        ctx.font = "12px Arial";
        ctx.fillText(unit.unit_type, 150, 275);
        if (unit.brand || unit.model) {
          ctx.fillText(
            `${unit.brand || ""} ${unit.model || ""}`.trim(),
            150,
            295,
          );
        }
        ctx.fillText(unit.customer.name, 150, 315);

        const link = document.createElement("a");
        link.download = `QR-${unit.qr_code}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const isWarrantyActive = (date: string | null) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  const getUnitTypes = () => {
    const types = new Set(units.map((u) => u.unit_type));
    return Array.from(types);
  };

  // Sortable table head component
  const SortableTableHead = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    return (
      <TableHead className={className}>
        <button
          className="flex items-center hover:text-foreground transition-colors font-medium"
          onClick={() => handleSort(field)}
        >
          {children}
          {getSortIcon(field)}
        </button>
      </TableHead>
    );
  };

  // Pagination component
  const PaginationControls = () => {
    const maxPageButtons = 5;
    const pages: number[] = [];

    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxPageButtons / 2),
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxPageButtons - 1,
    );

    if (endPage - startPage < maxPageButtons - 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between gap-4 py-4 border-t ">
        {/* Left: Items per page & info */}
        <div className="flex items-center gap-4 ">
          <div className="flex items-center gap-2 px-4 ">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pagination.itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Showing {pagination.from}-{pagination.to} of {pagination.totalCount}{" "}
            units
          </span>
        </div>

        {/* Right: Page controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage === 1 || loading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((page) => (
            <Button
              key={page}
              variant={page === pagination.currentPage ? "default" : "outline"}
              size="icon"
              onClick={() => handlePageChange(page)}
              disabled={loading}
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={
              pagination.currentPage === pagination.totalPages || loading
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={
              pagination.currentPage === pagination.totalPages || loading
            }
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Units</h1>
            <p className="text-muted-foreground">
              Manage and track all registered units
            </p>
          </div>
          <Button onClick={() => navigate("/units/register")}>
            <Plus className="mr-2 h-4 w-4" />
            Register Unit
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by QR, type, brand, model, serial..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Customer filter */}
              <Select
                value={selectedCustomer}
                onValueChange={handleCustomerFilter}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Type filter */}
              <Select value={selectedType} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {getUnitTypes().map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead field="qr_code">QR Code</SortableTableHead>
                <SortableTableHead field="unit_type">Type</SortableTableHead>
                <SortableTableHead field="brand">Brand/Model</SortableTableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>Customer</TableHead>
                <SortableTableHead field="warranty_expiry_date">
                  Warranty
                </SortableTableHead>
                <SortableTableHead field="created_at">
                  Registered
                </SortableTableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <p className="text-muted-foreground">
                      {searchQuery ||
                      selectedCustomer !== "all" ||
                      selectedType !== "all"
                        ? "No units found matching your filters"
                        : "No units registered yet"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit) => (
                  <TableRow
                    key={unit.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewClick(unit)}
                  >
                    <TableCell>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQRUnit(
                            showQRUnit?.id === unit.id ? null : unit,
                          );
                        }}
                        className="flex items-center gap-2 hover:text-primary transition-colors"
                      >
                        <div className="bg-muted p-1.5 rounded">
                          <QrCode className="h-4 w-4" />
                        </div>
                        <span className="font-mono text-sm">
                          {unit.qr_code}
                        </span>
                      </button>
                      {showQRUnit?.id === unit.id && (
                        <div className="mt-2 p-4 bg-white rounded-lg border inline-block">
                          <QRCodeSVG
                            id={`qr-${unit.id}`}
                            value={unit.qr_code}
                            size={120}
                            level="H"
                            includeMargin
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadQR(unit);
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{unit.unit_type}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{unit.brand || "-"}</p>
                        <p className="text-sm text-muted-foreground">
                          {unit.model || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {unit.serial_number || "-"}
                      </span>
                    </TableCell>
                    <TableCell>{unit.customer.name}</TableCell>
                    <TableCell>
                      {unit.warranty_expiry_date ? (
                        <div>
                          <Badge
                            variant={
                              isWarrantyActive(unit.warranty_expiry_date)
                                ? "default"
                                : "secondary"
                            }
                          >
                            {isWarrantyActive(unit.warranty_expiry_date)
                              ? "Active"
                              : "Expired"}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(
                              new Date(unit.warranty_expiry_date),
                              "MMM d, yyyy",
                            )}
                          </p>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {format(new Date(unit.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleViewClick(unit)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditClick(unit)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteClick(unit)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!loading && units.length > 0 && <PaginationControls />}
        </Card>
      </div>

      {/* Edit Modal */}
      {selectedUnit && (
        <EditUnitModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          unit={selectedUnit}
          customers={customers}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Delete Dialog */}
      {selectedUnit && (
        <DeleteUnitDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          unit={selectedUnit}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </DashboardLayout>
  );
}
