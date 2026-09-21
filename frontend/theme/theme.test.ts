import { describe, expect, it } from 'vitest';
import { fortunaColors } from './palette';
import { theme } from './theme';

describe('fortunaColors', () => {
  it('matches the palette confirmed in architecture_docs/visual.md', () => {
    expect(fortunaColors).toEqual({
      gold: '#C9A227',
      graphite: '#1A1A1A',
      ivory: '#F5F1E8',
      wine: '#7A2E38',
      olive: '#74804B',
    });
  });
});

describe('theme', () => {
  it('wires MUI palette roles to the Fortuna design tokens', () => {
    expect(theme.palette.primary.main).toBe(fortunaColors.gold);
    expect(theme.palette.secondary.main).toBe(fortunaColors.graphite);
    expect(theme.palette.error.main).toBe(fortunaColors.wine);
    expect(theme.palette.success.main).toBe(fortunaColors.olive);
    expect(theme.palette.background.default).toBe(fortunaColors.ivory);
  });

  it('uses the confirmed typefaces (Cormorant for headings, Lora for body)', () => {
    expect(theme.typography.fontFamily).toContain('font-lora');
    expect(theme.typography.h1.fontFamily).toContain('font-cormorant');
  });

  it('avoids heavy shadows and pill-shaped buttons by default (see visual.md restrictions)', () => {
    expect(theme.shape.borderRadius).toBeLessThanOrEqual(8);
    expect(theme.components?.MuiButton?.defaultProps?.disableElevation).toBe(true);
  });
});
