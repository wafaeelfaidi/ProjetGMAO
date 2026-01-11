import { use } from 'react';

import { cookies } from 'next/headers';

import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider, SidebarTrigger } from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { navigationConfig } from '~/config/navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

// home imports
import { HomeMenuNavigation } from './_components/home-menu-navigation';
import { HomeMobileNavigation } from './_components/home-mobile-navigation';
import { HomeSidebar } from './_components/home-sidebar';

function HomeLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());

  if (style === 'sidebar') {
    return <SidebarLayout>{children}</SidebarLayout>;
  }

  return <HeaderLayout>{children}</HeaderLayout>;
}

export default withI18n(HomeLayout);

function SidebarLayout({ children }: React.PropsWithChildren) {
  const sidebarMinimized = navigationConfig.sidebarCollapsed;
  const [user] = use(Promise.all([requireUserInServerComponent()]));

  return (
    <SidebarProvider defaultOpen={sidebarMinimized}>
      <SidebarTrigger className="fixed left-[calc(var(--sidebar-width)-1rem)] top-4 z-50 text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-50 border border-gray-300 rounded-full p-2 h-9 w-9 shadow-[0_0_15px_rgba(156,163,175,0.3)] transition-all duration-200 hover:scale-110 hover:shadow-[0_0_25px_rgba(156,163,175,0.5)] group-data-[state=collapsed]:left-[calc(var(--sidebar-width-icon)+0.5rem)]" />
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

function HeaderLayout({ children }: React.PropsWithChildren) {
  return (
    <Page style={'header'}>
      <PageNavigation>
        <HomeMenuNavigation />
      </PageNavigation>

      <PageMobileNavigation className={'flex items-center justify-between'}>
        <MobileNavigation />
      </PageMobileNavigation>

      {children}
    </Page>
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
