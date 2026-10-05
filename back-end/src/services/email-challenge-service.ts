import bcrypt from 'bcrypt';
import { HttpError } from '../https/errors/index.js';
import {
  EMAIL_CHALLENGE_COOLDOWN_MS,
  EMAIL_CHALLENGE_TTL_MS,
  createEmailChallengeCode,
  maskEmail,
  randomEmailChallengeDueAt,
} from '../lib/email-challenge.js';
import { isSyntheticInternalEmail } from '../lib/internal-user-email.js';
import { prisma } from '../lib/prisma.js';
import { UserPrismaRepository } from '../repositories/prisma/user-repository.js';
import { $Enums } from '../generated/prisma/client.js';
import { sendEmailChallengeCode } from './mail-service.js';

export type SendEmailChallengeResult = {
  sent: boolean;
  retryAfterSeconds: number;
  maskedEmail: string;
  expiresAt: string | null;
};

function retryAfterSeconds(sentAt: Date): number {
  const elapsed = Date.now() - sentAt.getTime();
  return Math.max(1, Math.ceil((EMAIL_CHALLENGE_COOLDOWN_MS - elapsed) / 1000));
}

export class EmailChallengeService {
  private async requireRequester(userId: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findEmailChallenge(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 404);
    }
    if (user.role !== $Enums.UserRole.REQUESTER) {
      throw new HttpError('Sem permissão para realizar esta ação', 403);
    }
    return user;
  }

  async send(userId: string): Promise<SendEmailChallengeResult> {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await this.requireRequester(userId);

    if (isSyntheticInternalEmail(user.email)) {
      throw new HttpError(
        'Cadastre um e-mail real para receber o código',
        400,
      );
    }

    const now = Date.now();
    if (
      user.emailChallengeCodeHash &&
      user.emailChallengeSentAt &&
      user.emailChallengeExpiresAt &&
      user.emailChallengeExpiresAt.getTime() > now &&
      now - user.emailChallengeSentAt.getTime() < EMAIL_CHALLENGE_COOLDOWN_MS
    ) {
      return {
        sent: false,
        retryAfterSeconds: retryAfterSeconds(user.emailChallengeSentAt),
        maskedEmail: maskEmail(user.email),
        expiresAt: user.emailChallengeExpiresAt.toISOString(),
      };
    }

    const code = createEmailChallengeCode();
    const emailChallengeCodeHash = await bcrypt.hash(code, 10);
    const emailChallengeExpiresAt = new Date(now + EMAIL_CHALLENGE_TTL_MS);
    const emailChallengeSentAt = new Date(now);

    await userRepository.saveEmailChallengeCode(userId, {
      emailChallengeCodeHash,
      emailChallengeExpiresAt,
      emailChallengeSentAt,
    });

    try {
      await sendEmailChallengeCode({
        to: user.email,
        name: user.name,
        code,
      });
    } catch (error) {
      await userRepository.clearEmailChallengeCode(userId);
      console.error('Falha ao enviar código de verificação:', error);
      throw new HttpError(
        'Não foi possível enviar o e-mail. Tente novamente.',
        502,
      );
    }

    return {
      sent: true,
      retryAfterSeconds: Math.ceil(EMAIL_CHALLENGE_COOLDOWN_MS / 1000),
      maskedEmail: maskEmail(user.email),
      expiresAt: emailChallengeExpiresAt.toISOString(),
    };
  }

  async verify(userId: string, code: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await this.requireRequester(userId);

    if (!user.emailChallengeCodeHash || !user.emailChallengeExpiresAt) {
      throw new HttpError('Solicite um novo código', 400);
    }

    if (user.emailChallengeExpiresAt.getTime() <= Date.now()) {
      throw new HttpError('Código expirado. Solicite outro.', 400);
    }

    const matches = await bcrypt.compare(code, user.emailChallengeCodeHash);
    if (!matches) {
      throw new HttpError('Código inválido', 400);
    }

    await userRepository.completeEmailChallenge(
      userId,
      randomEmailChallengeDueAt(),
    );
  }

  async force(userId: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await this.requireRequester(userId);
    await userRepository.markEmailChallengeDue(userId, new Date());
    await userRepository.clearEmailChallengeCode(userId);

    return {
      emailSent: false,
      retryAfterSeconds: 0,
      maskedEmail: isSyntheticInternalEmail(user.email)
        ? null
        : maskEmail(user.email),
      expiresAt: null,
      sendError: null,
    };
  }

  async updateEmail(userId: string, email: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 404);
    }

    const normalized = email.trim().toLowerCase();
    if (!normalized || isSyntheticInternalEmail(normalized)) {
      throw new HttpError('Informe um e-mail real', 400);
    }

    if (normalized === user.email.trim().toLowerCase()) {
      throw new HttpError('Informe um e-mail diferente do atual', 400);
    }

    const existing = await userRepository.findByEmail(normalized);
    if (existing && existing.id !== userId) {
      throw new HttpError('E-mail já cadastrado', 400);
    }

    await userRepository.updateEmail(userId, normalized);
  }
}
