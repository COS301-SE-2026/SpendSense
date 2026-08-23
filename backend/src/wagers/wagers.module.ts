import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { WagersController } from './wagers.controller';
import { WagersService } from './wagers.service';
import { RewardModule } from '../rewards/reward.module';

@Module({
  imports: [AuthModule,NotificationsModule, PrismaModule,RewardModule,UsersModule],
  controllers: [WagersController],
  providers: [WagersService],
})
export class WagersModule {}
