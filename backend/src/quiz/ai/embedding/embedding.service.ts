import { Injectable } from '@nestjs/common';
import { AiService } from '../ai.service';
import { RepositoryService } from 'src/quiz/repository/repository.service';

// Vector embedding threshold, which defines similarity; below threshold = same, above = new entry
// e.g. "tv shows 1990" and "90's tv shows" - similarity 0.22
const TOPIC_SIMILARITY_THRESHOLD = 0.25;

@Injectable()
export class EmbeddingService {
    constructor(private readonly aiService: AiService,
        private readonly repositoryService: RepositoryService,
    ) { }

    // running the vector embedding logic
    async findOrCreateEmbedding(topic: string) {

        // retrieving the vector embedding from topic
        const inputEmbedding = await this.embed(topic);

        // searching the database for closest topic
        const match = await this.repositoryService.findClosestTopic(inputEmbedding);

        // if matches with topic, log; else not
        if (match)
            console.log(`For topic: ${topic}, closest match: ${match.title}, distance: ${match.distance}`);
        else
            console.log('no match');

        // if topic is closer than threshold match the entry to the existing topic
        if (match && match.distance < TOPIC_SIMILARITY_THRESHOLD) {
            return match.id;
        }

        // else, create a ne topic db entry
        const created = await this.repositoryService.createTopic({
            title: topic,
            embedding: inputEmbedding,
        })

        return created.id;
    }

    //question embedding
    async embedQuestions(query: string) {
        console.log(query);
        return this.embed(query);
    }

    // setting up the payload sending to api and format parsing
    async embed(text: string): Promise<number[]> {

        // prepare input
        const input = text.trim().toLowerCase();

        if (!input) {
            throw new Error('Cannot embed empty text');
        }

        // form payload from model and topic
        const payload = {
            model: 'text-embedding-3-small',
            input,
        };

        //send embedding to si
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

        // if not returning an array of exactly 1536 vectors, fail
        if (!Array.isArray(embedding) || embedding.length !== 1536) {
            throw new Error('Unexpected embedding format');
        }
        return embedding;
    }

}
