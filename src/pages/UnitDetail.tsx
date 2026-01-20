import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  QrCode,
  Calendar,
  Shield,
  Wrench,
  User,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Edit,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { EditUnitModal } from "@/components/units/EditUnitModal";
import { DeleteUnitDialog } from "@/components/units/DeleteUnitDialog";

interface UnitDetail {
  id: string;
  qr_code: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  created_at: string;
  customer_id: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

interface ServiceHistory {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  scheduled_date: string | null;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  service_address: string | null;
  technician_notes: string | null;
  invoice: {
    invoice_number: string;
    invoice_date: string;
  };
  assigned_technician: {
    name: string;
  } | null;
}

interface Customer {
  id: string;
  name: string;
}

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchUnitDetails();
      fetchCustomers();
    }
  }, [id]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("blacklisted", false)
      .order("name");
    if (data) setCustomers(data);
  };

  const fetchUnitDetails = async () => {
    setLoading(true);
    try {
      // Fetch unit details
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select(
          `
          *,
          customer:customers (
            id,
            name,
            phone,
            email
          )
        `,
        )
        .eq("id", id)
        .single();

      if (unitError) throw unitError;

      setUnit({
        ...unitData,
        customer: Array.isArray(unitData.customer)
          ? unitData.customer[0]
          : unitData.customer,
      });

      // Fetch service history
      const { data: historyData, error: historyError } = await supabase
        .from("invoice_services")
        .select(
          `
          id,
          title,
          description,
          status,
          priority,
          service_cost,
          parts_cost,
          total_cost,
          scheduled_date,
          actual_checkin_at,
          actual_checkout_at,
          service_address,
          technician_notes,
          invoice:invoices (
            invoice_number,
            invoice_date
          ),
          assigned_technician:employees (name)
        `,
        )
        .eq("unit_id", id)
        .order("created_at", { ascending: false });

      if (historyError) throw historyError;

      setServiceHistory(
        historyData?.map((item) => ({
          ...item,
          invoice: Array.isArray(item.invoice) ? item.invoice[0] : item.invoice,
          assigned_technician: Array.isArray(item.assigned_technician)
            ? item.assigned_technician[0]
            : item.assigned_technician,
        })) || [],
      );
    } catch (error: any) {
      console.error("Error fetching unit details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load unit details",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    fetchUnitDetails();
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "Success",
      description: "Navigating back to units list",
    });
    navigate("/units");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { label: string; className: string; icon: any }
    > = {
      pending: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800",
        icon: Clock,
      },
      assigned: {
        label: "Assigned",
        className: "bg-blue-100 text-blue-800",
        icon: User,
      },
      in_progress: {
        label: "In Progress",
        className: "bg-purple-100 text-purple-800",
        icon: Wrench,
      },
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-800",
        icon: CheckCircle2,
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-800",
        icon: AlertCircle,
      },
    };
    const { label, className, icon: Icon } = config[status] || config.pending;
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { className: string }> = {
      urgent: { className: "bg-red-100 text-red-800" },
      high: { className: "bg-orange-100 text-orange-800" },
      normal: { className: "bg-blue-100 text-blue-800" },
      low: { className: "bg-gray-100 text-gray-800" },
    };
    const { className } = config[priority] || config.normal;
    return <Badge className={className}>{priority.toUpperCase()}</Badge>;
  };

  const isWarrantyActive = () => {
    if (!unit?.warranty_expiry_date) return false;
    return new Date(unit.warranty_expiry_date) > new Date();
  };

  const handleDownloadQR = () => {
    if (!unit) return;

    const svg = document.getElementById("unit-qr-code");
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!unit) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">Unit not found</h3>
          <Button onClick={() => navigate("/units")} className="mt-4">
            Back to Units
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/units")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {unit.unit_type}
              </h1>
              <p className="text-muted-foreground">
                {[unit.brand, unit.model].filter(Boolean).join(" ") ||
                  "No brand/model"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowQR(!showQR)}>
              <QrCode className="mr-2 h-4 w-4" />
              {showQR ? "Hide" : "Show"} QR
            </Button>
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Unit Information - Same as before */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">QR Code</p>
                    <p className="font-mono font-medium">{unit.qr_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit Type</p>
                    <p className="font-medium">{unit.unit_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Brand</p>
                    <p className="font-medium">{unit.brand || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Model</p>
                    <p className="font-medium">{unit.model || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Serial Number
                    </p>
                    <p className="font-mono text-sm">
                      {unit.serial_number || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="font-medium">{unit.capacity || "-"}</p>
                  </div>
                </div>

                {unit.warranty_expiry_date && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield
                          className={`h-5 w-5 ${
                            isWarrantyActive()
                              ? "text-green-600"
                              : "text-muted-foreground"
                          }`}
                        />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Warranty Status
                          </p>
                          <p
                            className={`font-medium ${
                              isWarrantyActive()
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isWarrantyActive() ? "Active" : "Expired"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <p className="font-medium">
                          {format(
                            new Date(unit.warranty_expiry_date),
                            "MMM d, yyyy",
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Registered</p>
                  <p className="font-medium">
                    {format(new Date(unit.created_at), "MMMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Service History - Same as before */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Service History</span>
                  <Badge variant="secondary">
                    {serviceHistory.length} services
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Wrench className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No service history yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceHistory.map((service) => (
                      <div
                        key={service.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/jobs/${service.id}`)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium">{service.title}</h4>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {getStatusBadge(service.status)}
                            {getPriorityBadge(service.priority)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">Invoice</p>
                              <p className="font-mono text-xs">
                                {service.invoice.invoice_number}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">
                                Technician
                              </p>
                              <p className="font-medium">
                                {service.assigned_technician?.name ||
                                  "Unassigned"}
                              </p>
                            </div>
                          </div>

                          {service.scheduled_date && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-muted-foreground">
                                  Scheduled
                                </p>
                                <p className="font-medium">
                                  {format(
                                    new Date(service.scheduled_date),
                                    "MMM d, yyyy HH:mm",
                                  )}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">
                                Total Cost
                              </p>
                              <p className="font-medium">
                                {formatCurrency(service.total_cost)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {(service.actual_checkin_at ||
                          service.actual_checkout_at) && (
                          <>
                            <Separator className="my-3" />
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              {service.actual_checkin_at && (
                                <div>
                                  Check-in:{" "}
                                  {format(
                                    new Date(service.actual_checkin_at),
                                    "MMM d, HH:mm",
                                  )}
                                </div>
                              )}
                              {service.actual_checkout_at && (
                                <div>
                                  Check-out:{" "}
                                  {format(
                                    new Date(service.actual_checkout_at),
                                    "MMM d, HH:mm",
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {service.technician_notes && (
                          <>
                            <Separator className="my-3" />
                            <div className="text-sm">
                              <p className="text-muted-foreground mb-1">
                                Technician Notes:
                              </p>
                              <p className="text-sm">
                                {service.technician_notes}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Same as before */}
          <div className="space-y-6">
            {showQR && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QR Code</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <QRCodeSVG
                      id="unit-qr-code"
                      value={unit.qr_code}
                      size={160}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadQR}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download QR
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{unit.customer.name}</p>
                </div>
                {unit.customer.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{unit.customer.phone}</p>
                  </div>
                )}
                {unit.customer.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{unit.customer.email}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/customers/${unit.customer.id}`)}
                >
                  View Customer
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Services
                  </span>
                  <span className="font-bold text-lg">
                    {serviceHistory.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Completed
                  </span>
                  <span className="font-medium">
                    {
                      serviceHistory.filter((s) => s.status === "completed")
                        .length
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    In Progress
                  </span>
                  <span className="font-medium">
                    {
                      serviceHistory.filter((s) => s.status === "in_progress")
                        .length
                    }
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Spent
                  </span>
                  <span className="font-bold">
                    {formatCurrency(
                      serviceHistory.reduce((sum, s) => sum + s.total_cost, 0),
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditUnitModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        unit={unit}
        customers={customers}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Dialog */}
      <DeleteUnitDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        unit={unit}
        serviceCount={serviceHistory.length}
        onSuccess={handleDeleteSuccess}
      />
    </DashboardLayout>
  );
}
