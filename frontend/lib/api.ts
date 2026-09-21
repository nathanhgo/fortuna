export interface PlayerSummary {
  id: number;
  display_name: string;
  avatar: string;
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
  player_id?: number;
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

export interface ChessLegalMove {
  from: string;
  to: string;
  promotion: string | null;
}

export interface ChessState {
  fen: string;
  white_id: string;
  black_id: string;
  turn: 'white' | 'black';
  status: string;
  winner: string | null;
  clocks: { white_ms: number | null; black_ms: number | null; last_stamp_ms: number };
  in_check: boolean;
  legal_moves: ChessLegalMove[];
  pgn: string;
  last_move: { from: string; to: string } | null;
  viewer_color: 'white' | 'black' | null;
}

export type CoupCharacter =
  | 'duke'
  | 'assassin'
  | 'captain'
  | 'ambassador'
  | 'contessa'
  | 'inquisitor';

export interface CoupPlayerView {
  coins: number;
  hand: (CoupCharacter | null)[];
  hidden_count: number;
  revealed: CoupCharacter[];
  faction: 'loyalist' | 'reformist' | null;
  alive: boolean;
}

export interface CoupPending {
  action?: string;
  actor?: string;
  target?: string | null;
  claimed?: string | null;
  blocker?: string;
  block_claimed?: string;
  deadline_ms?: number;
  drawn?: (CoupCharacter | null)[];
  lose_queue?: { player: string; reason: string; chooser?: string }[];
  shown?: CoupCharacter | null;
  shown_by?: string;
}

export interface CoupLegalAct {
  kind: string;
  target?: string;
  card?: CoupCharacter;
  slot?: number;
}

export interface CoupState {
  players: Record<string, CoupPlayerView>;
  order: string[];
  turn: string;
  phase: string;
  pending: CoupPending;
  history: { text: string }[];
  treasury_reserve: number;
  winner: string | null;
  status: string;
  deck_count: number;
  challenge_seconds: number;
  reformation: boolean;
  inquisitor: boolean;
  viewer_id: string | null;
  legal_acts: CoupLegalAct[];
}

export interface CoupConfig {
  max_players: number;
  copies: Record<string, number>;
  reformation: boolean;
  inquisitor: boolean;
  challenge_seconds: number;
}

export interface GameInstanceDetail extends GameInstanceSummary {
  state: BattleshipState | ChessState | CoupState | null;
  result?: ShotResult;
}

export interface BattleshipConfig {
  board_size: number;
  fleet_sizes: number[];
}

export interface ChessConfig {
  mode: 'realistic' | 'assisted';
  host_color: 'random' | 'white' | 'black';
  initial_seconds?: number | null;
  increment_seconds?: number;
}

export function isChessState(
  state: BattleshipState | ChessState | CoupState | null
): state is ChessState {
  return Boolean(state && 'fen' in state);
}

export function isCoupState(
  state: BattleshipState | ChessState | CoupState | null
): state is CoupState {
  return Boolean(state && 'phase' in state && 'deck_count' in state);
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
  if (response.status === 204) {
    return undefined as T;
  }
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

export function deleteGameInstance(
  code: string,
  instanceId: string,
  token: string
): Promise<void> {
  return request<void>(`/api/rooms/${code}/games/${instanceId}/`, {
    method: 'DELETE',
    headers: { [PLAYER_TOKEN_HEADER]: token },
  });
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

export function updateChessConfig(
  code: string,
  instanceId: string,
  token: string,
  config: ChessConfig
): Promise<GameInstanceDetail> {
  return patchJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/config/`,
    config,
    token
  );
}

export function updateCoupConfig(
  code: string,
  instanceId: string,
  token: string,
  config: CoupConfig
): Promise<GameInstanceDetail> {
  return patchJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/config/`,
    config,
    token
  );
}

export function startGameInstance(
  code: string,
  instanceId: string,
  token: string
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/start/`,
    {},
    token
  );
}

export function playCoupAct(
  code: string,
  instanceId: string,
  token: string,
  act: CoupLegalAct & { cards?: CoupCharacter[]; swap?: boolean; slot?: number }
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/acts/`,
    act,
    token
  );
}

export function playChessMove(
  code: string,
  instanceId: string,
  token: string,
  from: string,
  to: string,
  promotion?: string
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/moves/`,
    { from, to, ...(promotion ? { promotion } : {}) },
    token
  );
}

export function claimChessFlag(
  code: string,
  instanceId: string,
  token: string
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/flag/`,
    {},
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
  token: string,
  config?: BattleshipConfig | ChessConfig | CoupConfig
): Promise<GameInstanceDetail> {
  return postJson<GameInstanceDetail>(
    `/api/rooms/${code}/games/${instanceId}/rematch/`,
    config ? { config } : {},
    token
  );
}

export interface ChatMessageSummary {
  id: number;
  text: string;
  display_name: string;
  avatar: string;
  created_at: string;
  instance_id: string | null;
}

export function updatePlayerAvatar(
  code: string,
  token: string,
  avatar: string
): Promise<PlayerSummary> {
  return patchJson<PlayerSummary>(`/api/rooms/${code}/players/me/`, { avatar }, token);
}

export function listChatMessages(
  code: string,
  token: string,
  instanceId?: string | null
): Promise<ChatMessageSummary[]> {
  const query = instanceId ? `?instance_id=${encodeURIComponent(instanceId)}` : '';
  return request<ChatMessageSummary[]>(`/api/rooms/${code}/messages/${query}`, {
    headers: { [PLAYER_TOKEN_HEADER]: token },
  });
}

export function sendChatMessage(
  code: string,
  token: string,
  text: string,
  instanceId?: string | null
): Promise<ChatMessageSummary> {
  return postJson<ChatMessageSummary>(
    `/api/rooms/${code}/messages/`,
    { text, instance_id: instanceId ?? null },
    token
  );
}
