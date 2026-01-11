import { Injectable } from '@nestjs/common';
import { TopicDto } from '../dto';
import { DIFFICULTY_PROFILES } from '../difficulty/difficulty.config';

// main prompt service
@Injectable()
export class PromptService {

  // this function forms the payload for the ai api call with injections of topic, ai model, and exclusion question array
  // it serves at the primary logic for proper responsing
  buildPayload(dto: TopicDto, model: string, excludeQuestions: string) {
    const profile = DIFFICULTY_PROFILES[dto.difficulty];

    return {
      model,
      messages: [
        {
          role: 'system',
          content: `
You are a quiz generation engine.
You ONLY output valid JSON.

Existing questions (DO NOT repeat or paraphrase these):
${excludeQuestions}

Hard rule:
- Do NOT generate questions that are the same as, very similar to,
  or rewordings of any question listed above.
          `.trim(),
        },
        {
          role: 'user',
          content: `
Topic: ${dto.topic}

Task:
Generate exactly ${dto.qnum} quiz questions.

Difficulty:
${profile.label}

Audience:
${profile.audience}

Content depth rules:
${profile.depthRules}

Question design goals:
${profile.questionStyle}

Answer rules:
${profile.distractorRules}

Output format:
Return a JSON array with exactly ${dto.qnum} objects.
subject_icon is a set of 1-3 emojis best fitting the topic.
The icon MUST be identical in each question.

Each object MUST contain:
- question: string
- subject_icon: string
- answers: array of exactly 4 objects

Each answer object MUST contain:
- text: string
- isCorrect: boolean (exactly ONE true per question)
- position: number (1-4, unique)

Hard constraints:
- answers array length MUST be exactly 4
- positions MUST be 1, 2, 3, 4
- Exactly ONE answer must have isCorrect = true
- Output ONLY the JSON array
- No explanations or extra text
          `.trim(),
        },
      ],
      temperature: 0.1, // hallucination levels
    };
  }
}
