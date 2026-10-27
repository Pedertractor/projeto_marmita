import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  assertLoginAccountAllowed,
  clearLoginAccountFailures,
  loginAccountKey,
  recordLoginAccountFailure,
} from '../../lib/login-account-throttle.js';
import {
  AVATAR_DATA_URL_MAX_LENGTH,
  CARD_NUMBER_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  RESET_TOKEN_MAX_LENGTH,
} from '../../lib/validation-limits.js';
import { AuditLogService } from '../../services/audit-log-service.js';
import { EmailChallengeService } from '../../services/email-challenge-service.js';
import { PasswordResetService } from '../../services/password-reset-service.js';
import { UserService } from '../../services/user-service.js';
import { HttpError } from '../errors/index.js';
import { $Enums } from '../../generated/prisma/client.js';

export async function register(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z.object({
    email: z.email('E-mail inválido'),
    name: z.string().min(1, 'Nome é obrigatório').max(NAME_MAX_LENGTH),
    password: z.string().max(PASSWORD_MAX_LENGTH).optional(),
    role: z.enum($Enums.UserRole),
    companyId: z.string().uuid().nullable().optional(),
    restaurantId: z.string().uuid().nullable().optional(),
    active: z.boolean().optional(),
    requiresWorkLocation: z.boolean().optional(),
  });

  const body = bodySchema.parse(request.body);

  if (
    body.role === $Enums.UserRole.SUPER_ADMIN &&
    request.user.role !== $Enums.UserRole.SUPER_ADMIN
  ) {
    throw new HttpError(
      'Apenas SUPER_ADMIN pode criar outro SUPER_ADMIN',
      403,
    );
  }

  const userService = new UserService();
  const result = await userService.register(body, request.user.sub);
  const fullUser = await userService.getById(result.user.id);

  return reply.status(201).send({
    user: fullUser,
    temporaryPassword: result.temporaryPassword,
  });
}

export async function lookupEmployee(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    cardNumber: z
      .string()
      .min(1, 'Informe o número do cartão')
      .max(CARD_NUMBER_MAX_LENGTH),
    unit: z.enum($Enums.Unit),
  });

  const body = bodySchema.parse(request.body);
  const userService = new UserService();
  const employee = await userService.lookupEmployee(
    body.cardNumber,
    body.unit,
  );

  return reply.status(200).send({ employee });
}

