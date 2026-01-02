import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { quizController } from './quiz/quiz.controller';
import { quizService } from './quiz/quiz.service';
import { quizModule } from './quiz/quiz.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({isGlobal: true}), PrismaModule, AuthModule, quizModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
