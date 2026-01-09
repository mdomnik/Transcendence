import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TopicDto } from './dto';
import { QuizService } from './quiz.service';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/common/decorators/user.decorator';

// Endpoint of the quiz module used for quiz related functionality
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) { }

  // GET for (/api/quiz/questions) endpoint which takes a query of ({topic=x&qnum=x&&difficulty=x})
  @UseGuards(AuthGuard('jwt')) // Guard Requiring jwt authentication for call
  @Throttle({ ai: { limit: 5, ttl: 60000 } }) // Throttler that limits ip to max 5 calls per minute
  @Get('questions')
  async getQuestions(@Query() query: TopicDto, @User('id') userId: string) {
    return this.quizService.getQuestionSet(query, userId);
  }
  @Post('room')
  async createTestRoom() {
    // const roomId = crypto.randomUUID();
    const roomId = await this.quizService.createRoom();
    return { roomId };
  }
}
