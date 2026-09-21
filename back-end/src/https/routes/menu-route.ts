import type { FastifyInstance } from 'fastify';
import {
  getMenuByDate,
  listMenus,
  upsertMenu,
} from '../controllers/menu-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

export async function menuRoutes(app: FastifyInstance) {
  app.get(
    '/by-date',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['menus'],
        summary: 'Cardápio por data',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['date'],
          properties: {
            date: { type: 'string' },
            restaurantId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getMenuByDate,
  );

  app.get(
    '/',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['menus'],
        summary: 'Listar cardápios a partir de uma data',
        security: [{ bearerAuth: [] }],
      },
    },
    listMenus,
  );

  app.post(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RESTAURANT,
          $Enums.UserRole.SUPER_ADMIN,
        ]),
      ],
      schema: {
        tags: ['menus'],
        summary: 'Criar/atualizar cardápio do dia',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['date', 'items'],
          properties: {
            date: { type: 'string' },
            restaurantId: { type: 'string', format: 'uuid' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  available: { type: 'boolean' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    upsertMenu,
  );

  app.put(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RESTAURANT,
          $Enums.UserRole.SUPER_ADMIN,
        ]),
      ],
      schema: {
        tags: ['menus'],
        summary: 'Atualizar cardápio do dia',
        security: [{ bearerAuth: [] }],
      },
    },
    upsertMenu,
  );
}
