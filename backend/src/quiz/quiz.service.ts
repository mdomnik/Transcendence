import { Injectable } from '@nestjs/common';
import { TopicDto } from './dto';
import { ConfigService } from '@nestjs/config';
import { QuizPromptBuilder } from './prompt/quiz.prompt.builder';
import { QuizResponseParser } from './parser/quiz.response.parser';
import { AiService } from './ai/ai.service';

@Injectable()
export class QuizService {
  constructor(
    private readonly promptBuilder: QuizPromptBuilder,
    private readonly aiService: AiService,
    private readonly parser: QuizResponseParser,
    private readonly configService: ConfigService,
  ) {}

  async generateQuestionSet(dto: TopicDto) {
    const payload = this.promptBuilder.buildPayload(
      dto,
      this.configService.getOrThrow('AI_MODEL'),
    );

    const response = await this.aiService.send(payload);

    return this.parser.parse(
      response.choices[0].message.content,
    );
  }
}
