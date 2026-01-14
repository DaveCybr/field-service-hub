import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Navigation, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  Play,
  Square
} from 'lucide-react';

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
  onCheckIn: (latitude: number, longitude: number, isValid: boolean) => Promise<void>;
  onCheckOut: (latitude: number, longitude: number, isValid: boolean) => Promise<void>;
  disabled?: boolean;
}

// Maximum allowed distance in meters for GPS validation
const MAX_DISTANCE_METERS = 100;

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
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
  onCheckIn,
  onCheckOut,
  disabled = false,
}: GPSCheckInOutProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  const hasServiceLocation = serviceLatitude !== null && serviceLongitude !== null;
  const canCheckIn = jobStatus === 'approved' && !actualCheckinAt;
  const canCheckOut = jobStatus === 'in_progress' && actualCheckinAt && !actualCheckoutAt;

  // Get current location
  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  };

  // Refresh current location
  const refreshLocation = async () => {
    setGettingLocation(true);
    setLocationError(null);
    
    try {
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;
      setCurrentLocation({ lat: latitude, lng: longitude });
      
      if (hasServiceLocation) {
        const dist = calculateDistance(latitude, longitude, serviceLatitude!, serviceLongitude!);
        setDistance(dist);
      }
    } catch (error: any) {
      console.error('Error getting location:', error);
      if (error.code === 1) {
        setLocationError('Location access denied. Please enable GPS permissions.');
      } else if (error.code === 2) {
        setLocationError('Unable to determine location. Please try again.');
      } else if (error.code === 3) {
        setLocationError('Location request timed out. Please try again.');
      } else {
        setLocationError('Failed to get your location.');
      }
    } finally {
      setGettingLocation(false);
    }
  };

  // Auto-refresh location on mount
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
      await onCheckIn(currentLocation.lat, currentLocation.lng, isValid);
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
      await onCheckOut(currentLocation.lat, currentLocation.lng, isValid);
    } finally {
      setLoading(false);
    }
  };

  // Format distance for display
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  // If not in a state that needs check-in/out, show summary
  if (!canCheckIn && !canCheckOut) {
    if (actualCheckinAt || actualCheckoutAt) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              GPS Verification
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
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not at location
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
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not at location
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
          {canCheckIn ? 'Check-in to Start Job' : 'Check-out to Complete Job'}
        </CardTitle>
        <CardDescription>
          {canCheckIn 
            ? 'Verify your location to start working on this job'
            : 'Verify your location to mark job as completed'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service Location */}
        {serviceAddress && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Service Location</p>
              <p className="text-sm text-muted-foreground">{serviceAddress}</p>
            </div>
          </div>
        )}

        {/* Current Location Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Location</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Refresh'
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
                <span>Location acquired</span>
              </div>
              {hasServiceLocation && distance !== null && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  distance <= MAX_DISTANCE_METERS 
                    ? 'bg-emerald-50 border border-emerald-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <span className="text-sm font-medium">Distance from service location</span>
                  <span className={`text-sm font-bold ${
                    distance <= MAX_DISTANCE_METERS ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {formatDistance(distance)}
                  </span>
                </div>
              )}
              {hasServiceLocation && distance !== null && distance > MAX_DISTANCE_METERS && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You are more than {MAX_DISTANCE_METERS}m from the service location. 
                    Check-in/out will be recorded with GPS violation.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : gettingLocation ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Getting your location...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4" />
              <span>Location not available</span>
            </div>
          )}
        </div>

        {/* Action Button */}
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
                Checking in...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Check-in & Start Job
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
                Checking out...
              </>
            ) : (
              <>
                <Square className="mr-2 h-4 w-4" />
                Check-out & Complete Job
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}