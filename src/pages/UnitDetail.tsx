import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  QrCode,
  Calendar,
  Shield,
  Wrench,
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  History,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { EditUnitModal } from "@/components/units/EditUnitModal";
import { DeleteUnitDialog } from "@/components/units/DeleteUnitDialog";
import { RecurringIssuesAlert } from "@/components/units/RecurringIssuesAlert";
import { PartsHistoryTimeline } from "@/components/units/PartsHistoryTimeline";
import { ServiceTimeline } from "@/components/units/ServiceTimeline";
import { useUnitInsights } from "@/hooks/useUnitInsights";

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

  // Use the new insights hook
  const {
    insights,
    loading: insightsLoading,
    refetch: refetchInsights,
  } = useUnitInsights(id);

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

  const handleIssueResolved = () => {
    refetchInsights();
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

        {/* Alert Badges if there are issues */}
        {!insightsLoading && insights.criticalIssuesCount > 0 && (
          <div className="flex gap-2">
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {insights.criticalIssuesCount} Critical Issue
              {insights.criticalIssuesCount > 1 ? "s" : ""}
            </Badge>
            {insights.activeIssuesCount > insights.criticalIssuesCount && (
              <Badge
                variant="outline"
                className="border-yellow-500 text-yellow-700"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {insights.activeIssuesCount - insights.criticalIssuesCount}{" "}
                Other Active Issue
                {insights.activeIssuesCount - insights.criticalIssuesCount > 1
                  ? "s"
                  : ""}
              </Badge>
            )}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Unit Information */}
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

            {/* Recurring Issues Alert */}
            {!insightsLoading && insights.recurringIssues.length > 0 && (
              <RecurringIssuesAlert
                issues={insights.recurringIssues}
                onIssueResolved={handleIssueResolved}
              />
            )}

            {/* Tabs for Service History & Parts */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="services"
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Service History
                </TabsTrigger>
                <TabsTrigger value="parts" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts History
                  {insights.partsHistory.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {insights.partsHistory.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="services" className="mt-6">
                <ServiceTimeline services={serviceHistory} />
              </TabsContent>
              <TabsContent value="parts" className="mt-6">
                <PartsHistoryTimeline
                  parts={insights.partsHistory}
                  totalCost={insights.totalPartsCost}
                  mostReplacedPart={insights.mostReplacedPart}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar - 1/3 width */}
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
                    Service Cost
                  </span>
                  <span className="font-bold">
                    {formatCurrency(
                      serviceHistory.reduce(
                        (sum, s) => sum + s.service_cost,
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Parts Cost
                  </span>
                  <span className="font-bold">
                    {formatCurrency(insights.totalPartsCost)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Total Spent
                  </span>
                  <span className="font-bold text-primary">
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
