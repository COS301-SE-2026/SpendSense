-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ZAR', 'USD', 'EUR', 'GBP');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('OBLIGATION', 'EXPENSE', 'BOTH');

-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('RENT', 'SUBSCRIPTION', 'BNPL', 'UTILITY', 'IOU', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ObligationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('ONCE', 'WEEKLY', 'MONTHLY', 'FIXED_INSTALLMENT');

-- CreateEnum
CREATE TYPE "PaymentOccurrenceStatus" AS ENUM ('PENDING', 'PAID', 'PAID_LATE', 'OVERDUE', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('ON_TIME', 'LATE');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('SCHEDULED', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REMINDER', 'SCORE_CHANGE', 'REWARD', 'BADGE_EARNED', 'PAYMENT_STATUS', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ScoreTier" AS ENUM ('BUILDING', 'FAIR', 'GOOD', 'EXCELLENT', 'ELITE');

-- CreateEnum
CREATE TYPE "ScoreEventType" AS ENUM ('PAYMENT_ON_TIME', 'PAYMENT_LATE', 'PAYMENT_OVERDUE', 'PAYMENT_MISSED', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "MascotMood" AS ENUM ('HAPPY', 'NEUTRAL', 'STRESSED', 'SAD', 'CELEBRATING');

-- CreateEnum
CREATE TYPE "UserEventType" AS ENUM ('USER_CREATED', 'OBLIGATION_CREATED', 'PAYMENT_LOGGED', 'PAYMENT_ON_TIME', 'PAYMENT_LATE', 'PAYMENT_OVERDUE', 'SCORE_UPDATED', 'REWARD_GRANTED', 'BADGE_EARNED');

-- CreateEnum
CREATE TYPE "UserEventSourceType" AS ENUM ('USER', 'FINANCIAL_OBLIGATION', 'PAYMENT_OCCURRENCE', 'PAYMENT_RECORD', 'SCORE_EVENT', 'REWARD_TRANSACTION', 'BADGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RewardTransactionType" AS ENUM ('EARNED', 'SPENT', 'ADJUSTED');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('PAYMENT', 'STREAK', 'OBLIGATION', 'SCORE', 'DEMO');

-- CreateEnum
CREATE TYPE "BadgeCriteriaType" AS ENUM ('FIRST_OBLIGATION', 'FIRST_ON_TIME_PAYMENT', 'PAYMENT_STREAK_COUNT', 'SCORE_REACHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseAuthId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "currency" "Currency" NOT NULL DEFAULT 'ZAR',
    "language" TEXT NOT NULL DEFAULT 'en',
    "reducedMotion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultReminderDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL DEFAULT 'BOTH',
    "iconKey" TEXT,
    "colourKey" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialObligation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ObligationType" NOT NULL,
    "status" "ObligationStatus" NOT NULL DEFAULT 'ACTIVE',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ZAR',
    "priority" "ObligationPriority" NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSchedule" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "totalOccurrences" INTEGER,
    "occurrencesGeneratedUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOccurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amountDue" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ZAR',
    "status" "PaymentOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "sequenceNumber" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "overdueAt" TIMESTAMP(3),
    "missedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ZAR',
    "paidDate" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "PaymentRecordStatus" NOT NULL,
    "daysLate" INTEGER NOT NULL DEFAULT 0,
    "simulatedInterest" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL DEFAULT 'IN_APP',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" "ObligationPriority" NOT NULL DEFAULT 'MEDIUM',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sourceType" "UserEventSourceType",
    "sourceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentScore" INTEGER NOT NULL DEFAULT 600,
    "previousScore" INTEGER NOT NULL DEFAULT 600,
    "scoreTier" "ScoreTier" NOT NULL DEFAULT 'GOOD',
    "onTimePaymentCount" INTEGER NOT NULL DEFAULT 0,
    "latePaymentCount" INTEGER NOT NULL DEFAULT 0,
    "missedPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "currentUtilisationScore" DECIMAL(5,2),
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CreditProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creditProfileId" TEXT NOT NULL,
    "occurrenceId" TEXT,
    "paymentRecordId" TEXT,
    "eventType" "ScoreEventType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "scoreBefore" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "calculationMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamificationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coinBalance" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "mascotLevel" INTEGER NOT NULL DEFAULT 1,
    "mascotMood" "MascotMood" NOT NULL DEFAULT 'NEUTRAL',
    "currentPaymentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestPaymentStreak" INTEGER NOT NULL DEFAULT 0,
    "currentKnowledgeStreak" INTEGER NOT NULL DEFAULT 0,
    "longestKnowledgeStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "GamificationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "UserEventType" NOT NULL,
    "sourceType" "UserEventSourceType" NOT NULL,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "type" "RewardTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "criteriaType" "BadgeCriteriaType" NOT NULL,
    "criteriaValue" INTEGER NOT NULL DEFAULT 1,
    "iconKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeDefinitionId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "earnedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON "User"("supabaseAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "Category_isDefault_idx" ON "Category"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_key" ON "Category"("name", "type");

-- CreateIndex
CREATE INDEX "FinancialObligation_userId_deletedAt_idx" ON "FinancialObligation"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "FinancialObligation_userId_type_idx" ON "FinancialObligation"("userId", "type");

-- CreateIndex
CREATE INDEX "FinancialObligation_userId_status_idx" ON "FinancialObligation"("userId", "status");

-- CreateIndex
CREATE INDEX "FinancialObligation_categoryId_idx" ON "FinancialObligation"("categoryId");

-- CreateIndex
CREATE INDEX "PaymentSchedule_obligationId_idx" ON "PaymentSchedule"("obligationId");

-- CreateIndex
CREATE INDEX "PaymentSchedule_isActive_idx" ON "PaymentSchedule"("isActive");

-- CreateIndex
CREATE INDEX "PaymentOccurrence_userId_dueDate_idx" ON "PaymentOccurrence"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "PaymentOccurrence_userId_status_idx" ON "PaymentOccurrence"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentOccurrence_obligationId_idx" ON "PaymentOccurrence"("obligationId");

-- CreateIndex
CREATE INDEX "PaymentOccurrence_scheduleId_idx" ON "PaymentOccurrence"("scheduleId");

-- CreateIndex
CREATE INDEX "PaymentOccurrence_deletedAt_idx" ON "PaymentOccurrence"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_occurrenceId_key" ON "PaymentRecord"("occurrenceId");

-- CreateIndex
CREATE INDEX "PaymentRecord_userId_paidDate_idx" ON "PaymentRecord"("userId", "paidDate");

-- CreateIndex
CREATE INDEX "PaymentRecord_userId_paymentStatus_idx" ON "PaymentRecord"("userId", "paymentStatus");

-- CreateIndex
CREATE INDEX "PaymentRecord_obligationId_idx" ON "PaymentRecord"("obligationId");

-- CreateIndex
CREATE INDEX "PaymentRecord_deletedAt_idx" ON "PaymentRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "Reminder_userId_scheduledFor_idx" ON "Reminder"("userId", "scheduledFor");

-- CreateIndex
CREATE INDEX "Reminder_userId_status_idx" ON "Reminder"("userId", "status");

-- CreateIndex
CREATE INDEX "Reminder_occurrenceId_idx" ON "Reminder"("occurrenceId");

-- CreateIndex
CREATE INDEX "Reminder_deletedAt_idx" ON "Reminder"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");

-- CreateIndex
CREATE INDEX "Notification_sourceType_sourceId_idx" ON "Notification"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Notification_deletedAt_idx" ON "Notification"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditProfile_userId_key" ON "CreditProfile"("userId");

-- CreateIndex
CREATE INDEX "CreditProfile_scoreTier_idx" ON "CreditProfile"("scoreTier");

-- CreateIndex
CREATE INDEX "CreditProfile_deletedAt_idx" ON "CreditProfile"("deletedAt");

-- CreateIndex
CREATE INDEX "ScoreEvent_userId_createdAt_idx" ON "ScoreEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ScoreEvent_creditProfileId_idx" ON "ScoreEvent"("creditProfileId");

-- CreateIndex
CREATE INDEX "ScoreEvent_eventType_idx" ON "ScoreEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "GamificationProfile_userId_key" ON "GamificationProfile"("userId");

-- CreateIndex
CREATE INDEX "GamificationProfile_mascotMood_idx" ON "GamificationProfile"("mascotMood");

-- CreateIndex
CREATE INDEX "GamificationProfile_deletedAt_idx" ON "GamificationProfile"("deletedAt");

-- CreateIndex
CREATE INDEX "UserEvent_userId_createdAt_idx" ON "UserEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserEvent_eventType_idx" ON "UserEvent"("eventType");

-- CreateIndex
CREATE INDEX "UserEvent_sourceType_sourceId_idx" ON "UserEvent"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "RewardTransaction_userId_createdAt_idx" ON "RewardTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardTransaction_sourceEventId_idx" ON "RewardTransaction"("sourceEventId");

-- CreateIndex
CREATE INDEX "RewardTransaction_type_idx" ON "RewardTransaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeDefinition_code_key" ON "BadgeDefinition"("code");

-- CreateIndex
CREATE INDEX "BadgeDefinition_category_idx" ON "BadgeDefinition"("category");

-- CreateIndex
CREATE INDEX "BadgeDefinition_isActive_idx" ON "BadgeDefinition"("isActive");

-- CreateIndex
CREATE INDEX "UserBadge_userId_earnedAt_idx" ON "UserBadge"("userId", "earnedAt");

-- CreateIndex
CREATE INDEX "UserBadge_badgeDefinitionId_idx" ON "UserBadge"("badgeDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeDefinitionId_key" ON "UserBadge"("userId", "badgeDefinitionId");

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialObligation" ADD CONSTRAINT "FinancialObligation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialObligation" ADD CONSTRAINT "FinancialObligation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinancialObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOccurrence" ADD CONSTRAINT "PaymentOccurrence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOccurrence" ADD CONSTRAINT "PaymentOccurrence_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinancialObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOccurrence" ADD CONSTRAINT "PaymentOccurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PaymentSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "PaymentOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinancialObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "PaymentOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditProfile" ADD CONSTRAINT "CreditProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_creditProfileId_fkey" FOREIGN KEY ("creditProfileId") REFERENCES "CreditProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "PaymentOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreEvent" ADD CONSTRAINT "ScoreEvent_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamificationProfile" ADD CONSTRAINT "GamificationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "UserEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeDefinitionId_fkey" FOREIGN KEY ("badgeDefinitionId") REFERENCES "BadgeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
