import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";

interface CheckInButtonProps {
  serviceId: string;
  serviceAddress: {
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
  onSuccess: () => void;
}

export function CheckInButton({
  serviceId,
  serviceAddress,
  onSuccess,
}: CheckInButtonProps) {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const validateGPS = (
    currentLat: number,
    currentLng: number
  ): { valid: boolean; distance: number } => {
    if (!serviceAddress.latitude || !serviceAddress.longitude) {
      return { valid: true, distance: 0 }; // No validation if service location not set
    }

    // Haversine formula to calculate distance
    const R = 6371e3; // Earth radius in meters
    const φ1 = (currentLat * Math.PI) / 180;
    const φ2 = (serviceAddress.latitude * Math.PI) / 180;
    const Δφ = ((serviceAddress.latitude - currentLat) * Math.PI) / 180;
    const Δλ = ((serviceAddress.longitude - currentLng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in meters

    const maxDistance = 500; // 500 meters radius
    return { valid: distance <= maxDistance, distance: Math.round(distance) };
  };

  const handleCheckIn = async () => {
    try {
      setLoading(true);
      setGpsError(null);

      // Get current location
      if (!navigator.geolocation) {
        toast({
          variant: "destructive",
          title: "GPS Not Available",
          description: "Your device doesn't support GPS",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;

          // Validate GPS
          const gpsCheck = validateGPS(currentLat, currentLng);

          if (!gpsCheck.valid) {
            setGpsError(
              `You are ${gpsCheck.distance}m away from service location. Maximum allowed: 500m`
            );
            setShowDialog(true);
            setLoading(false);
            return;
          }

          // Perform check-in
          const { error } = await supabase
            .from("invoice_services")
            .update({
              actual_checkin_at: new Date().toISOString(),
              checkin_gps_valid: gpsCheck.valid,
              status: "in_progress",
              updated_at: new Date().toISOString(),
            })
            .eq("id", serviceId);

          if (error) throw error;

          toast({
            title: "Checked In",
            description: "You have successfully checked in to this service",
          });

          onSuccess();
        },
        (error) => {
          console.error("GPS Error:", error);
          toast({
            variant: "destructive",
            title: "GPS Error",
            description:
              "Unable to get your location. Please enable GPS and try again.",
          });
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check in. Please try again.",
      });
      setLoading(false);
    }
  };

  const handleForceCheckIn = async () => {
    try {
      setLoading(true);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { error } = await supabase
            .from("invoice_services")
            .update({
              actual_checkin_at: new Date().toISOString(),
              checkin_gps_valid: false,
              gps_violation_detected: true,
              status: "in_progress",
              updated_at: new Date().toISOString(),
            })
            .eq("id", serviceId);

          if (error) throw error;

          toast({
            title: "Checked In (GPS Override)",
            description: "Admin will be notified of GPS violation",
            variant: "destructive",
          });

          setShowDialog(false);
          onSuccess();
        },
        () => {
          toast({
            variant: "destructive",
            title: "GPS Required",
            description: "GPS is required for check-in",
          });
          setLoading(false);
        }
      );
    } catch (error: any) {
      console.error("Force check-in error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check in",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handleCheckIn} disabled={loading} size="lg">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting Location...
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-4 w-4" />
            Check In
          </>
        )}
      </Button>

      {/* GPS Warning Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              GPS Location Mismatch
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{gpsError}</p>
              <p className="font-medium">Service Location:</p>
              <p className="text-sm">{serviceAddress.address}</p>
              <p className="text-destructive font-medium mt-4">
                Checking in from wrong location will be reported to admin.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForceCheckIn}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking In...
                </>
              ) : (
                "Check In Anyway"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
