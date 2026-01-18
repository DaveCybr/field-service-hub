import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LogOut, Loader2 } from "lucide-react";

interface CheckOutButtonProps {
  serviceId: string;
  onSuccess: () => void;
}

export function CheckOutButton({ serviceId, onSuccess }: CheckOutButtonProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [notes, setNotes] = useState("");

  const calculateDuration = (checkinTime: string): number => {
    const checkin = new Date(checkinTime);
    const checkout = new Date();
    const diffMs = checkout.getTime() - checkin.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins;
  };

  const handleCheckOut = async () => {
    try {
      setLoading(true);

      // Get check-in time first
      const { data: service, error: fetchError } = await supabase
        .from("invoice_services")
        .select("actual_checkin_at")
        .eq("id", serviceId)
        .single();

      if (fetchError) throw fetchError;

      if (!service.actual_checkin_at) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No check-in time found",
        });
        return;
      }

      // Calculate duration
      const duration = calculateDuration(service.actual_checkin_at);

      // Get current GPS location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          // Update service
          const { error } = await supabase
            .from("invoice_services")
            .update({
              actual_checkout_at: new Date().toISOString(),
              actual_duration_minutes: duration,
              checkout_gps_valid: true,
              status: "completed",
              technician_notes: notes || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", serviceId);

          if (error) throw error;

          toast({
            title: "Checked Out",
            description: `Service completed in ${duration} minutes`,
          });

          setShowDialog(false);
          onSuccess();
        },
        async () => {
          // If GPS fails, still allow checkout but mark as invalid
          const { error } = await supabase
            .from("invoice_services")
            .update({
              actual_checkout_at: new Date().toISOString(),
              actual_duration_minutes: duration,
              checkout_gps_valid: false,
              gps_violation_detected: true,
              status: "completed",
              technician_notes: notes || null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", serviceId);

          if (error) throw error;

          toast({
            title: "Checked Out (No GPS)",
            description: "GPS was unavailable. Admin will be notified.",
            variant: "destructive",
          });

          setShowDialog(false);
          onSuccess();
        }
      );
    } catch (error: any) {
      console.error("Check-out error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check out. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={loading}
        size="lg"
        variant="default"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Check Out
      </Button>

      {/* Check-out Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Service</DialogTitle>
            <DialogDescription>
              Add any final notes about the service before checking out.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Technician Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any issues, observations, or recommendations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Before checking out:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Ensure all tasks are completed</li>
                <li>Upload after photos</li>
                <li>All parts used are recorded</li>
                <li>Customer is satisfied with the service</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleCheckOut} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Out...
                </>
              ) : (
                "Complete & Check Out"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
