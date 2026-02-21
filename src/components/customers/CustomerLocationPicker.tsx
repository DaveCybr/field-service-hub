// CustomerLocationPicker.tsx
// Komponen input GPS untuk customer — 3 cara:
//   1. Paste link Google Maps
//   2. Input latitude/longitude manual
//   3. Klik di map langsung (via LocationPicker yang sudah ada)

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationPicker } from "@/components/jobs/LocationPicker";
import { MapPin, Link, Hash, Map, X, ExternalLink } from "lucide-react";

interface CustomerLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  onLocationChange: (lat: number | null, lng: number | null) => void;
  onAddressChange?: (address: string) => void;
}

// Parse berbagai format link Google Maps → { lat, lng }
function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
  try {
    // Format: maps.google.com/?q=-8.123,113.456
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch)
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

    // Format: google.com/maps/@-8.123,113.456
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch)
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

    // Format: maps.google.com/maps?ll=-8.123,113.456
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch)
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

    // Format: /place/ dengan koordinat
    const placeMatch = url.match(
      /\/place\/[^/]*\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    );
    if (placeMatch)
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) };

    return null;
  } catch {
    return null;
  }
}

export function CustomerLocationPicker({
  latitude,
  longitude,
  address = "",
  onLocationChange,
  onAddressChange,
}: CustomerLocationPickerProps) {
  const [linkInput, setLinkInput] = useState("");
  const [linkError, setLinkError] = useState("");
  const [manualLat, setManualLat] = useState(latitude?.toString() || "");
  const [manualLng, setManualLng] = useState(longitude?.toString() || "");
  const [manualError, setManualError] = useState("");

  const hasLocation = latitude !== null && longitude !== null;

  const handleLinkPaste = (val: string) => {
    setLinkInput(val);
    setLinkError("");

    if (!val.trim()) return;

    const parsed = parseGoogleMapsLink(val.trim());
    if (parsed) {
      onLocationChange(parsed.lat, parsed.lng);
      setManualLat(parsed.lat.toString());
      setManualLng(parsed.lng.toString());
      setLinkError("");
    } else if (val.includes("goo.gl") || val.includes("maps.app")) {
      // Short URL — tidak bisa di-parse langsung di browser tanpa follow redirect
      setLinkError(
        "Link ini adalah short URL. Buka dulu di browser, lalu copy URL lengkapnya dari address bar.",
      );
    } else if (val.length > 10) {
      setLinkError(
        "Format link tidak dikenali. Coba copy URL dari address bar Google Maps.",
      );
    }
  };

  const handleManualApply = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setManualError("Latitude tidak valid (-90 s/d 90)");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setManualError("Longitude tidak valid (-180 s/d 180)");
      return;
    }

    setManualError("");
    onLocationChange(lat, lng);
  };

  const handleClear = () => {
    onLocationChange(null, null);
    setLinkInput("");
    setManualLat("");
    setManualLng("");
    setLinkError("");
    setManualError("");
  };

  const googleMapsUrl = hasLocation
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null;

  return (
    <div className="space-y-3">
      {/* Status lokasi saat ini */}
      {hasLocation ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm">
          <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-emerald-700 font-medium">
              Lokasi tersimpan
            </span>
            <p className="text-xs text-emerald-600 font-mono truncate">
              {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
            </p>
          </div>
          <div className="flex gap-1 shrink-0">
            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
                title="Buka di Google Maps"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded hover:bg-emerald-100 text-emerald-600"
              title="Hapus lokasi"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>Belum ada lokasi GPS</span>
        </div>
      )}

      {/* 3 cara input */}
      <Tabs defaultValue="link">
        <TabsList className="w-full grid grid-cols-3 h-8">
          <TabsTrigger value="link" className="text-xs gap-1">
            <Link className="h-3 w-3" />
            Paste Link
          </TabsTrigger>
          <TabsTrigger value="manual" className="text-xs gap-1">
            <Hash className="h-3 w-3" />
            Lat / Lng
          </TabsTrigger>
          <TabsTrigger value="map" className="text-xs gap-1">
            <Map className="h-3 w-3" />
            Klik Map
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Paste link Google Maps */}
        <TabsContent value="link" className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Buka Google Maps → cari lokasi → copy URL dari address bar → paste
            di sini
          </p>
          <Input
            placeholder="https://www.google.com/maps?q=-8.1234,113.5678"
            value={linkInput}
            onChange={(e) => handleLinkPaste(e.target.value)}
            className={linkError ? "border-destructive" : ""}
          />
          {linkError && <p className="text-xs text-destructive">{linkError}</p>}
          {hasLocation && !linkError && linkInput && (
            <p className="text-xs text-emerald-600">
              ✓ Koordinat berhasil dibaca dari link
            </p>
          )}
        </TabsContent>

        {/* Tab 2: Input lat/lng manual */}
        <TabsContent value="manual" className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Contoh: Latitude -8.172453 · Longitude 113.700483
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Latitude</Label>
              <Input
                placeholder="-8.172453"
                value={manualLat}
                onChange={(e) => {
                  setManualLat(e.target.value);
                  setManualError("");
                }}
                className={manualError ? "border-destructive" : ""}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Longitude</Label>
              <Input
                placeholder="113.700483"
                value={manualLng}
                onChange={(e) => {
                  setManualLng(e.target.value);
                  setManualError("");
                }}
                className={manualError ? "border-destructive" : ""}
              />
            </div>
          </div>
          {manualError && (
            <p className="text-xs text-destructive">{manualError}</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleManualApply}
            disabled={!manualLat || !manualLng}
            className="w-full"
          >
            Terapkan Koordinat
          </Button>
        </TabsContent>

        {/* Tab 3: Klik di map */}
        <TabsContent value="map" className="mt-2">
          <p className="text-xs text-muted-foreground mb-2">
            Cari alamat atau klik langsung di peta untuk menandai lokasi
          </p>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            address={address}
            onLocationChange={(lat, lng) => {
              onLocationChange(lat, lng);
              if (lat !== null) {
                setManualLat(lat.toString());
                setManualLng(lng!.toString());
              }
            }}
            onAddressChange={onAddressChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
