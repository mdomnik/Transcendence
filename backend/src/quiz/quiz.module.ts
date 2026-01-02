import { Module } from '@nestjs/common';
import { quizService } from './quiz.service';
import { quizController } from './quiz.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    providers: [quizService],
    controllers: [quizController],
    exports: [quizService],
})
export class quizModule {}
