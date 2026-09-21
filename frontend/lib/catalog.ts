import type { GameKind } from '@/lib/api';

export interface CatalogGame {
  slug: string;
  name: string;
  cover: string;
  description: string;
  available: boolean;
  kind?: GameKind;
  path: string;
}

export const GAME_CATALOG: CatalogGame[] = [
  {
    slug: 'chess',
    name: 'Xadrez',
    cover: '/images/game-covers/chess-cover.png',
    description:
      'Escolha entre a partida fiel ao tabuleiro físico ou o modo assistido, com dicas, notação e relógio.',
    available: true,
    kind: 'chess',
    path: '/jogos/xadrez',
  },
  {
    slug: 'coup',
    name: 'Coup',
    cover: '/images/game-covers/coup-cover.png',
    description:
      'Blefe, acuse e conquiste a corte. Configure quais personagens entram na mesa antes de começar.',
    available: true,
    kind: 'coup',
    path: '/jogos/coup',
  },
  {
    slug: 'battleship',
    name: 'Batalha Naval',
    cover: '/images/game-covers/battleship-cover.png',
    description: 'Posicione sua frota e ataque as coordenadas do adversário até afundar tudo.',
    available: true,
    kind: 'battleship',
    path: '/jogos/batalha-naval',
  },
  {
    slug: 'truco',
    name: 'Truco',
    cover: '/images/game-covers/truco-cover.png',
    description: 'Truco paulista na mesma sala dos outros jogos. Ainda não está na mesa.',
    available: false,
    path: '/jogos/truco',
  },
  {
    slug: 'werewolf',
    name: 'Lobisomem',
    cover: '/images/game-covers/werewolf-cover.png',
    description: 'Dedução social à noite, no estilo Werewolf. Ainda não está na mesa.',
    available: false,
    path: '/jogos/lobisomem',
  },
  {
    slug: 'checkers',
    name: 'Damas',
    cover: '/images/game-covers/damas-cover.png',
    description: 'Damas clássicas, sem conta e com o mesmo convite da sala. Ainda não está na mesa.',
    available: false,
    path: '/jogos/damas',
  },
  {
    slug: 'domino',
    name: 'Dominó',
    cover: '/images/game-covers/domino-cover.png',
    description: 'Dominó em dupla ou todos contra todos. Ainda não está na mesa.',
    available: false,
    path: '/jogos/domino',
  },
];

export const AVAILABLE_KINDS: GameKind[] = GAME_CATALOG.filter(
  (game): game is CatalogGame & { kind: GameKind } => Boolean(game.available && game.kind)
).map((game) => game.kind);

export function gameHref(kind: GameKind, code: string, instanceId: string): string {
  if (kind === 'battleship') return `/sala/${code}/batalha-naval/${instanceId}`;
  if (kind === 'chess') return `/sala/${code}/xadrez/${instanceId}`;
  return `/sala/${code}/coup/${instanceId}`;
}

export function gameLabel(kind: string): string {
  return GAME_CATALOG.find((game) => game.kind === kind || game.slug === kind)?.name ?? kind;
}

export function instanceShortId(id: string): string {
  const compact = id.replace(/-/g, '');
  return `#${compact.slice(0, 6).toUpperCase()}`;
}

export function tableLabel(kind: string, id: string): string {
  return `${gameLabel(kind)} ${instanceShortId(id)}`;
}
