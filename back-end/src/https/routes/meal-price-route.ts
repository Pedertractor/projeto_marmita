import type { FastifyInstance } from 'fastify';
import {
  getCurrentMealPrice,
  listMealPriceHistory,
  createMealPrice,
} from '../controllers/meal-price-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

export async function mealPriceRoutes(app: FastifyInstance) {
  app.get(
    '/current',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RH,
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.REQUESTER,
        ]),
      ],
      schema: {
        tags: ['meal-prices'],
        summary: 'Preço vigente da empresa',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['companyId'],
          properties: {
            companyId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getCurrentMealPrice,
  );

  app.get(
    '/history',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.RH, $Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['meal-prices'],
        summary: 'Histórico de preços da empresa',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          required: ['companyId'],
          properties: {
            companyId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    listMealPriceHistory,
  );

  app.post(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.RH, $Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['meal-prices'],
        summary: 'Definir novo preço para empresa',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['companyId', 'amount'],
          properties: {
            companyId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            effectiveFrom: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    createMealPrice,
  );
}
