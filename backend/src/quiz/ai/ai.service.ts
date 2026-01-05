import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AiResponseException } from 'src/common/exceptions/ai-response.exception';
import { aiLimiter } from './ai.limiter';
import { QuestionDto, TopicDto } from '../dto';
import { QuizPromptBuilder } from '../prompt/quiz.prompt.builder';
import { QuizResponseParser } from '../parser/quiz.response.parser';

@Injectable()
export class AiService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly promptBuilder: QuizPromptBuilder,
        private readonly parser: QuizResponseParser,
    ) { }
    async generateQuestions(dto: TopicDto, excludeQuestions: string[], ): Promise<QuestionDto[]> {

        const formattedExclusionQuestions = excludeQuestions.join('\n');

        const payload = this.promptBuilder.buildPayload(
            dto,
            this.configService.getOrThrow('AI_MODEL'),
            formattedExclusionQuestions,
        );

        console.log(`excludeQuestions: ${formattedExclusionQuestions}`);

        const response = await this.send(payload);

        const generatedArray = await this.parser.parse(
            response.choices[0].message.content,
            dto.difficulty,
        );

        return generatedArray;
    }

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