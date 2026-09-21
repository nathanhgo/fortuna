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

export const PLAYER_TOKEN_HEADER = 'X-Player-Token';

export type GameKind = 'battleship' | 'chess' | 'coup';
export type GameStatus = 'configuring' | 'in_progress' | 'finished';
export type ParticipantRole = 'player' | 'spectator';
export type ShotResult = 'hit' | 'miss' | 'sunk';

export interface GameParticipantSummary {
  display_name: string;
  role: ParticipantRole;
  seat: number | null;
}

export interface GameInstanceSummary {
  id: string;
  game: GameKind;
  status: GameStatus;
  config: Record<string, unknown>;
  participants: GameParticipantSummary[];
  winner_name: string | null;
  created_at: string;
}

export interface BattleshipShot {
  cell: number[];
  result: ShotResult;
}

export interface BattleshipFleetView {
  ships: number[][][];
  shots_received: BattleshipShot[];
}

export interface BattleshipState {
  board_size: number;
  fleet_sizes: number[];
  fleets: Record<string, BattleshipFleetView>;
  turn: string | null;
  winner: string | null;
}

export interface GameInstanceDetail extends GameInstanceSummary {
  state: BattleshipState | null;
  result?: ShotResult;
}

export interface BattleshipConfig {
  board_size: number;
  fleet_sizes: number[];
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
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') {
      return record.detail;
    }
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
      }
      if (typeof value === 'string') {
        return value;
      }
    }
  }
  return 'Não foi possível completar a operação.';
}

function jsonHeaders(token?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { [PLAYER_TOKEN_HEADER]: token } : {}),
  };
}

function postJson<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(body),
  });
}

function patchJson<T>(path: string, body: unknown, token: string): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    headers: jsonHeaders(token),
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

export function listGameInstances(code: string): Promise<GameInstanceSummary[]> {
  return request<GameInstanceSummary[]>(`/api/rooms/${code}/games/`);
}

export function createGameInstance(
  code: string,
  token: string,
  game: GameKind = 'battleship'
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(`/api/rooms/${code}/games/`, { game }, token);
}

export function getGameInstance(
  code: string,
  instanceId: string,
  token?: string
): Promise<GameInstanceDetail> {
  return request<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/`,
    token ? { headers: { [PLAYER_TOKEN_HEADER]: token } } : undefined
  );
}

export function joinGameInstance(
  code: string,
  instanceId: string,
  token: string,
  role: ParticipantRole = 'player'
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/join/`,
    { role },
    token
  );
}

export function updateBattleshipConfig(
  code: string,
  instanceId: string,
  token: string,
  config: BattleshipConfig
): Promise<GameInstanceDetail> {
  return patchJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/config/`,
    config,
    token
  );
}

export function placeBattleshipFleet(
  code: string,
  instanceId: string,
  token: string,
  ships: number[][][]
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/fleet/`,
    { ships },
    token
  );
}

export function fireBattleshipShot(
  code: string,
  instanceId: string,
  token: string,
  cell: number[]
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/shots/`,
    { cell },
    token
  );
}

export function requestRematch(
  code: string,
  instanceId: string,
  token: string
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/rematch/`,
    {},
    token
  );
}