export async function registerByCard(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    cardNumber: z
      .string()
      .min(1, 'Informe o número do cartão')
      .max(CARD_NUMBER_MAX_LENGTH),
    unit: z.enum($Enums.Unit),
    role: z.enum($Enums.UserRole),
    email: z.email('E-mail inválido').nullable().optional(),
    phone: z.string().max(PHONE_MAX_LENGTH).nullable().optional(),
    companyId: z.string().uuid().nullable().optional(),
    restaurantId: z.string().uuid().nullable().optional(),
    requiresWorkLocation: z.boolean().optional(),
  });

  const body = bodySchema.parse(request.body);

  if (
    body.role === $Enums.UserRole.SUPER_ADMIN &&
    request.user.role !== $Enums.UserRole.SUPER_ADMIN
  ) {
    throw new HttpError(
      'Apenas SUPER_ADMIN pode criar outro SUPER_ADMIN',
      403,
    );
  }

  const userService = new UserService();
  const result = await userService.registerByCard(body, request.user.sub);
  const fullUser = await userService.getById(result.user.id);

  return reply.status(201).send({
    user: fullUser,
    temporaryPassword: result.temporaryPassword,
  });
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const bodySchema = z
    .object({
      email: z.email('E-mail inválido').optional(),
      cardNumber: z.string().min(1).max(CARD_NUMBER_MAX_LENGTH).optional(),
      unit: z.enum($Enums.Unit).optional(),
      password: z
        .string()
        .min(1, 'Senha é obrigatória')
        .max(PASSWORD_MAX_LENGTH),
    })
    .superRefine((data, ctx) => {
      const hasCard = Boolean(data.cardNumber?.trim() && data.unit);
      const hasEmail = Boolean(data.email?.trim());
      if (hasCard === hasEmail) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Informe e-mail e senha (Outros) ou cartão, empresa e senha (Pedertractor/Tractor)',
        });
      }
    });

  const body = bodySchema.parse(request.body);
  const userService = new UserService();
  const audit = new AuditLogService();
  const loginMethod = body.cardNumber && body.unit ? 'card' : 'email';
  const accountKey = loginAccountKey({
    email: body.email,
    cardNumber: body.cardNumber,
    unit: body.unit,
  });

  assertLoginAccountAllowed(accountKey);

  let user: Awaited<ReturnType<UserService['loginWithEmail']>>;
  try {
    user =
      body.cardNumber && body.unit
        ? await userService.loginWithCard(
            body.cardNumber,
            body.unit,
            body.password,
          )
        : await userService.loginWithEmail(body.email!, body.password);
  } catch (error) {
    recordLoginAccountFailure(accountKey);
    await audit.write({
      userId: null,
      action: 'USER_LOGIN_FAILURE',
      entityType: 'User',
      entityId: 'unknown',
      metadata: {
        method: loginMethod,
        email: body.email?.trim().toLowerCase() || null,
        unit: body.unit ?? null,
      },
    });
    throw error;
  }

  clearLoginAccountFailures(accountKey);

  const token = await reply.jwtSign({
    sub: user.id,
    tv: user.tokenVersion,
  });
  const fullUser = await userService.getMe(user.id);

  await audit.write({
    userId: user.id,
    action: 'USER_LOGIN_SUCCESS',
    entityType: 'User',
    entityId: user.id,
    metadata: { method: loginMethod },
  });

  return reply.status(200).send({ user: fullUser, token });
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const userService = new UserService();
  const user = await userService.getMe(request.user.sub);
  return reply.status(200).send({ user });
}

export async function updateMyAvatar(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    avatar: z
      .string()
      .min(1, 'Envie sua foto')
      .max(AVATAR_DATA_URL_MAX_LENGTH),
  });
  const body = bodySchema.parse(request.body);
  const userService = new UserService();
  const user = await userService.updateMyAvatar(request.user.sub, body.avatar);
  return reply.status(200).send({ user });
}

export async function changePassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    newPassword: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(PASSWORD_MAX_LENGTH),
  });
  const { newPassword } = bodySchema.parse(request.body);
  const userService = new UserService();
  const user = await userService.changePassword(request.user.sub, newPassword);
  const principal = await userService.resolveSessionPrincipal(request.user.sub);
  const token = await reply.jwtSign({
    sub: principal.id,
    tv: principal.tokenVersion,
  });
  return reply.status(200).send({ user, token });
}

export async function listUsers(request: FastifyRequest, reply: FastifyReply) {
  const userService = new UserService();
  const users = await userService.list();
  return reply.status(200).send({ users });
}

export async function getUserById(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    userId: z.string().uuid('ID de usuário inválido'),
  });
  const { userId } = paramsSchema.parse(request.params);
  const userService = new UserService();
  const user = await userService.getById(userId);
  return reply.status(200).send({ user });
}

