/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { LobbyKeys } from 'src/lobby/lobby.keys';
import { RedisService } from 'src/redis/redis.service';
import { GameKeys } from './game.keys';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuizService } from 'src/quiz/quiz.service';
import { RepositoryService } from 'src/quiz/repository/repository.service';
import { LobbyView } from 'src/lobby/lobby.service';
import { GameGateway } from './game.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MatchState } from 'src/types/game.interface';
import { PhaseState } from 'src/types/game.interface';
import { GameView } from 'src/types/game.interface';
const MAX_TOPIC_CHARACTERS = 40;

const STATIC_FALLBACK_TOPIC = {
  topicTitle: 'Cats',
  difficulty: 'EASY' as const,
};

@Injectable()
export class GameService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly quizService: QuizService,
    private readonly repositoryService: RepositoryService,
    @Inject(forwardRef(() => GameGateway))
    private readonly gameGateway: GameGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getGameView(lobbyId: string): Promise<GameView | null> {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );
    if (!matchMeta?.state) return null;

    const matchState = matchMeta.state as MatchState;
    const currentRound = Number(matchMeta.currentRound);

    const rawScores = await this.redis.client.hgetall(GameKeys.scores(lobbyId));
    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, currentRound),
    );
    const configRaw = await this.redis.client.hgetall(
      GameKeys.matchConfig(lobbyId),
    );

    if (!roundMeta?.phase || !roundMeta.phaseStartedAt) {
      return null;
    }

    const phase = roundMeta.phase as PhaseState;
    const phaseStartedAt = Number(roundMeta.phaseStartedAt);
    const config = {
      roundsTotal: Number(configRaw.roundsTotal),
      timePerQuestion: Number(configRaw.timePerQuestion),
      questionsPerRound: Number(configRaw.questionsPerRound),
    };

    const timeoutSeconds = this.getPhaseTimeoutSeconds(phase, config);
    const endsAt =
      timeoutSeconds !== null ? phaseStartedAt + timeoutSeconds * 1000 : null;

    const memberIds = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, username: true },
    });
    const players = users.map((u) => ({
      userId: u.id,
      username: u.username,
      score: Number(rawScores[u.id] ?? 0),
      isConnected: true,
    }));

    let roundData: GameView['roundData'] = null;

    if (phase === 'ROUND_START') {
      roundData = {
        phase: 'ROUND_START',
        round: currentRound,
      };
    } else if (phase === 'TOPIC_INPUT') {
      const rawInputs = await this.redis.client.hgetall(
        GameKeys.roundInputs(lobbyId, currentRound),
      );

      roundData = {
        phase: 'TOPIC_INPUT',
        submittedBy: Object.keys(rawInputs),
        proposals: Object.entries(rawInputs).map(([userId, raw]) => {
          const parsed = JSON.parse(raw);
          return {
            userId,
            topicTitle: parsed.topicTitle,
            difficulty: parsed.difficulty,
          };
        }),
      };
    } else if (phase === 'VOTING_START') {
      roundData = {
        phase: 'VOTING_START',
      };
    } else if (phase === 'VOTING') {
      const rawInputs = await this.redis.client.hgetall(
        GameKeys.roundInputs(lobbyId, currentRound),
      );

      const rawVotes = await this.redis.client.hgetall(
        GameKeys.roundVotes(lobbyId, currentRound),
      );

      const voteCounts: Record<string, number> = {};
      for (const votedForUserId of Object.values(rawVotes)) {
        voteCounts[votedForUserId] = (voteCounts[votedForUserId] ?? 0) + 1;
      }

      roundData = {
        phase: 'VOTING',
        proposals: Object.entries(rawInputs).map(([userId, raw]) => {
          const parsed = JSON.parse(raw);
          return {
            userId,
            topicTitle: parsed.topicTitle,
            difficulty: parsed.difficulty,
            votes: voteCounts[userId] ?? 0,
          };
        }),
        votedBy: Object.keys(rawVotes),
      };
    } else if (phase === 'SELECT_TOPIC') {
      const rawInputs = await this.redis.client.hgetall(
        GameKeys.roundInputs(lobbyId, currentRound),
      );

      const rawVotes = await this.redis.client.hgetall(
        GameKeys.roundVotes(lobbyId, currentRound),
      );

      const voteCounts: Record<string, number> = {};
      for (const votedForUserId of Object.values(rawVotes)) {
        voteCounts[votedForUserId] = (voteCounts[votedForUserId] ?? 0) + 1;
      }

      const selectedRaw = await this.redis.client.hgetall(
        GameKeys.selected(lobbyId, currentRound),
      );

      roundData = {
        phase: 'SELECT_TOPIC',
        proposals: Object.entries(rawInputs).map(([userId, raw]) => {
          const parsed = JSON.parse(raw);
          return {
            userId,
            topicTitle: parsed.topicTitle,
            difficulty: parsed.difficulty,
            votes: voteCounts[userId] ?? 0,
          };
        }),
        selectedProposal: selectedRaw.topicTitle
          ? {
              userId: selectedRaw.proposerId || '',
              topicTitle: selectedRaw.topicTitle,
              difficulty: selectedRaw.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            }
          : undefined,
      };
    } else if (phase === 'ANSWERING') {
      const questionsRaw = await this.redis.client.get(
        GameKeys.questions(lobbyId, currentRound),
      );

      const questions = questionsRaw
        ? JSON.parse(questionsRaw).map((q) => ({
            id: q.id,
            text: q.text,
            answers: q.answers.map((a) => ({
              id: a.id,
              text: a.text,
            })),
          }))
        : [];

      const rawAnswers = await this.redis.client.hgetall(
        GameKeys.answers(lobbyId, currentRound),
      );

      const answeredBy: Record<string, string[]> = {};
      const correctnessMap: Record<string, Record<string, boolean>> = {};

      const fullQuestions = questionsRaw ? JSON.parse(questionsRaw) : [];

      for (const [userId, raw] of Object.entries(rawAnswers)) {
        const parsed = JSON.parse(raw);
        answeredBy[userId] = Object.keys(parsed.answers ?? {});
        correctnessMap[userId] = {};

        for (const q of fullQuestions) {
          const userAnswer = parsed.answers?.[q.id];
          if (userAnswer) {
            const correct = q.answers?.find((a) => a.isCorrect);
            correctnessMap[userId][q.id] = userAnswer.answerId === correct?.id;
          }
        }
      }

      const selectedRaw = await this.redis.client.hgetall(
        GameKeys.selected(lobbyId, currentRound),
      );

      roundData = {
        phase: 'ANSWERING',
        questions,
        answeredBy,
        correctnessMap,
        selectedProposal: selectedRaw.topicTitle
          ? {
              userId: selectedRaw.proposerId || '',
              topicTitle: selectedRaw.topicTitle,
              difficulty: selectedRaw.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            }
          : undefined,
      };
    } else if (phase === 'ROUND_END') {
      const rawScoresNow = await this.redis.client.hgetall(
        GameKeys.scores(lobbyId),
      );

      const rawDeltas = await this.redis.client.get(
        GameKeys.roundScore(lobbyId, currentRound),
      );

      const scoreDeltas = rawDeltas ? JSON.parse(rawDeltas) : {};

      roundData = {
        phase: 'ROUND_END',
        scoreDeltas,
        totalScores: Object.fromEntries(
          Object.entries(rawScoresNow).map(([k, v]) => [k, Number(v)]),
        ),
      };
    } else if (phase === 'MATCH_END') {
      const rawScoresFinal = await this.redis.client.hgetall(
        GameKeys.scores(lobbyId),
      );

      const scores = Object.fromEntries(
        Object.entries(rawScoresFinal).map(([k, v]) => [k, Number(v)]),
      );

      const maxScore = Math.max(...Object.values(scores));
      const winners = Object.entries(scores)
        .filter(([, s]) => s === maxScore)
        .map(([userId]) => userId);

      roundData = {
        phase: 'MATCH_END',
        finalScores: scores,
        winners,
      };
    }

    return {
      lobbyId,
      match: {
        state: matchState,
        round: currentRound,
        roundsTotal: config.roundsTotal,
      },
      phase: {
        state: phase,
        startedAt: phaseStartedAt,
        endsAt,
      },
      config: {
        timePerQuestion: config.timePerQuestion,
        questionsPerRound: config.questionsPerRound,
      },
      players,
      roundData,
    };
  }

  async submitTopic(
    lobbyId: string,
    userId: string,
    input: {
      topicTitle: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    },
  ): Promise<void> {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );

    if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
      throw new ForbiddenException('Match is not in progress');
    }

    const currentRound = Number(matchMeta.currentRound);
    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, currentRound),
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

    if (
      !input.topicTitle ||
      input.topicTitle.trim().length < 3 ||
      input.topicTitle.trim().length > MAX_TOPIC_CHARACTERS
    ) {
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
      return;
    }

    if (members.length === 2) {
      await this.redis.client.del(GameKeys.questions(lobbyId, currentRound));

      // ----- SELECT WINNING PROPOSAL FOR 2-PLAYER GAME -----
      const rawInputs = await this.redis.client.hgetall(
        GameKeys.roundInputs(lobbyId, currentRound),
      );

      const proposals = Object.entries(rawInputs).map(([userId, value]) => ({
        userId,
        ...JSON.parse(value),
      }));

      let selectedProposal;

      if (proposals.length === 0) {
        const randomTopic = await this.repositoryService.getRandomTopic();
        selectedProposal = randomTopic
          ? {
              userId: null,
              topicTitle: randomTopic.title,
              difficulty: 'EASY',
            }
          : {
              userId: null,
              topicTitle: STATIC_FALLBACK_TOPIC.topicTitle,
              difficulty: STATIC_FALLBACK_TOPIC.difficulty,
            };
      } else {
        // For 2 players, pick randomly between the two proposals
        selectedProposal =
          proposals[Math.floor(Math.random() * proposals.length)];
      }

      // Save the selected proposal
      await this.redis.client.hset(GameKeys.selected(lobbyId, currentRound), {
        topicTitle: selectedProposal.topicTitle,
        difficulty: selectedProposal.difficulty,
        proposerId: selectedProposal.userId ?? '',
      });
      await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
        phase: 'SELECT_TOPIC',
        phaseStartedAt: Date.now().toString(),
      });
      return;
    }

    // Show VOTING_START transition
    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
      phase: 'VOTING_START',
      phaseStartedAt: Date.now().toString(),
    });

    return;
  }

  async submitVote(
    lobbyId: string,
    userId: string,
    votedForUserId: string,
  ): Promise<void> {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );
    if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
      throw new ForbiddenException('Match is not in progress');
    }

    const round = Number(matchMeta.currentRound);
    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, round),
    );

    if (roundMeta.phase !== 'VOTING') {
      throw new ForbiddenException('Not in voting phase');
    }

    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    if (!members.includes(userId)) {
      throw new ForbiddenException('User not in lobby');
    }
    if (userId === votedForUserId) {
      throw new ForbiddenException('Cannot vote for your own topic');
    }

    const proposalExists = await this.redis.client.hexists(
      GameKeys.roundInputs(lobbyId, round),
      votedForUserId,
    );

    if (!proposalExists) {
      throw new ForbiddenException('Proposal does not exist');
    }

    // idempotent vote
    const alreadyVoted = await this.redis.client.hexists(
      GameKeys.roundVotes(lobbyId, round),
      userId,
    );

    if (alreadyVoted) return;

    await this.redis.client.hset(
      GameKeys.roundVotes(lobbyId, round),
      userId,
      votedForUserId,
    );

    // ----- COMPLETION CHECK -----
    const votesCount = await this.redis.client.hlen(
      GameKeys.roundVotes(lobbyId, round),
    );

    if (votesCount < members.length) return;

    await this.redis.client.del(GameKeys.questions(lobbyId, round));

    // ----- SELECT WINNING PROPOSAL BEFORE TRANSITION -----
    const rawInputs = await this.redis.client.hgetall(
      GameKeys.roundInputs(lobbyId, round),
    );

    const proposals = Object.entries(rawInputs).map(([userId, value]) => ({
      userId,
      ...JSON.parse(value),
    }));

    let selectedProposal;

    // If there are no submission fallbacks will be used db?? -> cats
    if (proposals.length === 0) {
      const randomTopic = await this.repositoryService.getRandomTopic();
      selectedProposal = randomTopic
        ? {
            userId: null,
            topicTitle: randomTopic.title,
            difficulty: 'EASY',
          }
        : {
            userId: null,
            topicTitle: STATIC_FALLBACK_TOPIC.topicTitle,
            difficulty: STATIC_FALLBACK_TOPIC.difficulty,
          };
    } else {
      const rawVotes = await this.redis.client.hgetall(
        GameKeys.roundVotes(lobbyId, round),
      );

      const voteCounts: Record<string, number> = {};
      Object.values(rawVotes).forEach((v) => {
        voteCounts[v] = (voteCounts[v] ?? 0) + 1;
      });

      const maxVotes = Math.max(0, ...Object.values(voteCounts));
      const winners = Object.entries(voteCounts)
        .filter(([, c]) => c === maxVotes)
        .map(([id]) => id);

      const winnerId =
        winners.length > 0
          ? winners[Math.floor(Math.random() * winners.length)]
          : proposals[Math.floor(Math.random() * proposals.length)].userId;

      selectedProposal = proposals.find((p) => p.userId === winnerId)!;
    }

    await this.redis.client.hset(GameKeys.selected(lobbyId, round), {
      topicTitle: selectedProposal.topicTitle,
      difficulty: selectedProposal.difficulty,
      proposerId: selectedProposal.userId ?? '',
    });

    // ----- TRANSITION PHASE -----
    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
      phase: 'SELECT_TOPIC',
      phaseStartedAt: Date.now().toString(),
    });

    await this.emitGameUpdate(lobbyId);
  }

  async selectQuestion(lobbyId: string): Promise<void> {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );
    if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') return;

    const round = Number(matchMeta.currentRound);
    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, round),
    );

    const questionsExist = await this.redis.client.exists(
      GameKeys.questions(lobbyId, round),
    );

    if (questionsExist) {
      return;
    }

    if (roundMeta.phase !== 'SELECT_TOPIC') return;

    // Acquiring Lock
    const lockKey = GameKeys.selectLock(lobbyId, round);
    const gotLock = await this.redis.client.setnx(lockKey, '1');

    if (!gotLock) {
      return;
    }

    // Auto-release lock if something crashes
    await this.redis.client.pexpire(lockKey, 30_000);

    try {
      let selectedRaw = await this.redis.client.hgetall(
        GameKeys.selected(lobbyId, round),
      );

      if (!selectedRaw || !selectedRaw.topicTitle) {
        const randomTopic = await this.repositoryService.getRandomTopic();
        selectedRaw = randomTopic
          ? {
              topicTitle: randomTopic.title,
              difficulty: 'EASY',
              proposerId: '',
            }
          : {
              topicTitle: STATIC_FALLBACK_TOPIC.topicTitle,
              difficulty: STATIC_FALLBACK_TOPIC.difficulty,
              proposerId: '',
            };
      }

      if (!selectedRaw.topicTitle) {
        console.error('No selected proposal found, this should not happen');
        await this.redis.client.del(lockKey);
        return;
      }

      const selectedProposal = {
        userId: selectedRaw.proposerId || null,
        topicTitle: selectedRaw.topicTitle,
        difficulty: selectedRaw.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
      };

      const members = await this.redis.client.smembers(
        LobbyKeys.members(lobbyId),
      );
      const configRaw = await this.redis.client.hgetall(
        GameKeys.matchConfig(lobbyId),
      );

      const difficultyMap = { EASY: 1, MEDIUM: 2, HARD: 3 };
      const questions = await this.quizService.getQuestionSet(
        {
          topic: selectedProposal.topicTitle,
          difficulty: difficultyMap[selectedProposal.difficulty],
          qnum: Number(configRaw.questionsPerRound),
        },
        members,
      );

      await this.redis.client.set(
        GameKeys.questions(lobbyId, round),
        JSON.stringify(questions),
      );
      await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
        phase: 'ANSWERING',
        phaseStartedAt: Date.now().toString(),
      });

      await this.emitGameUpdate(lobbyId);
    } catch (err) {
      console.log('Error caught in selectQuestion: ', err);
    }
  }

  async submitAnswer(
    lobbyId: string,
    userId: string,
    payload: { questionId: string; answerId: string },
  ): Promise<void> {
    try {
      const matchMeta = await this.redis.client.hgetall(
        GameKeys.matchMeta(lobbyId),
      );
      if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
        throw new ForbiddenException('Match is not in progress');
      }

      // console.log('Answer Submitted', {
      //   lobbyId,
      //   userId,
      //   payload,
      // });

      const round = Number(matchMeta.currentRound);
      const roundMeta = await this.redis.client.hgetall(
        GameKeys.roundMeta(lobbyId, round),
      );

      if (roundMeta.phase !== 'ANSWERING') {
        throw new ForbiddenException('Not in answering phase');
      }

      const isMember = await this.redis.client.sismember(
        LobbyKeys.members(lobbyId),
        userId,
      );

      if (!isMember) {
        throw new ForbiddenException('User not in lobby');
      }

      const questionsData = await this.redis.client.get(
        GameKeys.questions(lobbyId, round),
      );

      if (!questionsData) {
        throw new NotFoundException('Questions not found for this round');
      }

      const questions: any[] = JSON.parse(questionsData);
      const question = questions.find((q) => q.id === payload.questionId);
      if (!question) {
        throw new ForbiddenException('Invalid question');
      }

      // Validate if answer is part of question
      const answerExists =
        Array.isArray(question.answers) &&
        question.answers.some((a) => a.id === payload.answerId);
      if (!answerExists) {
        throw new ForbiddenException('Invalid answer');
      }

      // load user answers
      const rawUserAnswers = await this.redis.client.hget(
        GameKeys.answers(lobbyId, round),
        userId,
      );
      const userAnswers = rawUserAnswers
        ? JSON.parse(rawUserAnswers)
        : { answers: {} };

      if (userAnswers.answers[payload.questionId]) {
        throw new ForbiddenException('Already answered');
      }

      userAnswers.answers[payload.questionId] = {
        answerId: payload.answerId,
        answeredAt: Date.now(),
      };

      await this.redis.client.hset(
        GameKeys.answers(lobbyId, round),
        userId,
        JSON.stringify(userAnswers),
      );

      // check if all players have answered ALL questions
      const members = await this.redis.client.smembers(
        LobbyKeys.members(lobbyId),
      );

      const questionsDataNew = await this.redis.client.get(
        GameKeys.questions(lobbyId, round),
      );
      if (!questionsDataNew) return;

      const questionsNew: any[] = JSON.parse(questionsDataNew);
      const allAnsweredAllQuestions = (
        await Promise.all(
          members.map(async (memberId) => {
            const raw = await this.redis.client.hget(
              GameKeys.answers(lobbyId, round),
              memberId,
            );
            if (!raw) return false;

            const parsed = JSON.parse(raw);
            return questionsNew.every((q) => parsed.answers?.[q.id]);
          }),
        )
      ).every(Boolean);

      if (!allAnsweredAllQuestions) return;

      const latestRoundMeta = await this.redis.client.hgetall(
        GameKeys.roundMeta(lobbyId, round),
      );

      if (latestRoundMeta.phase !== 'ANSWERING') {
        return;
      }

      await this.finalizeAnsweringRound(lobbyId, round);
    } catch (err) {
      console.error('submitAnswer crashed', err);
      throw err;
    }
  }

  async checkPhaseTimeout(lobbyId: string): Promise<boolean> {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );

    if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
      return false;
    }

    const currentRound = Number(matchMeta.currentRound);
    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, currentRound),
    );

    if (!roundMeta.phase || !roundMeta.phaseStartedAt) {
      return false;
    }

    const phase = roundMeta.phase as PhaseState;
    const phaseStartedAt = Number(roundMeta.phaseStartedAt);
    const now = Date.now();

    if (phase === 'SELECT_TOPIC') {
      await this.selectQuestion(lobbyId);
      return false;
    }

    const configRaw = await this.redis.client.hgetall(
      GameKeys.matchConfig(lobbyId),
    );

    const timePerQuestion = Number(configRaw.timePerQuestion);
    const questionsPerRound = Number(configRaw.questionsPerRound);

    let timeout: number | null = null;

    switch (phase) {
      case 'ROUND_START':
        timeout = 3;
        break;
      case 'TOPIC_INPUT':
        timeout = 60;
        break;
      case 'VOTING_START':
        timeout = 3;
        break;
      case 'VOTING':
        timeout = 20;
        break;
      case 'ANSWERING':
        timeout = timePerQuestion * questionsPerRound;
        break;
      case 'ROUND_END':
        timeout = 5;
        break;
    }

    if (!timeout || now - phaseStartedAt < timeout * 1000) {
      return false;
    }

    await this.handlePhaseTimeout(lobbyId, currentRound, phase);

    await this.emitGameUpdate(lobbyId);

    return true;
  }

  private async handlePhaseTimeout(
    lobbyId: string,
    round: number,
    phase: PhaseState,
  ) {
    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    switch (phase) {
      case 'ROUND_START': {
        await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
          phase: 'TOPIC_INPUT',
          phaseStartedAt: Date.now().toString(),
        });
        return;
      }

      case 'TOPIC_INPUT': {
        const submittedCount = await this.redis.client.hlen(
          GameKeys.roundInputs(lobbyId, round),
        );

        const nextPhase =
          submittedCount === 0 || members.length === 2
            ? 'SELECT_TOPIC'
            : 'VOTING_START';

        await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
          phase: nextPhase,
          phaseStartedAt: Date.now().toString(),
        });
        return;
      }

      case 'VOTING_START': {
        await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
          phase: 'VOTING',
          phaseStartedAt: Date.now().toString(),
        });
        return;
      }

      case 'VOTING': {
        await this.redis.client.del(GameKeys.questions(lobbyId, round));
        await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
          phase: 'SELECT_TOPIC',
          phaseStartedAt: Date.now().toString(),
        });
        return;
      }

      case 'ANSWERING': {
        await this.finalizeAnsweringRound(lobbyId, round);
        return;
      }

      case 'ROUND_END': {
        await this.advanceRound(lobbyId);
        return;
      }
    }
  }

  private async finalizeAnsweringRound(lobbyId: string, round: number) {
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

    if (!timePerQuestionSec || !phaseStartedAt) {
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

      if (!raw) continue;

      const parsed = JSON.parse(raw);

      for (const q of questions) {
        const userAnswer = parsed.answers?.[q.id];
        if (!userAnswer) continue;

        const correct = q.answers?.find((a) => a.isCorrect);
        if (!correct) continue;

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

    await this.redis.client.set(
      GameKeys.roundScore(lobbyId, round),
      JSON.stringify(scoreDeltas),
    );

    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
      phase: 'ROUND_END',
      phaseStartedAt: Date.now().toString(),
    });

    await this.emitGameUpdate(lobbyId);
    return;
  }

  private async advanceRound(lobbyId: string) {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );

    if (matchMeta.state !== 'IN_PROGRESS') {
      return;
    }

    const currentRound = Number(matchMeta.currentRound);
    const config = await this.redis.client.hgetall(
      GameKeys.matchConfig(lobbyId),
    );
    const roundsTotal = Number(config.roundsTotal);

    if (currentRound >= roundsTotal) {
      await this.finalizeMatch(lobbyId);
      return;
    }

    const nextRound = currentRound + 1;

    await this.redis.client.hset(GameKeys.matchMeta(lobbyId), {
      currentRound: nextRound.toString(),
    });

    // Clear NEW round data (in case of restart)
    await this.redis.client.del(GameKeys.roundInputs(lobbyId, nextRound));
    await this.redis.client.del(GameKeys.roundVotes(lobbyId, nextRound));
    await this.redis.client.del(GameKeys.questions(lobbyId, nextRound));
    await this.redis.client.del(GameKeys.answers(lobbyId, nextRound));
    await this.redis.client.del(GameKeys.selected(lobbyId, nextRound));
    await this.redis.client.del(GameKeys.selectLock(lobbyId, nextRound));

    // Always start with ROUND_START transition
    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, nextRound), {
      phase: 'ROUND_START',
      phaseStartedAt: Date.now().toString(),
    });

    await this.emitGameUpdate(lobbyId);
    return;
  }

  private async finalizeMatch(lobbyId: string) {
    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    if (members.length === 0) return;

    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );
    const currentRound = Number(matchMeta.currentRound || 1);

    // Get topic from the last round played
    const selected = await this.redis.client.hgetall(
      GameKeys.selected(lobbyId, currentRound),
    );
    const topicTitle = selected?.topicTitle || 'General Knowledge';

    // Find or create topic
    let topic = await this.prisma.quizTopic.findUnique({
      where: { title: topicTitle },
    });

    if (!topic) {
      topic = await this.prisma.quizTopic.create({
        data: { title: topicTitle },
      });
    }

    const rawScores = await this.redis.client.hgetall(GameKeys.scores(lobbyId));
    const scores: Record<string, number> = {};
    const correctCounts: Record<string, number> = {};
    const totalQuestions: Record<string, number> = {};

    for (const userId of members) {
      scores[userId] = Number(rawScores[userId] ?? 0);
      correctCounts[userId] = 0;
      totalQuestions[userId] = 0;
    }

    // Aggregate correct answers across all rounds
    for (let r = 1; r <= currentRound; r++) {
      const qRaw = await this.redis.client.get(GameKeys.questions(lobbyId, r));
      if (!qRaw) continue;
      const questions = JSON.parse(qRaw) as any[];

      for (const userId of members) {
        totalQuestions[userId] += questions.length;
        const ansRaw = await this.redis.client.hget(
          GameKeys.answers(lobbyId, r),
          userId,
        );
        if (!ansRaw) continue;
        const parsed = JSON.parse(ansRaw);

        for (const q of questions) {
          const userAnswer = parsed.answers?.[q.id];
          if (!userAnswer) continue;
          const correct = q.answers?.find((a: any) => a.isCorrect);
          if (correct && userAnswer.answerId === correct.id) {
            correctCounts[userId]++;
          }
        }
      }
    }

    const maxScore = Math.max(...Object.values(scores), -1);

    const winners = new Set(
      Object.entries(scores)
        .filter(([, score]) => score === maxScore && score > 0)
        .map(([userId]) => userId),
    );

    for (const userId of members) {
      const isWinner = winners.has(userId);
      const userScore = scores[userId];

      await this.prisma.userStats.upsert({
        where: { userId },
        update: {
          gamesPlayed: { increment: 1 },
          gamesWon: isWinner ? { increment: 1 } : undefined,
          gamesLost: !isWinner ? { increment: 1 } : undefined,
          totalQuestions: { increment: totalQuestions[userId] },
          correctAnswers: { increment: correctCounts[userId] },
        },
        create: {
          userId,
          gamesPlayed: 1,
          gamesWon: isWinner ? 1 : 0,
          gamesLost: isWinner ? 0 : 1,
          totalQuestions: totalQuestions[userId],
          correctAnswers: correctCounts[userId],
        },
      });
      // Save individual game result for history
      try {
        await this.prisma.gameResult.create({
          data: {
            userId,
            topicId: topic.id,
            score: userScore,
            won: isWinner,
          },
        });
      } catch (e) {
        console.error(`Failed to save game result for user ${userId}:`, e);
      }
    }

    // Sending an event to the leaderboard backend to update leaderboard for everyone
    this.eventEmitter.emit('leaderboard.updated');
    await this.redis.client.hset(GameKeys.matchMeta(lobbyId), {
      state: 'FINISHED',
    });
    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
      phase: 'MATCH_END',
      phaseStartedAt: Date.now().toString(),
    });
  }

  private getPhaseTimeoutSeconds(
    phase: PhaseState,
    config: { timePerQuestion: number; questionsPerRound?: number },
  ): number | null {
    switch (phase) {
      case 'ROUND_START':
        return 3;
      case 'TOPIC_INPUT':
        return 30;
      case 'VOTING_START':
        return 3;
      case 'VOTING':
        return 20;
      case 'ANSWERING':
        return config.timePerQuestion * (config.questionsPerRound || 10);
      case 'ROUND_END':
        return 5;
      default:
        return null;
    }
  }

  async createMatchFromLobby(lobby: LobbyView) {
    await this.redis.client.hset(GameKeys.matchMeta(lobby.lobbyId), {
      state: 'IN_PROGRESS',
      currentRound: '1',
    });

    await this.redis.client.hset(GameKeys.matchConfig(lobby.lobbyId), {
      roundsTotal: lobby.config.roundsTotal.toString(),
      timePerQuestion: lobby.config.timePerQuestion.toString(),
      questionsPerRound: lobby.config.questionsPerRound.toString(),
    });

    // Always start with ROUND_START
    await this.redis.client.hset(GameKeys.roundMeta(lobby.lobbyId, 1), {
      phase: 'ROUND_START',
      phaseStartedAt: Date.now().toString(),
    });

    await this.redis.client.sadd(GameKeys.activeMatches(), lobby.lobbyId);
  }

  async quitGame(lobbyId: string, userId: string) {
    await this.redis.client.srem(LobbyKeys.members(lobbyId), userId);
    await this.redis.client.del(LobbyKeys.userLobby(userId));
    await this.redis.client.hdel(GameKeys.scores(lobbyId), userId);

    const remaining = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    if (remaining.length <= 1) {
      await this.redis.client.hset(GameKeys.matchMeta(lobbyId), {
        state: 'FINISHED',
      });

      await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
        state: 'FINISHED',
      });

      const matchMeta = await this.redis.client.hgetall(
        GameKeys.matchMeta(lobbyId),
      );
      const currentRound = Number(matchMeta.currentRound);

      await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
        phase: 'MATCH_END',
        phaseStartedAt: Date.now().toString(),
      });

      const view = await this.getGameView(lobbyId);
      if (view) {
        await this.redis.client.publish(
          'game-events',
          JSON.stringify({ lobbyId }),
        );
      }

      return;
    }

    const view = await this.getGameView(lobbyId);
    if (!view) return;
  }

  private async emitGameUpdate(lobbyId: string) {
    const view = await this.getGameView(lobbyId);
    if (!view) return;

    this.gameGateway.server.to(lobbyId).emit('game:state', view);
  }
}
