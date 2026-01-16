import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
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

export function JobsOverviewMap({ className = "" }: JobsOverviewMapProps) {
  const [jobs, setJobs] = useState<JobLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerClusterGroup = useRef<L.MarkerClusterGroup | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Initialize map - runs when container is ready
  const initializeMap = () => {
    if (!mapContainer.current || mapInitialized || map.current) return;

    try {
      const defaultCenter: [number, number] = [-6.2088, 106.8456];

      map.current = L.map(mapContainer.current).setView(defaultCenter, 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map.current);

      // Initialize marker cluster group
      markerClusterGroup.current = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 16,
        iconCreateFunction: function (cluster) {
          const count = cluster.getChildCount();
          let size = "small";
          let colorClass = "bg-primary";

          if (count >= 10 && count < 30) {
            size = "medium";
            colorClass = "bg-amber-500";
          } else if (count >= 30) {
            size = "large";
            colorClass = "bg-red-500";
          }

          const sizeMap = { small: 30, medium: 40, large: 50 };
          const sizeValue = sizeMap[size as keyof typeof sizeMap];

          return L.divIcon({
            html: `<div style="
              width: ${sizeValue}px;
              height: ${sizeValue}px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background: ${
                colorClass === "bg-primary"
                  ? "#3b82f6"
                  : colorClass === "bg-amber-500"
                  ? "#f59e0b"
                  : "#ef4444"
              };
              color: white;
              font-weight: bold;
              font-size: ${
                size === "small" ? "12px" : size === "medium" ? "14px" : "16px"
              };
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">${count}</div>`,
            className: "custom-marker-cluster",
            iconSize: L.point(sizeValue, sizeValue, true),
          });
        },
      });

      map.current.addLayer(markerClusterGroup.current);

      // Force map to recalculate size after initialization
      setTimeout(() => {
        if (map.current) {
          map.current.invalidateSize();
        }
      }, 100);

      setMapInitialized(true);
    } catch (error) {
      console.error("Error initializing map:", error);
      setError("Gagal menginisialisasi peta");
    }
  };

  // Watch for container to be ready, then initialize
  useEffect(() => {
    // Clear any pending timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    // Wait for container to be rendered and have dimensions
    initTimeoutRef.current = setTimeout(() => {
      if (mapContainer.current && !mapInitialized) {
        const rect = mapContainer.current.getBoundingClientRect();
        // Only initialize if container has actual dimensions
        if (rect.width > 0 && rect.height > 0) {
          initializeMap();
        }
      }
    }, 250);

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [mapInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        markerClusterGroup.current = null;
        setMapInitialized(false);
      }
    };
  }, []);

  // Update markers when jobs change
  useEffect(() => {
    if (!map.current || !markerClusterGroup.current || !mapInitialized) return;

    // Clear existing markers
    markerClusterGroup.current.clearLayers();

    if (jobs.length === 0) return;

    // Add markers
    jobs.forEach((job) => {
      const marker = L.marker([job.service_latitude, job.service_longitude], {
        icon: statusIcons[job.status] || statusIcons.pending_assignment,
      });

      // Create popup content
      const popupContent = document.createElement("div");
      popupContent.className = "text-sm min-w-[200px]";
      popupContent.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="font-mono text-xs">${job.job_number}</span>
          ${getPriorityBadgeHTML(job.priority)}
        </div>
        <p class="font-semibold text-base mb-1">${job.title}</p>
        <div class="mb-2">${getStatusBadgeHTML(job.status)}</div>
        <div class="space-y-1 text-xs text-gray-600">
          <p class="flex items-center gap-1">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            ${job.customer_name}
          </p>
          ${
            job.technician_name
              ? `<p class="flex items-center gap-1">
                  <svg class="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  <span class="text-blue-600">${job.technician_name}</span>
                </p>`
              : ""
          }
          ${
            job.scheduled_date
              ? `<p class="flex items-center gap-1">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  ${format(new Date(job.scheduled_date), "dd MMM yyyy")}
                </p>`
              : ""
          }
          ${
            job.service_address
              ? `<p class="flex items-start gap-1 mt-1">
                  <svg class="h-3 w-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span class="line-clamp-2">${job.service_address}</span>
                </p>`
              : ""
          }
        </div>
      `;

      // Add button
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "mt-3";
      const button = document.createElement("button");
      button.className =
        "w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2";
      button.innerHTML = `
        <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
        Lihat Detail
      `;
      button.onclick = () => {
        window.location.href = `/jobs/${job.id}`;
      };
      buttonContainer.appendChild(button);
      popupContent.appendChild(buttonContainer);

      marker.bindPopup(popupContent);
      markerClusterGroup.current!.addLayer(marker);
    });

    // Fit bounds to show all markers
    const bounds = L.latLngBounds(
      jobs.map((job) => [job.service_latitude, job.service_longitude])
    );

    if (jobs.length === 1) {
      map.current.setView(
        [jobs[0].service_latitude, jobs[0].service_longitude],
        15
      );
    } else {
      map.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [jobs, mapInitialized]);

  // Load jobs on mount
  useEffect(() => {
    fetchJobsWithLocation();
  }, []);

  const getStatusBadgeHTML = (status: string) => {
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
    return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}">${config.label}</span>`;
  };

  const getPriorityBadgeHTML = (priority: string) => {
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
    return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.className}">${config.label}</span>`;
  };

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
        <div className="h-96 rounded-lg overflow-hidden border relative bg-muted">
          <div
            ref={mapContainer}
            style={{ width: "100%", height: "100%", minHeight: "384px" }}
          />

          {/* Loading overlay */}
          {(loading || !mapInitialized) && (
            <div className="absolute inset-0 h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {loading ? "Memuat data..." : "Menginisialisasi peta..."}
                </p>
              </div>
            </div>
          )}

          {/* No jobs overlay */}
          {jobs.length === 0 && !loading && mapInitialized && (
            <div className="absolute inset-0 h-full flex items-center justify-center bg-muted/50 pointer-events-none">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">
                  Tidak ada job aktif dengan lokasi
                </p>
              </div>
            </div>
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
