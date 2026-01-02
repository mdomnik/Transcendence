import { Controller, Get, Post, Query } from '@nestjs/common';
import { TopicDto } from './dto';
import { json } from 'stream/consumers';
import { QuizService } from './quiz.service';

@Controller('quiz')
export class quizController {
    constructor(
        private readonly quizService: QuizService,
    ) {}

    @Get('questions')
    async generateQuestions(
        @Query() query: TopicDto,
    ) {
        return this.quizService.generateQuestionSet(query);
    }
}
