import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTopicDto, UpdateTopicDto } from './dto';

@Injectable()
export class TopicsService {
    constructor(private readonly prisma: PrismaService) { }

    // Gets all quiz topics from DB
    async findAllTopics() {
        return this.prisma.quizTopic.findMany({
            select: {
                id: true,
                title: true,
                requestCount: true,
                createdAt: true,
            }
        });
    }

    // Gets all questions under a specific topic
    async findSpecificTopic(id: string) {
        const topic = await this.prisma.quizTopic.findUnique({
            where: { id },
            include: {
                questions: {
                    select: {
                        id: true,
                        text: true,
                        difficulty: true,
                    }
                }
            }
        });

        if (!topic) {
            throw new NotFoundException('Topic not found');
        }

        return topic;
    }

    // Creates a new topic in the DB
    async createNewTopic(dto: CreateTopicDto) {
        try {
            const topic = await this.prisma.quizTopic.create({
                data: {
                    title: dto.title,
                }
            });
            return topic;
        } catch (error: any) {
            if (error?.code === 'P2002') {
                throw new ConflictException('Quiz topic already exists');
            }
            throw error;
        }
    };

    // Updates id with a new topic name   
    async updateTopic(id: string, dto: UpdateTopicDto) {
        try {
            return await this.prisma.quizTopic.update({
                where: { id },
                data: dto,
            });
        } catch (error: any) {
            if (error?.code === 'P2002') {
                throw new ConflictException('Quiz topic title already exists');
            }
            throw error;
        }
    }

    // Removes the topic from DB
    async removeTopic(id: string) {
        return this.prisma.quizTopic.delete({
            where: { id },
        });
    }

}
