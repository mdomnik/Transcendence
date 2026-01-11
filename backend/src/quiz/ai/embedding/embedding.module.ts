import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { AiModule } from '../ai.module';
import { RepositoryModule } from 'src/quiz/repository/repository.module';

// embedding module
@Module({
  imports: [AiModule, RepositoryModule],
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule { }
