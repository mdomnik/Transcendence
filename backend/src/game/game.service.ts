/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LobbyKeys } from 'src/lobby/lobby.keys';
import { RedisService } from 'src/redis/redis.service';
import { GameKeys } from './game.keys';
import { PrismaService } from 'src/prisma/prisma.service';
import { QuizService } from 'src/quiz/quiz.service';
import { RepositoryService } from 'src/quiz/repository/repository.service';
import { LobbyView } from 'src/lobby/lobby.service';

const MAX_ROUNDS = 50;
const MAX_TIME_PER_QUESTION = 120;
const MAX_QUESTIONS_PER_ROUND = 10;
const MAX_TOPIC_CHARACTERS = 40;

const STATIC_FALLBACK_TOPIC = {
  topicTitle: 'Pandas',
  difficulty: 'EASY' as const,
};

type MatchState = 'SETUP' | 'IN_PROGRESS' | 'FINISHED';

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

interface TopicInputView {
  phase: 'TOPIC_INPUT';
  submittedBy: string[];
  proposals: Array<{
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }>;
}

interface VotingView {
  phase: 'VOTING';
  proposals: Array<{
    userId: string;
    topicTitle: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  }>;
  votedBy: string[];
}

interface QuestionSelectionView {
  phase: 'SELECT_QUESTION';
}

interface AnsweringView {
  phase: 'ANSWERING';
  questions: Array<{
    id: string;
    text: string;
    answers: Array<{
      id: string;
      text: string;
    }>;
  }>;
  answeredBy: Record<string, string[]>;
}

interface RoundEndView {
  phase: 'ROUND_END';
  scoreDeltas: Record<string, number>;
  totalScores: Record<string, number>;
}

interface MatchEndView {
  phase: 'MATCH_END';
  finalScores: Record<string, number>;
  winners: string[];
}

export type RoundView =
  | TopicInputView
  | VotingView
  | QuestionSelectionView
  | AnsweringView
  | RoundEndView
  | MatchEndView;

export interface GameView {
  lobbyId: string;

  match: {
    state: MatchState;
    round: number;
    roundsTotal: number;
  };

  phase: {
    state: PhaseState;
    startedAt: number;
    endsAt: number | null;
  };

  config: {
    timePerQuestion: number;
    questionsPerRound: number;
  };

  players: Array<{
    userId: string;
    username: string;
    score: number;
    isConnected: boolean;
  }>;

  roundData: RoundView | null;
}

