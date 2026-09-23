-- Prisma cannot express this PostgreSQL partial uniqueness constraint in schema.prisma.
-- A user may resume at most one briefing, active, or paused simulation session.
CREATE UNIQUE INDEX "SimulationSession_one_resumable_session_per_user"
ON "SimulationSession"("userId")
WHERE "status" IN ('BRIEFING', 'ACTIVE', 'PAUSED');
