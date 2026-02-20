import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PhotoUpload from "./PhotoUpload";
import {
  Navigation,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Play,
  Square,
  Camera,
} from "lucide-react";

interface GPSCheckInOutProps {
  jobId: string;
  jobStatus: string;
  serviceLatitude: number | null;
  serviceLongitude: number | null;
  serviceAddress: string | null;
  actualCheckinAt: string | null;
  actualCheckoutAt: string | null;
  checkinGpsValid: boolean | null;
  checkoutGpsValid: boolean | null;
  beforePhotos?: string[];
  afterPhotos?: string[];
  onCheckIn: (
    latitude: number,
    longitude: number,
    isValid: boolean,
    photos: string[],
  ) => Promise<void>;
  onCheckOut: (
    latitude: number,
    longitude: number,
    isValid: boolean,
    photos: string[],
  ) => Promise<void>;
  disabled?: boolean;
}

// Jarak maksimum yang diizinkan dalam meter untuk validasi GPS
const MAX_DISTANCE_METERS = 100;

// Hitung jarak antara dua koordinat GPS menggunakan rumus Haversine
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Jarak dalam meter
}

export default function GPSCheckInOut({
  jobId,
  jobStatus,
  serviceLatitude,
  serviceLongitude,
  serviceAddress,
  actualCheckinAt,
  actualCheckoutAt,
  checkinGpsValid,
  checkoutGpsValid,
  beforePhotos = [],
  afterPhotos = [],
  onCheckIn,
  onCheckOut,
  disabled = false,
}: GPSCheckInOutProps) {
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  // State foto
  const [checkinPhotos, setCheckinPhotos] = useState<string[]>(beforePhotos);
  const [checkoutPhotos, setCheckoutPhotos] = useState<string[]>(afterPhotos);

  const hasServiceLocation =
    serviceLatitude !== null && serviceLongitude !== null;
  const canCheckIn = jobStatus === "approved" && !actualCheckinAt;
  const canCheckOut =
    jobStatus === "in_progress" && actualCheckinAt && !actualCheckoutAt;

  // Dapatkan lokasi saat ini
  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation tidak didukung oleh browser Anda"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  // Perbarui lokasi saat ini
  const refreshLocation = async () => {
    setGettingLocation(true);
    setLocationError(null);

    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });

      if (hasServiceLocation) {
        const dist = calculateDistance(
          latitude,
          longitude,
          serviceLatitude!,
          serviceLongitude!,
        );
        setDistance(dist);
      }
    } catch (error: any) {
      console.error("Error mendapatkan lokasi:", error);
      if (error.code === 1) {
        setLocationError("Akses lokasi ditolak. Harap aktifkan izin GPS.");
      } else if (error.code === 2) {
        setLocationError("Tidak dapat menentukan lokasi. Silakan coba lagi.");
      } else if (error.code === 3) {
        setLocationError("Permintaan lokasi habis waktu. Silakan coba lagi.");
      } else {
        setLocationError("Gagal mendapatkan lokasi Anda.");
      }
    } finally {
      setGettingLocation(false);
    }
  };

  // Perbarui lokasi otomatis saat mount
  useEffect(() => {
    if (canCheckIn || canCheckOut) {
      refreshLocation();
    }
  }, [canCheckIn, canCheckOut]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (!currentLocation) {
      await refreshLocation();
      if (!currentLocation) return;
    }

    setLoading(true);
    try {
      let isValid = false;
      if (hasServiceLocation && distance !== null) {
        isValid = distance <= MAX_DISTANCE_METERS;
      }
      await onCheckIn(
        currentLocation.lat,
        currentLocation.lng,
        isValid,
        checkinPhotos,
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (!currentLocation) {
      await refreshLocation();
      if (!currentLocation) return;
    }

    setLoading(true);
    try {
      let isValid = false;
      if (hasServiceLocation && distance !== null) {
        isValid = distance <= MAX_DISTANCE_METERS;
      }
      await onCheckOut(
        currentLocation.lat,
        currentLocation.lng,
        isValid,
        checkoutPhotos,
      );
    } finally {
      setLoading(false);
    }
  };

  // Format jarak untuk ditampilkan
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // Jika tidak dalam status yang membutuhkan check-in/out, tampilkan ringkasan
  if (!canCheckIn && !canCheckOut) {
    if (actualCheckinAt || actualCheckoutAt) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Verifikasi GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {actualCheckinAt && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">Check-in</span>
                </div>
                <div className="flex items-center gap-2">
                  {checkinGpsValid ? (
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Terverifikasi
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Di luar lokasi
                    </Badge>
                  )}
                </div>
              </div>
            )}
            {actualCheckoutAt && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Check-out</span>
                </div>
                <div className="flex items-center gap-2">
                  {checkoutGpsValid ? (
                    <Badge className="bg-emerald-100 text-emerald-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Terverifikasi
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Di luar lokasi
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          {canCheckIn
            ? "Check-in untuk Memulai Pekerjaan"
            : "Check-out untuk Menyelesaikan Pekerjaan"}
        </CardTitle>
        <CardDescription>
          {canCheckIn
            ? "Verifikasi lokasi Anda untuk mulai mengerjakan pekerjaan ini"
            : "Verifikasi lokasi Anda untuk menandai pekerjaan sebagai selesai"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lokasi Service */}
        {serviceAddress && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Lokasi Service</p>
              <p className="text-sm text-muted-foreground">{serviceAddress}</p>
            </div>
          </div>
        )}

        {/* Status Lokasi Saat Ini */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Lokasi Anda</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Perbarui"
              )}
            </Button>
          </div>

          {locationError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          ) : currentLocation ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Lokasi berhasil didapatkan</span>
              </div>
              {hasServiceLocation && distance !== null && (
                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    distance <= MAX_DISTANCE_METERS
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-amber-50 border border-amber-200"
                  }`}
                >
                  <span className="text-sm font-medium">
                    Jarak dari lokasi service
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      distance <= MAX_DISTANCE_METERS
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {formatDistance(distance)}
                  </span>
                </div>
              )}
              {hasServiceLocation &&
                distance !== null &&
                distance > MAX_DISTANCE_METERS && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Anda berada lebih dari {MAX_DISTANCE_METERS}m dari lokasi
                      service. Check-in/out akan dicatat dengan pelanggaran GPS.
                    </AlertDescription>
                  </Alert>
                )}
            </div>
          ) : gettingLocation ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Mendapatkan lokasi Anda...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <span>Lokasi tidak tersedia</span>
            </div>
          )}
        </div>

        {/* Bagian Upload Foto */}
        {canCheckIn && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Foto Sebelum (Opsional)
                </span>
              </div>
              <PhotoUpload
                jobId={jobId}
                type="before"
                onPhotosChange={setCheckinPhotos}
                existingPhotos={checkinPhotos}
                disabled={loading}
                maxPhotos={5}
              />
            </div>
          </>
        )}

        {canCheckOut && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Foto Sesudah (Disarankan)
                </span>
              </div>
              <PhotoUpload
                jobId={jobId}
                type="after"
                onPhotosChange={setCheckoutPhotos}
                existingPhotos={checkoutPhotos}
                disabled={loading}
                maxPhotos={5}
              />
            </div>
          </>
        )}

        {/* Tombol Aksi */}
        {canCheckIn && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckIn}
            disabled={loading || disabled || !currentLocation}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sedang check-in...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Check-in & Mulai Pekerjaan
              </>
            )}
          </Button>
        )}

        {canCheckOut && (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
            onClick={handleCheckOut}
            disabled={loading || disabled || !currentLocation}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sedang check-out...
              </>
            ) : (
              <>
                <Square className="mr-2 h-4 w-4" />
                Check-out & Selesaikan Pekerjaan
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
