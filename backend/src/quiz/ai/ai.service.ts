import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AiResponseException } from 'src/common/exceptions/ai-response.exception';
import { aiLimiter } from './ai.limiter';

@Injectable()
export class AiService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async send(payload: unknown): Promise<any> {
        try {
            return await aiLimiter.schedule(async () => {
                const response = await this.httpService.axiosRef.post(
                    this.configService.getOrThrow('AI_API_URL'),
                    payload,
                    {
                        headers: {
                            Authorization: `Bearer ${this.configService.getOrThrow('AI_API_KEY')}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 20_000,
                    },
                );

                return response.data;
            });
        } catch (error) {
            if (error?.response?.status === 429) {
                throw new AiResponseException('AI rate limit reached');
            }
            throw new AiResponseException('AI provider failed');
        }
    }
}