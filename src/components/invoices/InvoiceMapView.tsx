import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  MapPin,
  Calendar as CalendarIcon,
  Loader2,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import { getStatusBadge } from "@/lib/utils/badges";

// Fix Leaflet default marker icon
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import markerIconRetina from "leaflet/dist/images/marker-icon-2x.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
});

interface InvoiceLocation {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  service_address: string;
  latitude: number;
  longitude: number;
  service_cost: number;
  status: string;
  scheduled_date?: string;
  service_title: string;
}

type FilterPeriod = "day" | "month" | "year" | "custom";

export function InvoiceMapView() {
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);

  const [locations, setLocations] = useState<InvoiceLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<InvoiceLocation[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    -7.250445, 112.768845,
  ]); // Jember, Indonesia

  // Fetch invoice locations
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `
          id,
          service_address,
          service_latitude,
          service_longitude,
          service_cost,
          status,
          scheduled_date,
          title,
          invoice:invoices!inner (
            id,
            invoice_number,
            customer:customers (
              name
            )
          )
        `
        )
        .not("service_latitude", "is", null)
        .not("service_longitude", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: InvoiceLocation[] = data.map((item) => ({
        invoice_id: (item.invoice as any).id,
        invoice_number: (item.invoice as any).invoice_number,
        customer_name: (item.invoice as any).customer?.name || "Unknown",
        service_address: item.service_address || "",
        latitude: item.service_latitude!,
        longitude: item.service_longitude!,
        service_cost: item.service_cost || 0,
        status: item.status,
        scheduled_date: item.scheduled_date || undefined,
        service_title: item.title,
      }));

      setLocations(mapped);
    } catch (error: any) {
      console.error("Error fetching locations:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load locations",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter locations by date and status
  useEffect(() => {
    let filtered = [...locations];

    // Filter by date
    if (filterPeriod !== "custom") {
      const now = selectedDate;
      let startDate: Date;
      let endDate: Date;

      switch (filterPeriod) {
        case "day":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "year":
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      filtered = filtered.filter((loc) => {
        if (!loc.scheduled_date) return false;
        const serviceDate = new Date(loc.scheduled_date);
        return serviceDate >= startDate && serviceDate <= endDate;
      });
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((loc) => loc.status === selectedStatus);
    }

    setFilteredLocations(filtered);
  }, [locations, filterPeriod, selectedDate, selectedStatus]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(mapCenter, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    // Initialize marker cluster group
    const markers = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 60,
    });

    map.addLayer(markers);
    mapRef.current = map;
    markersRef.current = markers;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, [mapCenter]);

  // Update markers when filtered locations change
  useEffect(() => {
    if (!markersRef.current) return;

    // Clear existing markers
    markersRef.current.clearLayers();

    // Add markers for filtered locations
    filteredLocations.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude]);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">
            ${location.invoice_number}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Customer:</strong> ${location.customer_name}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Service:</strong> ${location.service_title}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Cost:</strong> ${formatCurrency(location.service_cost)}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Status:</strong> <span style="text-transform: capitalize;">${location.status.replace(
              "_",
              " "
            )}</span>
          </div>
          ${
            location.scheduled_date
              ? `<div style="margin-bottom: 8px;">
                  <strong>Date:</strong> ${format(
                    new Date(location.scheduled_date),
                    "PPP"
                  )}
                </div>`
              : ""
          }
          <div style="margin-bottom: 4px; font-size: 12px; color: #666;">
            ${location.service_address}
          </div>
          <a 
            href="/invoices/${location.invoice_id}" 
            style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; font-size: 12px;"
          >
            View Invoice →
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersRef.current!.addLayer(marker);
    });

    // Fit map to markers bounds
    if (filteredLocations.length > 0 && mapRef.current) {
      const bounds = markersRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [filteredLocations]);

  // Fetch locations on mount
  useEffect(() => {
    fetchLocations();
  }, []);

  // Get my current location
  const handleGetMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 14);
          }
          toast({
            title: "Location Found",
            description: "Map centered to your current location",
          });
        },
        (error) => {
          toast({
            variant: "destructive",
            title: "Location Error",
            description: "Could not get your location",
          });
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Geolocation is not supported by your browser",
      });
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Invoice Locations Map</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Badge variant="secondary">
                {filteredLocations.length} locations
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter */}
          <Select
            value={filterPeriod}
            onValueChange={(val) => setFilterPeriod(val as FilterPeriod)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Per Day</SelectItem>
              <SelectItem value="month">Per Month</SelectItem>
              <SelectItem value="year">Per Year</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-[240px] justify-start text-left font-normal")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  filterPeriod === "day" ? (
                    format(selectedDate, "PPP")
                  ) : filterPeriod === "month" ? (
                    format(selectedDate, "MMMM yyyy")
                  ) : (
                    format(selectedDate, "yyyy")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* My Location Button */}
          <Button variant="outline" size="sm" onClick={handleGetMyLocation}>
            <Navigation className="h-4 w-4 mr-2" />
            My Location
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-[600px] rounded-lg border"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Locations</p>
            <p className="text-2xl font-bold">{locations.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Filtered</p>
            <p className="text-2xl font-bold">{filteredLocations.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filteredLocations.reduce(
                  (sum, loc) => sum + loc.service_cost,
                  0
                )
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Avg. Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filteredLocations.length > 0
                  ? filteredLocations.reduce(
                      (sum, loc) => sum + loc.service_cost,
                      0
                    ) / filteredLocations.length
                  : 0
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
