import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

// DashboardModule: upcomming payments, aggregated view combining score, rewards, badges, notifications
// TODO: implement DashboardController and DashboardService

//planned endpoints:
// GET /api/v1/dashboard

@Module({
  imports: [AuthModule, UsersModule, PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
