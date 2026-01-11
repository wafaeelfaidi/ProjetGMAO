import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon, BarChart3, Clock, Zap } from 'lucide-react';

import {
  CtaButton,
  FeatureCard,
  FeatureGrid,
  FeatureShowcase,
  FeatureShowcaseIconContainer,
  Hero,
  Pill,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      <div className={'container mx-auto'}>
        <Hero
          pill={
            <Pill label={'Welcome'}>
              <span>Professional Equipment Management Platform</span>
            </Pill>
          }
          title={
            <>
              <span>Streamline Your Equipment</span>
              <span>Management & Maintenance</span>
            </>
          }
          subtitle={
            <span>
              A comprehensive solution for tracking, managing, and maintaining your equipment. 
              Make data-driven decisions with real-time insights and predictive maintenance.
            </span>
          }
          cta={<MainCallToActionButton />}
        />
      </div>

      <div className={'container mx-auto'}>
        <div
          className={'flex flex-col space-y-16 xl:space-y-32 2xl:space-y-36'}
        >
          <FeatureShowcase
            heading={
              <>
                <b className="font-semibold dark:text-white">
                  Powerful Features
                </b>
                .{' '}
                <span className="text-muted-foreground font-normal">
                  Everything you need to efficiently manage your equipment fleet and maintenance operations.
                </span>
              </>
            }
            icon={
              <FeatureShowcaseIconContainer>
                <BarChart3 className="h-5" />
                <span>Smart Management</span>
              </FeatureShowcaseIconContainer>
            }
          >
            <FeatureGrid>
              <FeatureCard
                className={
                  'relative col-span-2 w-full overflow-hidden lg:col-span-1'
                }
                label={'Predictive Maintenance'}
                description={`AI-powered predictions help prevent equipment failures before they happen, reducing downtime.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden lg:col-span-1'}
                label={'Maintenance Scheduling'}
                description={`Automated scheduling and tracking of routine maintenance tasks with notifications and reminders.`}
              />

              <FeatureCard
                className={'relative col-span-2 overflow-hidden'}
                label={'Performance Analytics'}
                description={`Gain insights into equipment performance, utilization rates, and operational efficiency metrics.`}
              />
            </FeatureGrid>
          </FeatureShowcase>
        </div>
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-4'}>
      <CtaButton>
        <Link href={'/auth/sign-up'}>
          <span className={'flex items-center space-x-0.5'}>
            <span>
              <Trans i18nKey={'common:getStarted'} />
            </span>

            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant={'link'}>
        <Link href={'/auth/signIn'}>
          <Trans i18nKey={'auth:signIn'} />
        </Link>
      </CtaButton>
    </div>
  );
}
