'use client';

import { useMemo } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { SupabaseFileService } from './supabase-file.service';

/**
 * Hook to get the Supabase file service instance
 */
export function useSupabaseFileService() {
  const supabase = useSupabase();
  
  const fileService = useMemo(() => {
    return new SupabaseFileService(supabase);
  }, [supabase]);
  
  return fileService;
}
