import { describe, expect, it } from 'vitest';
import { groupTurnActions, rewriteHistory } from './characters';

describe('groupTurnActions', () => {
  const copies = {
    duke: 3,
    assassin: 3,
    captain: 3,
    ambassador: 3,
    contessa: 3,
    inquisitor: 0,
  };

  it('puts general actions in standard, owned roles in mine, and the rest in bluff', () => {
    const grouped = groupTurnActions({
      hand: ['captain', 'ambassador'],
      coins: 2,
      copies,
      reformation: false,
    });
    expect(grouped.standard.map((act) => act.kind)).toEqual(['income', 'foreign_aid', 'coup']);
    expect(grouped.mine.map((act) => act.kind)).toEqual(['steal', 'exchange']);
    expect(grouped.bluff.map((act) => act.kind)).toEqual(['tax', 'assassinate']);
    expect(grouped.standard.find((act) => act.kind === 'coup')?.affordable).toBe(false);
    expect(grouped.bluff.find((act) => act.kind === 'assassinate')?.affordable).toBe(false);
    expect(grouped.standard.find((act) => act.kind === 'income')?.affordable).toBe(true);
  });

  it('with ten coins only allows a coup', () => {
    const grouped = groupTurnActions({
      hand: ['duke', 'contessa'],
      coins: 10,
      copies,
      reformation: false,
    });
    expect(grouped.standard.map((act) => act.kind)).toEqual(['coup']);
    expect(grouped.mine).toEqual([]);
    expect(grouped.bluff).toEqual([]);
  });
});

describe('rewriteHistory', () => {
  it('replaces player ids with names, longest id first', () => {
    expect(
      rewriteHistory('14 mostrou Duque. 15 perde influência. 1 espera.', {
        '1': 'Carol',
        '14': 'Alice',
        '15': 'Bob',
      })
    ).toBe('Alice mostrou Duque. Bob perde influência. Carol espera.');
  });
});
