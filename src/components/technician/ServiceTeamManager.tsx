// ============================================
// FILE: src/components/technician/ServiceTeamManager.tsx
// Enterprise-grade team management component
// ============================================

import { useState } from "react";
import { useServiceTeam } from "@/hooks/useTechnicianAssignment";
import { TeamCard } from "./TeamCard";
import { AssignTechnicianDialog } from "./AssignTechnicianDialog";
import { Plus, Users, AlertCircle, RefreshCw } from "lucide-react";

interface ServiceTeamManagerProps {
  invoiceId: string;
  serviceId: string | null;
  serviceName?: string;
  canManage?: boolean;
  compact?: boolean;
  onTeamUpdated?: () => void;
}

// ── Shimmer Skeleton ──────────────────────────────────────────────────────────
function TeamSkeleton() {
  return (
    <div>
      <style>{`
        .tm-shimmer { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation: tmShimmer 1.4s infinite; }
        @keyframes tmShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100"
          >
            <div className="tm-shimmer h-9 w-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="tm-shimmer h-3 w-32 rounded" />
              <div className="tm-shimmer h-2.5 w-24 rounded" />
            </div>
            <div className="tm-shimmer h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ServiceTeamManager({
  invoiceId,
  serviceId,
  serviceName,
  canManage = true,
  compact = false,
  onTeamUpdated,
}: ServiceTeamManagerProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { team, loading, error, refetch } = useServiceTeam(
    invoiceId,
    serviceId,
  );

  const handleTeamUpdate = async () => {
    await refetch();
    onTeamUpdated?.();
  };

  const serviceTeam = {
    service_id: serviceId,
    service_title: serviceName,
    assignments: team,
    lead: team.find((t) => t.role === "lead"),
    members: team.filter((t) => t.role !== "lead"),
  };

  // ── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 rounded bg-slate-200" />
          <div className="h-4 w-28 rounded bg-slate-200" />
        </div>
        <TeamSkeleton />
      </div>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-700">Gagal Memuat Tim</p>
            <p className="text-xs text-red-500 mt-0.5">{error.message}</p>
          </div>
          <button
            onClick={handleTeamUpdate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Compact Mode ─────────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <TeamCard
          team={serviceTeam}
          onAddMember={canManage ? () => setAssignDialogOpen(true) : undefined}
          canManage={canManage}
          compact={true}
        />
        {canManage && (
          <AssignTechnicianDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            invoiceId={invoiceId}
            serviceId={serviceId}
            serviceName={serviceName}
            onSuccess={handleTeamUpdate}
          />
        )}
      </>
    );
  }

  // ── Full Mode ────────────────────────────────────────────────────────────
  return (
    <>
      <TeamCard
        team={serviceTeam}
        onAddMember={canManage ? () => setAssignDialogOpen(true) : undefined}
        canManage={canManage}
        compact={false}
      />
      {canManage && (
        <AssignTechnicianDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          invoiceId={invoiceId}
          serviceId={serviceId}
          serviceName={serviceName}
          onSuccess={handleTeamUpdate}
        />
      )}
    </>
  );
}
