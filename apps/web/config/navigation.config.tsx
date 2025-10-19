import { Home, User, LayoutDashboard, Bot, Wrench, FileWarning,Upload  } from 'lucide-react';


import { z } from 'zod';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import pathsConfig from '~/config/paths.config';

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
        label: 'common:routes.dataUpload',
        path: pathsConfig.app.dataupload,
        Icon: <Upload  className={iconClasses} />,
      },


      {
        label: 'common:routes.dashboard',
        path: pathsConfig.app.dashboard,
        Icon: <LayoutDashboard className={iconClasses} />,
      },



      
      
      {
        label: 'common:routes.RPN',
        path: pathsConfig.app.RPN,
        Icon: <Wrench className={iconClasses} />,
      },
      {
        label: 'common:routes.PDR',
        path: pathsConfig.app.PDR,
        Icon: <FileWarning className={iconClasses} />,
      },


      {
        label: 'common:routes.chatbot',
        path: pathsConfig.app.chatbot,
        Icon: <Bot className={iconClasses} />,
      },
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
