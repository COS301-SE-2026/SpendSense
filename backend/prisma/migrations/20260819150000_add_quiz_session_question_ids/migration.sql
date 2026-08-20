-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN "questionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
