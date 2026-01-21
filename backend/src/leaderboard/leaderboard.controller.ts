import { UseGuards, Controller } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import { LeaderboardService } from './leaderboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}
}
