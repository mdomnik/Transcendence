import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { QuestionDto, TopicDto } from './dto';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { AiResponseException } from 'src/common/exceptions/ai-response.exception';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class quizService {
    private readonly logger = new Logger(quizService.name);
    private readonly aiApiKey: string;
    private readonly aiProviderEndpoint: string;
    private readonly aiModel: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.aiProviderEndpoint = this.configService.getOrThrow<string>('AI_API_URL');
        this.aiApiKey = this.configService.getOrThrow<string>('AI_API_KEY');
        this.aiModel = this.configService.getOrThrow<string>('AI_MODEL');
    }

    async generateQuestionSet(dto: TopicDto): Promise<QuestionDto[]> {

        // logging beggining of question generation
        this.logger.log(`Generating question set for topic: ${dto.topic} using model: ${this.aiModel}`);

        // format payload send for trivia generation to the AI API
        const payload = this.buildPayload(dto);

        // call the AI model with a prepared prompt Payload (the returned content will be raw and nonvalidated)
        const response = await this.callAi(payload);

        // extract raw text content from the AI response
        const rawContent = response.choices[0].message.content;

        let parsedJson: unknown;

        // try catch block that attempts parsing the response as a JSON; if failed abort safetly
        try {
            parsedJson = JSON.parse(rawContent);
        } catch (error) {
            this.logger.error('Failed to parse AI response as JSON', {
                dto,
                rawContent,
            });
            throw new AiResponseException('Invalid JSON');
        }

        // check that the parsed content is an array
        if (!Array.isArray(parsedJson))
        {
            this.logger.error('AI response is not an array', {
                dto,
                parsedType: typeof parsedJson,
            });
            throw new AiResponseException('Response is not an array');
        }

        // convert plain JS objects into QuestionDto instances, allowing class-validator to run against defined the DTO ruleset
        const questions = plainToInstance(QuestionDto, parsedJson);

        // validate each question against DTO; if any are invalid, fail the request
        try {
            await Promise.all(
                questions.map((q) => validateOrReject(q))
            );
        } catch(error) {
            this.logger.error('AI response failed DTO validation', {
                dto,
                error,
                parsedJson,
            });
            throw new AiResponseException('DTO validation failed');
        }

        // log the successful entry
        this.logger.log(
            `Successfully generated ${questions.length} questions for topic: ${dto.topic}`,
        );

        // return a validated question set
        return questions;
    }

    private async callAi(payload: unknown): Promise<any> {
        try {
            const response = await this.httpService.axiosRef.post(
                this.aiProviderEndpoint,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${this.aiApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 20_000,
                },
            );
            return response.data;
        } catch (error: any) {
            this.logger.error('AI request failed', {
                error: error?.response?.data ?? error.message,
            });

            throw new AiResponseException('Failed to reach AI provider');
        }
    }

    private buildPayload(dto: TopicDto) {

        const difficultyText = this.difficultyMap(dto.difficulty);

        return {
            model: this.aiModel,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a factual quiz generation engine. You only output valid JSON. You do not explain anything. You do not include extra text.',
                },
                {
                    role: 'user',
                    content: `
Topic: ${dto.topic}

Task:
Generate exactly ${dto.qnum} expert-level quiz questions about the given topic.

Audience assumption:
Assume the player is highly experienced and already knows all common mechanics, rules, and popular knowledge.
Avoid beginner, intermediate, or commonly asked questions.

Difficulty:
EXPERT / NICHE

Content depth rules:
- You MUST include deep, niche, or edge-case knowledge.
- Focus on:
  - Rare mechanics
  - Non-obvious interactions
  - Historical behaviors that persisted for a long time
  - Subtle rule exceptions
  - Advanced strategies or system-level details
- It is acceptable if casual players would find these questions very difficult.
- Avoid information dependent on very recent updates or short-lived changes.

Question design goals:
- Questions should challenge even experienced players.
- A knowledgeable expert should still hesitate.
- Prefer “why”, “how”, or “under what condition” style questions.
- Avoid trivia based purely on numbers unless the number is widely memorized by experts.

Answer rules (CRITICAL):
- Each question must have exactly 4 answer options.
- Exactly ONE answer must be correct.
- ALL incorrect answers must be:
  - Real mechanics, rules, or concepts from the topic
  - Extremely close to the correct answer
  - Correct in similar or adjacent situations, but wrong here
- Differences between answers should be subtle, not obvious.
- No silly or clearly incorrect options.

Output format:
Return a JSON array with exactly ${dto.qnum} objects.

Each object MUST contain:
- question: string
- answer1: string
- answer2: string
- answer3: string
- answer4: string
- c_answer: number (1–4)

Hard constraints:
- Output ONLY the JSON array.
- No explanations, comments, markdown, or extra text.
- Do NOT repeat questions.
- Ensure the correct answer index matches the correct answer text.

If expert-level questions are not possible for the topic, generate the deepest, most technical questions available.
`.trim(),
                },
            ],
            temperature: 0.1,
        };
    }

    private difficultyMap(difficulty: number): string {
        switch (difficulty) {
            case 1:
                return 'easy (basic, introductory facts)';
            case 2:
                return 'medium (commonly known but slightly deeper facts)'
            case 3:
                return 'hard (advanced but still widely accepted facts)';
            default:
                return 'easy';
        }
    }
}

