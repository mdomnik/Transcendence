import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';

// module for prompt service
@Module({
    providers: [PromptService],
    exports: [PromptService],
})
export class PromptModule { }
