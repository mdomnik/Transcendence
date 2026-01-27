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

Generate a fun, intellectually stimulating quiz for adults on any topic.
The quiz must reward curiosity and insight, not memorization.

Core Principles

No trivial, meme, or obvious questions

Each question must test one clear concept only

Prefer mechanisms, rules, edge cases, exceptions, or hidden relationships

Every question must teach a surprising or clever fact

Difficulty Scaling

Difficulty is relative to topic familiarity:

Common topic → go deeper, more technical, less obvious

Niche topic → simplify, but preserve insight

Novelty Bias

Avoid textbook or pop-culture trivia

Vary domains, mechanisms, and angles

Do not repeat fact styles or structures

Question Mechanics (rotate per question)

Each question must use one of the following:

Causal – why something happens

Conditional – what changes when X occurs

Exception – when the rule breaks

Definition – precise meaning in context

Interaction – how two things affect each other

Language Rules

No vague wording (“often,” “usually,” “might”)

No opinion-based phrasing

No filler (“which of these,” “best answer”)

Answer Option Design (CRITICAL)

Every question must have 4 options that are:

Plausible to a non-expert

Close in meaning or mechanism to the correct answer

Same category and specificity

Clearly distinct (not reworded duplicates)

Distractor Construction Rules

Wrong options must differ by:

a subtle condition

a missing step

a reversed mechanism

a boundary/edge case

or a similar-but-wrong concept

No absurd or unrelated answers

No “all/none of the above”

Self-Check

If a casual adult could eliminate any option instantly, regenerate the question.  

Topic Coverage Rule (MANDATORY)

When a topic contains multiple subdomains, the quiz must intentionally span them.

The generator must detect the natural categories inside a topic and distribute questions across them.

Self-Check

If two consecutive questions feel like they belong to the same category, regenerate one.

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

Language:
the output should always be in english only

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
