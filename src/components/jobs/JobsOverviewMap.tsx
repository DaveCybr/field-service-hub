import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, RefreshCw, Eye, User, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons for different job statuses
const createStatusIcon = (color: string) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const statusIcons: Record<string, L.Icon> = {
  pending_assignment: createStatusIcon("grey"),
  pending_approval: createStatusIcon("orange"),
  approved: createStatusIcon("blue"),
  in_progress: createStatusIcon("green"),
  completed: createStatusIcon("violet"),
  completed_paid: createStatusIcon("violet"),
  cancelled: createStatusIcon("red"),
};

// Custom cluster icon creator
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = "small";
  let className = "bg-primary";

  if (count >= 10 && count < 30) {
    size = "medium";
    className = "bg-amber-500";
  } else if (count >= 30) {
    size = "large";
    className = "bg-red-500";
  }

  const sizeMap = {
    small: 30,
    medium: 40,
    large: 50,
  };

  return L.divIcon({
    html: `<div class="cluster-icon ${className}" style="
      width: ${sizeMap[size as keyof typeof sizeMap]}px;
      height: ${sizeMap[size as keyof typeof sizeMap]}px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      color: white;
      font-weight: bold;
      font-size: ${
        size === "small" ? "12px" : size === "medium" ? "14px" : "16px"
      };
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 3px solid white;
    ">${count}</div>`,
    className: "custom-marker-cluster",
    iconSize: L.point(
      sizeMap[size as keyof typeof sizeMap],
      sizeMap[size as keyof typeof sizeMap],
      true
    ),
  });
};

interface JobLocation {
  id: string;
  job_number: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  service_address: string | null;
  service_latitude: number;
  service_longitude: number;
  customer_name: string;
  technician_name: string | null;
}

interface JobsOverviewMapProps {
  className?: string;
}

// Component to fit all markers
function FitAllMarkers({ jobs }: { jobs: JobLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (jobs.length === 0) return;

    const bounds = L.latLngBounds(
      jobs.map(
        (job) =>
          [job.service_latitude, job.service_longitude] as [number, number]
      )
    );

    if (jobs.length === 1) {
      map.setView([jobs[0].service_latitude, jobs[0].service_longitude], 15);
    } else {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, jobs]);

  return null;
}

export function JobsOverviewMap({ className = "" }: JobsOverviewMapProps) {
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobsWithLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("service_jobs")
        .select(
          `
          id,
          job_number,
          title,
          status,
          priority,
          scheduled_date,
          service_address,
          service_latitude,
          service_longitude,
          customers (name),
          assigned_technician:employees!assigned_technician_id(id, name, email)
        `
        )
        .not("service_latitude", "is", null)
        .not("service_longitude", "is", null)
        .not("status", "in", '("completed_paid","cancelled")')
        .order("priority", { ascending: false });

      if (fetchError) throw fetchError;

      const jobsWithLocation: JobLocation[] = (data || []).map((job) => ({
        id: job.id,
        job_number: job.job_number,
        title: job.title,
        status: job.status,
        priority: job.priority,
        scheduled_date: job.scheduled_date,
        service_address: job.service_address,
        service_latitude: job.service_latitude!,
        service_longitude: job.service_longitude!,
        customer_name: (job.customers as any)?.name || "Unknown",
        technician_name: (job.assigned_technician as any)?.name || null,
      }));

      setJobs(jobsWithLocation);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      setError("Gagal memuat data job");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsWithLocation();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending_assignment: {
        label: "Pending",
        className: "bg-gray-100 text-gray-800",
      },
      pending_approval: {
        label: "Needs Approval",
        className: "bg-orange-100 text-orange-800",
      },
      approved: { label: "Approved", className: "bg-blue-100 text-blue-800" },
      in_progress: {
        label: "In Progress",
        className: "bg-green-100 text-green-800",
      },
      completed: {
        label: "Completed",
        className: "bg-violet-100 text-violet-800",
      },
      completed_paid: {
        label: "Paid",
        className: "bg-violet-100 text-violet-800",
      },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || { label: status, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> =
      {
        low: { label: "Low", className: "bg-slate-100 text-slate-800" },
        normal: { label: "Normal", className: "bg-blue-100 text-blue-800" },
        high: { label: "High", className: "bg-amber-100 text-amber-800" },
        urgent: { label: "Urgent", className: "bg-red-100 text-red-800" },
      };
    const config = priorityConfig[priority] || {
      label: priority,
      className: "",
    };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Default center (Jakarta)
  const defaultCenter: [number, number] = [-6.2088, 106.8456];

  // Count jobs by status
  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Peta Overview Job Aktif
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobsWithLocation}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            Pending: {statusCounts.pending_assignment || 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            Approval: {statusCounts.pending_approval || 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            Approved: {statusCounts.approved || 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            In Progress: {statusCounts.in_progress || 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-violet-500"></div>
            Completed: {statusCounts.completed || 0}
          </Badge>
          <Badge variant="secondary" className="ml-auto">
            Total: {jobs.length} job
          </Badge>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            ⚠️ {error}
          </div>
        )}

        {/* Map Container */}
        <div className="h-96 rounded-lg overflow-hidden border">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Memuat peta...
                </p>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Tidak ada job aktif dengan lokasi
                </p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitAllMarkers jobs={jobs} />

              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterCustomIcon}
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                disableClusteringAtZoom={16}
              >
                {jobs.map((job) => (
                  <Marker
                    key={job.id}
                    position={[job.service_latitude, job.service_longitude]}
                    icon={
                      statusIcons[job.status] || statusIcons.pending_assignment
                    }
                  >
                    <Popup>
                      <div className="text-sm min-w-[200px]">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono text-xs">
                            {job.job_number}
                          </span>
                          {getPriorityBadge(job.priority)}
                        </div>

                        <p className="font-semibold text-base mb-1">
                          {job.title}
                        </p>

                        <div className="mb-2">{getStatusBadge(job.status)}</div>

                        <div className="space-y-1 text-xs text-gray-600">
                          <p className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {job.customer_name}
                          </p>

                          {job.technician_name && (
                            <p className="flex items-center gap-1">
                              <User className="h-3 w-3 text-blue-600" />
                              <span className="text-blue-600">
                                {job.technician_name}
                              </span>
                            </p>
                          )}

                          {job.scheduled_date && (
                            <p className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(
                                new Date(job.scheduled_date),
                                "dd MMM yyyy"
                              )}
                            </p>
                          )}

                          {job.service_address && (
                            <p className="flex items-start gap-1 mt-1">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">
                                {job.service_address}
                              </span>
                            </p>
                          )}
                        </div>

                        <Link to={`/jobs/${job.id}`}>
                          <Button size="sm" className="w-full mt-3">
                            <Eye className="h-3 w-3 mr-1" />
                            Lihat Detail
                          </Button>
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
            </MapContainer>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Pending Assignment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>Needs Approval</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500"></div>
            <span>Completed</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
