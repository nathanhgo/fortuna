import { describe, expect, it } from 'vitest';
import {
  cellLabel,
  occupiedKeys,
  remainingFleetSizes,
  shipCells,
  tryPlaceShip,
} from './placement';

describe('cellLabel', () => {
  it('names cells like a physical battleship board (column letter, 1-indexed row)', () => {
    expect(cellLabel(0, 0)).toBe('A1');
    expect(cellLabel(9, 2)).toBe('C10');
  });
});

describe('shipCells', () => {
  it('extends horizontally to the right', () => {
    expect(shipCells([2, 3], 3, 'horizontal')).toEqual([
      [2, 3],
      [2, 4],
      [2, 5],
    ]);
  });

  it('extends vertically downward', () => {
    expect(shipCells([2, 3], 3, 'vertical')).toEqual([
      [2, 3],
      [3, 3],
      [4, 3],
    ]);
  });
});

describe('tryPlaceShip', () => {
  it('places a ship that fits on an empty board', () => {
    expect(tryPlaceShip([0, 0], 3, 'horizontal', 10, new Set())).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
  });

  it('rejects a ship that would leave the board', () => {
    expect(tryPlaceShip([0, 8], 3, 'horizontal', 10, new Set())).toBeNull();
  });

  it('rejects a ship that overlaps an already occupied cell', () => {
    const occupied = occupiedKeys([
      [
        [0, 1],
        [0, 2],
      ],
    ]);
    expect(tryPlaceShip([0, 0], 3, 'horizontal', 10, occupied)).toBeNull();
  });
});

describe('remainingFleetSizes', () => {
  it('removes placed ship sizes from the configured fleet', () => {
    expect(remainingFleetSizes([5, 4, 3, 3, 2], [[[0, 0], [0, 1], [0, 2]]])).toEqual([5, 4, 3, 2]);
  });
});
