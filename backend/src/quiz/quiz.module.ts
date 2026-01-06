import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuizPromptBuilder } from './prompt/quiz.prompt.builder';
import { QuizResponseParser } from './parser/quiz.response.parser';
import { QuizService } from './quiz.service';
import { AiService } from './ai/ai.service';
import { QuizRepository } from './repository/quiz.repository';
import { EmbeddingModule } from './ai/embedding/embedding.module';
import { AiModule } from './ai/ai.module';
import { QuizController } from './quiz.controller';

@Module({
    imports: [HttpModule, AiModule, EmbeddingModule],
    providers: [
        QuizService,
        QuizPromptBuilder,
        QuizResponseParser,
        QuizRepository,
    ],
    controllers: [QuizController],
})
export class QuizModule {}