/**
 * Role types for the application
 */
export type UserRole = 'admin' | 'operator';

/**
 * Extended account type with role
 */
export interface AccountWithRole {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  picture_url?: string;
}

/**
 * Permissions for each role
 */
export const RolePermissions = {
  admin: {
    canAccessHome: true,
    canAccessDashboard: true,
    canAccessDataManagement: true,
    canAccessChatbot: true,
    canAccessAMDEC: true,
    canAccessWorkOrders: true,
    canAccessBreakdownPrediction: true,
    canAccessMaintenancePlanning: true,
    canAccessSettings: true,
    canManageUsers: true,
    canDeleteFiles: true,
  },
  operator: {
    canAccessHome: true,
    canAccessDashboard: true,
    canAccessDataManagement: false,
    canAccessChatbot: true,
    canAccessAMDEC: false,
    canAccessWorkOrders: false,
    canAccessBreakdownPrediction: false,
    canAccessMaintenancePlanning: true,
    canAccessSettings: true,
    canManageUsers: false,
    canDeleteFiles: false,
  },
} as const;

/**
 * Check if a user has permission based on their role
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: keyof typeof RolePermissions.admin
): boolean {
  if (!role) return false;
  return RolePermissions[role][permission] ?? false;
}

/**
 * Get allowed paths for a role
 */
export function getAllowedPaths(role: UserRole | null | undefined): string[] {
  if (role === 'admin') {
    return [
      '/home',
      '/home/csv-dashboard',
      '/home/iot-dashboard',
      '/home/DataManagement',
      '/home/chatbot',
      '/home/AMDEC',
      '/home/OT-creator',
      '/home/breakdown-prediction',
      '/home/maintenance',
      '/home/settings',
    ];
  }
  
  if (role === 'operator') {
    return [
      '/home',
      '/home/csv-dashboard',
      '/home/iot-dashboard',
      '/home/chatbot',
      '/home/maintenance',
      '/home/settings',
    ];
  }
  
  return [];
}

/**
 * Check if a path is allowed for a role
 */
export function isPathAllowed(
  role: UserRole | null | undefined,
  pathname: string
): boolean {
  if (!role) return false;
  if (role === 'admin') return true; // Admin has access to everything
  
  const allowedPaths = getAllowedPaths(role);
  return allowedPaths.some(
    (allowedPath) =>
      pathname === allowedPath || pathname.startsWith(allowedPath + '/')
  );
}
