import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@kit/ui/utils';

function LogoImage({
  className,
  width = 90,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <div
      className={cn(
        `flex items-center justify-center`,
        className
      )}
    >
      <Image
        src="/images/LOGO W&A.png"
        alt="AlphaWave"
        width={width}
        height={width * 0.6}
        className="object-contain max-h-12"
        priority
      />
    </div>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'Home Page'} href={href ?? '/'}>
      <LogoImage className={className} />
    </Link>
  );
}
