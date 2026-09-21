import type { CoupCharacter } from '@/lib/api';

export const CHARACTER_LABELS: Record<CoupCharacter, string> = {
  duke: 'Duque',
  assassin: 'Assassino',
  captain: 'Capitão',
  ambassador: 'Embaixador',
  contessa: 'Condessa',
  inquisitor: 'Inquisidor',
};

export const ACTION_LABELS: Record<string, string> = {
  income: 'Renda',
  foreign_aid: 'Ajuda externa',
  coup: 'Golpe',
  tax: 'Taxar',
  assassinate: 'Assassinar',
  steal: 'Roubar',
  exchange: 'Trocar com a corte',
  inquisitor_exchange: 'Consultar a corte',
  examine: 'Examinar',
  convert: 'Converter',
  embezzle: 'Desfalcar',
  challenge: 'Contestar',
  block: 'Bloquear',
  pass: 'Deixar passar',
};

export const ACTION_HELP: Record<string, string> = {
  income: 'Pegue 1 moeda do tesouro. Ninguém pode contestar nem bloquear.',
  foreign_aid: 'Pegue 2 moedas. Qualquer um pode bloquear alegando o Duque.',
  coup:
    'Pague 7 moedas e o alvo perde uma influência. Não pode ser contestado nem bloqueado. Com 10 moedas, é obrigatório.',
  tax: 'Alegue o Duque e pegue 3 moedas. Pode ser contestado.',
  assassinate:
    'Alegue o Assassino, pague 3 moedas e o alvo perde uma influência. Pode ser contestado ou bloqueado pela Condessa.',
  steal:
    'Alegue o Capitão e pegue até 2 moedas de outro jogador. Pode ser contestado ou bloqueado por Capitão, Embaixador ou Inquisidor.',
  exchange:
    'Alegue o Embaixador, pegue 2 cartas da corte e devolva 2. Pode ser contestado.',
  inquisitor_exchange:
    'Alegue o Inquisidor, pegue 1 carta da corte e devolva 1. Pode ser contestado.',
  examine:
    'Alegue o Inquisidor e olhe uma carta de outro jogador; você pode forçar a troca. Pode ser contestado.',
  convert: 'Pague 1 moeda para mudar a sua facção, ou 2 para mudar a de outra pessoa.',
  embezzle:
    'Pegue as moedas da reserva. Só vale se você NÃO tiver o Duque; quem contestar alega o contrário.',
  challenge: 'Acuse o jogador de não ter o personagem que ele alegou. Quem perder a disputa revela uma carta.',
  block: 'Alegue o personagem que impede essa ação. O bloqueio também pode ser contestado.',
  pass: 'Não conteste nem bloqueie. Se todos passarem (ou o tempo acabar), a ação segue.',
};

export const FACTION_LABELS = {
  loyalist: 'Lealista',
  reformist: 'Reformista',
} as const;

export interface TurnAction {
  kind: string;
  character?: CoupCharacter;
  cost: number;
  needsTarget: boolean;
  affordable: boolean;
}

const MUST_COUP_AT = 10;

const STANDARD_ACTIONS: Omit<TurnAction, 'affordable'>[] = [
  { kind: 'income', cost: 0, needsTarget: false },
  { kind: 'foreign_aid', cost: 0, needsTarget: false },
  { kind: 'coup', cost: 7, needsTarget: true },
];

const CHARACTER_ACTIONS: Omit<TurnAction, 'affordable'>[] = [
  { kind: 'tax', character: 'duke', cost: 0, needsTarget: false },
  { kind: 'assassinate', character: 'assassin', cost: 3, needsTarget: true },
  { kind: 'steal', character: 'captain', cost: 0, needsTarget: true },
  { kind: 'exchange', character: 'ambassador', cost: 0, needsTarget: false },
  { kind: 'inquisitor_exchange', character: 'inquisitor', cost: 0, needsTarget: false },
  { kind: 'examine', character: 'inquisitor', cost: 0, needsTarget: true },
];

export function groupTurnActions({
  hand,
  coins,
  copies,
  reformation,
}: {
  hand: (CoupCharacter | null)[];
  coins: number;
  copies: Record<string, number>;
  reformation: boolean;
}): { standard: TurnAction[]; mine: TurnAction[]; bluff: TurnAction[] } {
  const owned = new Set(hand.filter((card): card is CoupCharacter => Boolean(card)));

  if (coins >= MUST_COUP_AT) {
    return {
      standard: [{ kind: 'coup', cost: 7, needsTarget: true, affordable: true }],
      mine: [],
      bluff: [],
    };
  }

  const withAfford = (act: Omit<TurnAction, 'affordable'>): TurnAction => ({
    ...act,
    affordable: coins >= act.cost,
  });

  const standard = STANDARD_ACTIONS.map(withAfford);
  if (reformation) {
    standard.push(withAfford({ kind: 'convert', cost: 1, needsTarget: false }));
    standard.push(withAfford({ kind: 'embezzle', cost: 0, needsTarget: false }));
  }

  const roleActions = CHARACTER_ACTIONS.filter((act) => {
    if (!act.character) return false;
    return (copies[act.character] ?? 0) > 0;
  }).map(withAfford);

  return {
    standard,
    mine: roleActions.filter((act) => act.character && owned.has(act.character)),
    bluff: roleActions.filter((act) => act.character && !owned.has(act.character)),
  };
}

export function rewriteHistory(text: string, names: Record<string, string>): string {
  return Object.entries(names)
    .sort((left, right) => right[0].length - left[0].length)
    .reduce((result, [id, name]) => result.replaceAll(id, name), text);
}
