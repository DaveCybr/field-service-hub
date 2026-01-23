// ============================================
// ASSIGN TECHNICIAN DIALOG
// src/components/technician/AssignTechnicianDialog.tsx
// ============================================

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TechnicianRole,
  TechnicianInfo,
  suggestRoleFromLevel,
  ROLE_CONFIG,
} from "@/types/technician-assignment";
import {
  useAssignTechnician,
  useAvailableTechnicians,
  useServiceTeam,
} from "@/hooks/useTechnicianAssignment";
import { TechnicianAvatar } from "./TechnicianAvatar";
import { RoleBadge } from "./RoleBadge";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AssignTechnicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  serviceId: string | null;
  serviceName?: string;
  onSuccess?: () => void;
}

export function AssignTechnicianDialog({
  open,
  onOpenChange,
  invoiceId,
  serviceId,
  serviceName,
  onSuccess,
}: AssignTechnicianDialogProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<TechnicianRole>("junior");
  const [notes, setNotes] = useState("");

  const { technicians, loading: loadingTechnicians } = useAvailableTechnicians(
    invoiceId,
    serviceId,
  );
  const { team } = useServiceTeam(invoiceId, serviceId);
  const { assignTechnician, loading: assigning } = useAssignTechnician();

  const selectedTechnician = technicians.find(
    (t) => t.id === selectedTechnicianId,
  );
  const hasLead = team.some((t) => t.role === "lead");

  // Auto-suggest role based on technician level
  const handleTechnicianSelect = (techId: string) => {
    setSelectedTechnicianId(techId);
    const tech = technicians.find((t) => t.id === techId);
    if (tech?.technician_level) {
      const suggested = suggestRoleFromLevel(tech.technician_level);
      if (suggested) {
        // Only suggest if role is available
        if (suggested === "lead" && !hasLead) {
          setSelectedRole("lead");
        } else if (suggested !== "lead") {
          setSelectedRole(suggested);
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedTechnicianId || !selectedRole) return;

    const result = await assignTechnician({
      invoice_id: invoiceId,
      service_id: serviceId,
      technician_id: selectedTechnicianId,
      role: selectedRole,
      notes: notes || undefined,
    });

    if (result.success) {
      // Reset form
      setSelectedTechnicianId("");
      setSelectedRole("junior");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const canAssignAsLead = !hasLead && selectedRole === "lead";
  const leadAlreadyExists = hasLead && selectedRole === "lead";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tugaskan Teknisi</DialogTitle>
          <DialogDescription>
            {serviceName ? (
              <>
                Tugaskan teknisi untuk: <strong>{serviceName}</strong>
              </>
            ) : (
              <>Tugaskan teknisi untuk invoice ini</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Technician Selection */}
          <div className="space-y-2">
            <Label htmlFor="technician">Pilih Teknisi *</Label>
            {loadingTechnicians ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : technicians.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Semua teknisi sudah ditugaskan untuk servis ini.
                </AlertDescription>
              </Alert>
            ) : (
              <Select
                value={selectedTechnicianId}
                onValueChange={handleTechnicianSelect}
              >
                <SelectTrigger id="technician">
                  <SelectValue placeholder="Pilih teknisi..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2">
                        <span>{tech.name}</span>
                        {tech.technician_level && (
                          <span className="text-xs text-muted-foreground">
                            ({tech.technician_level})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Selected Technician Preview */}
            {selectedTechnician && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <TechnicianAvatar
                  technician={selectedTechnician}
                  size="md"
                  showName
                  showEmail
                />
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) =>
                setSelectedRole(value as TechnicianRole)
              }
              disabled={!selectedTechnicianId}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead" disabled={hasLead}>
                  <div className="flex items-center gap-2">
                    <span>Kepala Teknisi</span>
                    {hasLead && (
                      <span className="text-xs text-red-600">(Sudah ada)</span>
                    )}
                  </div>
                </SelectItem>
                <SelectItem value="senior">Teknisi Senior</SelectItem>
                <SelectItem value="junior">Teknisi Junior</SelectItem>
                <SelectItem value="helper">Helper</SelectItem>
              </SelectContent>
            </Select>

            {/* Role Preview */}
            {selectedRole && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-muted-foreground">Role:</span>
                <RoleBadge role={selectedRole} size="sm" />
              </div>
            )}

            {/* Lead Warning */}
            {leadAlreadyExists && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Sudah ada Kepala Teknisi untuk servis ini. Pilih role lain
                  atau hapus lead yang ada terlebih dahulu.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Textarea
              id="notes"
              placeholder="Tambahkan catatan khusus untuk penugasan ini..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={!selectedTechnicianId}
            />
          </div>

          {/* Current Team Info */}
          {team.length > 0 && (
            <div className="space-y-2">
              <Label>Tim Saat Ini</Label>
              <div className="flex flex-wrap gap-2">
                {team.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-2 bg-muted rounded-lg p-2"
                  >
                    <TechnicianAvatar
                      technician={assignment.technician}
                      size="sm"
                    />
                    <RoleBadge
                      role={assignment.role}
                      size="sm"
                      showIcon={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assigning}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedTechnicianId ||
              !selectedRole ||
              leadAlreadyExists ||
              assigning ||
              technicians.length === 0
            }
          >
            {assigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Tugaskan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
