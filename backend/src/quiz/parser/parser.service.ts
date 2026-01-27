import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { QuestionDto } from '../dto/question.dto';
import { AiResponseException } from 'src/common/exceptions/ai-response.exception';

@Injectable()
export class ParserService {

  // parses AI output to check if it is a valid JSON format
  async parse(rawContent: string, difficulty: number): Promise<QuestionDto[]> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent); // check for valid JSON format, else throw exception
    } catch {
      throw new AiResponseException('Invalid JSON');
    }

    if (!Array.isArray(parsed)) { //if not array throw error
      throw new AiResponseException('Response is not an array');
    }

    const questions = plainToInstance(QuestionDto, parsed); // convert plain JSON to dto

    for (const q of questions) { // inject question difficulty
      q.difficulty = difficulty;
    }

    await Promise.all( // check validity of each question based on dtos decorators
      questions.map((q) => validateOrReject(q)),
    );

    return questions;
  }
}