import { fortunaColors } from '@/theme/palette';
import type { Orientation } from '@/lib/battleship/placement';

interface ShipSilhouetteProps {
  length: number;
  orientation: Orientation;
  wrecked?: boolean;
}

function hullColor(wrecked: boolean): string {
  return wrecked ? fortunaColors.wine : fortunaColors.gold;
}

/**
 * Silhuetas de linha (2 a 5 casas). O casco fica centrado no viewBox para coincidir
 * com o miolo das casas — torres/períscopo não empurram o desenho para cima.
 */
export function ShipSilhouette({ length, orientation, wrecked = false }: ShipSilhouetteProps) {
  const stroke = hullColor(wrecked);
  const vertical = orientation === 'vertical';

  return (
    <svg
      viewBox={vertical ? '0 0 24 100' : '0 0 100 24'}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      aria-hidden
    >
      <g transform={vertical ? 'translate(24 0) rotate(90)' : undefined}>
        <Hull length={length} stroke={stroke} />
      </g>
    </svg>
  );
}

function Hull({ length, stroke }: { length: number; stroke: string }) {
  const fill = fortunaColors.graphite;
  if (length >= 5) {
    return (
      <>
        <path
          d="M2 12 L12 3 H88 L98 12 L88 21 H12 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <rect x="22" y="3.2" width="11" height="6.5" stroke={stroke} strokeWidth="1.4" fill={fill} />
        <rect x="52" y="3.2" width="11" height="6.5" stroke={stroke} strokeWidth="1.4" fill={fill} />
        <path d="M27.5 3.2 V1.4" stroke={stroke} strokeWidth="1.4" />
        <path d="M57.5 3.2 V1.4" stroke={stroke} strokeWidth="1.4" />
      </>
    );
  }
  if (length === 4) {
    return (
      <>
        <path
          d="M3 12 L14 3 H86 L97 12 L86 21 H14 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <rect x="40" y="3.4" width="13" height="6.5" stroke={stroke} strokeWidth="1.4" fill={fill} />
        <path d="M46.5 3.4 V1.4" stroke={stroke} strokeWidth="1.4" />
        <path d="M62 11 H80" stroke={stroke} strokeWidth="1.4" />
      </>
    );
  }
  if (length === 3) {
    return (
      <>
        <path
          d="M5 12 C12 4 32 3.2 50 7 C70 11 86 10.5 95 12 C86 20 70 21.5 50 18 C32 14.5 12 20 5 12 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M48 8 V2.6" stroke={stroke} strokeWidth="1.5" />
        <circle cx="48" cy="2.6" r="1.4" fill={stroke} />
      </>
    );
  }
  if (length === 2) {
    return (
      <>
        <path
          d="M6 12 L20 3.5 H80 L94 12 L80 20.5 H20 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.8"
        />
        <path d="M40 5 V2.2 H50" stroke={stroke} strokeWidth="1.4" />
      </>
    );
  }
  return (
    <path
      d="M8 12 L18 4 H82 L92 12 L82 20 H18 Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.8"
    />
  );
}

export function HitMark() {
  return (
    <svg viewBox="0 0 32 32" width="92%" height="92%" aria-hidden>
      <circle cx="16" cy="18" r="8.5" fill={fortunaColors.wine} stroke={fortunaColors.gold} strokeWidth="1.6" />
      <path
        d="M16 9.5 V5.5"
        stroke={fortunaColors.gold}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 5.5 C18 4 21 5 22 7"
        stroke={fortunaColors.gold}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="7.2" r="1.5" fill={fortunaColors.gold} />
      <circle cx="13.5" cy="16.5" r="1.4" fill={fortunaColors.ivory} opacity="0.45" />
    </svg>
  );
}

export function MissMark() {
  return (
    <svg viewBox="0 0 24 24" width="78%" height="78%" aria-hidden>
      <circle cx="12" cy="12" r="3.2" stroke={fortunaColors.olive} strokeWidth="1.6" fill="none" />
      <circle cx="12" cy="12" r="6.5" stroke={fortunaColors.olive} strokeWidth="1.2" fill="none" opacity="0.85" />
      <circle cx="12" cy="12" r="9.5" stroke={fortunaColors.gold} strokeWidth="0.9" fill="none" opacity="0.6" />
    </svg>
  );
}
