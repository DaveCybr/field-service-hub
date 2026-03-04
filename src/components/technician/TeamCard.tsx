// ============================================
// FILE: src/components/technician/TeamCard.tsx
// Enterprise-grade team card component
// ============================================

import { ServiceTeam } from "@/types/technician-assignment";
import { TechnicianAvatar } from "./TechnicianAvatar";
import { RoleBadge } from "./RoleBadge";
import { Users, Plus, X, Crown } from "lucide-react";
import { useRemoveAssignment } from "@/hooks/useTechnicianAssignment";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TeamCardProps {
  team: ServiceTeam;
  onAddMember?: () => void;
  canManage?: boolean;
  compact?: boolean;
}

function RemoveButton({
  assignmentId,
  name,
  removing,
  onRemove,
}: {
  assignmentId: string;
  name: string;
  removing: boolean;
  onRemove: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          disabled={removing}
          className="h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent
        style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base font-bold text-slate-900">
            Hapus dari Tim?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500">
            <strong className="text-slate-700">{name}</strong> akan dihapus dari
            tim service ini.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-sm font-semibold">
            Batal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onRemove}
            className="bg-red-600 hover:bg-red-700 text-sm font-semibold"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function TeamCard({
  team,
  onAddMember,
  canManage = false,
  compact = false,
}: TeamCardProps) {
  const { removeAssignment, loading: removing } = useRemoveAssignment();

  const handleRemove = async (assignmentId: string, technicianName: string) => {
    const result = await removeAssignment(assignmentId);
    if (result.success) toast.success(`${technicianName} dihapus dari tim`);
  };

  const totalMembers = (team.lead ? 1 : 0) + team.members.length;

  // ── Compact Mode ──────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {team.lead && (
          <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2 border border-violet-200">
            <TechnicianAvatar technician={team.lead.technician} size="sm" />
            <Crown className="h-3 w-3 text-violet-500" />
          </div>
        )}
        {team.members.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200"
          >
            <TechnicianAvatar technician={a.technician} size="sm" />
          </div>
        ))}
        {canManage && onAddMember && (
          <button
            onClick={onAddMember}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border-2 border-dashed border-slate-300 text-xs font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        )}
      </div>
    );
  }

  // ── Full Mode ─────────────────────────────────────────────────────────────
  return (
    <div
      className="bg-white rounded-xl border border-slate-200 overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-bold text-slate-900">
            {team.service_title ? `Tim · ${team.service_title}` : "Tim Teknisi"}
          </span>
          {totalMembers > 0 && (
            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
              {totalMembers}
            </span>
          )}
        </div>
        {canManage && onAddMember && (
          <button
            onClick={onAddMember}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Teknisi
          </button>
        )}
      </div>

      <div className="p-4 space-y-2">
        {/* Lead */}
        {team.lead && (
          <div className="group flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-200 hover:bg-violet-100/80 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative">
                <TechnicianAvatar technician={team.lead.technician} size="md" />
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-violet-600 flex items-center justify-center border-2 border-white">
                  <Crown className="h-2 w-2 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {team.lead.technician.name}
                </p>
                <p className="text-xs text-slate-500">
                  {team.lead.technician.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RoleBadge role="lead" size="sm" />
              {canManage && (
                <RemoveButton
                  assignmentId={team.lead.id}
                  name={team.lead.technician.name}
                  removing={removing}
                  onRemove={() =>
                    handleRemove(team.lead!.id, team.lead!.technician.name)
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Members */}
        {team.members.length > 0 && (
          <>
            {team.lead && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pt-1">
                Anggota
              </p>
            )}
            {team.members.map((a) => (
              <div
                key={a.id}
                className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TechnicianAvatar technician={a.technician} size="md" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {a.technician.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.technician.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <RoleBadge role={a.role} size="sm" />
                  {canManage && (
                    <RemoveButton
                      assignmentId={a.id}
                      name={a.technician.name}
                      removing={removing}
                      onRemove={() => handleRemove(a.id, a.technician.name)}
                    />
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {!team.lead && team.members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500">
                Belum ada teknisi
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Tambahkan teknisi ke tim service ini
              </p>
            </div>
            {canManage && onAddMember && (
              <button
                onClick={onAddMember}
                className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Teknisi Pertama
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
