import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Wrench,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

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

interface ServiceTimelineProps {
  services: ServiceHistory[];
}

export function ServiceTimeline({ services }: ServiceTimelineProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.invoice.invoice_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      service.assigned_technician?.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || service.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || service.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const displayedServices = showAll
    ? filteredServices
    : filteredServices.slice(0, 5);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { label: string; className: string; icon: any }
    > = {
      pending: {
        label: "Pending",
        className: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock,
      },
      assigned: {
        label: "Assigned",
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: User,
      },
      in_progress: {
        label: "In Progress",
        className: "bg-purple-100 text-purple-800 border-purple-200",
        icon: Wrench,
      },
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-800 border-green-200",
        icon: CheckCircle2,
      },
      cancelled: {
        label: "Cancelled",
        className: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle,
      },
    };
    return (
      configs[status] || {
        label: status,
        className: "bg-gray-100 text-gray-800 border-gray-200",
        icon: Clock,
      }
    );
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { className: string }> = {
      urgent: { className: "bg-red-100 text-red-800 border-red-200" },
      high: { className: "bg-orange-100 text-orange-800 border-orange-200" },
      normal: { className: "bg-blue-100 text-blue-800 border-blue-200" },
      low: { className: "bg-gray-100 text-gray-800 border-gray-200" },
    };
    return (
      configs[priority] || {
        className: "bg-gray-100 text-gray-800 border-gray-200",
      }
    );
  };

  if (services.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wrench className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No service history yet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service History Timeline
          </CardTitle>
          <Badge variant="secondary">{services.length} services</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, invoice, or technician..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredServices.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No services match your filters
            </p>
          </div>
        ) : (
          <>
            <Separator />

            {/* Timeline */}
            <div className="space-y-1">
              {displayedServices.map((service, index) => {
                const statusConfig = getStatusConfig(service.status);
                const priorityConfig = getPriorityConfig(service.priority);
                const StatusIcon = statusConfig.icon;

                return (
                  <div key={service.id} className="flex gap-4">
                    {/* Timeline Indicator */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${statusConfig.className} border-2 border-background shadow-sm`}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </div>
                      {index < displayedServices.length - 1 && (
                        <div className="h-full w-0.5 bg-muted mt-2" />
                      )}
                    </div>

                    {/* Content Card */}
                    <div className="flex-1 pb-6">
                      <div
                        className="rounded-lg border bg-card hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate(`/jobs/${service.id}`)}
                      >
                        <div className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">
                                  {service.title}
                                </h4>
                              </div>
                              {service.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {service.description}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Badge
                                variant="outline"
                                className={statusConfig.className}
                              >
                                {statusConfig.label}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={priorityConfig.className}
                              >
                                {service.priority.toUpperCase()}
                              </Badge>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Date
                                </p>
                                <p className="font-medium">
                                  {format(
                                    new Date(service.invoice.invoice_date),
                                    "MMM d, yyyy",
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Technician
                                </p>
                                <p className="font-medium truncate">
                                  {service.assigned_technician?.name ||
                                    "Unassigned"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Service Cost
                                </p>
                                <p className="font-medium">
                                  {formatCurrency(service.service_cost)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Total Cost
                                </p>
                                <p className="font-bold text-primary">
                                  {formatCurrency(service.total_cost)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Invoice & Location */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <span className="text-xs">Invoice:</span>
                              <span className="font-mono font-medium text-foreground">
                                {service.invoice.invoice_number}
                              </span>
                            </div>
                            {service.service_address && (
                              <>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="text-xs truncate max-w-[200px]">
                                    {service.service_address}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Check-in/Check-out Times */}
                          {(service.actual_checkin_at ||
                            service.actual_checkout_at) && (
                            <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                              {service.actual_checkin_at && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Check-in:{" "}
                                  {format(
                                    new Date(service.actual_checkin_at),
                                    "MMM d, HH:mm",
                                  )}
                                </div>
                              )}
                              {service.actual_checkout_at && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Check-out:{" "}
                                  {format(
                                    new Date(service.actual_checkout_at),
                                    "MMM d, HH:mm",
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Technician Notes */}
                          {service.technician_notes && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-muted-foreground mb-1">
                                Technician Notes:
                              </p>
                              <p className="text-sm line-clamp-2">
                                {service.technician_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Show More/Less Button */}
            {filteredServices.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? "Show Less"
                    : `Show ${filteredServices.length - 5} More Services`}
                </Button>
              </div>
            )}

            {/* Summary Stats */}
            {filteredServices.length > 0 && (
              <>
                <Separator />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Services
                    </p>
                    <p className="text-xl font-bold">
                      {filteredServices.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Completed
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      {
                        filteredServices.filter((s) => s.status === "completed")
                          .length
                      }
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Total Cost
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(
                        filteredServices.reduce(
                          (sum, s) => sum + s.total_cost,
                          0,
                        ),
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Avg Cost
                    </p>
                    <p className="text-lg font-bold">
                      {formatCurrency(
                        filteredServices.reduce(
                          (sum, s) => sum + s.total_cost,
                          0,
                        ) / filteredServices.length,
                      )}
                    </p>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
