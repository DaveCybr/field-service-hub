import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import TechnicianLayout from "@/components/layout/TechnicianLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Clock,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

interface Service {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  estimated_duration_minutes: number;
  service_address: string;
  service_cost: number;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  invoice: {
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  unit: {
    unit_type: string;
    brand: string;
    model: string;
  } | null;
}

const statusColors = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
};

const priorityColors = {
  low: "bg-gray-500",
  normal: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function TechnicianJobs() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { employee } = useAuth();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Stats
  const todayJobs = services.filter(
    (s) =>
      s.scheduled_date &&
      format(new Date(s.scheduled_date), "yyyy-MM-dd") ===
        format(new Date(), "yyyy-MM-dd")
  ).length;

  const pendingJobs = services.filter((s) => s.status === "pending").length;
  const inProgressJobs = services.filter(
    (s) => s.status === "in_progress"
  ).length;
  const completedJobs = services.filter((s) => s.status === "completed").length;

  useEffect(() => {
    if (employee?.id) {
      loadJobs();
    }
  }, [employee?.id]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices(
            invoice_number,
            customer:customers(name, phone)
          ),
          unit:units(unit_type, brand, model)
        `
        )
        .eq("assigned_technician_id", employee?.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      setServices(data || []);
    } catch (error: any) {
      console.error("Error loading jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load jobs",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    // Search filter
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.invoice.customer.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === "all" || service.status === statusFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter === "today") {
      matchesDate =
        service.scheduled_date &&
        format(new Date(service.scheduled_date), "yyyy-MM-dd") ===
          format(new Date(), "yyyy-MM-dd");
    } else if (dateFilter === "week") {
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      matchesDate =
        service.scheduled_date &&
        new Date(service.scheduled_date) >= today &&
        new Date(service.scheduled_date) <= weekFromNow;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  if (loading) {
    return (
      <TechnicianLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </TechnicianLayout>
    );
  }

  return (
    <TechnicianLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">
            Manage your assigned service jobs
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedJobs}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs List */}
        {filteredServices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No jobs found</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" || dateFilter !== "all"
                  ? "Try adjusting your filters"
                  : "You don't have any assigned jobs yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/technician/jobs/${service.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Title & Badges */}
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg flex-1">
                          {service.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`${
                            statusColors[
                              service.status as keyof typeof statusColors
                            ]
                          } text-white`}
                        >
                          {service.status.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${
                            priorityColors[
                              service.priority as keyof typeof priorityColors
                            ]
                          } text-white`}
                        >
                          {service.priority}
                        </Badge>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <p className="font-medium">
                          {service.invoice.customer.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {service.invoice.invoice_number}
                        </p>
                      </div>

                      {/* Unit Info */}
                      {service.unit && (
                        <p className="text-sm text-muted-foreground">
                          {service.unit.unit_type} - {service.unit.brand}{" "}
                          {service.unit.model}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {service.scheduled_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(
                              new Date(service.scheduled_date),
                              "dd MMM yyyy, HH:mm"
                            )}
                          </div>
                        )}
                        {service.estimated_duration_minutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {service.estimated_duration_minutes} mins
                          </div>
                        )}
                        {service.service_address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {service.service_address.substring(0, 30)}...
                          </div>
                        )}
                      </div>

                      {/* Cost */}
                      <div className="text-sm font-medium">
                        Service Cost: {formatCurrency(service.service_cost)}
                      </div>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex-shrink-0">
                      {service.status === "pending" && (
                        <Button size="sm">Start Job</Button>
                      )}
                      {service.status === "in_progress" && (
                        <Button size="sm" variant="outline">
                          Continue
                        </Button>
                      )}
                      {service.status === "completed" && (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TechnicianLayout>
  );
}
