-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailChallengeDueAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailChallengeCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "emailChallengeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailChallengeSentAt" TIMESTAMP(3);

-- Agenda o primeiro desafio só para solicitantes com e-mail real.
-- Quem ainda está com e-mail técnico continua bloqueado até cadastrar um e-mail.
UPDATE "User"
SET "emailChallengeDueAt" = NOW() + ((FLOOR(RANDOM() * 15)::int + 1) * INTERVAL '1 day')
WHERE "role" = 'REQUESTER'
  AND "email" NOT ILIKE '%@marmita.internal'
  AND "email" NOT ILIKE '%@mesa.internal'
  AND "emailChallengeDueAt" IS NULL;
