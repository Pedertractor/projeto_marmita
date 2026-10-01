import type { FastifyInstance } from 'fastify';
import {
  approveRegistrationRequest,
  checkRegistrationAvailability,
  createRegistrationRequest,
  listRegistrationRequests,
  rejectRegistrationRequest,
  validateEmployeeRegistration,
} from '../controllers/registration-request-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

export async function registrationRequestRoutes(app: FastifyInstance) {
  app.post(
    '/check-availability',
    {
      schema: {
        tags: ['registration-requests'],
        summary: 'Verificar se e-mail pode ser usado no cadastro',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    checkRegistrationAvailability,
  );

  app.post(
    '/validate-employee',
    {
      schema: {
        tags: ['registration-requests'],
        summary: 'Validar colaborador PEDERTRACTOR/TRACTOR na API base',
        body: {
          type: 'object',
          required: ['cardNumber', 'unit'],
          properties: {
            cardNumber: { type: 'string' },
            unit: { type: 'string', enum: ['PEDERTRACTOR', 'TRACTOR'] },
          },
        },
      },
    },
    validateEmployeeRegistration,
  );

  app.post(
    '/',
    {
      schema: {
        tags: ['registration-requests'],
        summary: 'Solicitar cadastro público (aguarda RH)',
        body: {
          type: 'object',
          required: ['email', 'phone', 'password', 'companyKind'],
          properties: {
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            password: { type: 'string', minLength: 6 },
            companyKind: {
              type: 'string',
              enum: ['PEDERTRACTOR', 'TRACTOR', 'OTHER'],
            },
            companyName: { type: 'string' },
            cardNumber: { type: 'string' },
          },
        },
      },
    },
    createRegistrationRequest,
  );

  app.get(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.RH, $Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['registration-requests'],
        summary: 'Listar solicitações de cadastro',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'APPROVED', 'REJECTED'],
            },
          },
        },
      },
    },
    listRegistrationRequests,
  );

  app.post(
    '/:id/approve',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.RH, $Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['registration-requests'],
        summary: 'Aprovar solicitação e definir preço da empresa',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['mealPriceAmount'],
          properties: {
            mealPriceAmount: { type: 'number' },
            companyName: { type: 'string' },
          },
        },
      },
    },
    approveRegistrationRequest,
  );

  app.post(
    '/:id/reject',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.RH, $Enums.UserRole.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['registration-requests'],
        summary: 'Rejeitar solicitação de cadastro',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            note: { type: 'string' },
          },
        },
      },
    },
    rejectRegistrationRequest,
  );
}
