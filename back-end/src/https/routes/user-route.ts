import type { FastifyInstance } from 'fastify';
import {
  login,
  register,
  getMe,
  updateMyAvatar,
  changePassword,
  sendEmailChallenge,
  verifyEmailChallenge,
  forceEmailChallenge,
  updateMyEmail,
  forgotPassword,
  previewPasswordReset,
  resetPasswordWithCode,
  listUsers,
  getUserById,
  updateUserByAdmin,
  resetUserPassword,
  deleteUserByAdmin,
} from '../controllers/user-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { env } from '../../env/index.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';
import {
  loginRateLimit,
  sensitivePublicRateLimit,
} from '../rate-limits.js';

const userRoleEnum = [
  'SUPER_ADMIN',
  'RH',
  'RESTAURANT',
  'REQUESTER',
] as const;

const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

export async function userRoutes(app: FastifyInstance) {
  app.post(
    '/login',
    {
      config: { rateLimit: loginRateLimit },
      schema: {
        tags: ['users'],
        summary: 'Login',
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            email: { type: 'string', format: 'email' },
            cardNumber: { type: 'string' },
            unit: { type: 'string', enum: ['PEDERTRACTOR', 'TRACTOR'] },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              user: { type: 'object', additionalProperties: true },
              token: { type: 'string' },
            },
          },
          401: errorResponseSchema,
        },
      },
    },
    login,
  );

  app.post(
    '/forgot-password',
    {
      config: { rateLimit: sensitivePublicRateLimit },
      schema: {
        tags: ['users'],
        summary: 'Solicitar código para redefinir senha',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    forgotPassword,
  );

  app.get(
    '/reset-password/preview',
    {
      config: { rateLimit: sensitivePublicRateLimit },
      schema: {
        tags: ['users'],
        summary: 'Pré-visualizar usuário do magic link de redefinição',
        querystring: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    previewPasswordReset,
  );

  app.post(
    '/reset-password',
    {
      config: { rateLimit: sensitivePublicRateLimit },
      schema: {
        tags: ['users'],
        summary: 'Redefinir senha com token do magic link',
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    resetPasswordWithCode,
  );

  app.post(
    '/register',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Registrar usuário',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email', 'name', 'password', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string', enum: userRoleEnum },
            companyId: { type: 'string', format: 'uuid', nullable: true },
            restaurantId: { type: 'string', format: 'uuid', nullable: true },
            active: { type: 'boolean' },
          },
        },
      },
    },
    register,
  );

  app.get(
    '/me',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['users'],
        summary: 'Usuário autenticado',
        security: [{ bearerAuth: [] }],
      },
    },
    getMe,
  );

  app.put(
    '/me/avatar',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['users'],
        summary: 'Atualizar foto de perfil',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['avatar'],
          properties: {
            avatar: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    updateMyAvatar,
  );

  app.put(
    '/me/change-password',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['users'],
        summary: 'Trocar senha (primeiro login)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    changePassword,
  );

  app.post(
    '/me/email-challenge/send',
    {
      config: { rateLimit: sensitivePublicRateLimit },
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.REQUESTER]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Enviar código de verificação por e-mail',
        security: [{ bearerAuth: [] }],
      },
    },
    sendEmailChallenge,
  );

  app.post(
    '/me/email-challenge/verify',
    {
      config: { rateLimit: sensitivePublicRateLimit },
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.REQUESTER]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Confirmar código de verificação',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6 },
          },
        },
      },
    },
    verifyEmailChallenge,
  );

  if (env.NODE_ENV !== 'production') {
    app.post(
      '/me/email-challenge/force',
      {
        preHandler: [
          authMiddleware,
          roleMiddleware([$Enums.UserRole.REQUESTER]),
        ],
        schema: {
          tags: ['users'],
          summary: 'Simular vencimento da verificação por e-mail',
          security: [{ bearerAuth: [] }],
        },
      },
      forceEmailChallenge,
    );
  }

  app.patch(
    '/me/email',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['users'],
        summary: 'Atualizar e-mail de login do usuário autenticado',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    updateMyEmail,
  );

  app.get(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.RH,
        ]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Listar usuários',
        security: [{ bearerAuth: [] }],
      },
    },
    listUsers,
  );

  app.get(
    '/:userId',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.RH,
        ]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Buscar usuário por ID',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getUserById,
  );

  app.patch(
    '/:userId',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.RH,
        ]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Atualizar usuário',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    updateUserByAdmin,
  );

  app.post(
    '/:userId/reset-password',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.RH,
        ]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Resetar senha do usuário',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    resetUserPassword,
  );

  app.delete(
    '/:userId',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.RH,
        ]),
      ],
      schema: {
        tags: ['users'],
        summary: 'Apagar usuário sem apontamentos',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    deleteUserByAdmin,
  );
}
