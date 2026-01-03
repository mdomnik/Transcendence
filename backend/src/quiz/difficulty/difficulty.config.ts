import { DifficultyProfile } from './difficulty.profile';

export const DIFFICULTY_PROFILES: Record<number, DifficultyProfile> = {
  1: {
    label: 'EASY',
    audience:
      'Assume the player is familiar with the topic at a casual or beginner level.',
    depthRules: `
- Focus on commonly known mechanics and widely recognized concepts.
- Avoid niche interactions or edge cases.
- Prefer clear, straightforward facts.`,
    questionStyle: `
- Prefer direct "what is" or "which of the following" questions.
- Questions should be confidently answerable by casual players.`,
    distractorRules: `
- At least one incorrect answer may be obviously wrong.
- Other incorrect answers should be plausible but clearly distinguishable.`,
  },

  2: {
    label: 'HARD',
    audience:
      'Assume the player is experienced and familiar with standard mechanics and meta knowledge.',
    depthRules: `
- Focus on deeper mechanics, common edge cases, and well-known advanced concepts.
- Include interactions that experienced players should recognize.`,
    questionStyle: `
- Prefer "how" and "under what condition" questions.
- A knowledgeable player should hesitate between at least two options.`,
    distractorRules: `
- All incorrect answers should be plausible and close to the correct one.
- Differences should require careful reading or knowledge.`,
  },

  3: {
    label: 'EXPERT / NICHE',
    audience:
      'Assume the player is highly experienced and deeply knowledgeable.',
    depthRules: `
- You MUST include deep, niche, or obscure knowledge.
- Focus on rare mechanics, subtle exceptions, and historical behaviors.
- It is acceptable if even experienced players find these difficult.`,
    questionStyle: `
- Prefer edge-case, conditional, or system-level questions.
- An expert should still hesitate.`,
    distractorRules: `
- ALL incorrect answers must be extremely close to the correct one.
- Incorrect answers should be correct in very similar situations but wrong here.`,
  },
};