import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.getHttpAdapter().getInstance().set('trust proxy', true);

  app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
    }),
  );
  app.setGlobalPrefix('api');

  await app.listen(8080, '0.0.0.0');
}
bootstrap();