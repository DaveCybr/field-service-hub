// ============================================
// TEAM CARD COMPONENT
// src/components/technician/TeamCard.tsx
// ============================================

import { ServiceTeam } from "@/types/technician-assignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TechnicianAvatar } from "./TechnicianAvatar";
import { RoleBadge } from "./RoleBadge";
import { Users, Plus, X } from "lucide-react";
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

interface TeamCardProps {
  team: ServiceTeam;
  onAddMember?: () => void;
  canManage?: boolean; // Can add/remove members
  compact?: boolean;
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
    if (result.success) {
      toast.success(`${technicianName} dihapus dari tim`);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {team.lead && (
          <div className="flex items-center gap-2 bg-purple-50 rounded-lg p-2 border border-purple-200">
            <TechnicianAvatar technician={team.lead.technician} size="sm" />
            <RoleBadge role="lead" size="sm" />
          </div>
        )}

        {team.members.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border"
          >
            <TechnicianAvatar technician={assignment.technician} size="sm" />
            <RoleBadge role={assignment.role} size="sm" showIcon={false} />
          </div>
        ))}

        {canManage && onAddMember && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddMember}
            className="h-9"
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {team.service_title ? (
              <span>Tim - {team.service_title}</span>
            ) : (
              <span>Tim Teknisi</span>
            )}
          </CardTitle>

          {canManage && onAddMember && (
            <Button variant="outline" size="sm" onClick={onAddMember}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Teknisi
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Lead Technician */}
          {team.lead && (
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <TechnicianAvatar
                  technician={team.lead.technician}
                  size="md"
                  showName
                  showEmail
                />
                <RoleBadge role="lead" size="md" />
              </div>

              {canManage && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={removing}>
                      <X className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Kepala Teknisi?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menghapus{" "}
                        {team.lead.technician.name} dari tim? Tim akan
                        kehilangan kepala teknisi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          handleRemove(
                            team.lead!.id,
                            team.lead!.technician.name,
                          )
                        }
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}

          {/* Team Members */}
          {team.members.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Anggota Tim
              </h4>
              {team.members.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <TechnicianAvatar
                      technician={assignment.technician}
                      size="md"
                      showName
                      showEmail
                    />
                    <RoleBadge role={assignment.role} size="md" />
                  </div>

                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={removing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Teknisi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus{" "}
                            {assignment.technician.name} dari tim?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              handleRemove(
                                assignment.id,
                                assignment.technician.name,
                              )
                            }
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !team.lead && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ada teknisi ditugaskan</p>
                {canManage && onAddMember && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAddMember}
                    className="mt-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Tambah Teknisi Pertama
                  </Button>
                )}
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}
