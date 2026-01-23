// ============================================
// ROLE BADGE COMPONENT
// src/components/technician/RoleBadge.tsx
// ============================================

import { TechnicianRole, ROLE_CONFIG } from "@/types/technician-assignment";
import { Badge } from "@/components/ui/badge";
import { Crown, User, UserCheck, Users } from "lucide-react";

interface RoleBadgeProps {
  role: TechnicianRole;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const ROLE_ICONS = {
  lead: Crown,
  senior: UserCheck,
  junior: User,
  helper: Users,
};

export function RoleBadge({
  role,
  size = "md",
  showIcon = true,
  className = "",
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role];
  const Icon = ROLE_ICONS[role];

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
        ${config.bgColor} 
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
