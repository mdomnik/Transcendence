import { Module } from '@nestjs/common';
import { RepositoryService } from './repository.service';

// module for repository
@Module({
    providers: [RepositoryService],
    exports: [RepositoryService],
})
export class RepositoryModule { }
