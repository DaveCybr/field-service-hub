import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ServiceItem } from "@/types/invoice";

export function useInvoiceServices() {
  const { toast } = useToast();
  const [services, setServices] = useState<ServiceItem[]>([]);

  const addService = useCallback(
    (service: Omit<ServiceItem, "id">) => {
      if (!service.title?.trim()) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Service title is required",
        });
        return;
      }

      const newService: ServiceItem = {
        ...service,
        id: Date.now().toString(),
      };

      setServices((prev) => [...prev, newService]);

      toast({
        title: "Service Added",
        description: `"${newService.title}" added to invoice`,
      });
    },
    [toast]
  );

  const removeService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateService = useCallback(
    (id: string, updates: Partial<ServiceItem>) => {
      setServices((prev) =>
        prev.map((service) =>
          service.id === id ? { ...service, ...updates } : service
        )
      );
    },
    []
  );

  const calculateTotal = useCallback(() => {
    return services.reduce(
      (sum, service) => sum + (service.service_cost || 0),
      0
    );
  }, [services]);

  const clearServices = useCallback(() => {
    setServices([]);
  }, []);

  return {
    services,
    addService,
    removeService,
    updateService,
    calculateTotal,
    clearServices,
  };
}
