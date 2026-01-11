import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AiResponseException } from 'src/common/exceptions/ai-response.exception';
import { aiLimiter } from './ai.limiter';
import { QuestionDto, TopicDto } from '../dto';
import { PromptService } from '../prompt/prompt.service';
import { ParserService } from '../parser/parser.service';

@Injectable()
export class AiService {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly promptService: PromptService,
        private readonly parserService: ParserService,
    ) { }

    // Main function for AI service; generates quiz question through an api given a topic and a series of past topic to avoid
    async generateQuestions(dto: TopicDto, excludeQuestions: string[],): Promise<QuestionDto[]> {

        // reformat exclusion into single string
        const formattedExclusionQuestions = excludeQuestions.join('\n');

        // build payload based on questions of exclusion topic to a given modle
        const payload = this.promptService.buildPayload(
            dto,
            this.configService.getOrThrow('AI_MODEL'),
            formattedExclusionQuestions,
        );

        // send payload to the coresponding api
        const response = await this.sendChat(payload);

        // parse recieved array
        const generatedArray = await this.parserService.parse(
            response.choices[0].message.content,
            dto.difficulty,
        );

        return generatedArray;
    }

    // send payload to an ai endpoint and recieves a newly generated JSON output
    async sendChat(payload: unknown): Promise<any> {
        // make a post request using axios to the api
        try {
            return await aiLimiter.schedule(async () => {
                const response = await this.httpService.axiosRef.post(
                    this.configService.getOrThrow('CHAT_AI_API_URL'),
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
        } catch (error) { // if rate limit reached return error
            if (error?.response?.status === 429) {
                throw new AiResponseException('AI rate limit reached');
            }
            throw new AiResponseException('AI provider failed'); // return general error on unknown
        }
    }

    // send payload to the embedding api endpoint on the api provider
    async sendEmbed(payload: unknown): Promise<any> {
        try {
            return await aiLimiter.schedule(async () => {
                const response = await this.httpService.axiosRef.post(
                    this.configService.getOrThrow('EMBED_AI_API_URL'),
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