export async function updateUserByAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    userId: z.string().uuid('ID de usuário inválido'),
  });
  const bodySchema = z.object({
    name: z.string().min(1).max(NAME_MAX_LENGTH).optional(),
    phone: z.string().max(PHONE_MAX_LENGTH).nullable().optional(),
    role: z.enum($Enums.UserRole).optional(),
    active: z.boolean().optional(),
    requiresWorkLocation: z.boolean().optional(),
    companyId: z.string().uuid().nullable().optional(),
    restaurantId: z.string().uuid().nullable().optional(),
  });

  const { userId } = paramsSchema.parse(request.params);
  const body = bodySchema.parse(request.body);

  const actorRole = request.user.role;
  const isSuperAdmin = actorRole === $Enums.UserRole.SUPER_ADMIN;
  const isRh = actorRole === $Enums.UserRole.RH;

  if (!isSuperAdmin && !isRh) {
    throw new HttpError('Sem permissão para editar usuários', 403);
  }

  const userService = new UserService();
  const target = await userService.getById(userId);

  if (body.active === false && request.user.sub === userId) {
    throw new HttpError(
      'Não é permitido desativar a própria conta por esta ação',
      400,
    );
  }

  if (body.role !== undefined) {
    if (!isSuperAdmin && body.role === $Enums.UserRole.SUPER_ADMIN) {
      throw new HttpError(
        'Apenas Super Admin pode atribuir o papel Super Admin',
        403,
      );
    }
    if (!isSuperAdmin && target.role === $Enums.UserRole.SUPER_ADMIN) {
      throw new HttpError(
        'Não é permitido alterar o papel de um Super Admin',
        403,
      );
    }
  }

  const user = await userService.updateByAdmin(userId, body, {
    allowRoleChange: true,
    actingAdminId: request.user.sub,
    actingAdminRole: actorRole,
  });
  return reply.status(200).send({ user });
}

export async function resetUserPassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    userId: z.string().uuid('ID de usuário inválido'),
  });
  const { userId } = paramsSchema.parse(request.params);
  const userService = new UserService();
  const result = await userService.resetPassword(
    request.user.sub,
    request.user.role,
    userId,
  );
  return reply.status(200).send(result);
}

export async function deleteUserByAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    userId: z.string().uuid('ID de usuário inválido'),
  });
  const { userId } = paramsSchema.parse(request.params);
  const userService = new UserService();
  const result = await userService.deleteByAdmin(
    request.user.sub,
    request.user.role,
    userId,
  );
  return reply.status(200).send(result);
}

export async function sendEmailChallenge(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const emailChallengeService = new EmailChallengeService();
  const result = await emailChallengeService.send(request.user.sub);
  return reply.status(200).send(result);
}

export async function verifyEmailChallenge(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'Informe o código de 6 dígitos'),
  });
  const { code } = bodySchema.parse(request.body);
  const emailChallengeService = new EmailChallengeService();
  await emailChallengeService.verify(request.user.sub, code);
  const userService = new UserService();
  const user = await userService.getMe(request.user.sub);
  return reply.status(200).send({ user });
}

export async function forceEmailChallenge(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const emailChallengeService = new EmailChallengeService();
  const result = await emailChallengeService.force(request.user.sub);
  const userService = new UserService();
  const user = await userService.getMe(request.user.sub);
  return reply.status(200).send({ user, ...result });
}

export async function updateMyEmail(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    email: z.email('E-mail inválido'),
  });
  const { email } = bodySchema.parse(request.body);
  const emailChallengeService = new EmailChallengeService();
  await emailChallengeService.updateEmail(request.user.sub, email);
  const userService = new UserService();
  const user = await userService.getMe(request.user.sub);
  return reply.status(200).send({ user });
}

export async function forgotPassword(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    email: z.email('E-mail inválido'),
  });
  const { email } = bodySchema.parse(request.body);
  const passwordResetService = new PasswordResetService();
  const result = await passwordResetService.request(email);
  return reply.status(200).send(result);
}

export async function previewPasswordReset(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    token: z.string().min(1, 'Link inválido').max(RESET_TOKEN_MAX_LENGTH),
  });
  const { token } = querySchema.parse(request.query);
  const passwordResetService = new PasswordResetService();
  const result = await passwordResetService.preview(token);
  return reply.status(200).send(result);
}

export async function resetPasswordWithCode(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    token: z.string().min(1, 'Link inválido').max(RESET_TOKEN_MAX_LENGTH),
    newPassword: z
      .string()
      .min(8, 'Senha deve ter no mínimo 8 caracteres')
      .max(PASSWORD_MAX_LENGTH),
  });
  const body = bodySchema.parse(request.body);
  const passwordResetService = new PasswordResetService();
  await passwordResetService.reset(body);
  return reply.status(200).send({
    message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
  });
}
