import { use } from 'react';
import { cookies } from 'next/headers';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';
import { HomeSidebar } from '../home/_components/home-sidebar';
import { HomeMobileNavigation } from '../home/_components/home-mobile-navigation';
import { HomeMenuNavigation } from '../home/_components/home-menu-navigation';

function ProtectedLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());
  const [user] = use(Promise.all([requireUserInServerComponent()]));

  return (
    <SidebarProvider defaultOpen={navigationConfig.sidebarCollapsed}>
      <Page style={'sidebar'}>
        <PageNavigation>
          <HomeSidebar user={user} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <MobileNavigation />
        </PageMobileNavigation>

        {children}
      </Page>
    </SidebarProvider>
  );
}

function MobileNavigation() {
  return (
    <>
      <AppLogo />
      <HomeMobileNavigation />
    </>
  );
}

async function getLayoutStyle() {
  const cookieStore = await cookies();
  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    navigationConfig.style
  );
}

export default withI18n(ProtectedLayout);