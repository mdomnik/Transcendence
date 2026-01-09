import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();