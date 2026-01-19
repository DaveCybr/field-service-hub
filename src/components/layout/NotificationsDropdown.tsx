import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Wrench,
  Package,
  Check,
  Trash2,
  AlertTriangle,
  UserPlus,
  Clock,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useRealtimeNotifications";
import { formatDistanceToNow } from "date-fns";
import { QuickAssignModal } from "./QuickAssignModal";

interface NotificationsDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}

export default function NotificationsDropdown({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
}: NotificationsDropdownProps) {
  const navigate = useNavigate();
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "job_assigned":
      case "job_auto_assigned":
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "job_status_changed":
        return <Wrench className="h-4 w-4 text-primary" />;
      case "low_stock":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "new_job":
        return <Wrench className="h-4 w-4 text-emerald-500" />;
      case "job_pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "technician_available":
        return <UserCheck className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "job_pending":
        return "bg-yellow-50 border-yellow-200";
      case "technician_available":
        return "bg-green-50 border-green-200";
      case "job_auto_assigned":
        return "bg-blue-50 border-blue-200";
      case "low_stock":
        return "bg-amber-50 border-amber-200";
      default:
        return "";
    }
  };

  const handleNotificationClick = (
    notification: Notification,
    e?: React.MouseEvent,
  ) => {
    // Prevent default if clicking on action buttons
    if (e && (e.target as HTMLElement).closest("button[data-action]")) {
      return;
    }

    onMarkAsRead(notification.id);

    // Navigate based on notification type
    if (notification.type === "technician_available") {
      // Open quick assign modal instead of navigating
      setSelectedNotification(notification);
      setAssignModalOpen(true);
    } else if (notification.type === "job_pending") {
      // Go to jobs page with pending filter
      navigate("/jobs?status=pending");
    } else if (notification.data?.jobId) {
      navigate(`/jobs/${notification.data.jobId}`);
    } else if (notification.data?.job_id) {
      navigate(`/jobs/${notification.data.job_id}`);
    } else if (notification.data?.productId) {
      navigate("/inventory");
    }
  };

  const handleQuickAssign = (
    notification: Notification,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    onMarkAsRead(notification.id);
    setSelectedNotification(notification);
    setAssignModalOpen(true);
  };

  const handleViewJobs = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate("/jobs?status=pending");
  };

  const renderNotificationActions = (notification: Notification) => {
    if (notification.type === "technician_available") {
      return (
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={(e) => handleQuickAssign(notification, e)}
            data-action="assign"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Assign Now
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleViewJobs}
            data-action="view"
          >
            View Jobs
          </Button>
        </div>
      );
    }

    if (notification.type === "job_pending") {
      return (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs mt-2"
          onClick={handleViewJobs}
          data-action="view"
        >
          <Clock className="h-3 w-3 mr-1" />
          View Pending Jobs
        </Button>
      );
    }

    return null;
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="h-8 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
                <p className="text-xs text-muted-foreground/70">
                  You'll see job updates and alerts here
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={(e) => handleNotificationClick(notification, e)}
                    className={cn(
                      "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                      !notification.read && "bg-primary/5",
                      getNotificationColor(notification.type),
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5">{getIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm",
                              !notification.read && "font-medium",
                            )}
                          >
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                          })}
                        </p>
                        {renderNotificationActions(notification)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="w-full h-8 text-xs text-muted-foreground"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all notifications
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Quick Assign Modal */}
      <QuickAssignModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        notification={selectedNotification}
      />
    </>
  );
}
