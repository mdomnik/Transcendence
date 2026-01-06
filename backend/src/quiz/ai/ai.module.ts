import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { QuizPromptBuilder } from '../prompt/quiz.prompt.builder';
import { QuizResponseParser } from '../parser/quiz.response.parser';

@Module({
    imports: [HttpModule],
    providers: [
        AiService,
        QuizPromptBuilder,
        QuizResponseParser,
    ],
    exports: [AiService],
})
export class AiModule {}
