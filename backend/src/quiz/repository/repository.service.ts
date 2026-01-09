import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QuestionDto } from '../dto';
import { DIFFICULTY_FROM_INT } from '../domain/difficulty';

// Service for repository queries
@Injectable()
export class RepositoryService {
    constructor(private readonly prisma: PrismaService) { }

    // finds questions given user did not see under topic per difficulty
    async findUnseenQuestions(
        topicId: string,
        difficulty: number,
        userId: string,
    ) {
        return this.prisma.question.findMany({
            where: {
                difficulty: DIFFICULTY_FROM_INT[difficulty] ?? 'MEDIUM',
                topicId: topicId,
                seenBy: {
                    none: {
                        userId,
                    },
                },
            },
            include: {
                answers: {
                    orderBy: {
                        position: 'asc',
                    },
                },
            },
        });
    }

    // create a question entry under a certain topic
    async createQuestionsWithAnswers(
        questions: QuestionDto[],
        topicId: string,
    ) {
        return this.prisma.$transaction(
            questions.map((q) =>
                this.prisma.question.create({
                    data: {
                        text: q.question,
                        difficulty: DIFFICULTY_FROM_INT[q.difficulty],
                        topicId,

                        answers: {
                            create: q.answers.map((a) => ({
                                text: a.text,
                                isCorrect: a.isCorrect,
                                position: a.position,
                            })),
                        },
                    },
                    include: {
                        answers: true,
                    },
                })
            ),
        );
    }

    // find topic with matching title, else create it
    async findOrCreateTopic(title: string) {
        return this.prisma.quizTopic.upsert({
            where: { title },
            update: {},
            create: { title },
        });
    }

    // mark question as seen in a user question in a user/question map
    async markQuestionAsSeen(
        userId: string,
        questionIds: string[],
    ) {
        if (questionIds.length === 0) return;

        await this.prisma.userQuestion.createMany({
            data: questionIds.map((questionId) => ({
                userId,
                questionId,
            })),
            skipDuplicates: true,
        });
    }

    // returns all questions with a given topic and difficulty and returns their questions text
    async findQuestionTextsByTopicAndDifficulty(topicId: string, difficulty: number): Promise<string[]> {
        const rows = await this.prisma.question.findMany({
            where: { topicId, difficulty: DIFFICULTY_FROM_INT[difficulty] },
            select: { text: true },
        });

        return rows.map((r) => r.text);
    }

    // returns the count of questions under a topic
    async countQuestionsByTopic(topicId: string): Promise<number> {
        return this.prisma.question.count({
            where: { topicId },
        });
    }


    // resets the question/user mapping for a given user
    async resetSeenQuesitonsForUserAndTopicAndDifficulty(
        userId: string,
        topicId: string,
        difficulty: number,
    ) {
        await this.prisma.userQuestion.deleteMany({
            where: {
                userId,
                question: {
                    topicId,
                    difficulty: DIFFICULTY_FROM_INT[difficulty],
                },
            },
        });
    }

    // count amount of questions per topic per difficulty
    async countQuestionsByTopicAndDifficulty(
        topicId: string,
        difficulty: number,
    ): Promise<number> {
        return this.prisma.question.count({
            where: {
                topicId,
                difficulty: DIFFICULTY_FROM_INT[difficulty],
            },
        });
    }

    // increment a variable which tracks the amount of times a topic has been played
    async incrementTopicRequestCount(topicId: string) {
        await this.prisma.quizTopic.update({
            where: { id: topicId },
            data: {
                requestCount: {
                    increment: 1,
                },
            },
        });
    }

    // return all questions with a certain topic and difficulty
    async getAllQuestionsByTopicAndDifficutly(
        topicId: string,
        difficulty: number,
    ) {
        return this.prisma.question.findMany({
            where: {
                difficulty: DIFFICULTY_FROM_INT[difficulty] ?? 'MEDIUM',
                topicId,
            },
            include: {
                answers: {
                    orderBy: {
                        position: 'asc',
                    },
                },
            },
        });
    }

    // runs a sql query which finds vector distance between 2 vector embedded topics
    async findClosestTopic(embedding: number[]) {
        const vectorLiteral = `[${embedding.join(',')}]`;

        const sql = `
    SELECT
      id,
      title,
      embedding <=> '${vectorLiteral}'::vector AS distance
    FROM "QuizTopic"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> '${vectorLiteral}'::vector
    LIMIT 1
  `;

        const result = await this.prisma.$queryRawUnsafe<
            { id: string; title: string; distance: number }[]
        >(sql);

        return result[0] ?? null;
    }

    // creates a topic entry with a vector embedded array 
    async createTopic(data: { title: string; embedding: number[] }) {
        const vectorLiteral = `[${data.embedding.join(',')}]`;

        const sql = `
    INSERT INTO "QuizTopic" (id, title, embedding, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      $1,
      '${vectorLiteral}'::vector,
      now(),
      now()
    )
    RETURNING id, title
  `;

        const result = await this.prisma.$queryRawUnsafe<
            { id: string; title: string }[]
        >(sql, data.title);

        return result[0];
    }

    async getPlayerUsername(userId: string) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            select: { username: true },
        });
    }

}
