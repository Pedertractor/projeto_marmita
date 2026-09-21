import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { MealPriceService } from '../../services/meal-price-service.js';

export async function getCurrentMealPrice(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    companyId: z.string().uuid('Empresa inválida'),
  });
  const query = querySchema.parse(request.query);
  const service = new MealPriceService();
  const mealPrice = await service.getCurrent(query.companyId);
  return reply.status(200).send({ mealPrice });
}

export async function listMealPriceHistory(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    companyId: z.string().uuid('Empresa inválida'),
  });
  const query = querySchema.parse(request.query);
  const service = new MealPriceService();
  const history = await service.history(query.companyId);
  return reply.status(200).send({ history });
}

export async function createMealPrice(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    companyId: z.string().uuid('Empresa inválida'),
    amount: z.number().positive('Valor deve ser positivo'),
    effectiveFrom: z.coerce.date().optional(),
  });
  const body = bodySchema.parse(request.body);
  const service = new MealPriceService();
  const mealPrice = await service.setNew(body, request.user.sub);
  return reply.status(201).send({ mealPrice });
}
