import { BarChart3, Database, Home, MessageSquare, User, AlertTriangle, FileText, Activity, Wrench } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from './paths.config';

const iconClasses = 'w-4';

// Define navigation items with role requirements
const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
        // Available to all roles
      },
      {
        label: 'Dashboard',
        path: pathsConfig.app.csvDashboard,
        Icon: <BarChart3 className={iconClasses} />,
        // Available to all roles
      },
      {
        label: 'Data Management',
        path: pathsConfig.app.dataSection,
        Icon: <Database className={iconClasses} />,
        // Admin only - will be filtered on client side
      },
      {
        label: 'Chatbot',
        path: pathsConfig.app.chatbot,
        Icon: <MessageSquare className={iconClasses} />,
        // Available to all roles
      },

      {
        label: 'AMDEC',
        path: pathsConfig.app.AMDEC,
        Icon: <AlertTriangle className={iconClasses} />,
        // Admin only - will be filtered on client side
      },
      {
        label: 'Work Orders',
        path: pathsConfig.app.otCreator,
        Icon: <FileText className={iconClasses} />,
        // Admin only - will be filtered on client side
      },
      {
        label: 'Breakdown Prediction',
        path: pathsConfig.app.breakdownPrediction,
        Icon: <Activity className={iconClasses} />,
        // Admin only - will be filtered on client side
      },
      {
        label: 'Maintenance Planning',
        path: pathsConfig.app.maintenancePlan,
        Icon: <Wrench className={iconClasses} />,
        // Available to all roles
      }
    ],
  },
  {
    label: 'common:routes.settings',
    children: [
      {
        label: 'common:routes.profile',
        path: pathsConfig.app.profileSettings,
        Icon: <User className={iconClasses} />,
        // Available to all roles
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});

/**
 * Filter navigation routes based on user role
 * Admin: sees all routes
 * Operator: sees only home, dashboard, chatbot, maintenance planning, settings
 */
export function getFilteredRoutes(role: 'admin' | 'operator' | null | undefined) {
  if (!role || role === 'admin') {
    return navigationConfig.routes;
  }

  // Operator: filter out admin-only routes
  const operatorAllowedPaths = [
    pathsConfig.app.home,
    pathsConfig.app.csvDashboard,
    pathsConfig.app.chatbot,
    pathsConfig.app.maintenancePlan,
    pathsConfig.app.profileSettings,
  ];

  return navigationConfig.routes.map((section) => ({
    ...section,
    children: section.children.filter((item) =>
      operatorAllowedPaths.includes(item.path)
    ),
  }));
}
