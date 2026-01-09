import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getConnectionStatus(): string {
    return 'Backend Communication Established. Hi!';
  }
}
