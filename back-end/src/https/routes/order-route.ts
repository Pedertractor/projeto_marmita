import type { FastifyInstance } from 'fastify';
import {
  startOrder,
  createOrder,
  updateOrder,
  submitOrder,
  listOrders,
  getOrderById,
  changeOrderStatus,
} from '../controllers/order-controller.js';
import { $Enums } from '../../generated/prisma/client.js';
import { authMiddleware } from '../../middlewares/auth-middleware.js';
import { roleMiddleware } from '../../middlewares/auth-role-middleware.js';

const orderStatusEnum = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'READY'] as const;

export async function orderRoutes(app: FastifyInstance) {
  app.post(
    '/start',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.REQUESTER]),
      ],
      schema: {
        tags: ['orders'],
        summary: 'Iniciar rascunho de pedido (gera orderCode)',
        security: [{ bearerAuth: [] }],
      },
    },
    startOrder,
  );

  app.post(
    '/',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.REQUESTER]),
      ],
      schema: {
        tags: ['orders'],
        summary: 'Criar pedido (legado — envia direto como SUBMITTED)',
        security: [{ bearerAuth: [] }],
      },
    },
    createOrder,
  );

  app.get(
    '/',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['orders'],
        summary: 'Listar pedidos',
        security: [{ bearerAuth: [] }],
      },
    },
    listOrders,
  );

  app.get(
    '/:orderId',
    {
      preHandler: [authMiddleware],
      schema: {
        tags: ['orders'],
        summary: 'Detalhe do pedido',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getOrderById,
  );

  app.put(
    '/:orderId',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.REQUESTER]),
      ],
      schema: {
        tags: ['orders'],
        summary: 'Atualizar pedido (DRAFT ou SUBMITTED)',
        security: [{ bearerAuth: [] }],
      },
    },
    updateOrder,
  );

  app.post(
    '/:orderId/submit',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([$Enums.UserRole.REQUESTER]),
      ],
      schema: {
        tags: ['orders'],
        summary: 'Enviar rascunho (DRAFT → SUBMITTED)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    submitOrder,
  );

  app.patch(
    '/:orderId/status',
    {
      preHandler: [
        authMiddleware,
        roleMiddleware([
          $Enums.UserRole.RESTAURANT,
          $Enums.UserRole.RH,
          $Enums.UserRole.SUPER_ADMIN,
        ]),
      ],
      schema: {
        tags: ['orders'],
        summary: 'Alterar status do pedido',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: orderStatusEnum },
          },
        },
      },
    },
    changeOrderStatus,
  );
}

