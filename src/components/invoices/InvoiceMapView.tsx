// InvoiceMapView.tsx - Lokasi Faktur pada Peta
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
import { id as localeId } from "date-fns/locale";
import {
  MapPin,
  Calendar as CalendarIcon,
  Loader2,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

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

type FilterPeriod = "day" | "month" | "year";

const STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  assigned: "Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  completed: "Selesai",
};

export function InvoiceMapView() {
  const { toast } = useToast();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.MarkerClusterGroup | null>(null);

  const [locations, setLocations] = useState<InvoiceLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<InvoiceLocation[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("month");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [mapCenter] = useState<[number, number]>([-8.1845, 113.716]); // Jember

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `
          id, service_address, service_latitude, service_longitude,
          service_cost, status, scheduled_date, title,
          invoice:invoices!inner (
            id, invoice_number,
            customer:customers (name)
          )
        `,
        )
        .not("service_latitude", "is", null)
        .not("service_longitude", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: InvoiceLocation[] = data.map((item) => ({
        invoice_id: (item.invoice as any).id,
        invoice_number: (item.invoice as any).invoice_number,
        customer_name:
          (item.invoice as any).customer?.name || "Tidak diketahui",
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
      toast({
        variant: "destructive",
        title: "Gagal Memuat",
        description: "Gagal memuat data lokasi",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = [...locations];
    const now = selectedDate;
    let startDate: Date, endDate: Date;

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
    }

    filtered = filtered.filter((loc) => {
      if (!loc.scheduled_date) return false;
      const serviceDate = new Date(loc.scheduled_date);
      return serviceDate >= startDate && serviceDate <= endDate;
    });

    if (selectedStatus !== "all") {
      filtered = filtered.filter((loc) => loc.status === selectedStatus);
    }

    setFilteredLocations(filtered);
  }, [locations, filterPeriod, selectedDate, selectedStatus]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView(mapCenter, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

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

  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    filteredLocations.forEach((location) => {
      const marker = L.marker([location.latitude, location.longitude]);
      const popupContent = `
        <div style="min-width: 200px;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">${location.invoice_number}</div>
          <div style="margin-bottom: 4px;"><strong>Pelanggan:</strong> ${location.customer_name}</div>
          <div style="margin-bottom: 4px;"><strong>Layanan:</strong> ${location.service_title}</div>
          <div style="margin-bottom: 4px;"><strong>Biaya:</strong> ${formatCurrency(location.service_cost)}</div>
          <div style="margin-bottom: 4px;"><strong>Status:</strong> ${STATUS_LABELS[location.status] || location.status}</div>
          ${
            location.scheduled_date
              ? `<div style="margin-bottom: 8px;"><strong>Jadwal:</strong> ${format(new Date(location.scheduled_date), "dd MMM yyyy", { locale: localeId })}</div>`
              : ""
          }
          <div style="margin-bottom: 4px; font-size: 12px; color: #666;">${location.service_address}</div>
          <a href="/invoices/${location.invoice_number}" style="display:inline-block;margin-top:8px;padding:4px 12px;background:#3b82f6;color:white;text-decoration:none;border-radius:4px;font-size:12px;">
            Lihat Faktur →
          </a>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersRef.current!.addLayer(marker);
    });

    if (filteredLocations.length > 0 && mapRef.current) {
      const bounds = markersRef.current.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [filteredLocations]);

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleGetMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) mapRef.current.setView([latitude, longitude], 14);
          toast({
            title: "Lokasi Ditemukan",
            description: "Peta berpusat ke lokasi Anda",
          });
        },
        () => {
          toast({
            variant: "destructive",
            title: "Gagal",
            description: "Tidak dapat mengakses lokasi Anda",
          });
        },
      );
    } else {
      toast({
        variant: "destructive",
        title: "Tidak Didukung",
        description: "Browser tidak mendukung geolokasi",
      });
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <CardTitle>Peta Lokasi Faktur</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat...
              </div>
            ) : (
              <Badge variant="secondary">
                {filteredLocations.length} lokasi
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterPeriod}
            onValueChange={(val) => setFilterPeriod(val as FilterPeriod)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Per Hari</SelectItem>
              <SelectItem value="month">Per Bulan</SelectItem>
              <SelectItem value="year">Per Tahun</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[220px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterPeriod === "day"
                  ? format(selectedDate, "dd MMMM yyyy", { locale: localeId })
                  : filterPeriod === "month"
                    ? format(selectedDate, "MMMM yyyy", { locale: localeId })
                    : format(selectedDate, "yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                locale={localeId}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="assigned">Ditugaskan</SelectItem>
              <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleGetMyLocation}>
            <Navigation className="h-4 w-4 mr-2" />
            Lokasi Saya
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Muat Ulang
              </>
            )}
          </Button>
        </div>

        <div
          ref={mapContainerRef}
          className="w-full h-[600px] rounded-lg border"
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Lokasi</p>
            <p className="text-2xl font-bold">{locations.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ditampilkan</p>
            <p className="text-2xl font-bold">{filteredLocations.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Nilai</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filteredLocations.reduce(
                  (sum, loc) => sum + loc.service_cost,
                  0,
                ),
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Rata-rata Nilai</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                filteredLocations.length > 0
                  ? filteredLocations.reduce(
                      (sum, loc) => sum + loc.service_cost,
                      0,
                    ) / filteredLocations.length
                  : 0,
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
