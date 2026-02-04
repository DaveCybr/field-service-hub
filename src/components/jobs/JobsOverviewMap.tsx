import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

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
  pending: createStatusIcon("grey"),
  assigned: createStatusIcon("orange"),
  in_progress: createStatusIcon("green"),
  completed: createStatusIcon("violet"),
  cancelled: createStatusIcon("red"),
};

interface ServiceLocation {
  id: string;
  invoice_id: string;
  invoice_number: string;
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
  const [services, setServices] = useState<ServiceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerClusterGroup = useRef<L.MarkerClusterGroup | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();

  const fetchServicesWithLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("invoice_services")
        .select(`
          id,
          title,
          status,
          priority,
          scheduled_date,
          service_address,
          service_latitude,
          service_longitude,
          invoice:invoices!invoice_services_invoice_id_fkey (
            id,
            invoice_number,
            customer:customers (name)
          ),
          assigned_technician:employees!invoice_services_assigned_technician_id_fkey (name)
        `)
        .not("service_latitude", "is", null)
        .not("service_longitude", "is", null)
        .not("status", "in", '("completed","cancelled")')
        .order("priority", { ascending: false });

      if (fetchError) throw fetchError;

      const servicesWithLocation: ServiceLocation[] = (data || []).map((service: any) => {
        const invoice = Array.isArray(service.invoice) ? service.invoice[0] : service.invoice;
        const technician = Array.isArray(service.assigned_technician) 
          ? service.assigned_technician[0] 
          : service.assigned_technician;
        
        return {
          id: service.id,
          invoice_id: invoice?.id || "",
          invoice_number: invoice?.invoice_number || "N/A",
          title: service.title,
          status: service.status,
          priority: service.priority,
          scheduled_date: service.scheduled_date,
          service_address: service.service_address,
          service_latitude: Number(service.service_latitude),
          service_longitude: Number(service.service_longitude),
          customer_name: invoice?.customer?.name || "Unknown",
          technician_name: technician?.name || null,
        };
      });

      setServices(servicesWithLocation);
    } catch (err) {
      console.error("Error fetching services:", err);
      setError("Gagal memuat data service");
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current || mapInitialized || map.current) return;

    try {
      const defaultCenter: [number, number] = [-6.2088, 106.8456];
      map.current = L.map(mapContainer.current).setView(defaultCenter, 10);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map.current);

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
              background: ${colorClass === "bg-primary" ? "#3b82f6" : colorClass === "bg-amber-500" ? "#f59e0b" : "#ef4444"};
              color: white;
              font-weight: bold;
              font-size: ${size === "small" ? "12px" : size === "medium" ? "14px" : "16px"};
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              border: 3px solid white;
            ">${count}</div>`,
            className: "custom-marker-cluster",
            iconSize: L.point(sizeValue, sizeValue, true),
          });
        },
      });

      map.current.addLayer(markerClusterGroup.current);

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

  useEffect(() => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
    }

    initTimeoutRef.current = setTimeout(() => {
      if (mapContainer.current && !mapInitialized) {
        const rect = mapContainer.current.getBoundingClientRect();
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

  useEffect(() => {
    if (!map.current || !markerClusterGroup.current || !mapInitialized) return;

    markerClusterGroup.current.clearLayers();

    if (services.length === 0) return;

    services.forEach((service) => {
      const marker = L.marker([service.service_latitude, service.service_longitude], {
        icon: statusIcons[service.status] || statusIcons.pending,
      });

      const popupContent = document.createElement("div");
      popupContent.className = "text-sm min-w-[200px]";
      popupContent.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-2">
          <span class="font-mono text-xs">${service.invoice_number}</span>
          ${getPriorityBadgeHTML(service.priority)}
        </div>
        <p class="font-semibold text-base mb-1">${service.title}</p>
        <div class="mb-2">${getStatusBadgeHTML(service.status)}</div>
        <div class="space-y-1 text-xs text-gray-600">
          <p>👤 ${service.customer_name}</p>
          ${service.technician_name ? `<p class="text-blue-600">🔧 ${service.technician_name}</p>` : ""}
          ${service.scheduled_date ? `<p>📅 ${format(new Date(service.scheduled_date), "dd MMM yyyy")}</p>` : ""}
          ${service.service_address ? `<p>📍 ${service.service_address}</p>` : ""}
        </div>
      `;

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "mt-3";
      const button = document.createElement("button");
      button.className = "w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2";
      button.innerHTML = "👁 Lihat Detail";
      button.onclick = () => {
        window.location.href = `/invoices/${service.invoice_number}`;
      };
      buttonContainer.appendChild(button);
      popupContent.appendChild(buttonContainer);

      marker.bindPopup(popupContent);
      markerClusterGroup.current!.addLayer(marker);
    });

    const bounds = L.latLngBounds(
      services.map((s) => [s.service_latitude, s.service_longitude])
    );

    if (services.length === 1) {
      map.current.setView([services[0].service_latitude, services[0].service_longitude], 15);
    } else {
      map.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [services, mapInitialized]);

  useEffect(() => {
    fetchServicesWithLocation();
  }, []);

  const getStatusBadgeHTML = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: "Pending", className: "bg-gray-100 text-gray-800" },
      assigned: { label: "Assigned", className: "bg-orange-100 text-orange-800" },
      in_progress: { label: "In Progress", className: "bg-green-100 text-green-800" },
      completed: { label: "Completed", className: "bg-violet-100 text-violet-800" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };
    const c = config[status] || { label: status, className: "" };
    return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.className}">${c.label}</span>`;
  };

  const getPriorityBadgeHTML = (priority: string) => {
    const config: Record<string, { label: string; className: string }> = {
      low: { label: "Low", className: "bg-slate-100 text-slate-800" },
      normal: { label: "Normal", className: "bg-blue-100 text-blue-800" },
      high: { label: "High", className: "bg-amber-100 text-amber-800" },
      urgent: { label: "Urgent", className: "bg-red-100 text-red-800" },
    };
    const c = config[priority] || { label: priority, className: "" };
    return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.className}">${c.label}</span>`;
  };

  const statusCounts = services.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Peta Overview Service Aktif
        </CardTitle>
        <Button variant="outline" size="sm" onClick={fetchServicesWithLocation} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            Pending: {statusCounts.pending || 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            Assigned: {statusCounts.assigned || 0}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            In Progress: {statusCounts.in_progress || 0}
          </Badge>
          <Badge variant="secondary" className="ml-auto">
            Total: {services.length} service
          </Badge>
        </div>

        {error && (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchServicesWithLocation} className="mt-2">
              Coba Lagi
            </Button>
          </div>
        )}

        <div ref={mapContainer} className="h-[400px] rounded-lg overflow-hidden border" style={{ minHeight: "400px" }}>
          {loading && !mapInitialized && (
            <div className="h-full flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {services.length === 0 && !loading && !error && (
          <p className="text-center text-muted-foreground py-4">
            Tidak ada service dengan lokasi GPS
          </p>
        )}
      </CardContent>
    </Card>
  );
}
