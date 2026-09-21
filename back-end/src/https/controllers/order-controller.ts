import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { $Enums } from '../../generated/prisma/client.js';
import { OrderService } from '../../services/order-service.js';

const mealSchema = z.object({
  recipientName: z.string(),
  notes: z.string().nullable().optional(),
  itemIds: z.array(z.string().uuid()),
});

const mealSchemaStrict = mealSchema.extend({
  recipientName: z.string().min(1),
  itemIds: z.array(z.string().uuid()).min(1),
});

const fulfillmentSchema = z.enum($Enums.OrderFulfillmentType);

const draftBodySchema = z.object({
  menuId: z.string().uuid(),
  quantity: z.number().int().positive(),
  fulfillmentType: fulfillmentSchema.nullable().optional(),
  meals: z.array(mealSchema).default([]),
});

const ORDER_CODE_REGEX = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

const orderBodySchema = z.object({
  menuId: z.string().uuid(),
  quantity: z.number().int().positive(),
  fulfillmentType: fulfillmentSchema,
  orderCode: z.string().regex(ORDER_CODE_REGEX).optional(),
  meals: z.array(mealSchemaStrict).min(1),
});

const startBodySchema = z.object({
  menuId: z.string().uuid(),
});

export async function startOrder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = startBodySchema.parse(request.body);
  const service = new OrderService();
  const order = await service.start(request.user.sub, body);
  return reply.status(201).send({ order });
}

export async function createOrder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = orderBodySchema.parse(request.body);
  const service = new OrderService();
  const order = await service.create(request.user.sub, body);
  return reply.status(201).send({ order });
}

export async function updateOrder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    orderId: z.string().uuid(),
  });
  const { orderId } = paramsSchema.parse(request.params);
  const body = draftBodySchema.parse(request.body);
  const service = new OrderService();
  const order = await service.update(request.user.sub, orderId, body);
  return reply.status(200).send({ order });
}

export async function submitOrder(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    orderId: z.string().uuid(),
  });
  const { orderId } = paramsSchema.parse(request.params);
  const service = new OrderService();
  const order = await service.submit(request.user.sub, orderId);
  return reply.status(200).send({ order });
}

export async function listOrders(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    status: z.enum($Enums.OrderStatus).optional(),
    menuDate: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    companyId: z.string().uuid().optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new OrderService();
  const orders = await service.list(request.user.sub, query);
  return reply.status(200).send({ orders });
}

export async function getOrderById(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    orderId: z.string().uuid(),
  });
  const { orderId } = paramsSchema.parse(request.params);
  const service = new OrderService();
  const order = await service.getById(request.user.sub, orderId);
  return reply.status(200).send({ order });
}

export async function changeOrderStatus(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    orderId: z.string().uuid(),
  });
  const bodySchema = z.object({
    status: z.enum($Enums.OrderStatus),
  });
  const { orderId } = paramsSchema.parse(request.params);
  const { status } = bodySchema.parse(request.body);
  const service = new OrderService();
  const order = await service.changeStatus(request.user.sub, orderId, status);
  return reply.status(200).send({ order });
}

