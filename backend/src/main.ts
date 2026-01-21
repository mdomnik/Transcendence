import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.use(cookieParser());

  app.set('trust proxy', 1);

  app.enableCors({
    origin: [
      'https://localhost',
      'https://quiz.quizeverything.tech',
    ],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
  prefix: '/uploads',
  });
  await app.listen(8080, '0.0.0.0');
}
bootstrap();
