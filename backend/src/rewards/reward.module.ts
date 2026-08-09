import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';

@Module({
  providers: [RewardService],
  exports: [RewardService],
})
export class RewardModule {}
