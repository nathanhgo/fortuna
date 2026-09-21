import { describe, expect, it } from 'vitest';
import { AVAILABLE_KINDS, GAME_CATALOG, gameHref, gameLabel, instanceShortId, tableLabel } from './catalog';

describe('GAME_CATALOG', () => {
  it('lists the three playable games and the four coming soon', () => {
    expect(GAME_CATALOG.map((game) => game.name)).toEqual([
      'Xadrez',
      'Coup',
      'Batalha Naval',
      'Truco',
      'Lobisomem',
      'Damas',
      'Dominó',
    ]);
    expect(GAME_CATALOG.filter((game) => game.available).map((game) => game.kind)).toEqual([
      'chess',
      'coup',
      'battleship',
    ]);
    expect(AVAILABLE_KINDS).toEqual(['chess', 'coup', 'battleship']);
    expect(GAME_CATALOG.filter((game) => !game.available).every((game) => !game.kind)).toBe(true);
  });

  it('builds Portuguese table urls and labels', () => {
    expect(gameHref('chess', 'ABC123', 'x1')).toBe('/sala/ABC123/xadrez/x1');
    expect(gameHref('battleship', 'ABC123', 'b1')).toBe('/sala/ABC123/batalha-naval/b1');
    expect(gameHref('coup', 'ABC123', 'c1')).toBe('/sala/ABC123/coup/c1');
    expect(gameLabel('chess')).toBe('Xadrez');
  });

  it('labels each table with a short #id so two chess rooms stay distinct', () => {
    const first = 'aa111111-1111-1111-1111-111111111111';
    const second = 'bb222222-2222-2222-2222-222222222222';
    expect(instanceShortId(first)).toBe('#AA1111');
    expect(instanceShortId(second)).toBe('#BB2222');
    expect(tableLabel('chess', first)).toBe('Xadrez #AA1111');
    expect(tableLabel('chess', second)).toBe('Xadrez #BB2222');
  });
});
