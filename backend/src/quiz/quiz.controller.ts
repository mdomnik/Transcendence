import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TopicDto } from './dto';
import { QuizService } from './quiz.service';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/common/decorators/user.decorator';

@Controller('quiz')
export class QuizController {
  constructor(
    private readonly quizService: QuizService,
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Throttle({ ai: { limit: 5, ttl: 60000 } })
  @Get('questions')
  async getQuestions(
    @Query() query: TopicDto,
    @User('id') userId: string,
  ) {
    return this.quizService.getQuestionSet(
      query,
      userId,
    );
  }
}
