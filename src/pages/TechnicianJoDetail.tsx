import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

// Sub-components imports (we'll create these next)
import { CheckInButton } from "@/components/technician/CheckInButton";
import { CheckOutButton } from "@/components/technician/CheckOutButton";
import { PhotoUpload } from "@/components/technician/PhotoUpload";
import { TaskChecklist } from "@/components/technician/TaskCheckList";
import { PartsUsed } from "@/components/technician/PartsUsed";

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  estimated_duration_minutes: number;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  actual_duration_minutes: number | null;
  service_address: string;
  service_latitude: number | null;
  service_longitude: number | null;
  checkin_gps_valid: boolean | null;
  checkout_gps_valid: boolean | null;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  technician_notes: string | null;
  before_photos: string[];
  after_photos: string[];
  invoice: {
    invoice_number: string;
    customer: {
      id: string;
      name: string;
      phone: string;
      email: string;
      address: string;
    };
  };
  unit: {
    id: string;
    unit_type: string;
    brand: string;
    model: string;
    serial_number: string;
  } | null;
}

export default function TechnicianJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    if (id) {
      loadServiceDetail();
    }
  }, [id]);

  const loadServiceDetail = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(
            invoice_number,
            customer:customers(*)
          ),
          unit:units(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      // Verify this is technician's job
      if (data.assigned_technician_id !== employee?.id) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "This job is not assigned to you",
        });
        navigate("/technician/jobs");
        return;
      }

      setService(data);
    } catch (error: any) {
      console.error("Error loading service:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load service details",
      });
      navigate("/technician/jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSuccess = () => {
    loadServiceDetail();
    setActiveTab("execution");
  };

  const handleCheckOutSuccess = () => {
    toast({
      title: "Job Completed!",
      description: "Service has been marked as completed",
    });
    navigate("/technician/jobs");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", color: "bg-yellow-500" },
      in_progress: { variant: "default", color: "bg-blue-500" },
      completed: { variant: "outline", color: "bg-green-500" },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      normal: "bg-gray-100 text-gray-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={colors[priority] || colors.normal}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!service) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Service not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const canCheckIn = service.status === "pending" && !service.actual_checkin_at;
  const canCheckOut =
    service.status === "in_progress" &&
    service.actual_checkin_at &&
    !service.actual_checkout_at;
  const isCompleted = service.status === "completed";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/technician/jobs")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold">{service.title}</h1>
                {getStatusBadge(service.status)}
                {getPriorityBadge(service.priority)}
              </div>
              <p className="text-muted-foreground">
                {service.invoice.invoice_number}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {canCheckIn && (
              <CheckInButton
                serviceId={service.id}
                serviceAddress={{
                  address: service.service_address,
                  latitude: service.service_latitude,
                  longitude: service.service_longitude,
                }}
                onSuccess={handleCheckInSuccess}
              />
            )}
            {canCheckOut && (
              <CheckOutButton
                serviceId={service.id}
                onSuccess={handleCheckOutSuccess}
              />
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="execution">Execution</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {service.invoice.customer.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${service.invoice.customer.phone}`}
                    className="text-primary hover:underline"
                  >
                    {service.invoice.customer.phone}
                  </a>
                </div>
                {service.invoice.customer.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {service.invoice.customer.email}
                    </span>
                  </div>
                )}
                {service.service_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-sm">{service.service_address}</p>
                      {service.service_latitude &&
                        service.service_longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${service.service_latitude},${service.service_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Open in Maps →
                          </a>
                        )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Unit Info */}
            {service.unit && (
              <Card>
                <CardHeader>
                  <CardTitle>Unit Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-medium">{service.unit.unit_type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Brand</p>
                      <p className="font-medium">{service.unit.brand}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="font-medium">{service.unit.model}</p>
                    </div>
                    {service.unit.serial_number && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Serial Number
                        </p>
                        <p className="font-medium">
                          {service.unit.serial_number}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Service Details */}
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Description
                    </p>
                    <p className="text-sm">{service.description}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled</p>
                      <p className="text-sm font-medium">
                        {service.scheduled_date
                          ? format(
                              new Date(service.scheduled_date),
                              "dd MMM yyyy, HH:mm"
                            )
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Estimated Duration
                      </p>
                      <p className="text-sm font-medium">
                        {service.estimated_duration_minutes} minutes
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Service Cost
                    </span>
                    <span className="font-medium">
                      {formatCurrency(service.service_cost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Parts Cost
                    </span>
                    <span className="font-medium">
                      {formatCurrency(service.parts_cost)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Total Cost</span>
                    <span className="font-bold">
                      {formatCurrency(service.total_cost)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Check-in/Check-out Info */}
            {(service.actual_checkin_at || service.actual_checkout_at) && (
              <Card>
                <CardHeader>
                  <CardTitle>Time Tracking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {service.actual_checkin_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Check-in Time
                      </p>
                      <p className="font-medium">
                        {format(
                          new Date(service.actual_checkin_at),
                          "dd MMM yyyy, HH:mm:ss"
                        )}
                      </p>
                      {service.checkin_gps_valid !== null && (
                        <p className="text-xs text-muted-foreground">
                          GPS:{" "}
                          {service.checkin_gps_valid ? "✓ Valid" : "✗ Invalid"}
                        </p>
                      )}
                    </div>
                  )}

                  {service.actual_checkout_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Check-out Time
                      </p>
                      <p className="font-medium">
                        {format(
                          new Date(service.actual_checkout_at),
                          "dd MMM yyyy, HH:mm:ss"
                        )}
                      </p>
                      {service.checkout_gps_valid !== null && (
                        <p className="text-xs text-muted-foreground">
                          GPS:{" "}
                          {service.checkout_gps_valid ? "✓ Valid" : "✗ Invalid"}
                        </p>
                      )}
                    </div>
                  )}

                  {service.actual_duration_minutes && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Actual Duration
                      </p>
                      <p className="font-medium">
                        {service.actual_duration_minutes} minutes
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution" className="space-y-4">
            {!service.actual_checkin_at ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    Please check in to start the service
                  </p>
                  {canCheckIn && (
                    <CheckInButton
                      serviceId={service.id}
                      serviceAddress={{
                        address: service.service_address,
                        latitude: service.service_latitude,
                        longitude: service.service_longitude,
                      }}
                      onSuccess={handleCheckInSuccess}
                    />
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Before Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Before Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PhotoUpload
                      serviceId={service.id}
                      photoType="before"
                      existingPhotos={service.before_photos || []}
                      onUploadSuccess={loadServiceDetail}
                      disabled={isCompleted}
                    />
                  </CardContent>
                </Card>

                {/* Task Checklist */}
                <Card>
                  <CardHeader>
                    <CardTitle>Task Checklist</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TaskChecklist
                      serviceId={service.id}
                      disabled={isCompleted}
                    />
                  </CardContent>
                </Card>

                {/* Parts Used */}
                <Card>
                  <CardHeader>
                    <CardTitle>Parts Used</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PartsUsed
                      serviceId={service.id}
                      invoiceId={service.invoice?.invoice_number ? "" : ""}
                      disabled={isCompleted}
                      onPartsChange={loadServiceDetail}
                    />
                  </CardContent>
                </Card>

                {/* After Photos */}
                <Card>
                  <CardHeader>
                    <CardTitle>After Photos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PhotoUpload
                      serviceId={service.id}
                      photoType="after"
                      existingPhotos={service.after_photos || []}
                      onUploadSuccess={loadServiceDetail}
                      disabled={isCompleted}
                    />
                  </CardContent>
                </Card>

                {/* Technician Notes */}
                {service.technician_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Technician Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">
                        {service.technician_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Check-out Button */}
                {canCheckOut && (
                  <div className="flex justify-end">
                    <CheckOutButton
                      serviceId={service.id}
                      onSuccess={handleCheckOutSuccess}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Service history coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
