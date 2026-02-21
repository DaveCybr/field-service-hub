import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, X, Search } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

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
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Default ke Indonesia (tengah Jawa)
  const defaultLat = -7.250445;
  const defaultLng = 112.768845;

  useEffect(() => {
    if (showMap && mapContainerRef.current && !mapRef.current) {
      const map = L.map(mapContainerRef.current).setView(
        [latitude || defaultLat, longitude || defaultLng],
        latitude ? 15 : 10,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      if (latitude && longitude) {
        const marker = L.marker([latitude, longitude], {
          draggable: true,
        }).addTo(map);

        marker.on("dragend", async (e) => {
          const position = e.target.getLatLng();
          onLocationChange(position.lat, position.lng);
          await reverseGeocode(position.lat, position.lng);
        });

        markerRef.current = marker;
      }

      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;

        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const marker = L.marker([lat, lng], {
            draggable: true,
          }).addTo(map);

          marker.on("dragend", async (event) => {
            const position = event.target.getLatLng();
            onLocationChange(position.lat, position.lng);
            await reverseGeocode(position.lat, position.lng);
          });

          markerRef.current = marker;
        }

        onLocationChange(lat, lng);
        await reverseGeocode(lat, lng);
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showMap]);

  useEffect(() => {
    if (mapRef.current && markerRef.current && latitude && longitude) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      );
      const data = await response.json();

      if (data.display_name) {
        onAddressChange(data.display_name);
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Geolocation tidak didukung oleh browser Anda",
      });
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        onLocationChange(lat, lng);
        await reverseGeocode(lat, lng);

        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 15);

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], {
              draggable: true,
            }).addTo(mapRef.current);

            marker.on("dragend", async (e) => {
              const position = e.target.getLatLng();
              onLocationChange(position.lat, position.lng);
              await reverseGeocode(position.lat, position.lng);
            });

            markerRef.current = marker;
          }
        }

        setLoading(false);
        toast({
          title: "Lokasi berhasil didapatkan",
          description: "Koordinat GPS berhasil disimpan",
        });
      },
      (error) => {
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal mendapatkan lokasi Anda: " + error.message,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Harap masukkan kata kunci pencarian",
      });
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchQuery,
        )}&format=json&limit=1`,
      );
      const data = await response.json();

      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        onLocationChange(latitude, longitude);
        onAddressChange(display_name);

        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 15);

          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          } else {
            const marker = L.marker([latitude, longitude], {
              draggable: true,
            }).addTo(mapRef.current);

            marker.on("dragend", async (e) => {
              const position = e.target.getLatLng();
              onLocationChange(position.lat, position.lng);
              await reverseGeocode(position.lat, position.lng);
            });

            markerRef.current = marker;
          }
        }

        toast({
          title: "Lokasi ditemukan",
          description: "Alamat telah diatur",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Tidak ditemukan",
          description: "Lokasi tidak ditemukan. Coba kata kunci yang berbeda.",
        });
      }
    } catch (error) {
      console.error("Error pencarian:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal mencari lokasi",
      });
    } finally {
      setSearching(false);
    }
  };

  const clearLocation = () => {
    onLocationChange(null, null);
    onAddressChange("");
    setSearchQuery("");

    if (markerRef.current && mapRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    toast({
      title: "Lokasi dihapus",
      description: "Koordinat GPS telah dihapus",
    });
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  return (
    <div className="space-y-3">
      {/* Tombol Aksi */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mendapatkan lokasi...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Gunakan Lokasi Saat Ini
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={toggleMap}
          className="flex-1"
        >
          <MapPin className="mr-2 h-4 w-4" />
          {showMap ? "Sembunyikan Peta" : "Tampilkan Peta"}
        </Button>

        {latitude && longitude && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearLocation}
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cari Lokasi */}
      <div className="flex gap-2">
        <Input
          placeholder="Cari lokasi (contoh: Jember, Jawa Timur)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchLocation();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={searchLocation}
          disabled={searching}
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Kontainer Peta */}
      {showMap && (
        <div className="border rounded-lg overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-[400px]"
            style={{ zIndex: 0 }}
          />
          <div className="p-3 bg-muted text-xs text-muted-foreground">
            💡 Klik pada peta untuk menentukan lokasi, atau seret penanda untuk
            menyesuaikan
          </div>
        </div>
      )}

      {/* Tampilan Koordinat */}
      {latitude && longitude && (
        <div className="p-3 rounded-lg bg-muted space-y-2">
          <div>
            <p className="font-medium text-sm">Koordinat GPS:</p>
            <p className="text-xs text-muted-foreground font-mono">
              Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
            </p>
          </div>
          {address && (
            <div>
              <p className="font-medium text-sm">Alamat:</p>
              <p className="text-xs text-muted-foreground">{address}</p>
            </div>
          )}
          <a
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs inline-flex items-center gap-1"
          >
            Lihat di Google Maps →
          </a>
        </div>
      )}
    </div>
  );
}
