/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { QuestionDto, TopicDto } from './dto';
import { ConfigService } from '@nestjs/config';

import { AiService } from './ai/ai.service';
import { queryObjects } from 'v8';
import { QuizRepository } from './repository/quiz.repository';
import { diff } from 'util';
import { EmbeddingService } from './ai/embedding/embedding.service';
import { Query } from 'pg';
import { QuizRoomService } from './quiz-cache.service';

const TOPIC_SIMILARITY_THRESHOLD = 0.25;
const MAX_EXCLUSIONS = 1000;
const MAX_QUESTIONS_PER_DIFFICULTY = 1000;

@Injectable()
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly aiService: AiService,
    private readonly roomService: QuizRoomService,
  ) {}
  // Calling from quiz-cache.service.ts to fetch cache data from redis
  async getRoomState(roomId: string) {
    return this.roomService.getRoomState(roomId);
  }
  // Create data in the redis cache and
  // returns the roomId for the backend socket to send it to frontend
  async createRoom(): Promise<string> {
    const roomId = crypto.randomUUID();
    await this.roomService.createRoom(roomId);
    this.roomService.createRoom(roomId);

    return roomId;
  }

  async getQuestionSet(dto: TopicDto, userId: string) {
    const { topic, qnum, difficulty } = dto;

    const topicId = await this.findOrCreateEmbedding(topic);

    console.log('user:', userId, 'requesting topic:', dto);
    // Increment how many times users asked for that topic [Analytics]
    await this.quizRepository.incrementTopicRequestCount(topicId);

    // Find how many entries of Questions exist under that topic and difficulty
    const totalQuestionsForTopicDifficulty =
      await this.quizRepository.countQuestionsByTopicAndDifficulty(
        topicId,
        difficulty,
      );

    // disable generation if the database is full
    const limitReached =
      totalQuestionsForTopicDifficulty >= MAX_QUESTIONS_PER_DIFFICULTY;

    // get the number of questions that user has seen under that topic and difficulty
    const unseenQuestions = await this.quizRepository.findUnseenQuestions(
      topicId,
      difficulty,
      userId,
    );

    console.log('unseen question count: ', unseenQuestions.length);

    // if user has seen all topics and there is no space for generation, return a set of random questions
    if (unseenQuestions.length < qnum && limitReached) {
      console.log(
        `MaxSizeReached and seen it all; giving a random set of questions`,
      );

      const allQuestions =
        await this.quizRepository.getAllQuestionsByTopicAndDifficutly(
          topicId,
          difficulty,
        );

      const result = this.pickRandom(allQuestions, qnum);

      await this.quizRepository.markQuestionAsSeen(
        userId,
        result.map((q) => q.id),
      );

      return result;
    }

    //
    if (unseenQuestions.length < qnum) {
      console.log(
        `The user has seen more than the database; generating more; unseen ${unseenQuestions.length}, question amount: ${qnum}`,
      );

      const amountToGenerate = qnum - unseenQuestions.length;

      const ListOfQuestionTexts =
        await this.quizRepository.findQuestionTextsByTopicAndDifficulty(
          topicId,
          difficulty,
        );
      const SetofQuestionTexts = new Set(
        ListOfQuestionTexts.map((q) => q.toLowerCase().trim()),
      );
      const ListOfExcludedQuestions = Array.from(SetofQuestionTexts).slice(
        0,
        MAX_EXCLUSIONS,
      );

      const newGeneratedQuestions = await this.aiService.generateQuestions(
        {
          topic,
          difficulty,
          qnum: amountToGenerate,
        },
        ListOfExcludedQuestions,
      );

      console.log('=== NEW GENERATED QUESTIONS ===');

      newGeneratedQuestions.forEach((q, index) => {
        console.log(`${index + 1}. ${q.question}`);
      });

      console.log('=== END OF NEW GENERATED QUESTIONS ===');

      const filteredGeneratedQuestions = newGeneratedQuestions.filter(
        (q) => !SetofQuestionTexts.has(q.question.toLocaleLowerCase().trim()),
      );

      const newQuestions = await this.quizRepository.createQuestionsWithAnswers(
        filteredGeneratedQuestions,
        topicId,
      );

      console.log(`new questions: ${newQuestions}; end of new questions`);

      let result = [
        ...this.pickRandom(unseenQuestions, unseenQuestions.length),
        ...newQuestions,
      ].slice(0, qnum);

      if (result.length < qnum) {
        const allQuestions =
          await this.quizRepository.getAllQuestionsByTopicAndDifficutly(
            topicId,
            difficulty,
          );
        const filler = this.pickRandom(allQuestions, qnum - result.length);

        let temp = result;

        temp = [...result, ...filler].slice(0, qnum);

        result = temp;
      }

      await this.quizRepository.markQuestionAsSeen(
        userId,
        result.map((q) => q.id),
      );

      return result;
    }

    console.log(
      `user has not seen all questions, returning a random array of unseen questions`,
    );

    const result = this.pickRandom(unseenQuestions, qnum);

    await this.quizRepository.markQuestionAsSeen(
      userId,
      result.map((q) => q.id),
    );

    return result;
  }

  private pickRandom<T>(items: T[], count: number): T[] {
    return [...items].sort(() => Math.random() - 0.5).slice(0, count);
  }

  async findOrCreateEmbedding(topic: string) {
    const inputEmbedding = await this.embeddingService.embed(topic);

    const match = await this.quizRepository.findClosestTopic(inputEmbedding);

    if (match)
      console.log(
        `For topic: ${topic}, closest match: ${match.title}, distance: ${match.distance}`,
      );
    else console.log('no match');

    if (match && match.distance < TOPIC_SIMILARITY_THRESHOLD) {
      return match.id;
    }

    const created = await this.quizRepository.createTopic({
      title: topic,
      embedding: inputEmbedding,
    });

    return created.id;
  }

  async embedQuestions(query: string) {
    console.log(query);
    return this.embeddingService.embed(query);
  }
}
