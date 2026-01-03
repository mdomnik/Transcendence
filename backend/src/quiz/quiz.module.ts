import { Module } from '@nestjs/common';
import { quizController } from './quiz.controller';
import { HttpModule } from '@nestjs/axios';
import { QuizPromptBuilder } from './prompt/quiz.prompt.builder';
import { QuizResponseParser } from './parser/quiz.response.parser';
import { AiClient } from './ai/ai.client';
import { QuizService } from './quiz.service';

@Module({
    imports: [HttpModule],
    providers: [
        QuizService,
        QuizPromptBuilder,
        QuizResponseParser,
        AiClient
    ],
    controllers: [quizController],
    exports: [QuizService],
})
export class quizModule {}
