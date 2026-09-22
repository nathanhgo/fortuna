import { describe, expect, it } from 'vitest';
import {
  asShipGrid,
  cellLabel,
  occupiedKeys,
  remainingFleetSizes,
  shipCells,
  shipLayout,
  sunkShips,
  tryPlaceShip,
  type Cell,
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

describe('shipLayout', () => {
  it('describes a horizontal ship from its occupied cells', () => {
    expect(shipLayout([[0, 2], [0, 0], [0, 1]])).toEqual({
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      length: 3,
      orientation: 'horizontal',
      origin: [0, 0],
    });
  });

  it('describes a vertical ship from its occupied cells', () => {
    expect(shipLayout([[3, 1], [1, 1], [2, 1]])).toEqual({
      cells: [
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      length: 3,
      orientation: 'vertical',
      origin: [1, 1],
    });
  });
});

describe('sunkShips', () => {
  it('returns only ships whose every cell was shot', () => {
    const ships: Cell[][] = [
      [
        [0, 0],
        [0, 1],
      ],
      [
        [2, 0],
        [3, 0],
      ],
    ];
    expect(sunkShips(ships, [{ cell: [0, 0] }, { cell: [0, 1] }, { cell: [2, 0] }])).toEqual([
      [
        [0, 0],
        [0, 1],
      ],
    ]);
  });

  it('normalizes API ship arrays into Cell tuples', () => {
    expect(asShipGrid([[[0, 0], [0, 1]]])).toEqual([[[0, 0], [0, 1]]]);
  });
});
