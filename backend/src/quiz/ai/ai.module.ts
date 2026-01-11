import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { PromptService } from '../prompt/prompt.service';
import { ParserService } from '../parser/parser.service';

// AI module
@Module({
    imports: [HttpModule],
    providers: [
        AiService,
        PromptService,
        ParserService,
    ],
    exports: [AiService],
})
export class AiModule { }
