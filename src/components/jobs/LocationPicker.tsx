import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Navigation,
  Loader2,
  Search,
  LocateFixed,
  MapPinOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

// Custom marker icon
const locationIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  onAddressChange: (address: string) => void;
}

export function LocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  onAddressChange,
}: LocationPickerProps) {
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [gettingLocation, setGettingLocation] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapInitialized) return;

    try {
      const defaultCenter: [number, number] = [-6.2088, 106.8456]; // Jakarta
      const center =
        latitude && longitude
          ? ([latitude, longitude] as [number, number])
          : defaultCenter;

      map.current = L.map(mapContainer.current).setView(center, 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map.current);

      // Add click handler to map
      map.current.on("click", (e: L.LeafletMouseEvent) => {
        handleMapClick(e.latlng.lat, e.latlng.lng);
      });

      // Add initial marker if location exists
      if (latitude && longitude) {
        markerRef.current = L.marker([latitude, longitude], {
          icon: locationIcon,
        }).addTo(map.current);
      }

      setMapInitialized(true);
    } catch (error) {
      console.error("Error initializing map:", error);
      toast({
        variant: "destructive",
        title: "Map Error",
        description: "Failed to initialize map",
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update marker when location changes
  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    if (latitude && longitude) {
      // Remove old marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Add new marker
      markerRef.current = L.marker([latitude, longitude], {
        icon: locationIcon,
      }).addTo(map.current);

      // Center map to new location
      map.current.setView([latitude, longitude], 17);
    } else {
      // Remove marker if no location
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [latitude, longitude, mapInitialized]);

  // Get current location using GPS
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Geolocation tidak didukung browser Anda",
      });
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        onLocationChange(lat, lng);

        // Try to get address from coordinates (reverse geocoding)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
          );
          const data = await response.json();
          if (data.display_name) {
            onAddressChange(data.display_name);
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
        }

        setGettingLocation(false);
        toast({
          title: "Lokasi ditemukan",
          description: "Lokasi GPS Anda telah ditandai di peta",
        });
      },
      (error) => {
        setGettingLocation(false);
        let message = "Gagal mendapatkan lokasi";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Izin lokasi ditolak";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Lokasi tidak tersedia";
            break;
          case error.TIMEOUT:
            message = "Timeout mendapatkan lokasi";
            break;
        }
        toast({
          variant: "destructive",
          title: "Error GPS",
          description: message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [onLocationChange, onAddressChange, toast]);

  // Search location by address
  const searchLocation = useCallback(async () => {
    const query = searchQuery.trim() || address.trim();
    if (!query) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Masukkan alamat untuk dicari",
      });
      return;
    }

    setSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1&countrycodes=id`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        onLocationChange(lat, lng);

        if (result.display_name) {
          onAddressChange(result.display_name);
        }

        toast({
          title: "Lokasi ditemukan",
          description: "Lokasi telah ditandai di peta",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Tidak ditemukan",
          description:
            "Alamat tidak ditemukan. Coba dengan alamat yang lebih spesifik.",
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal mencari lokasi",
      });
    } finally {
      setSearching(false);
    }
  }, [searchQuery, address, onLocationChange, onAddressChange, toast]);

  // Handle map click
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      onLocationChange(lat, lng);

      // Reverse geocode to get address
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );
        const data = await response.json();
        if (data.display_name) {
          onAddressChange(data.display_name);
        }
      } catch (error) {
        console.error("Reverse geocoding error:", error);
      }
    },
    [onLocationChange, onAddressChange]
  );

  // Clear location
  const clearLocation = useCallback(() => {
    onLocationChange(null, null);
  }, [onLocationChange]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Cari alamat atau klik peta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                searchLocation();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={searchLocation}
          disabled={searching}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={getCurrentLocation}
          disabled={gettingLocation}
          title="Gunakan lokasi GPS saat ini"
        >
          {gettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Map */}
      <div className="h-64 rounded-lg overflow-hidden border relative bg-muted">
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

        {/* Instruction overlay */}
        {!latitude && !longitude && mapInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 pointer-events-none">
            <div className="bg-card px-4 py-2 rounded-lg shadow text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Klik peta untuk memilih lokasi
            </div>
          </div>
        )}

        {!mapInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Coordinates Display */}
      {latitude && longitude && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-red-500" />
            <span className="font-mono">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearLocation}
            className="text-destructive hover:text-destructive"
          >
            <MapPinOff className="h-4 w-4 mr-1" />
            Hapus
          </Button>
        </div>
      )}

      {!latitude && !longitude && (
        <p className="text-sm text-amber-600 flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          Pilih lokasi untuk memvalidasi GPS check-in/check-out teknisi
        </p>
      )}
    </div>
  );
}
