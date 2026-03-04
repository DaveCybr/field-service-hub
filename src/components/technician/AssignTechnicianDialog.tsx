// ============================================
// FILE: src/components/technician/AssignTechnicianDialog.tsx
// Enterprise-grade assign dialog
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
import { AlertCircle, Loader2, Crown, Users, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignTechnicianDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  serviceId: string | null;
  serviceName?: string;
  onSuccess?: () => void;
}

const ROLE_OPTIONS = [
  {
    value: "lead",
    label: "Kepala Teknisi",
    icon: Crown,
    desc: "Penanggung jawab utama tim",
  },
  {
    value: "senior",
    label: "Senior",
    icon: UserCheck,
    desc: "Teknisi berpengalaman",
  },
  { value: "junior", label: "Junior", icon: Users, desc: "Teknisi reguler" },
  { value: "helper", label: "Helper", icon: Users, desc: "Asisten teknis" },
];

export function AssignTechnicianDialog({
  open,
  onOpenChange,
  invoiceId,
  serviceId,
  serviceName,
  onSuccess,
}: AssignTechnicianDialogProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
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
  const leadAlreadyExists = hasLead && selectedRole === "lead";

  const handleTechnicianSelect = (techId: string) => {
    setSelectedTechnicianId(techId);
    const tech = technicians.find((t) => t.id === techId);
    if (tech?.technician_level) {
      const suggested = suggestRoleFromLevel(tech.technician_level);
      if (suggested) {
        if (suggested === "lead" && !hasLead) setSelectedRole("lead");
        else if (suggested !== "lead") setSelectedRole(suggested);
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
      setSelectedTechnicianId("");
      setSelectedRole("junior");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px]"
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Tugaskan Teknisi
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {serviceName ? (
              <>
                <span className="font-semibold text-slate-700">
                  {serviceName}
                </span>
              </>
            ) : (
              "Pilih teknisi dan tentukan role dalam tim."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Technician Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Pilih Teknisi
            </Label>

            {loadingTechnicians ? (
              <div className="flex items-center justify-center py-8 gap-2 border border-slate-200 rounded-xl">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-sm text-slate-400">
                  Memuat teknisi...
                </span>
              </div>
            ) : technicians.length === 0 ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Semua teknisi sudah ditugaskan untuk service ini.
                </p>
              </div>
            ) : (
              <Select
                value={selectedTechnicianId}
                onValueChange={handleTechnicianSelect}
              >
                <SelectTrigger className="rounded-xl border-slate-200 h-11 text-sm">
                  <SelectValue placeholder="Cari dan pilih teknisi..." />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold">{tech.name}</span>
                        {tech.technician_level && (
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {tech.technician_level}
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
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <TechnicianAvatar technician={selectedTechnician} size="md" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedTechnician.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedTechnician.email}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Role Picker */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Role dalam Tim
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(({ value, label, icon: Icon, desc }) => {
                const isDisabled = value === "lead" && hasLead;
                const isSelected = selectedRole === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={!selectedTechnicianId || isDisabled}
                    onClick={() => setSelectedRole(value as TechnicianRole)}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : isDisabled
                          ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className={cn(
                          "h-3.5 w-3.5",
                          isSelected ? "text-white" : "text-slate-400",
                        )}
                      />
                      <span
                        className={cn(
                          "text-xs font-bold",
                          isSelected ? "text-white" : "text-slate-800",
                        )}
                      >
                        {label}
                      </span>
                      {isDisabled && (
                        <span className="text-[10px] text-red-500 font-semibold">
                          (Penuh)
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-[11px]",
                        isSelected ? "text-slate-300" : "text-slate-400",
                      )}
                    >
                      {desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {leadAlreadyExists && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">
                  Sudah ada Kepala Teknisi. Pilih role lain atau hapus lead yang
                  ada terlebih dahulu.
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Catatan{" "}
              <span className="text-slate-400 font-normal normal-case">
                (Opsional)
              </span>
            </Label>
            <Textarea
              placeholder="Tambahkan instruksi atau catatan khusus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              disabled={!selectedTechnicianId}
              className="rounded-xl border-slate-200 text-sm resize-none"
            />
          </div>

          {/* Current Team */}
          {team.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                Tim Saat Ini
              </Label>
              <div className="flex flex-wrap gap-2">
                {team.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2"
                  >
                    <TechnicianAvatar technician={a.technician} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {a.technician.name}
                      </p>
                      <RoleBadge role={a.role} size="sm" showIcon={false} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={assigning}
            className="flex-1 h-10 px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              !selectedTechnicianId ||
              !selectedRole ||
              leadAlreadyExists ||
              assigning ||
              technicians.length === 0
            }
            className="flex-1 h-10 px-4 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {assigning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {assigning ? "Menugaskan..." : "Tugaskan"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
