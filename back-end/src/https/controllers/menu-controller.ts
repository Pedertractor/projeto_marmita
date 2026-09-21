import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { MENU_ITEM_ICON_KEYS } from '../../constants/menu-item-icons.js';
import { MenuService } from '../../services/menu-service.js';

export async function getMenuByDate(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    date: z.string().min(1, 'Data é obrigatória'),
    restaurantId: z.string().uuid().optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new MenuService();
  const menu = await service.getByDate(query.date, query.restaurantId);
  return reply.status(200).send({ menu });
}

export async function listMenus(request: FastifyRequest, reply: FastifyReply) {
  const querySchema = z.object({
    fromDate: z.string().optional(),
    restaurantId: z.string().uuid().optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new MenuService();
  const menus = await service.listUpcoming(query.fromDate, query.restaurantId);
  return reply.status(200).send({ menus });
}

export async function upsertMenu(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    date: z.string().min(1),
    restaurantId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          name: z.string().min(1),
          description: z.string().max(500).optional().nullable(),
          iconKey: z.enum(MENU_ITEM_ICON_KEYS).optional(),
          available: z.boolean().optional(),
          sortOrder: z.number().int().optional(),
        }),
      )
      .min(1),
  });
  const body = bodySchema.parse(request.body);
  const service = new MenuService();
  const menu = await service.upsert(body, request.user.sub);
  return reply.status(200).send({ menu });
}
