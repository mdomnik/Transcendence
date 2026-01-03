import { Injectable, Logger } from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { QuestionDto } from '../dto/question.dto';
import { AiResponseException } from 'src/common/exceptions/ai-response.exception';

@Injectable()
export class QuizResponseParser {
  async parse(rawContent: string): Promise<QuestionDto[]> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new AiResponseException('Invalid JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new AiResponseException('Response is not an array');
    }

    const questions = plainToInstance(QuestionDto, parsed);

    await Promise.all(
      questions.map((q) => validateOrReject(q)),
    );

    return questions;
  }
}