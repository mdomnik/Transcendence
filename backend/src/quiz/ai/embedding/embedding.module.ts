import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { AiModule } from '../ai.module';

@Module({
  imports: [AiModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {}
