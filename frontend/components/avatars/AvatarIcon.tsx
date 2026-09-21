import type { ReactNode } from 'react';
import { fortunaColors } from '@/theme/palette';
import { AVATAR_LABELS, isAvatarKey, type AvatarKey } from '@/lib/avatars';

interface AvatarIconProps {
  avatar: string;
  size?: number;
  title?: string;
}

const stroke = fortunaColors.gold;

function Frame({
  children,
  label,
  size,
}: {
  children: ReactNode;
  label: string;
  size: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={label}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="22" stroke={stroke} strokeWidth="1.5" />
      {children}
    </svg>
  );
}

function Owl() {
  return (
    <>
      <ellipse cx="18" cy="20" rx="6" ry="7" stroke={stroke} strokeWidth="1.6" />
      <ellipse cx="30" cy="20" rx="6" ry="7" stroke={stroke} strokeWidth="1.6" />
      <circle cx="18" cy="20" r="1.6" fill={stroke} />
      <circle cx="30" cy="20" r="1.6" fill={stroke} />
      <path d="M22 26 L24 30 L26 26" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 32 C18 38 30 38 34 32" stroke={stroke} strokeWidth="1.6" />
    </>
  );
}

function Laurel() {
  return (
    <>
      <path
        d="M24 10 V38"
        stroke={stroke}
        strokeWidth="1.4"
      />
      <path
        d="M24 14 C16 16 12 22 14 28 C18 24 22 22 24 22"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <path
        d="M24 14 C32 16 36 22 34 28 C30 24 26 22 24 22"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <path
        d="M24 24 C17 26 14 32 16 36 C20 33 23 31 24 31"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <path
        d="M24 24 C31 26 34 32 32 36 C28 33 25 31 24 31"
        stroke={stroke}
        strokeWidth="1.6"
      />
    </>
  );
}

function Lyre() {
  return (
    <>
      <path d="M16 16 C14 28 16 36 24 36 C32 36 34 28 32 16" stroke={stroke} strokeWidth="1.6" />
      <path d="M16 16 H32" stroke={stroke} strokeWidth="1.6" />
      <path d="M20 16 V34" stroke={stroke} strokeWidth="1.2" />
      <path d="M24 16 V36" stroke={stroke} strokeWidth="1.2" />
      <path d="M28 16 V34" stroke={stroke} strokeWidth="1.2" />
      <path d="M22 36 H26" stroke={stroke} strokeWidth="1.6" />
    </>
  );
}

function Column() {
  return (
    <>
      <rect x="14" y="12" width="20" height="4" stroke={stroke} strokeWidth="1.6" />
      <rect x="18" y="16" width="12" height="18" stroke={stroke} strokeWidth="1.6" />
      <path d="M21 16 V34" stroke={stroke} strokeWidth="1.2" />
      <path d="M24 16 V34" stroke={stroke} strokeWidth="1.2" />
      <path d="M27 16 V34" stroke={stroke} strokeWidth="1.2" />
      <rect x="12" y="34" width="24" height="4" stroke={stroke} strokeWidth="1.6" />
    </>
  );
}

function Sun() {
  return (
    <>
      <circle cx="24" cy="24" r="8" stroke={stroke} strokeWidth="1.6" />
      <path d="M24 8 V13" stroke={stroke} strokeWidth="1.6" />
      <path d="M24 35 V40" stroke={stroke} strokeWidth="1.6" />
      <path d="M8 24 H13" stroke={stroke} strokeWidth="1.6" />
      <path d="M35 24 H40" stroke={stroke} strokeWidth="1.6" />
      <path d="M13 13 L16.5 16.5" stroke={stroke} strokeWidth="1.6" />
      <path d="M31.5 31.5 L35 35" stroke={stroke} strokeWidth="1.6" />
      <path d="M35 13 L31.5 16.5" stroke={stroke} strokeWidth="1.6" />
      <path d="M16.5 31.5 L13 35" stroke={stroke} strokeWidth="1.6" />
    </>
  );
}

function Trident() {
  return (
    <>
      <path d="M24 10 V38" stroke={stroke} strokeWidth="1.8" />
      <path d="M24 12 C18 12 16 18 16 22" stroke={stroke} strokeWidth="1.6" />
      <path d="M24 12 C30 12 32 18 32 22" stroke={stroke} strokeWidth="1.6" />
      <path d="M24 12 V18" stroke={stroke} strokeWidth="1.6" />
      <path d="M16 22 L16 18" stroke={stroke} strokeWidth="1.6" />
      <path d="M32 22 L32 18" stroke={stroke} strokeWidth="1.6" />
      <path d="M20 38 H28" stroke={stroke} strokeWidth="1.6" />
    </>
  );
}

function Mask() {
  return (
    <>
      <path
        d="M12 22 C14 12 34 12 36 22 C36 30 30 36 24 36 C18 36 12 30 12 22 Z"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <ellipse cx="18.5" cy="23" rx="3.2" ry="2.4" stroke={stroke} strokeWidth="1.4" />
      <ellipse cx="29.5" cy="23" rx="3.2" ry="2.4" stroke={stroke} strokeWidth="1.4" />
      <path d="M20 30 C22 32 26 32 28 30" stroke={stroke} strokeWidth="1.4" />
    </>
  );
}

function Cornucopia() {
  return (
    <>
      <path
        d="M12 30 C12 20 20 14 30 16 C36 17 38 22 34 26 C30 30 22 32 16 34 C12 35 12 33 12 30 Z"
        stroke={stroke}
        strokeWidth="1.6"
      />
      <circle cx="28" cy="18" r="2.2" stroke={stroke} strokeWidth="1.4" />
      <circle cx="33" cy="21" r="2" stroke={stroke} strokeWidth="1.4" />
      <path d="M24 16 C26 12 30 12 32 15" stroke={stroke} strokeWidth="1.4" />
    </>
  );
}

const GLYPHS: Record<AvatarKey, () => ReactNode> = {
  owl: Owl,
  laurel: Laurel,
  lyre: Lyre,
  column: Column,
  sun: Sun,
  trident: Trident,
  mask: Mask,
  cornucopia: Cornucopia,
};

export function AvatarIcon({ avatar, size = 40, title }: AvatarIconProps) {
  const key: AvatarKey = isAvatarKey(avatar) ? avatar : 'laurel';
  const label = title ?? AVATAR_LABELS[key];
  const Glyph = GLYPHS[key];
  return (
    <Frame label={label} size={size}>
      <Glyph />
    </Frame>
  );
}
