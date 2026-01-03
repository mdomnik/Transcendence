import { Module } from '@nestjs/common';
import { quizController } from './quiz.controller';
import { HttpModule } from '@nestjs/axios';
import { QuizPromptBuilder } from './prompt/quiz.prompt.builder';
import { QuizResponseParser } from './parser/quiz.response.parser';
import { QuizService } from './quiz.service';
import { AiService } from './ai/ai.service';

@Module({
    imports: [HttpModule],
    providers: [
        QuizService,
        QuizPromptBuilder,
        QuizResponseParser,
        AiService
    ],
    controllers: [quizController],
    exports: [QuizService],
})
export class quizModule {}
