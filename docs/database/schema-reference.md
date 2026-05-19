# SpendSense Demo 1 Database Schema Reference

The Prisma schema in `backend/prisma/schema.prisma` is the source of truth for the Demo 1 database foundation.

## Implemented Demo 1 tables

- `User`
- `UserPreference`
- `NotificationPreference`
- `Category`
- `FinancialObligation`
- `PaymentSchedule`
- `PaymentOccurrence`
- `PaymentRecord`
- `Reminder`
- `Notification`
- `CreditProfile`
- `ScoreEvent`
- `GamificationProfile`
- `UserEvent`
- `RewardTransaction`
- `BadgeDefinition`
- `UserBadge`

## Future tables intentionally not implemented yet

- `Expense`
- `Receipt`
- `Insight`
- `RecurringExpenseSuggestion`
- `AnomalyDetectionResult`
- `PredictionResult`
- `QuizQuestion`
- `QuizSession`
- `QuizAnswer`
- `LearningProgress`
- `FriendRequest`
- `Friendship`
- `Challenge`
- `ChallengeParticipant`
- `ChallengeStake`
- `ChallengeResult`
- `CosmeticItem`
- `UserInventoryItem`
- `MascotStateHistory`
- `MonthlySnapshot`
- `WrappedSummary`
- `RecoveryPlan`
- `RecoveryTask`
- `AchievementDefinition`
- `UserAchievement`
- `StreakEvent`
- `NotificationDeliveryAttempt`
- `PrivacySetting`

## Commands

From the repo root:

```powershell
npm run dev:db:migrate
npm run dev:db:seed
npm run dev:db:seed:demo
npm run dev:db:studio
npm run dev:db:reset
```

From `backend/`:

```powershell
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run prisma:seed:demo
npm run prisma:studio
npm run prisma:reset
npm run prisma:smoke
```

## Verification

After applying migrations and seeds, run:

```powershell
docker compose exec backend npm run prisma:smoke
```

The smoke script verifies the core Demo 1 relation chain:

```text
User -> FinancialObligation -> PaymentSchedule -> PaymentOccurrence -> PaymentRecord -> ScoreEvent
UserEvent -> RewardTransaction
BadgeDefinition -> UserBadge
```

It creates and removes only its own temporary records.

## Visual reference

See `docs/database/erd.md` for the implemented Demo 1 ERD.
