import { useEffect, useState, useCallback, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  User,
  Route,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";

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

// Custom icons
const serviceIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const technicianIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RouteInfo {
  coordinates: [number, number][];
  distance: number; // in meters
  duration: number; // in seconds
}

interface LocationMapProps {
  serviceLatitude?: number | null;
  serviceLongitude?: number | null;
  serviceAddress?: string | null;
  technicianName?: string;
  showTechnicianLocation?: boolean;
  className?: string;
}

export function LocationMap({
  serviceLatitude,
  serviceLongitude,
  serviceAddress,
  technicianName,
  showTechnicianLocation = true,
  className = "",
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const serviceMarkerRef = useRef<L.Marker | null>(null);
  const technicianMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  const [technicianLocation, setTechnicianLocation] = useState<
    [number, number] | null
  >(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  const serviceLocation: [number, number] | null =
    serviceLatitude && serviceLongitude
      ? [serviceLatitude, serviceLongitude]
      : null;

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Fetch route from OSRM (Open Source Routing Machine) - FREE
  const fetchRoute = useCallback(async () => {
    if (!technicianLocation || !serviceLocation) return;

    setLoadingRoute(true);
    setRouteError(null);

    try {
      // OSRM API - completely free, no API key needed
      const url = `https://router.project-osrm.org/route/v1/driving/${technicianLocation[1]},${technicianLocation[0]};${serviceLocation[1]},${serviceLocation[0]}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );

        setRouteInfo({
          coordinates,
          distance: route.distance,
          duration: route.duration,
        });
      } else {
        setRouteError("Tidak dapat menemukan rute");
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      setRouteError("Gagal memuat rute");
    } finally {
      setLoadingRoute(false);
    }
  }, [technicianLocation, serviceLocation]);

  // Open navigation in external app
  const openExternalNavigation = useCallback(() => {
    if (!serviceLocation || !technicianLocation) return;

    // Try to open Google Maps navigation
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${technicianLocation[0]},${technicianLocation[1]}&destination=${serviceLocation[0]},${serviceLocation[1]}&travelmode=driving`;
    window.open(googleMapsUrl, "_blank");
  }, [serviceLocation, technicianLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter: [number, number] = serviceLocation ||
      technicianLocation || [-6.2088, 106.8456]; // Default to Jakarta

    try {
      mapRef.current = L.map(mapContainerRef.current).setView(
        defaultCenter,
        15
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      setMapInitialized(true);
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update service marker
  useEffect(() => {
    if (!mapRef.current || !serviceLocation || !mapInitialized) return;

    // Remove old marker
    if (serviceMarkerRef.current) {
      serviceMarkerRef.current.remove();
    }

    // Add new marker
    serviceMarkerRef.current = L.marker(serviceLocation, {
      icon: serviceIcon,
    }).addTo(mapRef.current).bindPopup(`
        <div style="font-size: 14px;">
          <p style="font-weight: bold; color: #dc2626;">📍 Lokasi Service</p>
          ${
            serviceAddress
              ? `<p style="margin-top: 4px;">${serviceAddress}</p>`
              : ""
          }
          <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            ${serviceLocation[0].toFixed(6)}, ${serviceLocation[1].toFixed(6)}
          </p>
        </div>
      `);

    return () => {
      if (serviceMarkerRef.current) {
        serviceMarkerRef.current.remove();
      }
    };
  }, [serviceLocation, serviceAddress, mapInitialized]);

  // Update technician marker
  useEffect(() => {
    if (
      !mapRef.current ||
      !technicianLocation ||
      !showTechnicianLocation ||
      !mapInitialized
    )
      return;

    // Remove old marker
    if (technicianMarkerRef.current) {
      technicianMarkerRef.current.remove();
    }

    // Add new marker
    technicianMarkerRef.current = L.marker(technicianLocation, {
      icon: technicianIcon,
    }).addTo(mapRef.current).bindPopup(`
        <div style="font-size: 14px;">
          <p style="font-weight: bold; color: #2563eb;">
            👤 ${technicianName || "Teknisi"}
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">
            ${technicianLocation[0].toFixed(
              6
            )}, ${technicianLocation[1].toFixed(6)}
          </p>
          ${
            distance !== null
              ? `<p style="font-size: 12px; margin-top: 4px;">Jarak ke lokasi: ${formatDistance(
                  distance
                )}</p>`
              : ""
          }
        </div>
      `);

    return () => {
      if (technicianMarkerRef.current) {
        technicianMarkerRef.current.remove();
      }
    };
  }, [
    technicianLocation,
    showTechnicianLocation,
    technicianName,
    distance,
    mapInitialized,
  ]);

  // Update route polyline
  useEffect(() => {
    if (!mapRef.current || !routeInfo || !mapInitialized) return;

    // Remove old route
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
    }

    // Add new route
    routeLayerRef.current = L.polyline(routeInfo.coordinates, {
      color: "#10b981",
      weight: 5,
      opacity: 0.8,
    }).addTo(mapRef.current);

    // Fit bounds to show entire route
    mapRef.current.fitBounds(routeLayerRef.current.getBounds(), {
      padding: [50, 50],
    });

    return () => {
      if (routeLayerRef.current) {
        routeLayerRef.current.remove();
      }
    };
  }, [routeInfo, mapInitialized]);

  // Fit bounds when markers change (only if no route)
  useEffect(() => {
    if (!mapRef.current || !mapInitialized || routeInfo) return;

    const bounds: [number, number][] = [];
    if (serviceLocation) bounds.push(serviceLocation);
    if (technicianLocation) bounds.push(technicianLocation);

    if (bounds.length > 0) {
      if (bounds.length === 1) {
        mapRef.current.setView(bounds[0], 15);
      } else {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [serviceLocation, technicianLocation, routeInfo, mapInitialized]);

  // Watch technician location
  useEffect(() => {
    if (!showTechnicianLocation) return;

    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung browser");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setTechnicianLocation(newLocation);
        setLocationError(null);

        if (serviceLocation) {
          const dist = calculateDistance(
            serviceLocation[0],
            serviceLocation[1],
            position.coords.latitude,
            position.coords.longitude
          );
          setDistance(dist);
        }
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("Izin lokasi ditolak");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError("Lokasi tidak tersedia");
            break;
          case error.TIMEOUT:
            setLocationError("Timeout mendapatkan lokasi");
            break;
          default:
            setLocationError("Error mendapatkan lokasi");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [showTechnicianLocation, serviceLocation]);

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours} jam ${minutes} menit`;
    }
    return `${minutes} menit`;
  };

  if (!serviceLocation && !technicianLocation) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Peta Lokasi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Lokasi tidak tersedia</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Peta Lokasi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Legend and Distance Info */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span>Lokasi Service</span>
          </div>
          {showTechnicianLocation && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span>Posisi Teknisi</span>
            </div>
          )}
          {routeInfo && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-emerald-500 rounded"></div>
              <span>Rute</span>
            </div>
          )}
          {distance !== null && (
            <Badge variant="outline" className="ml-auto">
              <Navigation className="h-3 w-3 mr-1" />
              Jarak: {formatDistance(distance)}
            </Badge>
          )}
        </div>

        {/* Route Controls */}
        {showTechnicianLocation && technicianLocation && serviceLocation && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRoute}
              disabled={loadingRoute}
            >
              {loadingRoute ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Route className="h-4 w-4 mr-2" />
              )}
              {routeInfo ? "Perbarui Rute" : "Tampilkan Rute"}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={openExternalNavigation}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Buka di Google Maps
            </Button>
          </div>
        )}

        {/* Route Info */}
        {routeInfo && (
          <div className="flex flex-wrap gap-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800">
              <Route className="h-4 w-4" />
              <span className="font-medium">
                Jarak Rute: {formatDistance(routeInfo.distance)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <Clock className="h-4 w-4" />
              <span className="font-medium">
                Estimasi: {formatDuration(routeInfo.duration)}
              </span>
            </div>
          </div>
        )}

        {routeError && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            ⚠️ {routeError}
          </div>
        )}

        {locationError && (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ {locationError}
          </div>
        )}

        {/* Map Container */}
        <div className="h-80 rounded-lg overflow-hidden border relative">
          <div
            ref={mapContainerRef}
            style={{ height: "100%", width: "100%" }}
          />

          {!mapInitialized && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Location Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {serviceLocation && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="font-medium text-red-700 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Lokasi Service
              </p>
              {serviceAddress && (
                <p className="text-gray-600 mt-1">{serviceAddress}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Koordinat: {serviceLocation[0].toFixed(6)},{" "}
                {serviceLocation[1].toFixed(6)}
              </p>
            </div>
          )}
          {technicianLocation && showTechnicianLocation && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-700 flex items-center gap-1">
                <User className="h-4 w-4" />
                Posisi {technicianName || "Teknisi"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Koordinat: {technicianLocation[0].toFixed(6)},{" "}
                {technicianLocation[1].toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
