'use client';

import type { JwtPayload } from '@supabase/supabase-js';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarNavigation,
} from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';
import { getFilteredRoutes } from '~/config/navigation.config';
import { Tables } from '~/lib/database.types';
import { useUserRole } from '~/lib/roles/use-user-role';

export function HomeSidebar(props: {
  account?: Tables<'accounts'>;
  user: JwtPayload;
}) {
  const { role } = useUserRole();
  const filteredRoutes = getFilteredRoutes(role);

  return (
    <Sidebar collapsible={'icon'}>
      <SidebarHeader className={'h-16 justify-center'}>
        <div className={'flex items-center justify-center w-full'}>
          <AppLogo className={'max-w-full'} width={70} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNavigation config={{ ...filteredRoutes, routes: filteredRoutes }} />
      </SidebarContent>

      <SidebarFooter>
        <ProfileAccountDropdownContainer
          user={props.user}
          account={props.account}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
