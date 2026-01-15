import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SetupCheckResponse = { needsSetup?: boolean };

const CACHE_KEY = "initial_setup_needs_setup";

export function useInitialSetup() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached === null ? null : cached === "true";
  });
  const [loading, setLoading] = useState(() => needsSetup === null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const checkSetup = async () => {
      // Always stop spinner after a short grace period to avoid “loading forever” UX.
      const hardStop = window.setTimeout(() => {
        if (mountedRef.current) setLoading(false);
      }, 4000);

      try {
        const { data, error } = await supabase.functions.invoke<SetupCheckResponse>(
          "initial-setup",
          { body: { action: "check" } }
        );

        if (error) throw error;

        const value = data?.needsSetup ?? false;
        sessionStorage.setItem(CACHE_KEY, String(value));

        if (mountedRef.current) {
          setNeedsSetup(value);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking setup:", err);
        // Fail-open to prevent blocking the app.
        if (mountedRef.current) {
          setNeedsSetup(false);
          setLoading(false);
        }
      } finally {
        window.clearTimeout(hardStop);
      }
    };

    checkSetup();
  }, []);

  return { needsSetup, loading };
}

