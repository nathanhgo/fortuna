export function roomCodeFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/sala\/([^/]+)/i);
  return match ? match[1].toUpperCase() : null;
}

export function instanceIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/sala\/[^/]+\/[^/]+\/([^/]+)/i);
  return match ? match[1] : null;
}
