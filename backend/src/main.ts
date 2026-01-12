import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.getHttpAdapter().getInstance().set('trust proxy', true);
  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost', 'https://localhost'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
