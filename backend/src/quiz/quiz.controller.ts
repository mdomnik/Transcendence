import { Controller, Get, Post, Query } from '@nestjs/common';
import { TopicDto } from './dto';
import { json } from 'stream/consumers';
import { QuizService } from './quiz.service';
import { Throttle } from '@nestjs/throttler';
import { throttle } from 'rxjs';

@Controller('quiz')
export class quizController {
    constructor(
        private readonly quizService: QuizService,
    ) {}

    @Throttle({ ai: { limit: 5, ttl: 60000 }} )
    @Get('questions')
    async generateQuestions(
        @Query() query: TopicDto,
    ) {
        return this.quizService.generateQuestionSet(query);
    }
}
