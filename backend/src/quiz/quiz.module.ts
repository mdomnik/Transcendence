import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuizService } from './quiz.service';
import { EmbeddingModule } from './ai/embedding/embedding.module';
import { AiModule } from './ai/ai.module';
import { QuizController } from './quiz.controller';
import { RepositoryService } from './repository/repository.service';
import { RepositoryModule } from './repository/repository.module';
import { PromptModule } from './prompt/prompt.module';
import { PromptService } from './prompt/prompt.service';
import { ParserService } from './parser/parser.service';

// Quiz Module export end params
@Module({
    imports: [HttpModule, AiModule, EmbeddingModule, RepositoryModule, PromptModule],
    providers: [
        QuizService,
        PromptService,
        ParserService,
        RepositoryService,
    ],
    controllers: [QuizController],
    exports: [
        QuizService,
        RepositoryService,
    ]
})
export class QuizModule { }