@Injectable()
export class GameService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly quizService: QuizService,
    private readonly repositoryService: RepositoryService,
  ) {}

  async getGameView(lobbyId: string): Promise<GameView | null> {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );

    if (!matchMeta?.state) {
      return null;
    }

    const matchState = matchMeta.state as MatchState;
    const currentRound = Number(matchMeta.currentRound);

    const configRaw = await this.redis.client.hgetall(
      GameKeys.matchConfig(lobbyId),
    );

    const config = {
      roundsTotal: Number(configRaw.roundsTotal),
      timePerQuestion: Number(configRaw.timePerQuestion),
      questionsPerRound: Number(configRaw.questionsPerRound),
    };

    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, currentRound),
    );

    if (!roundMeta?.phase || !roundMeta.phaseStartedAt) {
      return null;
    }

    const phase = roundMeta.phase as PhaseState;
    const phaseStartedAt = Number(roundMeta.phaseStartedAt);

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

    const rawScores = await this.redis.client.hgetall(GameKeys.scores(lobbyId));

    const players = users.map((u) => ({
      userId: u.id,
      username: u.username,
      score: Number(rawScores[u.id] ?? 0),
      isConnected: true,
    }));

    let roundData: GameView['roundData'] = null;

    if (phase === 'TOPIC_INPUT') {
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
    } else if (phase === 'VOTING') {
      const rawInputs = await this.redis.client.hgetall(
        GameKeys.roundInputs(lobbyId, currentRound),
      );

      const rawVotes = await this.redis.client.hgetall(
        GameKeys.roundVotes(lobbyId, currentRound),
      );

      roundData = {
        phase: 'VOTING',
        proposals: Object.entries(rawInputs).map(([userId, raw]) => {
          const parsed = JSON.parse(raw);
          return {
            userId,
            topicTitle: parsed.topicTitle,
            difficulty: parsed.difficulty,
          };
        }),
        votedBy: Object.keys(rawVotes),
      };
    } else if (phase === 'SELECT_QUESTION') {
      roundData = {
        phase: 'SELECT_QUESTION',
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

      for (const [userId, raw] of Object.entries(rawAnswers)) {
        const parsed = JSON.parse(raw);
        answeredBy[userId] = Object.keys(parsed.answers ?? {});
      }

      roundData = {
        phase: 'ANSWERING',
        questions,
        answeredBy,
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
        .filter(([_, s]) => s === maxScore)
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
      await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
        phase: 'SELECT_QUESTION',
        phaseStartedAt: Date.now().toString(),
      });
      return;
    }

    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
      phase: 'VOTING',
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

    const currentRound = Number(matchMeta.currentRound);

    const roundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, currentRound),
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
    );

    if (!proposalExists) {
      throw new ForbiddenException('Voted proposal does not exist');
    }

    if (userId === votedForUserId)
      throw new ForbiddenException('Cannot vote for your own topic');

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
      return;
    }

    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
      phase: 'SELECT_QUESTION',
      phaseStartedAt: Date.now().toString(),
    });

    return;
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

    if (roundMeta.phase !== 'SELECT_QUESTION') return;

    const rawInputs = await this.redis.client.hgetall(
      GameKeys.roundInputs(lobbyId, round),
    );

    const proposals = Object.entries(rawInputs).map(([userId, value]) => ({
      userId,
      ...JSON.parse(value),
    }));

    let selectedProposal: {
      userId: string | null;
      topicTitle: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    };

    if (proposals.length === 0) {
      const randomTopic = await this.repositoryService.getRandomTopic();

      if (!randomTopic) {
        selectedProposal = {
          userId: null,
          topicTitle: STATIC_FALLBACK_TOPIC.topicTitle,
          difficulty: STATIC_FALLBACK_TOPIC.difficulty,
        };
      } else {
        selectedProposal = {
          userId: null,
          topicTitle: randomTopic.title,
          difficulty: 'EASY',
        };
      }
    } else {
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

        selectedProposal = proposals.find((p) => p.userId === winnerUserId)!;
      } else {
        selectedProposal =
          proposals[Math.floor(Math.random() * proposals.length)];
      }
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
    );

    await this.redis.client.hset(GameKeys.selected(lobbyId, round), {
      topicTitle: selectedProposal.topicTitle,
      difficulty: selectedProposal.difficulty,
      proposerId: selectedProposal.userId ?? '',
    });

    await this.redis.client.set(
      GameKeys.questions(lobbyId, round),
      JSON.stringify(questions),
    );

    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
      phase: 'ANSWERING',
      phaseStartedAt: Date.now().toString(),
    });
  }

  async submitAnswer(
    lobbyId: string,
    userId: string,
    payload: { questionId: string; answerId: string },
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
    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    const allAnswered = (
      await Promise.all(
        members.map(async (memberId) => {
          const raw = await this.redis.client.hget(
            GameKeys.answers(lobbyId, round),
            memberId,
          );
          if (!raw) return false;
          const parsed = JSON.parse(raw);
          return Object.keys(parsed.answers ?? {}).length === questions.length;
        }),
      )
    ).every(Boolean);

    if (!allAnswered) {
      return;
    }

    const latestRoundMeta = await this.redis.client.hgetall(
      GameKeys.roundMeta(lobbyId, round),
    );

    if (latestRoundMeta.phase !== 'ANSWERING') {
      return;
    }

    await this.finalizeAnsweringRound(lobbyId, round);
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
      case 'ROUND_END':
        timeout = 5;
        break;

      default:
        return;
    }

    if (now - phaseStartedAt < timeout * 1000) return;

    await this.handlePhaseTimeout(lobbyId, currentRound, phase);
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
      case 'TOPIC_INPUT': {
        const submittedCount = await this.redis.client.hlen(
          GameKeys.roundInputs(lobbyId, round),
        );

        if (submittedCount === 0) {
          await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
            phase: 'SELECT_QUESTION',
            phaseStartedAt: Date.now().toString(),
          });
          return;
        }

        if (members.length === 2) {
          await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
            phase: 'SELECT_QUESTION',
            phaseStartedAt: Date.now().toString(),
          });
          return;
        }

        await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
          phase: 'VOTING',
          phaseStartedAt: Date.now().toString(),
        });
        return;
      }

      case 'VOTING': {
        await this.redis.client.hset(GameKeys.roundMeta(lobbyId, round), {
          phase: 'SELECT_QUESTION',
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

      default:
        return;
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

    return;
  }

  private async advanceRound(lobbyId: string) {
    const matchMeta = await this.redis.client.hgetall(
      GameKeys.matchMeta(lobbyId),
    );

    if (!matchMeta?.state || matchMeta.state !== 'IN_PROGRESS') {
      return;
    }

    const currentRound = Number(matchMeta.currentRound);

    const configRaw = await this.redis.client.hgetall(
      GameKeys.matchConfig(lobbyId),
    );

    const totalRounds = Number(configRaw.roundsTotal);

    if (!totalRounds || currentRound > totalRounds) {
      throw new Error('Invalid match configuration');
    }

    if (currentRound >= totalRounds) {
      await this.redis.client.hset(GameKeys.matchMeta(lobbyId), {
        state: 'FINISHED',
      });

      await this.redis.client.hset(LobbyKeys.meta(lobbyId), {
        state: 'FINISHED',
      });

      await this.redis.client.hset(GameKeys.roundMeta(lobbyId, currentRound), {
        phase: 'MATCH_END',
        phaseStartedAt: Date.now().toString(),
      });

      await this.finalizeMatchStats(lobbyId);

      return;
    }

    const nextRound = currentRound + 1;

    await this.redis.client.hset(GameKeys.matchMeta(lobbyId), {
      currentRound: nextRound.toString(),
    });

    await this.redis.client.hset(GameKeys.roundMeta(lobbyId, nextRound), {
      phase: 'TOPIC_INPUT',
      phaseStartedAt: Date.now().toString(),
    });

    return;
  }

  private async finalizeMatchStats(lobbyId: string) {
    const members = await this.redis.client.smembers(
      LobbyKeys.members(lobbyId),
    );

    if (members.length === 0) return;

    const rawScores = await this.redis.client.hgetall(GameKeys.scores(lobbyId));

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

  private getPhaseTimeoutSeconds(
    phase: PhaseState,
    config: { timePerQuestion: number },
  ): number | null {
    switch (phase) {
      case 'TOPIC_INPUT':
        return 30;
      case 'VOTING':
        return 20;
      case 'ANSWERING':
        return config.timePerQuestion;
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

    await this.redis.client.hset(GameKeys.roundMeta(lobby.lobbyId, 1), {
      phase: 'TOPIC_INPUT',
      phaseStartedAt: Date.now().toString(),
    });
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

      await this.redis.client.hset(
        GameKeys.roundMeta(
          lobbyId,
          Number(
            (await this.redis.client.hgetall(GameKeys.matchMeta(lobbyId)))
              .currentRound,
          ),
        ),
        {
          phase: 'MATCH_END',
          phaseStartedAt: Date.now().toString(),
        },
      );

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
}
