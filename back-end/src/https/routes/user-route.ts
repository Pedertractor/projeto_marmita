import type { FastifyInstance } from 'fastify';
import {
  login,
  register,
  getMe,
  changePassword,
  listUsers,
  getUserById,
  updateUserByAdmin,
  resetUserPassword,
} from '../controllers/user-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

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
            password: { type: 'string', minLength: 6 },
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
            newPassword: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    changePassword,
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
        roleMiddleware([$Enums.UserRole.SUPER_ADMIN]),
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
}
