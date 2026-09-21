import type { ReactNode } from 'react';
import { fortunaColors } from '@/theme/palette';
import type { CoupCharacter } from '@/lib/api';
import { CHARACTER_LABELS } from '@/lib/coup/characters';

export function CoupCardBack() {
  const gold = fortunaColors.gold;
  const graphite = fortunaColors.graphite;
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" aria-hidden>
      <rect width="200" height="280" rx="10" fill={graphite} />
      <rect x="8" y="8" width="184" height="264" rx="7" fill="none" stroke={gold} strokeWidth="1.4" />
      <rect x="14" y="14" width="172" height="252" rx="5" fill="none" stroke={gold} strokeWidth="0.7" opacity="0.7" />
      <Corner x={20} y={20} />
      <Corner x={180} y={20} flipX />
      <Corner x={20} y={260} flipY />
      <Corner x={180} y={260} flipX flipY />
      <path d="M100 22 L103 28 L100 34 L97 28 Z" fill={gold} />
      <path d="M100 246 L103 252 L100 258 L97 252 Z" fill={gold} />
      <path d="M22 140 L28 143 L22 146 L16 143 Z" fill={gold} />
      <path d="M178 140 L184 143 L178 146 L172 143 Z" fill={gold} />
      <circle cx="100" cy="132" r="58" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.55" />
      <g transform="translate(42 74) scale(0.58)">
        <CoupMask />
      </g>
    </svg>
  );
}

function Corner({
  x,
  y,
  flipX = false,
  flipY = false,
}: {
  x: number;
  y: number;
  flipX?: boolean;
  flipY?: boolean;
}) {
  const gold = fortunaColors.gold;
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
      <path d="M0 18 Q0 0 18 0" fill="none" stroke={gold} strokeWidth="1.3" />
      <path d="M0 10 Q0 0 10 0" fill="none" stroke={gold} strokeWidth="0.8" opacity="0.7" />
      <path d="M4 4 L8 0 L12 4 L8 8 Z" fill="none" stroke={gold} strokeWidth="0.8" />
    </g>
  );
}

/** Máscara de teatro da capa do Coup, traçada em ouro. */
export function CoupMask() {
  const gold = fortunaColors.gold;
  const ivory = fortunaColors.ivory;
  return (
    <g fill="none" stroke={gold} strokeWidth="3.2" strokeLinejoin="round">
      <path d="M28 22 L48 8 L78 12 L86 58 L62 92 L32 78 Z" />
      <path d="M172 22 L152 8 L122 12 L114 58 L138 92 L168 78 Z" />
      <path d="M42 28 L52 18 L62 32" />
      <path d="M158 28 L148 18 L138 32" />
      <path d="M48 48 L58 38 L68 52" />
      <path d="M152 48 L142 38 L132 52" />
      <path d="M58 8 L78 4 L84 22" />
      <path d="M142 8 L122 4 L116 22" />
      <path
        d="M46 70 C48 38 70 22 100 22 C130 22 152 38 154 70 C154 108 132 148 100 162 C68 148 46 108 46 70 Z"
        fill={ivory}
      />
      <path d="M72 78 C78 72 88 72 92 80" />
      <path d="M108 80 C112 72 122 72 128 78" />
      <path d="M76 76 C80 74 86 74 90 77" strokeWidth="1.6" />
      <path d="M110 77 C114 74 120 74 124 76" strokeWidth="1.6" />
      <path d="M100 78 L96 108 C96 116 98 122 100 124 C102 122 104 116 104 108 L100 78 Z" fill={ivory} />
      <path d="M88 136 C94 144 106 144 112 136" />
      <path d="M90 138 C96 142 104 142 110 138" strokeWidth="1.8" />
      <path d="M58 92 C64 108 70 118 78 124" strokeWidth="1.4" />
      <path d="M60 100 C66 112 72 120 80 126" strokeWidth="1.2" opacity="0.8" />
      <path d="M62 108 C68 118 74 124 82 128" strokeWidth="1.1" opacity="0.65" />
    </g>
  );
}

