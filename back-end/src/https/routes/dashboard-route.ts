import type { FastifyInstance } from 'fastify';
import {
  dashboardRh,
  dashboardRestaurant,
  reportByCompany,
  listAuditLogs,
} from '../controllers/dashboard-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get(
    '/rh',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RH,
          $Enums.UserRole.SUPER_ADMIN,
        ]),
      ],
      schema: {
        tags: ['dashboard'],
        summary: 'Dashboard RH',
        security: [{ bearerAuth: [] }],
      },
    },
    dashboardRh,
  );

  app.get(
    '/restaurant',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RESTAURANT,
          $Enums.UserRole.SUPER_ADMIN,
        ]),
      ],
      schema: {
        tags: ['dashboard'],
        summary: 'Dashboard restaurante',
        security: [{ bearerAuth: [] }],
      },
    },
    dashboardRestaurant,
  );
}

export async function reportRoutes(app: FastifyInstance) {
  app.get(
    '/by-company',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RH,
          $Enums.UserRole.SUPER_ADMIN,
        ]),
      ],
      schema: {
        tags: ['reports'],
        summary: 'Relatório por empresa',
        security: [{ bearerAuth: [] }],
      },
    },
    reportByCompany,
  );
}

export async function auditLogRoutes(app: FastifyInstance) {
  app.get(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['audit-logs'],
        summary: 'Listar logs de auditoria',
        security: [{ bearerAuth: [] }],
      },
    },
    listAuditLogs,
  );
}
