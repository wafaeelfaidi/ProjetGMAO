'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import type { UserRole } from './role-utils';
import { hasPermission } from './role-utils';

/**
 * Hook to get the current user's role
 */
export function useUserRole() {
  const supabase = useSupabase();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        const { data: account, error } = await supabase
          .from('accounts')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else {
          setRole((account?.role as UserRole) ?? null);
        }
      } catch (error) {
        console.error('Error in useUserRole:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [supabase]);

  return { role, loading };
}

/**
 * Hook to check if user has a specific permission
 */
export function usePermission(permission: keyof ReturnType<typeof hasPermission>) {
  const { role, loading } = useUserRole();
  
  return {
    hasPermission: hasPermission(role, permission as any),
    loading,
    role,
  };
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin() {
  const { role, loading } = useUserRole();
  
  return {
    isAdmin: role === 'admin',
    loading,
  };
}

/**
 * Hook to check if user is operator
 */
export function useIsOperator() {
  const { role, loading } = useUserRole();
  
  return {
    isOperator: role === 'operator',
    loading,
  };
}
