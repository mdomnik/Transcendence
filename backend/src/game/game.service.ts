import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LobbyKeys } from 'src/lobby/lobby.keys';
import { RedisService } from 'src/redis/redis.service';
import { GameKeys } from './game.keys';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuizService } from 'src/quiz/quiz.service';
import { RepositoryService } from 'src/quiz/repository/repository.service';

const MAX_ROUNDS = 50;
const MAX_TIME_PER_QUESTION = 120;
const MAX_QUESTIONS_PER_ROUND = 10;
const MAX_TOPIC_CHARACTERS = 40;

const STATIC_FALLBACK_TOPIC = {
    topicTitle: 'Pandas',
    difficulty: 'EASY' as const,
}

type MatchState =
    | 'SETUP'
    | 'IN_PROGRESS'
    | 'FINISHED';

type PhaseState =
    | 'TOPIC_INPUT'
    | 'VOTING'
    | 'SELECT_QUESTION'
    | 'ANSWERING'
    | 'ROUND_END'
    | 'MATCH_END';

interface MatchConfig {
    roundsTotal: number;
    timePerQuestion: number;
    questionsPerRound: number;
}

@Injectable()
export class GameService {
    constructor(
        private readonly redis: RedisService,
        private readonly prisma: PrismaService,
        private readonly quizService: QuizService,
        private readonly repositoryService: RepositoryService,
    ) { }


