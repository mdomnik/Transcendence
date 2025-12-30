import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World, This is a testaasd!';
  }

  getTest(): string {
    return 'testing';
  }

  getData(): string {
    return 'data';
  }
}
