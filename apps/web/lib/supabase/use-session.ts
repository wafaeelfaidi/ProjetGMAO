import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

export function useSupabaseSession() {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("Initial session:", session);
      console.log("Initial session error:", error);
      setSession(session);
      setLoading(false);
    });

    // Listen for session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      console.log("Auth state change session:", session);
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { session, loading };
}