import { Controller, Get, Post, Query } from '@nestjs/common';
import { TopicDto } from './dto';
import { json } from 'stream/consumers';
import { quizService } from './quiz.service';

@Controller('quiz')
export class quizController {
    constructor(
        private readonly quizService: quizService,
    ) {}

    @Get('questions')
    async generateQuestions(
        @Query() query: TopicDto,
    ) {
        return this.quizService.generateQuestionSet(query);
    }
}
