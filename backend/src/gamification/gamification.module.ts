import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

// GamificationModule: streaks, coins, badges, mascots state
// TODO: implement RewardEngineService and BadgeEngineService when payment rewards are wired.

// planned endpoints:
// GET /api/v1/gamification/profile
// GET /api/v1/gamification/badges

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [GamificationController],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
