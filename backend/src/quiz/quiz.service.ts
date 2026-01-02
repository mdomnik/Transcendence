import { Injectable } from '@nestjs/common';
import { TopicDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { QuizPromptBuilder } from './prompt/quiz.prompt.builder';
import { AiClient } from './ai/ai.client';
import { QuizResponseParser } from './parser/quiz.response.parser';

@Injectable()
export class QuizService {
  constructor(
    private readonly promptBuilder: QuizPromptBuilder,
    private readonly aiClient: AiClient,
    private readonly parser: QuizResponseParser,
    private readonly configService: ConfigService,
  ) {}

  async generateQuestionSet(dto: TopicDto) {
    const payload = this.promptBuilder.buildPayload(
      dto,
      this.configService.getOrThrow('AI_MODEL'),
    );

    const response = await this.aiClient.send(payload);

    return this.parser.parse(
      response.choices[0].message.content,
    );
  }
}
