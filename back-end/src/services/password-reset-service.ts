import bcrypt from 'bcrypt';
import { HttpError } from '../https/errors/index.js';
import { maskEmail } from '../lib/email-challenge.js';
import { isSyntheticInternalEmail } from '../lib/internal-user-email.js';
import {
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
  createPasswordResetToken,
  hashPasswordResetToken,
} from '../lib/password-reset.js';
import { BCRYPT_COST } from '../lib/security-constants.js';
import { prisma } from '../lib/prisma.js';
import { UserPrismaRepository } from '../repositories/prisma/user-repository.js';
import { AuditLogService } from './audit-log-service.js';
import { sendPasswordResetLink } from './mail-service.js';
import { env } from '../env/index.js';

const GENERIC_OK_MESSAGE =
  'Se o e-mail estiver cadastrado, enviamos um link para redefinir a senha.';

function retryAfterSeconds(sentAt: Date): number {
  const elapsed = Date.now() - sentAt.getTime();
  return Math.max(1, Math.ceil((PASSWORD_RESET_COOLDOWN_MS - elapsed) / 1000));
}

function buildResetLink(token: string): string {
  const base = env.FRONT_END_URL.replace(/\/$/, '');
  return `${base}/redefinir-senha?token=${encodeURIComponent(token)}`;
}

export class PasswordResetService {
  async request(email: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const normalized = email.trim().toLowerCase();
    const user = await userRepository.findPasswordResetByEmail(normalized);

    if (!user || !user.active || isSyntheticInternalEmail(user.email)) {
      return {
        message: GENERIC_OK_MESSAGE,
        retryAfterSeconds: 0,
      };
    }

    const now = Date.now();
    if (
      user.passwordResetCodeHash &&
      user.passwordResetSentAt &&
      user.passwordResetExpiresAt &&
      user.passwordResetExpiresAt.getTime() > now &&
      now - user.passwordResetSentAt.getTime() < PASSWORD_RESET_COOLDOWN_MS
    ) {
      return {
        message: GENERIC_OK_MESSAGE,
        retryAfterSeconds: retryAfterSeconds(user.passwordResetSentAt),
      };
    }

    const token = createPasswordResetToken();
    const passwordResetCodeHash = hashPasswordResetToken(token);
    const passwordResetExpiresAt = new Date(now + PASSWORD_RESET_TTL_MS);
    const passwordResetSentAt = new Date(now);
    const resetLink = buildResetLink(token);

    await userRepository.savePasswordResetCode(user.id, {
      passwordResetCodeHash,
      passwordResetExpiresAt,
      passwordResetSentAt,
    });

    try {
      await sendPasswordResetLink({
        to: user.email,
        name: user.name,
        resetLink,
      });
    } catch (error) {
      await userRepository.clearPasswordReset(user.id);
      console.error('Falha ao enviar e-mail de redefinição de senha:', error);
      throw new HttpError(
        'Não foi possível enviar o e-mail. Tente novamente.',
        502,
      );
    }

    const audit = new AuditLogService();
    await audit.write({
      userId: user.id,
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
    });

    return {
      message: GENERIC_OK_MESSAGE,
      retryAfterSeconds: Math.ceil(PASSWORD_RESET_COOLDOWN_MS / 1000),
    };
  }

  private async resolveValidToken(tokenRaw: string) {
    const token = tokenRaw.trim();
    if (!token) {
      throw new HttpError('Link inválido ou expirado', 400);
    }

    const userRepository = new UserPrismaRepository(prisma);
    const tokenHash = hashPasswordResetToken(token);
    const user = await userRepository.findPasswordResetByTokenHash(tokenHash);

    if (!user || !user.active || isSyntheticInternalEmail(user.email)) {
      throw new HttpError('Link inválido ou expirado', 400);
    }

    if (!user.passwordResetExpiresAt) {
      throw new HttpError('Solicite um novo link', 400);
    }

    if (user.passwordResetExpiresAt.getTime() <= Date.now()) {
      throw new HttpError('Link expirado. Solicite outro.', 400);
    }

    return user;
  }

  async preview(token: string) {
    const user = await this.resolveValidToken(token);
    return {
      name: user.name,
      maskedEmail: maskEmail(user.email),
    };
  }

  async reset(input: { token: string; newPassword: string }) {
    const user = await this.resolveValidToken(input.token);
    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);
    const userRepository = new UserPrismaRepository(prisma);
    await userRepository.completePasswordReset(user.id, passwordHash);

    const audit = new AuditLogService();
    await audit.write({
      userId: user.id,
      action: 'USER_PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
    });
  }
}
