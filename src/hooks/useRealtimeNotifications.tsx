import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface Notification {
  id: string;
  type:
    | "job_assigned"
    | "job_status_changed"
    | "low_stock"
    | "new_job"
    | "job_auto_assigned"
    | string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { employee } = useAuth();

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      const newNotification: Notification = {
        ...notification,
        id: crypto.randomUUID(),
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount((prev) => prev + 1);

      // Show toast for the notification
      toast({
        title: notification.title,
        description: notification.message,
      });
    },
    [toast],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    // Subscribe to service_jobs changes
    const jobsChannel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_jobs",
        },
        (payload) => {
          const job = payload.new as any;
          addNotification({
            type: "new_job",
            title: "New Job Created",
            message: `Job #${job.job_number}: ${job.title}`,
            data: { jobId: job.id, jobNumber: job.job_number },
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_jobs",
        },
        (payload) => {
          const oldJob = payload.old as any;
          const newJob = payload.new as any;

          // Check for status change
          if (oldJob.status !== newJob.status) {
            const statusLabels: Record<string, string> = {
              pending_assignment: "Pending Assignment",
              assigned: "Assigned",
              en_route: "En Route",
              checked_in: "Checked In",
              in_progress: "In Progress",
              completed: "Completed",
              cancelled: "Cancelled",
            };

            addNotification({
              type: "job_status_changed",
              title: "Job Status Updated",
              message: `Job #${newJob.job_number} is now ${statusLabels[newJob.status] || newJob.status}`,
              data: {
                jobId: newJob.id,
                jobNumber: newJob.job_number,
                status: newJob.status,
              },
            });
          }

          // Check for technician assignment
          if (!oldJob.assigned_technician_id && newJob.assigned_technician_id) {
            // Only notify if this technician is assigned
            if (employee?.id === newJob.assigned_technician_id) {
              addNotification({
                type: "job_assigned",
                title: "New Job Assigned to You",
                message: `You have been assigned to Job #${newJob.job_number}: ${newJob.title}`,
                data: { jobId: newJob.id, jobNumber: newJob.job_number },
              });
            }
          }
        },
      )
      .subscribe();

    // Subscribe to stock_alerts changes
    const alertsChannel = supabase
      .channel("stock-alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "stock_alerts",
        },
        async (payload) => {
          const alert = payload.new as any;

          // Fetch product name
          const { data: product } = await supabase
            .from("products")
            .select("name")
            .eq("id", alert.product_id)
            .single();

          addNotification({
            type: "low_stock",
            title: "Low Stock Alert",
            message: `${product?.name || "Product"} is low on stock (${alert.current_stock} remaining)`,
            data: {
              productId: alert.product_id,
              currentStock: alert.current_stock,
            },
          });
        },
      )
      .subscribe();

    // Subscribe to products for stock changes (as a backup for stock alerts)
    const productsChannel = supabase
      .channel("products-stock-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
        },
        (payload) => {
          const oldProduct = payload.old as any;
          const newProduct = payload.new as any;

          // Check if stock dropped below threshold
          if (
            oldProduct.stock > newProduct.min_stock_threshold &&
            newProduct.stock <= newProduct.min_stock_threshold
          ) {
            addNotification({
              type: "low_stock",
              title: "Low Stock Warning",
              message: `${newProduct.name} stock is now ${newProduct.stock} (threshold: ${newProduct.min_stock_threshold})`,
              data: {
                productId: newProduct.id,
                currentStock: newProduct.stock,
              },
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(productsChannel);
    };
  }, [addNotification, employee?.id]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
