import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuizPromptBuilder } from './prompt/quiz.prompt.builder';
import { QuizResponseParser } from './parser/quiz.response.parser';
import { AiService } from './ai/ai.service';
import { QuizRepository } from './repository/quiz.repository';
import { EmbeddingModule } from './ai/embedding/embedding.module';
import { AiModule } from './ai/ai.module';
import { QuizController } from './quiz.controller';
import { QuizGateway } from './quiz.gateway';
import { QuizService } from './quiz.service';
import { RedisModule } from 'src/cache/redis.module';
import { QuizRoomService } from './quiz-room.service';

@Module({
  imports: [HttpModule, AiModule, EmbeddingModule],
  providers: [
    QuizService,
    QuizPromptBuilder,
    QuizResponseParser,
    QuizRepository,
    QuizGateway,
    QuizRoomService,
  ],
  controllers: [QuizController],
})
export class QuizModule {}
