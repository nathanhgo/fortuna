export const AVATAR_KEYS = [
  'owl',
  'laurel',
  'lyre',
  'column',
  'sun',
  'trident',
  'mask',
  'cornucopia',
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const AVATAR_LABELS: Record<AvatarKey, string> = {
  owl: 'Coruja',
  laurel: 'Louros',
  lyre: 'Lira',
  column: 'Coluna',
  sun: 'Sol',
  trident: 'Tridente',
  mask: 'Máscara',
  cornucopia: 'Cornucópia',
};

export function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(value);
}
