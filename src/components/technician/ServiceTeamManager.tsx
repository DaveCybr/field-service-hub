// ============================================
// SERVICE TEAM MANAGER
// src/components/technician/ServiceTeamManager.tsx
// Integrates all team management features
// ============================================

import { useState } from "react";
import { useServiceTeam } from "@/hooks/useTechnicianAssignment";
import { TeamCard } from "./TeamCard";
import { AssignTechnicianDialog } from "./AssignTechnicianDialog";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ServiceTeamManagerProps {
  invoiceId: string;
  serviceId: string | null;
  serviceName?: string;
  canManage?: boolean; // Permission to add/remove team members
  compact?: boolean;
}

export function ServiceTeamManager({
  invoiceId,
  serviceId,
  serviceName,
  canManage = false,
  compact = false,
}: ServiceTeamManagerProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const { team, loading, error, refetch } = useServiceTeam(
    invoiceId,
    serviceId,
  );

  const serviceTeam = {
    service_id: serviceId,
    service_title: serviceName,
    assignments: team,
    lead: team.find((t) => t.role === "lead"),
    members: team.filter((t) => t.role !== "lead"),
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
          <CardDescription>
            Gagal memuat data tim: {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refetch} variant="outline">
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

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
            onSuccess={refetch}
          />
        )}
      </>
    );
  }

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
          onSuccess={refetch}
        />
      )}
    </>
  );
}
