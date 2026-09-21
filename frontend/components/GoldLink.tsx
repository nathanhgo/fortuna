'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { fortunaColors } from '@/theme/palette';

export function GoldLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: fortunaColors.gold }}>
      {children}
    </Link>
  );
}
