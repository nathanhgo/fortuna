export interface PlayerSummary {
  id: number;
  display_name: string;
}

export interface PlayerWithToken extends PlayerSummary {
  token: string;
}

export interface RoomSummary {
  code: string;
  created_at: string;
  players: PlayerSummary[];
}

export interface CreateRoomResult {
  room: RoomSummary;
  player: PlayerWithToken;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);
  const data = await response.json();

  if (!response.ok) {
    const message = extractErrorMessage(data);
    throw new ApiError(message, response.status);
  }

  return data as T;
}

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
      }
    }
  }
  return 'Não foi possível completar a operação.';
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function createRoom(displayName: string): Promise<CreateRoomResult> {
  return postJson<CreateRoomResult>('/api/rooms/', { display_name: displayName });
}

export function joinRoom(code: string, displayName: string): Promise<PlayerWithToken> {
  return postJson<PlayerWithToken>(`/api/rooms/${code}/players/`, { display_name: displayName });
}

export function getRoom(code: string): Promise<RoomSummary> {
  return request<RoomSummary>(`/api/rooms/${code}/`);
}
