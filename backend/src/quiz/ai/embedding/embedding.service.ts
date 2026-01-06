import { Injectable } from '@nestjs/common';
import { AiService } from '../ai.service';

@Injectable()
export class EmbeddingService {
    constructor(private readonly aiService: AiService) { }

    async embed(text: string): Promise<number[]> {

        const input = text.trim().toLowerCase();

        if (!input) {
            throw new Error('Cannot embed empty text');
        }

        const payload = {
            model: 'text-embedding-3-small',
            input,
        };

        const response = await this.aiService.sendEmbed(payload);
        if (
            !response ||
            !response.data ||
            !Array.isArray(response.data) ||
            !response.data[0]?.embedding
        ) {
            throw new Error('Invalid embedding response from AI provider');
        }

        const embedding = response.data[0].embedding;

        if (!Array.isArray(embedding) || embedding.length !== 1536) {
            throw new Error('Unexpected embedding format');
        }
        return embedding;
    }

}
