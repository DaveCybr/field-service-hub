import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useInitialSetup() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('initial-setup', {
          method: 'GET',
        });

        if (error) {
          console.error('Error checking setup status:', error);
          setNeedsSetup(false);
        } else {
          setNeedsSetup(data?.needsSetup ?? false);
        }
      } catch (error) {
        console.error('Error checking setup:', error);
        setNeedsSetup(false);
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, []);

  return { needsSetup, loading };
}
