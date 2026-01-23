// ============================================
// STATUS BADGE COMPONENT
// src/components/technician/StatusBadge.tsx
// ============================================

import { AssignmentStatus, STATUS_CONFIG } from "@/types/technician-assignment";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: AssignmentStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const STATUS_ICONS = {
  assigned: Clock,
  accepted: CheckCircle2,
  rejected: XCircle,
  completed: CheckCircle2,
};

export function StatusBadge({
  status,
  size = "md",
  showIcon = true,
  className = "",
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge
      className={`
        ${config.color}
        ${sizeClasses[size]}
        font-medium
        inline-flex items-center gap-1.5
        ${className}
      `}
      variant="secondary"
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{config.label}</span>
    </Badge>
  );
}
