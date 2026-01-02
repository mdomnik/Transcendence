import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { AiResponseException } from 'src/common/exceptions/ai-response.exception';

@Injectable()
export class AiClient {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {}
  async send(payload: unknown): Promise<any> {
    try {
      return (
        await this.httpService.axiosRef.post(
          this.configService.getOrThrow('AI_API_URL'),
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.configService.getOrThrow('AI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            timeout: 20_000,
          },
        )
      ).data;
    } catch (error) {
      throw new AiResponseException('AI provider failed');
    }
  }
}