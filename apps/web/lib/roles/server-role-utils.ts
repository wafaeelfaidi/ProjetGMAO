import 'server-only';

import { cache } from 'react';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import type { UserRole } from './role-utils';

/**
 * Get the current user's role in a server component
 */
export const getUserRole = cache(async (): Promise<UserRole | null> => {
  const client = getSupabaseServerClient();
  
  const { data: userData } = await client.auth.getClaims();
  if (!userData?.claims) return null;
  
  const { data: account, error } = await client
    .from('accounts')
    .select('role')
    .eq('id', userData.claims.sub)
    .single();
  
  if (error || !account) return null;
  
  return account.role as UserRole;
});

/**
 * Check if the current user is an admin in a server component
 */
export const isAdmin = cache(async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === 'admin';
});

/**
 * Check if the current user is an operator in a server component
 */
export const isOperator = cache(async (): Promise<boolean> => {
  const role = await getUserRole();
  return role === 'operator';
});

/**
 * Require admin role in a server component
 * Throws an error if the user is not an admin
 */
export async function requireAdmin() {
  const admin = await isAdmin();
  
  if (!admin) {
    throw new Error('Admin role required');
  }
  
  return true;
}
