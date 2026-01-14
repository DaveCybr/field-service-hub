import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, User, Route, Clock, ExternalLink, Loader2 } from 'lucide-react';

// Fix for default marker icons in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const serviceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const technicianIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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

// Component to fit bounds when markers change
function FitBounds({ 
  serviceLocation, 
  technicianLocation,
  routeCoordinates
}: { 
  serviceLocation: [number, number] | null;
  technicianLocation: [number, number] | null;
  routeCoordinates: [number, number][];
}) {
  const map = useMap();
  
  useEffect(() => {
    if (routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
      return;
    }

    const bounds: [number, number][] = [];
    if (serviceLocation) bounds.push(serviceLocation);
    if (technicianLocation) bounds.push(technicianLocation);
    
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, serviceLocation, technicianLocation, routeCoordinates]);
  
  return null;
}

export function LocationMap({
  serviceLatitude,
  serviceLongitude,
  serviceAddress,
  technicianName,
  showTechnicianLocation = true,
  className = ""
}: LocationMapProps) {
  const [technicianLocation, setTechnicianLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const serviceLocation: [number, number] | null = 
    serviceLatitude && serviceLongitude 
      ? [serviceLatitude, serviceLongitude] 
      : null;

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

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

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
        );
        
        setRouteInfo({
          coordinates,
          distance: route.distance,
          duration: route.duration
        });
      } else {
        setRouteError('Tidak dapat menemukan rute');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      setRouteError('Gagal memuat rute');
    } finally {
      setLoadingRoute(false);
    }
  }, [technicianLocation, serviceLocation]);

  // Open navigation in external app
  const openExternalNavigation = useCallback(() => {
    if (!serviceLocation || !technicianLocation) return;

    // Try to open Google Maps navigation
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${technicianLocation[0]},${technicianLocation[1]}&destination=${serviceLocation[0]},${serviceLocation[1]}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  }, [serviceLocation, technicianLocation]);

  useEffect(() => {
    if (!showTechnicianLocation) return;

    if (!navigator.geolocation) {
      setLocationError('Geolocation tidak didukung browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: [number, number] = [position.coords.latitude, position.coords.longitude];
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
            setLocationError('Izin lokasi ditolak');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Lokasi tidak tersedia');
            break;
          case error.TIMEOUT:
            setLocationError('Timeout mendapatkan lokasi');
            break;
          default:
            setLocationError('Error mendapatkan lokasi');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
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

  const defaultCenter: [number, number] = serviceLocation || technicianLocation || [-6.2088, 106.8456]; // Default to Jakarta

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
              {routeInfo ? 'Perbarui Rute' : 'Tampilkan Rute'}
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
              <span className="font-medium">Jarak Rute: {formatDistance(routeInfo.distance)}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-800">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Estimasi: {formatDuration(routeInfo.duration)}</span>
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
        <div className="h-80 rounded-lg overflow-hidden border">
          <MapContainer
            center={defaultCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <FitBounds 
              serviceLocation={serviceLocation} 
              technicianLocation={technicianLocation}
              routeCoordinates={routeInfo?.coordinates || []}
            />

            {/* Route Polyline */}
            {routeInfo && (
              <Polyline
                positions={routeInfo.coordinates}
                pathOptions={{
                  color: '#10b981',
                  weight: 5,
                  opacity: 0.8,
                  dashArray: undefined
                }}
              />
            )}
            
            {/* Service Location Marker */}
            {serviceLocation && (
              <Marker position={serviceLocation} icon={serviceIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-red-600">📍 Lokasi Service</p>
                    {serviceAddress && <p className="mt-1">{serviceAddress}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      {serviceLocation[0].toFixed(6)}, {serviceLocation[1].toFixed(6)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Technician Location Marker */}
            {technicianLocation && showTechnicianLocation && (
              <Marker position={technicianLocation} icon={technicianIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-blue-600">
                      <User className="inline h-4 w-4 mr-1" />
                      {technicianName || 'Teknisi'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {technicianLocation[0].toFixed(6)}, {technicianLocation[1].toFixed(6)}
                    </p>
                    {distance !== null && (
                      <p className="text-xs mt-1">
                        Jarak ke lokasi: {formatDistance(distance)}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>

        {/* Location Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {serviceLocation && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="font-medium text-red-700 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Lokasi Service
              </p>
              {serviceAddress && <p className="text-gray-600 mt-1">{serviceAddress}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Koordinat: {serviceLocation[0].toFixed(6)}, {serviceLocation[1].toFixed(6)}
              </p>
            </div>
          )}
          {technicianLocation && showTechnicianLocation && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-700 flex items-center gap-1">
                <User className="h-4 w-4" />
                Posisi {technicianName || 'Teknisi'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Koordinat: {technicianLocation[0].toFixed(6)}, {technicianLocation[1].toFixed(6)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
