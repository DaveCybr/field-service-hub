// ============================================
// FILE: src/components/technician/TechnicianAvatar.tsx
// Enhanced avatar with gradient fallback
// ============================================

import { TechnicianInfo } from "@/types/technician-assignment";
import { cn } from "@/lib/utils";

interface TechnicianAvatarProps {
  technician: TechnicianInfo;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  showEmail?: boolean;
  className?: string;
}

const AVATAR_COLORS: [string, string][] = [
  ["#dbeafe", "#1d4ed8"],
  ["#ede9fe", "#6d28d9"],
  ["#dcfce7", "#15803d"],
  ["#fef9c3", "#a16207"],
  ["#fee2e2", "#b91c1c"],
  ["#e0f2fe", "#0369a1"],
  ["#fce7f3", "#be185d"],
  ["#f0fdf4", "#166534"],
];

function getAvatarColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const SIZE_CLASSES = {
  sm: { container: "h-7 w-7", text: "text-[10px]" },
  md: { container: "h-9 w-9", text: "text-xs" },
  lg: { container: "h-11 w-11", text: "text-sm" },
  xl: { container: "h-14 w-14", text: "text-base" },
};

export function TechnicianAvatar({
  technician,
  size = "md",
  showName = false,
  showEmail = false,
  className = "",
}: TechnicianAvatarProps) {
  const [bg, fg] = getAvatarColors(technician.name);
  const { container, text } = SIZE_CLASSES[size];
  const initials = getInitials(technician.name);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {technician.avatar_url ? (
        <img
          src={technician.avatar_url}
          alt={technician.name}
          className={cn("rounded-full object-cover flex-shrink-0", container)}
        />
      ) : (
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold flex-shrink-0",
            container,
            text,
          )}
          style={{ background: bg, color: fg }}
        >
          {initials}
        </div>
      )}

      {(showName || showEmail) && (
        <div className="flex flex-col min-w-0">
          {showName && (
            <span className="text-sm font-semibold text-slate-900 truncate leading-tight">
              {technician.name}
            </span>
          )}
          {showEmail && (
            <span className="text-xs text-slate-500 truncate leading-tight">
              {technician.email}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
