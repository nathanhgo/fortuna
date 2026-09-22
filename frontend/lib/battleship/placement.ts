export type Orientation = 'horizontal' | 'vertical';
export type Cell = [number, number];

export function asShipGrid(ships: number[][][]): Cell[][] {
  return ships.map((ship) => ship.map((cell) => [cell[0], cell[1]] as Cell));
}

export function cellLabel(row: number, col: number): string {
  return `${String.fromCharCode(65 + col)}${row + 1}`;
}

export function cellKey(cell: Cell): string {
  return `${cell[0]},${cell[1]}`;
}

export function occupiedKeys(ships: Cell[][]): Set<string> {
  return new Set(ships.flat().map(cellKey));
}

export function shipCells(origin: Cell, length: number, orientation: Orientation): Cell[] {
  return Array.from({ length }, (_, offset) =>
    orientation === 'horizontal'
      ? ([origin[0], origin[1] + offset] as Cell)
      : ([origin[0] + offset, origin[1]] as Cell)
  );
}

export function tryPlaceShip(
  origin: Cell,
  length: number,
  orientation: Orientation,
  boardSize: number,
  occupied: Set<string>
): Cell[] | null {
  const cells = shipCells(origin, length, orientation);
  const onBoard = cells.every(
    ([row, col]) => row >= 0 && col >= 0 && row < boardSize && col < boardSize
  );
  if (!onBoard) return null;
  if (cells.some((cell) => occupied.has(cellKey(cell)))) return null;
  return cells;
}

export function remainingFleetSizes(fleetSizes: number[], placed: Cell[][]): number[] {
  const remaining = [...fleetSizes].sort((a, b) => b - a);
  const used = placed.map((ship) => ship.length).sort((a, b) => b - a);
  for (const size of used) {
    const index = remaining.indexOf(size);
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining;
}

export interface ShipLayout {
  cells: Cell[];
  length: number;
  orientation: Orientation;
  origin: Cell;
}

export function shipLayout(cells: Cell[]): ShipLayout {
  const sorted = [...cells].sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const origin = sorted[0];
  const last = sorted[sorted.length - 1];
  const orientation: Orientation =
    sorted.length < 2 || origin[0] === last[0] ? 'horizontal' : 'vertical';
  return { cells: sorted, length: sorted.length, orientation, origin };
}

export function isShipSunk(ship: Cell[], shotKeys: Set<string>): boolean {
  return ship.every((cell) => shotKeys.has(cellKey(cell)));
}

export function sunkShips(ships: Cell[][], shots: { cell: number[] }[]): Cell[][] {
  const shotKeys = new Set(shots.map((shot) => cellKey(shot.cell as Cell)));
  return ships.filter((ship) => isShipSunk(ship, shotKeys));
}
