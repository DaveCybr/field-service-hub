// ============================================
// TECHNICIAN AVATAR COMPONENT
// src/components/technician/TechnicianAvatar.tsx
// ============================================

import { TechnicianInfo } from "@/types/technician-assignment";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";

interface TechnicianAvatarProps {
  technician: TechnicianInfo;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  showEmail?: boolean;
  className?: string;
}

export function TechnicianAvatar({
  technician,
  size = "md",
  showName = false,
  showEmail = false,
  className = "",
}: TechnicianAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage
          src={technician.avatar_url || undefined}
          alt={technician.name}
        />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
          {getInitials(technician.name)}
        </AvatarFallback>
      </Avatar>

      {(showName || showEmail) && (
        <div className="flex flex-col min-w-0">
          {showName && (
            <span className="font-medium text-sm truncate">
              {technician.name}
            </span>
          )}
          {showEmail && (
            <span className="text-xs text-muted-foreground truncate">
              {technician.email}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return content;
}
