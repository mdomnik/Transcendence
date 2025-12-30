import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World, This is a testa!';
  }

  getTest(): string {
    return 'testing';
  }

  // getData(): {
  //   return 
  // }
}