export function CoupCardFace({ character }: { character: CoupCharacter }) {
  const gold = fortunaColors.gold;
  const ivory = fortunaColors.ivory;
  const graphite = fortunaColors.graphite;
  return (
    <svg viewBox="0 0 200 280" width="100%" height="100%" aria-hidden>
      <rect width="200" height="280" rx="10" fill={ivory} />
      <rect x="8" y="8" width="184" height="264" rx="7" fill="none" stroke={gold} strokeWidth="1.6" />
      <text
        x="18"
        y="32"
        fill={gold}
        fontSize="13"
        fontFamily="var(--font-cormorant), Georgia, serif"
      >
        {CHARACTER_LABELS[character]}
      </text>
      <g transform="translate(40 70)">{CHARACTER_MARKS[character](gold, graphite)}</g>
      <text
        x="100"
        y="252"
        textAnchor="middle"
        fill={gold}
        fontSize="22"
        fontFamily="var(--font-cormorant), Georgia, serif"
      >
        {CHARACTER_LABELS[character]}
      </text>
    </svg>
  );
}

const CHARACTER_MARKS: Record<
  CoupCharacter,
  (gold: string, graphite: string) => ReactNode
> = {
  duke: (gold, graphite) => (
    <>
      <circle cx="60" cy="48" r="22" fill="none" stroke={gold} strokeWidth="3" />
      <path d="M60 18 V40" stroke={gold} strokeWidth="3" />
      <path d="M48 28 H72" stroke={gold} strokeWidth="3" />
      <path d="M38 78 Q60 58 82 78" fill="none" stroke={gold} strokeWidth="3" />
      <path d="M44 92 H76" stroke={gold} strokeWidth="3" />
      <circle cx="60" cy="64" r="6" fill={graphite} stroke={gold} strokeWidth="2" />
    </>
  ),
  assassin: (gold) => (
    <>
      <path
        d="M60 16 L64 22 V86 L70 92 L60 118 L50 92 L56 86 V22 Z"
        fill="none"
        stroke={gold}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d="M44 86 H76" stroke={gold} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M52 98 H68" stroke={gold} strokeWidth="2.2" />
    </>
  ),
  captain: (gold) => (
    <>
      <path d="M20 88 L60 28 L100 88 Z" fill="none" stroke={gold} strokeWidth="3" />
      <path d="M36 88 H84 L78 110 H42 Z" fill="none" stroke={gold} strokeWidth="3" />
      <path d="M60 28 V18" stroke={gold} strokeWidth="3" />
      <path d="M52 18 H68" stroke={gold} strokeWidth="3" />
    </>
  ),
  ambassador: (gold) => (
    <>
      <path d="M28 32 H92 V118 L60 102 L28 118 Z" fill="none" stroke={gold} strokeWidth="3" />
      <path d="M40 52 H80" stroke={gold} strokeWidth="2.4" />
      <path d="M40 68 H80" stroke={gold} strokeWidth="2.4" />
      <path d="M40 84 H68" stroke={gold} strokeWidth="2.4" />
    </>
  ),
  contessa: (gold, graphite) => (
    <>
      <path
        d="M36 78 C36 46 52 28 60 28 C68 28 84 46 84 78 C84 104 74 122 60 130 C46 122 36 104 36 78 Z"
        fill="none"
        stroke={gold}
        strokeWidth="2.6"
      />
      <path d="M40 44 Q60 22 80 44" fill="none" stroke={gold} strokeWidth="2.4" />
      <path d="M48 38 Q60 18 72 38" fill="none" stroke={gold} strokeWidth="1.8" />
      <path d="M48 70 C52 64 56 64 58 70" stroke={gold} strokeWidth="2" fill="none" />
      <path d="M62 70 C64 64 68 64 72 70" stroke={gold} strokeWidth="2" fill="none" />
      <path d="M60 74 L58 90 C58 94 59 96 60 96 C61 96 62 94 62 90 Z" fill={graphite} stroke={gold} strokeWidth="1.6" />
      <path d="M54 108 C58 112 62 112 66 108" stroke={gold} strokeWidth="2" fill="none" />
    </>
  ),
  inquisitor: (gold) => (
    <>
      <circle cx="60" cy="72" r="32" fill="none" stroke={gold} strokeWidth="3" />
      <circle cx="60" cy="72" r="12" fill="none" stroke={gold} strokeWidth="3" />
      <path d="M60 28 V20 M60 116 V124 M24 72 H16 M96 72 H104" stroke={gold} strokeWidth="3" />
    </>
  ),
};
