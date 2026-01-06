export const DIFFICULTY_FROM_INT = {
  1: 'EASY',
  2: 'MEDIUM',
  3: 'HARD',
} as const;

export type DifficultyStr =
  typeof DIFFICULTY_FROM_INT[keyof typeof DIFFICULTY_FROM_INT];
