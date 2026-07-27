-- CreateEnum
CREATE TYPE "QuizTopic" AS ENUM ('BUDGETING', 'CREDIT_SCORE', 'INTEREST', 'DEBT', 'BNPL', 'SUBSCRIPTIONS');

-- CreateEnum
CREATE TYPE "QuizSessionType" AS ENUM ('DAILY', 'TOPIC');

-- CreateEnum
CREATE TYPE "QuizSessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- AlterEnum
ALTER TYPE "UserEventSourceType" ADD VALUE 'QUIZ';

-- AlterEnum
ALTER TYPE "UserEventType" ADD VALUE 'QUIZ_COMPLETED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "monthlyBudget" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "topic" "QuizTopic" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOptionKey" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "QuizSessionType" NOT NULL,
    "topic" "QuizTopic",
    "quizDate" TIMESTAMP(3),
    "status" "QuizSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL,
    "coinsAwarded" INTEGER NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizSessionAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionKey" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizSessionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizQuestion_topic_isActive_idx" ON "QuizQuestion"("topic", "isActive");

-- CreateIndex
CREATE INDEX "QuizSession_userId_status_idx" ON "QuizSession"("userId", "status");

-- CreateIndex
CREATE INDEX "QuizSession_userId_quizDate_idx" ON "QuizSession"("userId", "quizDate");

-- CreateIndex
CREATE UNIQUE INDEX "QuizSession_userId_type_quizDate_key" ON "QuizSession"("userId", "type", "quizDate");

-- CreateIndex
CREATE INDEX "QuizSessionAnswer_sessionId_answeredAt_idx" ON "QuizSessionAnswer"("sessionId", "answeredAt");

-- CreateIndex
CREATE INDEX "QuizSessionAnswer_questionId_idx" ON "QuizSessionAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "QuizSession" ADD CONSTRAINT "QuizSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSessionAnswer" ADD CONSTRAINT "QuizSessionAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "QuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizSessionAnswer" ADD CONSTRAINT "QuizSessionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