    async setMatchConfig(lobbyId: string, ownerId: string, config: MatchConfig) {
        const lobbyMeta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));

        if (!lobbyMeta?.ownerId) {
            throw new NotFoundException('Lobby not found');
        }

        if (lobbyMeta.ownerId !== ownerId) {
            throw new ForbiddenException('Only lobby owner can start the match');
        }

        if (lobbyMeta.state !== 'SETUP') {
            throw new ForbiddenException(
                'Match can only be started in the SETUP phase'
            );
        }

        if (config.roundsTotal <= 0 || config.roundsTotal > MAX_ROUNDS)
            throw new ForbiddenException('Invalid roundsTotal');

        if (config.timePerQuestion < 5 || config.timePerQuestion > MAX_TIME_PER_QUESTION)
            throw new ForbiddenException('Invalid timePerQuestion');

        if (config.questionsPerRound <= 0 || config.questionsPerRound > MAX_QUESTIONS_PER_ROUND)
            throw new ForbiddenException('Invalid questionsPerRound');

        await this.redis.client.hset(
            GameKeys.matchConfig(lobbyId),
            {
                roundsTotal: config.roundsTotal.toString(),
                timePerQuestion: config.timePerQuestion.toString(),
                questionsPerRound: config.questionsPerRound.toString(),
            },
        );

        return {
            lobbyId,
            config
        };
    }

    async startMatch(lobbyId: string, ownerId: string) {
        const lobbyMeta = await this.redis.client.hgetall(LobbyKeys.meta(lobbyId));

        if (!lobbyMeta?.ownerId) {
            throw new NotFoundException('Lobby not found');
        }

        if (lobbyMeta.ownerId !== ownerId) {
            throw new ForbiddenException('Only lobby owner can start the match');
        }

        if (lobbyMeta.state !== 'SETUP') {
            throw new ForbiddenException(
                'Match can only be started in the SETUP phase'
            );
        }

        const rawConfig = await this.redis.client.hgetall(
            GameKeys.matchConfig(lobbyId),
        )

        if (
            !rawConfig?.roundsTotal ||
            !rawConfig?.timePerQuestion ||
            !rawConfig?.questionsPerRound
        ) {
            throw new ForbiddenException('Match Configuration is not complete');
        }

        const config: MatchConfig = {
            roundsTotal: Number(rawConfig.roundsTotal),
            timePerQuestion: Number(rawConfig.timePerQuestion),
            questionsPerRound: Number(rawConfig.questionsPerRound),
        };

        await this.redis.client.hset(
            GameKeys.matchMeta(lobbyId),
            {
                state: 'IN_PROGRESS',
                currentRound: '1',
            },
        );

        await this.redis.client.hset(
            GameKeys.roundMeta(lobbyId, 1),
            {
                phase: 'TOPIC_INPUT',
                phaseStartedAt: Date.now().toString(),
            }
        )

        await this.redis.client.hset(
            LobbyKeys.meta(lobbyId),
            {
                state: 'IN_PROGRESS',
            },
        );

        return {
            lobbyId,
            state: 'IN_PROGRESS' as MatchState,
            currentRound: 1,
            phase: 'TOPIC_INPUT' as PhaseState,
            config,
        };
    }

    async submitTopic(lobbyId: string, userId: string, input: {
        topicTitle: string;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    },
    ) {
        const matchMeta = await this.redis.client.hgetall(
            GameKeys.matchMeta(lobbyId),
        );

        if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
            throw new ForbiddenException('Match is not in progress');
        }

        const currentRound = Number(matchMeta.currentRound);

        const roundMeta = await this.redis.client.hgetall(
            GameKeys.roundMeta(lobbyId, currentRound)
        );

        if (roundMeta.phase !== 'TOPIC_INPUT') {
            throw new ForbiddenException('Not in topic input phase');
        }

        const isMember = await this.redis.client.sismember(
            LobbyKeys.members(lobbyId),
            userId,
        );

        if (!isMember) {
            throw new ForbiddenException('User is not a lobby member');
        }

        if (!input.topicTitle || input.topicTitle.trim().length < 3 || input.topicTitle.trim().length > MAX_TOPIC_CHARACTERS) {
            throw new ForbiddenException('Invalid topic title');
        }

        if (!['EASY', 'MEDIUM', 'HARD'].includes(input.difficulty)) {
            throw new ForbiddenException('Invalid difficulty');
        }

        const alreadySubmitted = await this.redis.client.hexists(
            GameKeys.roundInputs(lobbyId, currentRound),
            userId,
        );

        if (alreadySubmitted) {
            throw new ForbiddenException('Topic already submitted');
        }

        await this.redis.client.hset(
            GameKeys.roundInputs(lobbyId, currentRound),
            userId,
            JSON.stringify({
                topicTitle: input.topicTitle.trim(),
                difficulty: input.difficulty,
            }),
        );

        const members = await this.redis.client.smembers(
            LobbyKeys.members(lobbyId),
        );

        const submittedCount = await this.redis.client.hlen(
            GameKeys.roundInputs(lobbyId, currentRound),
        );

        if (submittedCount < members.length) {
            return {
                status: 'WAITING_FOR_OTHERS',
            };
        }

        if (members.length === 2) {
            await this.redis.client.hset(
                GameKeys.roundMeta(lobbyId, currentRound),
                {
                    phase: 'SELECT_QUESTION',
                    phaseStartedAt: Date.now().toString(),
                },
            );
            return {
                status: 'ALL_SUBMITTED',
                nextPhase: 'SELECT_QUESTION',
            };
        }

        await this.redis.client.hset(
            GameKeys.roundMeta(lobbyId, currentRound),
            {
                phase: 'VOTING',
                phaseStartedAt: Date.now().toString(),
            },
        );

        return {
            status: 'ALL_SUBMITTED',
            nextPhase: 'VOTING',
        };
    }

    async submitVote(lobbyId: string, userId: string, votedForUserId: string,) {
        const matchMeta = await this.redis.client.hgetall(
            GameKeys.matchMeta(lobbyId),
        );

        if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
            throw new ForbiddenException('Match is not in progress');
        }

        const currentRound = Number(matchMeta.currentRound);

        const roundMeta = await this.redis.client.hgetall(
            GameKeys.roundMeta(lobbyId, currentRound)
        );

        if (roundMeta.phase !== 'VOTING') {
            throw new ForbiddenException('Not in voting phase');
        }

        const isMember = await this.redis.client.sismember(
            LobbyKeys.members(lobbyId),
            userId,
        );

        if (!isMember) {
            throw new ForbiddenException('User is not a lobby member');
        }

        const alreadyVoted = await this.redis.client.hexists(
            GameKeys.roundVotes(lobbyId, currentRound),
            userId,
        );

        if (alreadyVoted) {
            throw new ForbiddenException('Vote already submitted');
        }

        const proposalExists = await this.redis.client.hexists(
            GameKeys.roundInputs(lobbyId, currentRound),
            votedForUserId,
        )

        if (!proposalExists) {
            throw new ForbiddenException('Voted proposal does not exist');
        }

        if (userId === votedForUserId)
            throw new ForbiddenException('Cannot vote for your own topic')

        await this.redis.client.hset(
            GameKeys.roundVotes(lobbyId, currentRound),
            userId,
            votedForUserId,
        );

        const members = await this.redis.client.smembers(
            LobbyKeys.members(lobbyId),
        );

        const votesCount = await this.redis.client.hlen(
            GameKeys.roundVotes(lobbyId, currentRound),
        );

        if (votesCount < members.length) {
            return {
                status: 'WAITING_FOR_OTHERS'
            };
        }

        await this.redis.client.hset(
            GameKeys.roundMeta(lobbyId, currentRound),
            {
                phase: 'SELECT_QUESTION',
                phaseStartedAt: Date.now().toString(),
            },
        );

        return {
            status: 'ALL_VOTED',
            nextPhase: 'SELECT_QUESTION',
        };
    }

    async selectQuestion(lobbyId: string) {
        const matchMeta = await this.redis.client.hgetall(
            GameKeys.matchMeta(lobbyId),
        );

        if (!matchMeta?.state || matchMeta.state !== 'IN_PROGESS')
            return;


        const round = Number(matchMeta.currentRound);

        const roundMeta = await this.redis.client.hgetall(
            GameKeys.roundMeta(lobbyId, round)
        );

        if (roundMeta.phase !== 'SELECT_QUESTION')
            return;

        const rawInputs = await this.redis.client.hgetall(
            GameKeys.roundInputs(lobbyId, round),
        );

        const proposals = Object.entries(rawInputs).map(
            ([userId, value]) => ({
                userId,
                ...JSON.parse(value),
            }),
        );

        let selectedProposal: {
            userId: string | null,
            topicTitle: string;
            difficulty: 'EASY' | 'MEDIUM' | 'HARD';
        };

        if (proposals.length === 0) {

            const randomTopic = await this.repositoryService.getRandomTopic();

            if (!randomTopic) {
                console.warn('NO DATABASE ENTRY FOR TOPIC FOUND!!!');
                selectedProposal = {
                    userId: null,
                    topicTitle: STATIC_FALLBACK_TOPIC.topicTitle,
                    difficulty: STATIC_FALLBACK_TOPIC.difficulty,
                };
            }
            else {
                selectedProposal = {
                    userId: null,
                    topicTitle: randomTopic.title,
                    difficulty: 'EASY',
                };
            }
        }

        const rawVotes = await this.redis.client.hgetall(
            GameKeys.roundVotes(lobbyId, round),
        );

        const voteCounts: Record<string, number> = {};

        for (const votedFor of Object.values(rawVotes)) {
            voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
        }

        if (Object.keys(voteCounts).length > 0) {
            const maxVotes = Math.max(...Object.values(voteCounts));

            const topCandidates = Object.entries(voteCounts)
                .filter(([_, count]) => count === maxVotes)
                .map(([userId]) => userId);

            const winnerUserId =
                topCandidates[Math.floor(Math.random() * topCandidates.length)];

            selectedProposal = proposals.find(p => p.userId === winnerUserId)!;
        }
        else {
            selectedProposal =
                proposals[Math.floor(Math.random() * proposals.length)];
        }

        const members = await this.redis.client.smembers(
            LobbyKeys.members(lobbyId),
        );

        const configRaw = await this.redis.client.hgetall(
            GameKeys.matchConfig(lobbyId),
        );


        let difficultyNumber = 1;

        switch (selectedProposal.difficulty) {
            case 'EASY':
                difficultyNumber = 1;
                break;
            case 'MEDIUM':
                difficultyNumber = 2;
                break;
            case 'HARD':
                difficultyNumber = 3;
                break;
            default:
                break;
        }

        const questions = await this.quizService.getQuestionSet(
            {
                topic: selectedProposal.topicTitle,
                difficulty: difficultyNumber,
                qnum: Number(configRaw.questionsPerRound),
            },
            members,
        )

        await this.redis.client.hset(
            GameKeys.selected(lobbyId, round),
            {
                topicTitle: selectedProposal.topicTitle,
                difficulty: selectedProposal.difficulty,
                proposerId: selectedProposal.userId ?? '',
            },
        );

        await this.redis.client.set(
            GameKeys.questions(lobbyId, round),
            JSON.stringify(questions),
        );

        await this.redis.client.hset(
            GameKeys.roundMeta(lobbyId, round),
            {
                phase: 'ANSWERING',
                phaseStartedAt: Date.now().toString(),
            },
        );
    }

    async submitAnswer(
        lobbyId: string,
        userId: string,
        payload: { questionId: string; answerId: string },
    ) {
        const matchMeta = await this.redis.client.hgetall(GameKeys.matchMeta(lobbyId));
        if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
            throw new ForbiddenException('Match is not in progress');
        }

        const round = Number(matchMeta.currentRound);

        const roundMeta = await this.redis.client.hgetall(GameKeys.roundMeta(lobbyId, round));
        if (roundMeta.phase !== 'ANSWERING') {
            throw new ForbiddenException('Not in answering phase');
        }

        const isMember = await this.redis.client.sismember(LobbyKeys.members(lobbyId), userId);
        if (!isMember) {
            throw new ForbiddenException('User not in lobby');
        }

        const questionsData = await this.redis.client.get(GameKeys.questions(lobbyId, round));
        if (!questionsData) {
            throw new NotFoundException('Questions not found for this round');
        }

        const questions: any[] = JSON.parse(questionsData);
        const question = questions.find(q => q.id === payload.questionId);
        if (!question) {
            throw new ForbiddenException('Invalid question');
        }

        // Validate if answer is part of question
        const answerExists = Array.isArray(question.answers) &&
            question.answers.some(a => a.id === payload.answerId);
        if (!answerExists) {
            throw new ForbiddenException('Invalid answer');
        }

        // load user answers
        const rawUserAnswers = await this.redis.client.hget(GameKeys.answers(lobbyId, round), userId);
        const userAnswers = rawUserAnswers ? JSON.parse(rawUserAnswers) : { answers: {} };

        if (userAnswers.answers[payload.questionId]) {
            throw new ForbiddenException('Already answered');
        }

        // save answers
        userAnswers.answers[payload.questionId] = {
            answerId: payload.answerId,
            answeredAt: Date.now(),
        };

        await this.redis.client.hset(
            GameKeys.answers(lobbyId, round),
            userId,
            JSON.stringify(userAnswers),
        );

        // check if all players have answered the question
        const members = await this.redis.client.smembers(LobbyKeys.members(lobbyId));

        const allAnswered = (
            await Promise.all(
                members.map(async memberId => {
                    const raw = await this.redis.client.hget(GameKeys.answers(lobbyId, round), memberId);
                    if (!raw) return false;
                    const parsed = JSON.parse(raw);
                    return Object.keys(parsed.answers).length === questions.length;
                }),
            )
        ).every(Boolean);

        if (!allAnswered) {
            return { status: 'WAITING_FOR_OTHERS' };
        }

        const scoreDeltas = await this.finalizeAnsweringRound(
            lobbyId,
            round,
        );

        return {
            status: 'ROUND_COMPLETE',
            scoreDeltas,
        }
    }

    async checkPhaseTimeout(lobbyId: string) {
        const matchMeta = await this.redis.client.hgetall(
            GameKeys.matchMeta(lobbyId),
        );

        if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
            return;
        }

        const currentRound = Number(matchMeta.currentRound);

        const roundMeta = await this.redis.client.hgetall(
            GameKeys.roundMeta(lobbyId, currentRound),
        );

        if (!roundMeta.phase || !roundMeta.phaseStartedAt) {
            return;
        }

        const phase = roundMeta.phase as PhaseState;
        const phaseStartedAt = Number(roundMeta.phaseStartedAt);
        const now = Date.now();

        const configRaw = await this.redis.client.hgetall(
            GameKeys.matchConfig(lobbyId),
        );

        const timePerQuestion = Number(configRaw.timePerQuestion);

        let timeout: number;

        switch (phase) {
            case 'TOPIC_INPUT':
                timeout = 30;
                break;
            case 'VOTING':
                timeout = 20;
                break;
            case 'ANSWERING':
                timeout = timePerQuestion;
                break;
            default:
                return;
        }

        if (now - phaseStartedAt < timeout * 1000)
            return;

        await this.handlePhaseTimeout(lobbyId, currentRound, phase);
    }

    private async handlePhaseTimeout(lobbyId: string, round: number, phase: PhaseState) {
        const members = await this.redis.client.smembers(
            LobbyKeys.members(lobbyId),
        );

        switch (phase) {
            case 'TOPIC_INPUT': {
                const submittedCount = await this.redis.client.hlen(
                    GameKeys.roundInputs(lobbyId, round),
                );

                if (submittedCount === 0) {
                    await this.redis.client.hset(
                        GameKeys.roundMeta(lobbyId, round),
                        {
                            phase: 'SELECT_QUESTION',
                            phaseStartedAt: Date.now().toString(),
                        },
                    );
                    return;
                }

                if (members.length === 2) {
                    await this.redis.client.hset(
                        GameKeys.roundMeta(lobbyId, round),
                        {
                            phase: 'SELECT_QUESTION',
                            phaseStartedAt: Date.now().toString(),
                        },
                    );
                    return;
                }

                await this.redis.client.hset(
                    GameKeys.roundMeta(lobbyId, round),
                    {
                        phase: 'VOTING',
                        phaseStartedAt: Date.now().toString(),
                    },
                );
                return;
            }

            case 'VOTING': {
                await this.redis.client.hset(
                    GameKeys.roundMeta(lobbyId, round),
                    {
                        phase: 'SELECT_QUESTION',
                        phaseStartedAt: Date.now().toString(),
                    },
                );
                return;
            }

            case 'ANSWERING': {
                await this.finalizeAnsweringRound(lobbyId, round);
                return;
            }

            case 'ROUND_END' : {
                await this.advanceRound(lobbyId);
                return;
            }

            default:
                return;

        }
    }

    private async finalizeAnsweringRound(
        lobbyId: string,
        round: number,
    ) {
        const questionsData = await this.redis.client.get(
        GameKeys.questions(lobbyId, round),
        );

        if (!questionsData) {
            throw new Error('Questions not stored for round finilization');
        }

        const questions: any[] = JSON.parse(questionsData);

        const members = await this.redis.client.smembers(
            LobbyKeys.members(lobbyId),
        );

        const roundMeta = await this.redis.client.hgetall(
            GameKeys.roundMeta(lobbyId, round),
        );

        const configRaw = await this.redis.client.hgetall(
            GameKeys.matchConfig(lobbyId),
        );

        const timePerQuestionSec = Number(configRaw.timePerQuestion);
        const phaseStartedAt = Number(roundMeta.phaseStartedAt);

        if(!timePerQuestionSec || !phaseStartedAt) {
            throw new Error('Invalid timing configuration');
        }

        const timeLimit = timePerQuestionSec * 1000;

        const scoreDeltas: Record<string, number> = {};

        for (const memberId of members) {
            scoreDeltas[memberId] = 0;

            const raw = await this.redis.client.hget(
                GameKeys.answers(lobbyId, round),
                memberId,
            );
            
            if (!raw)
                continue;

            const parsed = JSON.parse(raw);

            for (const q of questions) {
                const userAnswer = parsed.answers?.[q.id];
                if (!userAnswer)
                    continue;

                const correct = q.answers?.find(a => a.isCorrect);

                if (!correct)
                    continue;

                if (userAnswer.answerId === correct.id) {
                    const elapsed = userAnswer.answeredAt - phaseStartedAt;
                    const speedFactor = Math.max(0, 1 - elapsed / timeLimit);
                    scoreDeltas[memberId] += Math.floor(1000 * speedFactor);
                }
            }
        }

        for (const memberId of members) {
            if (scoreDeltas[memberId] !== 0) {
                await this.redis.client.hincrby(
                    GameKeys.scores(lobbyId),
                    memberId,
                    scoreDeltas[memberId],
                );
            }
        }

        await this.redis.client.hset(
            GameKeys.roundMeta(lobbyId, round),
            {
                phase: 'ROUND_END',
                phaseStartedAt: Date.now().toString(),
            },
        );

        await this.advanceRound(lobbyId);

        return scoreDeltas;
    }

    private async advanceRound(lobbyId: string) {
        const matchMeta = await this.redis.client.hgetall(
            GameKeys.matchMeta(lobbyId),
        );

        if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
            return;
        }

        const currentRound = Number(matchMeta.currentRound);

        const configRaw = await this.redis.client. hgetall(
            GameKeys.matchConfig(lobbyId),
        );

        const totalRounds = Number(configRaw.roundsTotal);

        if (!totalRounds || currentRound > totalRounds) {
            throw new Error('Invalid match configuration');
        }

        if (currentRound >= totalRounds) {
            await this.redis.client.hset(
                GameKeys.matchMeta(lobbyId),
                {
                    state: 'FINISHED'
                },
            );

            await this.redis.client.hset(
                LobbyKeys.meta(lobbyId),
                {
                    state: 'FINISHED'
                },
            );

            await this.redis.client.hset(
                GameKeys.roundMeta(lobbyId, currentRound),
                {
                    phase: 'MATCH_END',
                    phaseStartedAt: Date.now().toString(),
                },
            );

            await this.finalizeMatchStats(lobbyId);

            await this.redis.client.del(
                GameKeys.matchMeta(lobbyId),
                GameKeys.matchConfig(lobbyId),
                GameKeys.scores(lobbyId),
            );

            return { Status: 'MATCH_FINISHED'};
        }

        const nextRound = currentRound + 1;

        await this.redis.client.hset(
            GameKeys.matchMeta(lobbyId),
            { currentRound: nextRound.toString() },
        );

        await this.redis.client.hset( 
            GameKeys.roundMeta(lobbyId, nextRound),
            {
                phase: 'TOPIC_INPUT',
                phaseStartedAt: Date.now().toString(),
            },
        );

        return {
            status: 'NEXT_ROUND',
            round: nextRound,
            phase: 'TOPIC_INPUT',
        };
    }


    private async finalizeMatchStats(lobbyId: string) {
        const members = await this.redis.client.smembers(
            LobbyKeys.members(lobbyId),
        );

        if(members.length === 0)
            return;

        const rawScores = await this.redis.client.hgetall(
            GameKeys.scores(lobbyId),
        );

        const scores: Record<string, number> = {};
        for (const userId of members) {
            scores[userId] = Number(rawScores[userId] ?? 0);
        }

        const maxScore = Math.max(...Object.values(scores));

        const winners = new Set(
            Object.entries(scores)
                .filter(([_, score]) => score === maxScore)
                .map(([userId]) => userId),
        );

        for (const userId of members) {
            await this.prisma.userStats.upsert({
                where: { userId },
                update: {
                    gamesPlayed: { increment: 1 },
                    gamesWon: winners.has(userId) ? { increment: 1 } : undefined,
                    gamesLost: !winners.has(userId) ? { increment: 1 } : undefined,
                },
                create: {
                    userId,
                    gamesPlayed: 1,
                    gamesWon: winners.has(userId) ? 1 : 0,
                    gamesLost: winners.has(userId) ? 0 : 1,
                },
            });
        }
    }
}
