import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import QRScanner from "@/components/units/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  QrCode,
  Search,
  User,
  Wrench,
  Calendar,
  Shield,
  Package,
  Plus,
  History,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface UnitDetails {
  id: string;
  qr_code: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  last_service_date: string | null;
  total_services: number;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
  };
  recent_services: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    scheduled_date: string | null;
    service_cost: number;
    invoice: {
      invoice_number: string;
    };
  }>;
}

export default function ScanUnit() {
  const [unit, setUnit] = useState<UnitDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const lookupUnit = async (qrCode: string) => {
    setLoading(true);
    setUnit(null);

    try {
      // ✅ FIXED: Fetch unit with customer info
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select(
          `
          *,
          customers (
            id,
            name,
            phone,
            address
          )
        `,
        )
        .eq("qr_code", qrCode)
        .single();

      if (unitError || !unitData) {
        toast({
          variant: "destructive",
          title: "Unit Not Found",
          description: `No unit found with QR code: ${qrCode}`,
        });
        setLoading(false);
        return;
      }

      // ✅ FIXED: Query correct table (invoice_services)
      const { data: servicesData } = await supabase
        .from("invoice_services")
        .select(
          `
          id,
          title,
          status,
          priority,
          scheduled_date,
          service_cost,
          invoice:invoices!inner(invoice_number)
        `,
        )
        .eq("unit_id", unitData.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setUnit({
        ...unitData,
        customer: unitData.customers as any,
        recent_services:
          servicesData?.map((s) => ({
            ...s,
            invoice: Array.isArray(s.invoice) ? s.invoice[0] : s.invoice,
          })) || [],
      });

      toast({
        title: "Unit Found",
        description: `${unitData.unit_type} - ${unitData.qr_code}`,
      });
    } catch (error: any) {
      console.error("Lookup error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to lookup unit.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (result: string) => {
    lookupUnit(result);
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      lookupUnit(manualCode.trim());
    }
  };

  const isWarrantyActive = (date: string | null) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      assigned: "bg-purple-100 text-purple-800",
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      urgent: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      normal: "bg-blue-100 text-blue-800",
      low: "bg-gray-100 text-gray-800",
    };
    return priorityColors[priority] || "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Scan Unit QR Code
          </h1>
          <p className="text-muted-foreground">
            Scan a QR code or enter it manually to lookup unit details
          </p>
        </div>

        {/* Scanner */}
        <QRScanner onScan={handleScan} />

        {/* Manual Entry */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Manual Entry</CardTitle>
            <CardDescription>
              Enter the QR code manually if scanning is not available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., RT-M1234-ABC123"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
              />
              <Button
                onClick={handleManualSearch}
                disabled={!manualCode.trim() || loading}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unit Details */}
        {unit && !loading && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <QrCode className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-mono">{unit.qr_code}</CardTitle>
                    <CardDescription>{unit.unit_type}</CardDescription>
                  </div>
                </div>
                {unit.warranty_expiry_date && (
                  <Badge
                    variant={
                      isWarrantyActive(unit.warranty_expiry_date)
                        ? "default"
                        : "secondary"
                    }
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {isWarrantyActive(unit.warranty_expiry_date)
                      ? "Warranty Active"
                      : "Warranty Expired"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Unit Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {unit.brand && (
                  <div>
                    <p className="text-muted-foreground">Brand</p>
                    <p className="font-medium">{unit.brand}</p>
                  </div>
                )}
                {unit.model && (
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium">{unit.model}</p>
                  </div>
                )}
                {unit.serial_number && (
                  <div>
                    <p className="text-muted-foreground">Serial Number</p>
                    <p className="font-medium font-mono">
                      {unit.serial_number}
                    </p>
                  </div>
                )}
                {unit.capacity && (
                  <div>
                    <p className="text-muted-foreground">Capacity</p>
                    <p className="font-medium">{unit.capacity}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Customer Info */}
              <div className="flex items-start gap-3">
                <div className="bg-muted p-2 rounded-lg">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{unit.customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {unit.customer.phone}
                  </p>
                  {unit.customer.address && (
                    <p className="text-sm text-muted-foreground">
                      {unit.customer.address}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Service Stats */}
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span>{unit.total_services || 0} services</span>
                </div>
                {unit.last_service_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Last:{" "}
                      {format(new Date(unit.last_service_date), "dd MMM yyyy")}
                    </span>
                  </div>
                )}
                {unit.warranty_expiry_date && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Expires:{" "}
                      {format(
                        new Date(unit.warranty_expiry_date),
                        "dd MMM yyyy",
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Recent Services */}
              {unit.recent_services.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Recent Services</h4>
                    </div>
                    <div className="space-y-2">
                      {unit.recent_services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => navigate(`/jobs/${service.id}`)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm">
                                {service.title}
                              </p>
                              <Badge
                                variant="outline"
                                className={getPriorityColor(service.priority)}
                              >
                                {service.priority}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-mono">
                                {service.invoice.invoice_number}
                              </span>
                              {service.scheduled_date && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {format(
                                      new Date(service.scheduled_date),
                                      "dd MMM yyyy",
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getStatusColor(service.status)}
                            >
                              {service.status.replace(/_/g, " ")}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/units/${unit.id}`)}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </Button>
                <Button
                  onClick={() =>
                    navigate(
                      `/invoices/new?customer_id=${unit.customer.id}&unit_id=${unit.id}`,
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Service
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
