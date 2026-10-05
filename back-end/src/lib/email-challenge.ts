import { randomInt } from 'node:crypto';
import { $Enums } from '../generated/prisma/client.js';
import { isSyntheticInternalEmail } from './internal-user-email.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const EMAIL_CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CHALLENGE_COOLDOWN_MS = 60 * 1000;

export function randomEmailChallengeDueAt(from = new Date()): Date {
  const days = 1 + Math.floor(Math.random() * 15);
  return new Date(from.getTime() + days * DAY_MS);
}

export function createEmailChallengeCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  return `${local.slice(0, 1)}***@${domain}`;
}

export function needsEmailChallenge(user: {
  role: $Enums.UserRole;
  email: string;
  emailChallengeDueAt: Date | null;
}): boolean {
  if (user.role !== $Enums.UserRole.REQUESTER) return false;
  if (isSyntheticInternalEmail(user.email)) return true;
  if (!user.emailChallengeDueAt) return true;
  return user.emailChallengeDueAt.getTime() <= Date.now();
}

export function toEmailChallengePublic(user: {
  role: $Enums.UserRole;
  email: string;
  emailChallengeDueAt: Date | null;
}) {
  const hasRealEmail = !isSyntheticInternalEmail(user.email);
  return {
    needsEmailChallenge: needsEmailChallenge(user),
    hasRealEmail,
    maskedEmail: hasRealEmail ? maskEmail(user.email) : null,
  };
}
