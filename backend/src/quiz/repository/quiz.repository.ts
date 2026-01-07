import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QuestionDto } from '../dto';
import { DIFFICULTY_FROM_INT } from '../domain/difficulty';

@Injectable()
export class QuizRepository {
    constructor(private readonly prisma: PrismaService) { }

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

    async findOrCreateTopic(title: string) {
        return this.prisma.quizTopic.upsert({
            where: { title },
            update: {},
            create: { title },
        });
    }

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

    async findQuestionTextsByTopicAndDifficulty(topicId: string, difficulty: number): Promise<string[]> {
        const rows = await this.prisma.question.findMany({
            where: { topicId, difficulty: DIFFICULTY_FROM_INT[difficulty] },
            select: { text: true },
        });

        return rows.map((r) => r.text);
    }

    async countQuestionsByTopic(topicId: string): Promise<number> {
        return this.prisma.question.count({
            where: { topicId },
        });
    }


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

}
