import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

function UserSettingsLayout(props: React.PropsWithChildren) {
  return (
    <>
      <PageHeader
        title={<Trans i18nKey={'account:routes.settings'} />}
        description={<AppBreadcrumbs />}
      />

      {props.children}
    </>
  );
}

export default withI18n(UserSettingsLayout);
