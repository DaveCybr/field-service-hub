// ============================================
// TECHNICIANS TABLE COLUMNS
// src/components/technicians/columns.tsx
// Column definitions for Technicians DataTable
// ============================================

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowUpDown,
  MoreHorizontal,
  Star,
  Clock,
  UserCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Technician {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  rating: number;
  total_jobs_completed: number;
  avatar_url: string | null;
  skills: string[];
  active_jobs_count: number;
}

export interface TechnicianColumnActions {
  onViewDetails?: (technician: Technician) => void;
  onManageSkills?: (technician: Technician) => void;
  onManageAvailability?: (technician: Technician) => void;
  onViewJobs?: (technician: Technician) => void;
}

const getStatusBadge = (status: string, activeJobs: number) => {
  if (activeJobs > 0) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        <Clock className="h-3 w-3 mr-1" />
        Busy ({activeJobs})
      </Badge>
    );
  }

  const config: Record<string, { label: string; className: string }> = {
    available: {
      label: "Available",
      className: "bg-green-100 text-green-800 hover:bg-green-100",
    },
    on_job: {
      label: "On Job",
      className: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    },
    locked: {
      label: "Locked",
      className: "bg-red-100 text-red-800 hover:bg-red-100",
    },
    off_duty: {
      label: "Off Duty",
      className: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    },
  };

  const { label, className } = config[status] || config.available;
  return <Badge className={className}>{label}</Badge>;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const createTechnicianColumns = (
  actions?: TechnicianColumnActions,
): ColumnDef<Technician>[] => {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Technician
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const tech = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(tech.name)}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                  tech.active_jobs_count === 0 && tech.status === "available"
                    ? "bg-green-500"
                    : "bg-amber-500"
                }`}
              />
            </div>
            <div>
              <p className="font-medium">{tech.name}</p>
              <p className="text-sm text-muted-foreground">{tech.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }) => {
        const tech = row.original;
        return tech.phone ? (
          <span className="text-sm">{tech.phone}</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const tech = row.original;
        return getStatusBadge(tech.status, tech.active_jobs_count);
      },
    },
    {
      accessorKey: "active_jobs_count",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Active Jobs
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const count = row.original.active_jobs_count;
        return (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{count}</span>
            {count > 0 && actions?.onViewJobs && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  actions.onViewJobs(row.original);
                }}
              >
                View
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "rating",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Rating
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const rating = row.original.rating;
        return (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span className="font-medium">{rating.toFixed(1)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "total_jobs_completed",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Jobs Completed
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        return (
          <span className="font-medium">
            {row.original.total_jobs_completed}
          </span>
        );
      },
    },
    {
      accessorKey: "skills",
      header: "Skills",
      cell: ({ row }) => {
        const skills = row.original.skills;
        return (
          <div className="flex flex-wrap gap-1">
            {skills.length > 0 ? (
              <>
                {skills.slice(0, 2).map((skill, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {skills.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{skills.length - 2}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-sm text-muted-foreground italic">
                No skills
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const tech = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onViewDetails) {
                    actions.onViewDetails(tech);
                  }
                }}
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onManageSkills) {
                    actions.onManageSkills(tech);
                  }
                }}
              >
                Manage skills
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (actions?.onManageAvailability) {
                    actions.onManageAvailability(tech);
                  }
                }}
              >
                Manage availability
              </DropdownMenuItem>
              {tech.active_jobs_count > 0 && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (actions?.onViewJobs) {
                      actions.onViewJobs(tech);
                    }
                  }}
                >
                  View active jobs
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};

export const technicianColumns = createTechnicianColumns();
