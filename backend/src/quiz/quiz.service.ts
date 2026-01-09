/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { TopicDto } from './dto';
import { AiService } from './ai/ai.service';
import { EmbeddingService } from './ai/embedding/embedding.service';
import { RepositoryService } from './repository/repository.service';
import { CacheService } from './cache/cache.service';

// Maximum amount of previous questions passed down to the question generation prompt for exclusion.
const MAX_EXCLUSIONS = 100;

// Max db entries per topic per difficulty
const MAX_QUESTIONS_PER_DIFFICULTY = 100;

@Injectable()
export class QuizService {
  constructor(
    private readonly repositoryService: RepositoryService,
    private readonly embeddingService: EmbeddingService,
    private readonly aiService: AiService,
    private readonly cacheService: CacheService,
  ) {}

  // Calling from cache.service.ts to fetch cache data from redis
  async getRoomState(roomId: string) {
    return this.cacheService.getRoomState(roomId);
  }
  // Create data in the redis cache and
  // returns the roomId for the backend socket to send it to frontend
  async createRoom(): Promise<string> {
    const roomId = crypto.randomUUID();
    await this.cacheService.createRoom(roomId);

    return roomId;
  }

  // Generates a set of questions based on Topic, amount of questions, and difficulty
  async getQuestionSet(dto: TopicDto, userId: string) {

    const { topic, qnum, difficulty } = dto;

    // runs topic similarity calculations based on vector embeddings
    const topicId = await this.embeddingService.findOrCreateEmbedding(topic);

    // Increment how many times users asked for that topic [Analytics]
    await this.repositoryService.incrementTopicRequestCount(topicId);

    // Find how many entries of Questions exist under that topic and difficulty
    const totalQuestionsForTopicDifficulty =
      await this.repositoryService.countQuestionsByTopicAndDifficulty(
        topicId,
        difficulty,
      );

    // disable generation if the database is full
    const limitReached =
      totalQuestionsForTopicDifficulty >= MAX_QUESTIONS_PER_DIFFICULTY;

    // get the number of questions that user has seen under that topic and difficulty
    const unseenQuestions = await this.repositoryService.findUnseenQuestions(
      topicId,
      difficulty,
      userId,
    );


    // if user has seen all topics and there is no space for generation, return a set of random questions
    if (unseenQuestions.length < qnum && limitReached) {
      const allQuestions = await this.repositoryService.getAllQuestionsByTopicAndDifficutly(
        topicId,
        difficulty,
      )

      const result = this.pickRandom(
        allQuestions,
        qnum,
      );

      await this.repositoryService.markQuestionAsSeen(
        userId,
        result.map((q) => q.id),
      );

      return result;
    }

    // if user has seen all questions in db, and there is space for more; run ai topic generation
    if (unseenQuestions.length < qnum) {
      const amountToGenerate = qnum - unseenQuestions.length;

      // Get list of topic questions 
      const ListOfQuestionTexts = await this.repositoryService.findQuestionTextsByTopicAndDifficulty(topicId, difficulty);
      // transform topics into a set
      const SetofQuestionTexts = new Set(ListOfQuestionTexts.map((q) => q.toLowerCase().trim()));
      // form an exclusion array for all previous questions in the category
      const ListOfExcludedQuestions = Array.from(SetofQuestionTexts).slice(0, MAX_EXCLUSIONS);

      // run a generation call
      const newGeneratedQuestions = await this.aiService.generateQuestions(
        {
          topic,
          difficulty,
          qnum: amountToGenerate,
        },
        ListOfExcludedQuestions,
      )

      // print questions to console
      console.log('GENERATED QUESTIONS: ');
      newGeneratedQuestions.forEach((q, index) => {
        console.log(`${index + 1}. ${q.question}`);
      });

      // check for duplicated
      const filteredGeneratedQuestions = newGeneratedQuestions.filter((q) => !SetofQuestionTexts.has(q.question.toLocaleLowerCase().trim()));

      // form questions from question set and add them to db topic
      const newQuestions = await this.repositoryService.createQuestionsWithAnswers(
        filteredGeneratedQuestions,
        topicId,
      );

      // take random assortment of unseen questions
      let result = [
        ...this.pickRandom(unseenQuestions, unseenQuestions.length),
        ...newQuestions,
      ].slice(0, qnum);

      // if still not all questions, take the remaining from all questions
      if (result.length < qnum) {
        const allQuestions = await this.repositoryService.getAllQuestionsByTopicAndDifficutly(
          topicId,
          difficulty,
        )
        const filler = this.pickRandom(allQuestions, (qnum - result.length));

        let temp = result;

        // join generated with random seen
        temp = [
          ...result,
          ...filler,
        ].slice(0, qnum);

        result = temp;
      }

      // mark presented entries as seen
      await this.repositoryService.markQuestionAsSeen(
        userId,
        result.map((q) => q.id),
      );

      return result;
    }

    // User has not seen all the entries, simply return a random set of questions

    const result = this.pickRandom(unseenQuestions, qnum);

    await this.repositoryService.markQuestionAsSeen(
      userId,
      result.map((q) => q.id),
    );

    return result;
  }


  // private helper template code to generate a random set of items
  private pickRandom<T>(items: T[], count: number): T[] {
    return [...items]
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
  }

}
