import type { FastifyInstance } from 'fastify';
import {
  listCompanies,
  createCompany,
  updateCompany,
} from '../controllers/company-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

export async function companyRoutes(app: FastifyInstance) {
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
        tags: ['companies'],
        summary: 'Listar empresas',
        security: [{ bearerAuth: [] }],
      },
    },
    listCompanies,
  );

  app.post(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['companies'],
        summary: 'Criar empresa (apenas SUPER_ADMIN; produção via cadastro)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            active: { type: 'boolean' },
          },
        },
      },
    },
    createCompany,
  );

  app.patch(
    '/:companyId',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.SUPER_ADMIN,
          $Enums.UserRole.RH,
        ]),
      ],
      schema: {
        tags: ['companies'],
        summary: 'Atualizar empresa',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['companyId'],
          properties: {
            companyId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    updateCompany,
  );
}
