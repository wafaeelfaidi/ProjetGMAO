import { BarChart3, Database, Home, MessageSquare, User, AlertTriangle, FileText, Activity, Wrench } from 'lucide-react';
import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from './paths.config';

const iconClasses = 'w-4';

const routes = [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.home',
        path: pathsConfig.app.home,
        Icon: <Home className={iconClasses} />,
        end: true,
      },
      {
        label: 'Dashboard',
        path: pathsConfig.app.csvDashboard,
        Icon: <BarChart3 className={iconClasses} />,
      },
      {
        label: 'Data Management',
        path: pathsConfig.app.dataSection,
        Icon: <Database className={iconClasses} />,
      },
      {
        label: 'Chatbot',
        path: pathsConfig.app.chatbot,
        Icon: <MessageSquare className={iconClasses} />,
      },

      {
        label: 'AMDEC',
        path: pathsConfig.app.AMDEC,
        Icon: <AlertTriangle className={iconClasses} />,
      },
      {
        label: 'Work Orders',
        path: pathsConfig.app.otCreator,
        Icon: <FileText className={iconClasses} />,
      },
      {
        label: 'Breakdown Prediction',
        path: pathsConfig.app.breakdownPrediction,
        Icon: <Activity className={iconClasses} />,
      },
      {
        label: 'Maintenance Planning',
        path: pathsConfig.app.maintenancePlan,
        Icon: <Wrench className={iconClasses} />,
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
      },
    ],
  },
] satisfies z.infer<typeof NavigationConfigSchema>['routes'];

export const navigationConfig = NavigationConfigSchema.parse({
  routes,
  style: process.env.NEXT_PUBLIC_NAVIGATION_STYLE,
  sidebarCollapsed: process.env.NEXT_PUBLIC_HOME_SIDEBAR_COLLAPSED,
});
