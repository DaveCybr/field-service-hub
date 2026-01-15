import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SetupCheckResponse = { needsSetup?: boolean };

const CACHE_KEY = "initial_setup_needs_setup";

function getCachedValue(): boolean | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached === "true") return true;
    if (cached === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function useInitialSetup() {
  const cachedValue = getCachedValue();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(cachedValue);
  const [loading, setLoading] = useState(cachedValue === null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Skip if we already have a cached value
    if (cachedValue !== null) {
      return;
    }

    const checkSetup = async () => {
      // Hard stop after 4s to prevent infinite loading
      const hardStop = window.setTimeout(() => {
        if (mountedRef.current) {
          setNeedsSetup(false);
          setLoading(false);
        }
      }, 4000);

      try {
        const { data, error } = await supabase.functions.invoke<SetupCheckResponse>(
          "initial-setup",
          { body: { action: "check" } }
        );

        if (error) throw error;

        const value = data?.needsSetup ?? false;
        
        try {
          sessionStorage.setItem(CACHE_KEY, String(value));
        } catch {
          // Ignore storage errors
        }

        if (mountedRef.current) {
          setNeedsSetup(value);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error checking setup:", err);
        if (mountedRef.current) {
          setNeedsSetup(false);
          setLoading(false);
        }
      } finally {
        window.clearTimeout(hardStop);
      }
    };

    checkSetup();
  }, [cachedValue]);

  return { needsSetup, loading };
}
