import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { ObligationsModule } from './obligations/obligations.module';
import { PaymentsModule } from './payments/payments.module';
import { CreditModule } from './credit/credit.module';
import { GamificationModule } from './gamification/gamification.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RemindersModule } from './reminders/reminders.module';
import { CategoriesModule } from './categories/categories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentOccurrencesModule } from './payment-occurrences/payment-occurrences.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { QuizModule } from './quiz/quiz.module';
import { InsightsModule } from './insights/insights.module';
import { CreditScoreModule } from './credit-score/credit-score.module';
import { RewardModule } from './rewards/reward.module';
import { CosmeticsModule } from './cosmetics/cosmetics.module';
import { MonthlyWrappedModule } from './wrapped/wrapped.module';
import { FriendsModule } from './friends/friends.module';
import { WagersModule } from './wagers/wagers.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    ObligationsModule,
    PaymentsModule,
    CreditModule,
    GamificationModule,
    DashboardModule,
    RemindersModule,
    CategoriesModule,
    NotificationsModule,
    PaymentOccurrencesModule,
    SchedulerModule,
    QuizModule,
    InsightsModule,
    CreditScoreModule,
    RewardModule,
    CosmeticsModule,
    MonthlyWrappedModule,
    FriendsModule,
    WagersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}