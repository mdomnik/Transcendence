import { Injectable } from '@nestjs/common';
import { TopicDto } from '../dto';
import { DIFFICULTY_PROFILES } from '../difficulty/difficulty.config';

@Injectable()
export class PromptService {
  buildPayload(dto: TopicDto, model: string, excludeQuestions: string) {
    const profile = DIFFICULTY_PROFILES[dto.difficulty];

    const SYSTEM_RULES = `
You are a precision quiz generator.
Output ONLY valid JSON.

Difficulty is RELATIVE to topic familiarity:
- Common topic → raise depth
- Niche topic → simplify

Novelty bias:
- Avoid obvious, meme, or textbook facts
- Vary mechanisms, categories, and angles
- Do not repeat fact styles

Language constraints:
- Do NOT use: most likely, usually, often, tends to, generally, best
- No vague or probabilistic wording

Mechanism rule:
- Test a rule, mechanism, exception, or condition
- Avoid surface traits unless niche

Precision ladder:
- If a casual person can answer instantly, add a constraint

Structure variety:
- Rotate between: causal, conditional, exception, definition, interaction

Excluded (DO NOT repeat or paraphrase):
${excludeQuestions}
`.trim();

    return {
      model,
      temperature: 0.22,
      top_p: 0.9,
      messages: [
        {
          role: 'system',
          content: SYSTEM_RULES,
        },
        {
          role: 'user',
          content: `
Topic: ${dto.topic}
Count: ${dto.qnum}
Difficulty: ${profile.label}
Target: ${profile.successRate}

Rules:
${profile.rules}

Limits:
- Question ≤ 90 characters
- Answer ≤ 35 characters

Format:
Return a JSON array of ${dto.qnum} objects.

Each object:
- question
- subject_icon (same emojis for all)
- answers[4]

Each answer:
- text
- isCorrect (exactly one true)
- position (1-4)

No explanations. No extra text.
`.trim(),
        },
      ],
    };
  }
}
