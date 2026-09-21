export type Orientation = 'horizontal' | 'vertical';
export type Cell = [number, number];

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
