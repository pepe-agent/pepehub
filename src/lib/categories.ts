export const CATEGORIES = [
  'channel',
  'tool',
  'integration',
  'model',
  'automation',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}
