import { Injectable } from '@nestjs/common';
import { TopicDto } from '../dto';
import { DIFFICULTY_PROFILES } from '../difficulty/difficulty.config';

@Injectable()
export class QuizPromptBuilder {
  buildPayload(dto: TopicDto, model: string) {
    const profile = DIFFICULTY_PROFILES[dto.difficulty];

    return {
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a quiz generation engine. You ONLY output valid JSON.',
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

Each object MUST contain:
- question: string
- answer1: string
- answer2: string
- answer3: string
- answer4: string
- c_answer: number (1-4)

Hard constraints:
- Output ONLY the JSON array.
- No explanations or extra text.
          `.trim(),
        },
      ],
      temperature: 0.1,
    };
  }
}