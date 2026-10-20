import { $Enums, Prisma } from '../generated/prisma/client.js';
import {
  canTransitionStatus,
  ORDER_EDIT_WINDOW_MS,
} from '../constants/order-status.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { MealPricePrismaRepository } from '../repositories/prisma/meal-price-repository.js';
import { MenuPrismaRepository } from '../repositories/prisma/menu-repository.js';
import { OrderPrismaRepository } from '../repositories/prisma/order-repository.js';
import { RestaurantPrismaRepository } from '../repositories/prisma/restaurant-repository.js';
import { UserPrismaRepository } from '../repositories/prisma/user-repository.js';
import { AuditLogService } from './audit-log-service.js';

export type OrderMealInput = {
  recipientName: string;
  notes?: string | null | undefined;
  itemIds: string[];
};

function toDateOnly(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function normalizeRecipient(name: string): string {
  return name.trim().toLowerCase();
}

function requireBoundRestaurantId(user: {
  role: $Enums.UserRole;
  restaurantId: string | null;
}): string {
  if (user.role === $Enums.UserRole.RESTAURANT && user.restaurantId) {
    return user.restaurantId;
  }
  throw new HttpError(
    'Usuário de restaurante sem restaurante vinculado',
    403,
  );
}

/** Remove campos monetários da resposta para o papel restaurante. */
function omitOrderPricing<T extends { unitPrice?: unknown; totalPrice?: unknown }>(
  order: T,
): Omit<T, 'unitPrice' | 'totalPrice'> {
  const { unitPrice: _unit, totalPrice: _total, ...rest } = order;
  return rest;
}

function omitOrdersPricing<T extends { unitPrice?: unknown; totalPrice?: unknown }>(
  orders: T[],
): Omit<T, 'unitPrice' | 'totalPrice'>[] {
  return orders.map(omitOrderPricing);
}

export class OrderService {
  private async buildValidatedMeals(
    menuId: string,
    quantity: number,
    meals: OrderMealInput[],
    options: { strict: boolean },
  ) {
    if (options.strict && meals.length !== quantity) {
      throw new HttpError(
        'A quantidade de marmitas deve ser igual ao número de destinatários',
        400,
      );
    }

    if (quantity < 1) {
      throw new HttpError('Quantidade deve ser pelo menos 1', 400);
    }

    const seen = new Set<string>();
    for (const meal of meals) {
      const key = normalizeRecipient(meal.recipientName);
      if (options.strict && !key) {
        throw new HttpError('Nome do destinatário é obrigatório', 400);
      }
      if (key) {
        if (seen.has(key)) {
          throw new HttpError(
            'Destinatários devem ser únicos (ignorando maiúsculas/minúsculas)',
            400,
          );
        }
        seen.add(key);
      }

      if (options.strict && !meal.itemIds.length) {
        throw new HttpError(
          'Cada marmita deve ter ao menos um item do cardápio',
          400,
        );
      }
    }

    const menuRepo = new MenuPrismaRepository(prisma);
    const menu = await menuRepo.findById(menuId);
    if (!menu) {
      throw new HttpError('Cardápio não encontrado', 404);
    }

    const availableItems = new Map(
      menu.items
        .filter((item) => item.available)
        .map((item) => [item.id, item]),
    );

    const built = meals.map((meal, index) => {
      const uniqueItemIds = [...new Set(meal.itemIds)];
      const items = uniqueItemIds.map((itemId) => {
        const menuItem = availableItems.get(itemId);
        if (!menuItem) {
          throw new HttpError(
            'Item inválido ou indisponível no cardápio selecionado',
            400,
          );
        }
        return {
          menuItemId: menuItem.id,
          itemName: menuItem.name,
        };
      });

      return {
        recipientName: meal.recipientName.trim() || `Marmita ${index + 1}`,
        notes: meal.notes?.trim() || null,
        sortOrder: index,
        items,
      };
    });

    return { menu, meals: built };
  }

  async start(actingUserId: string, input: { menuId: string }) {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findByIdWithRelations(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (user.role !== $Enums.UserRole.REQUESTER) {
      throw new HttpError('Apenas solicitantes podem criar pedidos', 403);
    }
    if (!user.companyId || !user.company) {
      throw new HttpError('Solicitante sem empresa vinculada', 400);
    }
    if (!user.company.active) {
      throw new HttpError('Empresa do solicitante está inativa', 400);
    }

    const menuRepo = new MenuPrismaRepository(prisma);
    const menu = await menuRepo.findById(input.menuId);
    if (!menu) {
      throw new HttpError('Cardápio não encontrado', 404);
    }

    const orderRepo = new OrderPrismaRepository(prisma);
    const existingDraft = await orderRepo.findDraftForRequester(
      user.id,
      menu.date,
    );
    if (existingDraft) {
      return existingDraft;
    }

    const priceRepo = new MealPricePrismaRepository(prisma);
    const currentPrice = await priceRepo.findCurrent(user.companyId);
    if (!currentPrice) {
      throw new HttpError(
        'Empresa sem preço de marmita configurado. Contate o RH.',
        400,
      );
    }

    const order = await orderRepo.createDraft({
      requesterId: user.id,
      companyId: user.companyId,
      requesterName: user.name,
      companyName: user.company.name,
      restaurantId: menu.restaurantId,
      menuId: menu.id,
      menuDate: menu.date,
      unitPrice: currentPrice.amount,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: actingUserId,
      action: 'ORDER_START',
      entityType: 'Order',
      entityId: order.id,
      after: order,
    });

    return order;
  }

  async create(
    actingUserId: string,
    input: {
      menuId: string;
      quantity: number;
      fulfillmentType: $Enums.OrderFulfillmentType;
      meals: OrderMealInput[];
      orderCode?: string | undefined;
    },
  ) {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findByIdWithRelations(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (user.role !== $Enums.UserRole.REQUESTER) {
      throw new HttpError('Apenas solicitantes podem criar pedidos', 403);
    }
    if (!user.companyId || !user.company) {
      throw new HttpError('Solicitante sem empresa vinculada', 400);
    }
    if (!user.company.active) {
      throw new HttpError('Empresa do solicitante está inativa', 400);
    }

    const priceRepo = new MealPricePrismaRepository(prisma);
    const currentPrice = await priceRepo.findCurrent(user.companyId);
    if (!currentPrice) {
      throw new HttpError(
        'Empresa sem preço de marmita configurado. Contate o RH.',
        400,
      );
    }

    const { menu, meals } = await this.buildValidatedMeals(
      input.menuId,
      input.quantity,
      input.meals,
      { strict: true },
    );

    const unitPrice = currentPrice.amount;
    const totalPrice = new Prisma.Decimal(unitPrice).mul(input.quantity);

    const orderRepo = new OrderPrismaRepository(prisma);
    let order;
    try {
      order = await orderRepo.create({
        requesterId: user.id,
        companyId: user.companyId,
        requesterName: user.name,
        companyName: user.company.name,
        restaurantId: menu.restaurantId,
        menuId: menu.id,
        menuDate: menu.date,
        quantity: input.quantity,
        unitPrice,
        totalPrice,
        fulfillmentType: input.fulfillmentType,
        meals,
        changedById: user.id,
        ...(input.orderCode !== undefined
          ? { orderCode: input.orderCode }
          : {}),
      });
    } catch (error) {
      if (
        input.orderCode &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new HttpError('Código do pedido já em uso', 409);
      }
      throw error;
    }

    const audit = new AuditLogService();
    await audit.write({
      userId: actingUserId,
      action: 'ORDER_CREATE',
      entityType: 'Order',
      entityId: order.id,
      after: order,
    });

    return order;
  }

  async update(
    actingUserId: string,
    orderId: string,
    input: {
      menuId: string;
      quantity: number;
      fulfillmentType?: $Enums.OrderFulfillmentType | null | undefined;
      meals: OrderMealInput[];
    },
  ) {
    const userRepo = new UserPrismaRepository(prisma);
    const orderRepo = new OrderPrismaRepository(prisma);

    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    const existing = await orderRepo.findById(orderId);
    if (!existing) {
      throw new HttpError('Pedido não encontrado', 404);
    }

    if (existing.requesterId !== actingUserId) {
      throw new HttpError('Sem permissão para editar este pedido', 403);
    }

    if (existing.status === $Enums.OrderStatus.ACCEPTED) {
      throw new HttpError('Pedido em preparo não pode ser editado', 400);
    }

    if (existing.status === $Enums.OrderStatus.READY) {
      throw new HttpError('Pedido já finalizado não pode ser editado', 400);
    }

    if (
      existing.status !== $Enums.OrderStatus.SUBMITTED &&
      existing.status !== $Enums.OrderStatus.DRAFT
    ) {
      throw new HttpError(
        'Pedido só pode ser editado enquanto estiver em rascunho ou submetido',
        400,
      );
    }

    if (existing.status === $Enums.OrderStatus.SUBMITTED) {
      const submittedAt =
        [...(existing.statusHistory ?? [])]
          .reverse()
          .find((entry) => entry.toStatus === $Enums.OrderStatus.SUBMITTED)
          ?.createdAt ?? existing.createdAt;
      const elapsedMs = Date.now() - new Date(submittedAt).getTime();
      if (elapsedMs > ORDER_EDIT_WINDOW_MS) {
        throw new HttpError(
          'O prazo de 5 minutos para editar o pedido expirou',
          400,
        );
      }
    }

    const isDraft = existing.status === $Enums.OrderStatus.DRAFT;
    const { menu, meals } = await this.buildValidatedMeals(
      input.menuId,
      input.quantity,
      input.meals,
      { strict: !isDraft },
    );

    const unitPrice = existing.unitPrice;
    const totalPrice = new Prisma.Decimal(unitPrice).mul(input.quantity);

    const fulfillmentType =
      input.fulfillmentType !== undefined
        ? input.fulfillmentType
        : existing.fulfillmentType;

    if (!isDraft && !fulfillmentType) {
      throw new HttpError('Informe se é retirada ou entrega', 400);
    }

    const updated = await orderRepo.replaceMeals(orderId, {
      quantity: input.quantity,
      unitPrice,
      totalPrice,
      menuId: menu.id,
      menuDate: menu.date,
      restaurantId: menu.restaurantId,
      fulfillmentType: fulfillmentType ?? null,
      meals,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: actingUserId,
      action: isDraft ? 'ORDER_DRAFT_UPDATE' : 'ORDER_UPDATE',
      entityType: 'Order',
      entityId: orderId,
      before: existing,
      after: updated,
    });

    return updated;
  }

  async submit(actingUserId: string, orderId: string) {
    const userRepo = new UserPrismaRepository(prisma);
    const orderRepo = new OrderPrismaRepository(prisma);

    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    const existing = await orderRepo.findById(orderId);
    if (!existing) {
      throw new HttpError('Pedido não encontrado', 404);
    }

    if (existing.requesterId !== actingUserId) {
      throw new HttpError('Sem permissão para enviar este pedido', 403);
    }

    if (existing.status !== $Enums.OrderStatus.DRAFT) {
      throw new HttpError('Somente rascunhos podem ser enviados', 400);
    }

    if (!existing.fulfillmentType) {
      throw new HttpError('Informe se é retirada ou entrega', 400);
    }

    const mealInputs: OrderMealInput[] = existing.meals.map((meal) => ({
      recipientName: meal.recipientName,
      notes: meal.notes,
      itemIds: meal.items
        .map((i) => i.menuItemId)
        .filter((id): id is string => Boolean(id)),
    }));

    await this.buildValidatedMeals(
      existing.menuId,
      existing.quantity,
      mealInputs,
      { strict: true },
    );

    const updated = await orderRepo.updateStatus(orderId, {
      fromStatus: $Enums.OrderStatus.DRAFT,
      toStatus: $Enums.OrderStatus.SUBMITTED,
      changedById: actingUserId,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: actingUserId,
      action: 'ORDER_SUBMIT',
      entityType: 'Order',
      entityId: orderId,
      before: { status: existing.status },
      after: { status: $Enums.OrderStatus.SUBMITTED },
    });

    return updated;
  }

  async changeStatus(
    actingUserId: string,
    orderId: string,
    toStatus: $Enums.OrderStatus,
  ) {
    const userRepo = new UserPrismaRepository(prisma);
    const orderRepo = new OrderPrismaRepository(prisma);

    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new HttpError('Pedido não encontrado', 404);
    }

    if (user.role === $Enums.UserRole.RESTAURANT) {
      const restaurantId = requireBoundRestaurantId(user);
      if (order.restaurantId !== restaurantId) {
        throw new HttpError('Pedido de outro restaurante', 403);
      }
    }

    if (user.role === $Enums.UserRole.REQUESTER) {
      throw new HttpError(
        'Solicitante não pode alterar o status do pedido',
        403,
      );
    }

    if (order.status === $Enums.OrderStatus.DRAFT) {
      throw new HttpError('Rascunhos não podem ser avançados pelo restaurante', 400);
    }

    if (!canTransitionStatus(order.status, toStatus)) {
      throw new HttpError(
        `Transição de status inválida: ${order.status} → ${toStatus}`,
        400,
      );
    }

    const updated = await orderRepo.updateStatus(orderId, {
      fromStatus: order.status,
      toStatus,
      changedById: actingUserId,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: actingUserId,
      action: 'ORDER_STATUS_CHANGE',
      entityType: 'Order',
      entityId: orderId,
      before: { status: order.status },
      after: { status: toStatus },
    });

    if (user.role === $Enums.UserRole.RESTAURANT) {
      return omitOrderPricing(updated);
    }
    return updated;
  }

  async list(
    actingUserId: string,
    filters: {
      status?: $Enums.OrderStatus | undefined;
      menuDate?: Date | string | undefined;
      fromDate?: Date | string | undefined;
      toDate?: Date | string | undefined;
      companyId?: string | undefined;
    } = {},
  ) {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    const orderRepo = new OrderPrismaRepository(prisma);
    const base: {
      status?: $Enums.OrderStatus;
      excludeDraft?: boolean;
      menuDate?: Date;
      fromDate?: Date;
      toDate?: Date;
      companyId?: string;
      requesterId?: string;
      restaurantId?: string;
    } = {};

    if (filters.status) base.status = filters.status;
    if (filters.menuDate) base.menuDate = toDateOnly(filters.menuDate);
    if (filters.fromDate) base.fromDate = toDateOnly(filters.fromDate);
    if (filters.toDate) base.toDate = toDateOnly(filters.toDate);
    if (filters.companyId) base.companyId = filters.companyId;

    if (user.role === $Enums.UserRole.REQUESTER) {
      base.requesterId = user.id;
      return orderRepo.findMany(base);
    }

    if (user.role === $Enums.UserRole.RESTAURANT) {
      base.restaurantId = requireBoundRestaurantId(user);
      if (base.status === $Enums.OrderStatus.DRAFT) {
        return [];
      }
      if (!base.status) base.excludeDraft = true;
      return omitOrdersPricing(await orderRepo.findMany(base));
    }

    if (base.status === $Enums.OrderStatus.DRAFT) {
      return [];
    }
    if (!base.status) base.excludeDraft = true;
    return orderRepo.findMany(base);
  }

  async getById(actingUserId: string, orderId: string) {
    const userRepo = new UserPrismaRepository(prisma);
    const orderRepo = new OrderPrismaRepository(prisma);

    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    const order = await orderRepo.findById(orderId);
    if (!order) {
      throw new HttpError('Pedido não encontrado', 404);
    }

    if (
      user.role === $Enums.UserRole.REQUESTER &&
      order.requesterId !== actingUserId
    ) {
      throw new HttpError('Sem permissão para ver este pedido', 403);
    }

    if (user.role === $Enums.UserRole.RESTAURANT) {
      const restaurantId = requireBoundRestaurantId(user);
      if (order.restaurantId !== restaurantId) {
        throw new HttpError('Sem permissão para ver este pedido', 403);
      }
    }

    if (
      user.role === $Enums.UserRole.RESTAURANT &&
      order.status === $Enums.OrderStatus.DRAFT
    ) {
      throw new HttpError('Sem permissão para ver este pedido', 403);
    }

    if (user.role === $Enums.UserRole.RESTAURANT) {
      return omitOrderPricing(order);
    }
    return order;
  }

  async dashboardRh(filters: {
    fromDate?: Date | string | undefined;
    toDate?: Date | string | undefined;
  } = {}) {
    const orderRepo = new OrderPrismaRepository(prisma);
    const period: { fromDate?: Date; toDate?: Date } = {};
    if (filters.fromDate) period.fromDate = toDateOnly(filters.fromDate);
    if (filters.toDate) period.toDate = toDateOnly(filters.toDate);

    const byStatus = await orderRepo.countByStatus(period);
    const byCompany = await orderRepo.aggregateByCompany(period);

    const totals = byStatus.reduce(
      (acc, row) => {
        acc.orders += row._count._all;
        acc.quantity += row._sum.quantity ?? 0;
        acc.totalPrice = acc.totalPrice.add(
          row._sum.totalPrice ?? new Prisma.Decimal(0),
        );
        return acc;
      },
      {
        orders: 0,
        quantity: 0,
        totalPrice: new Prisma.Decimal(0),
      },
    );

    return {
      byStatus: byStatus.map((row) => ({
        status: row.status,
        orders: row._count._all,
        quantity: row._sum.quantity ?? 0,
        totalPrice: row._sum.totalPrice,
      })),
      byCompany: byCompany.map((row) => ({
        companyId: row.companyId,
        companyName: row.companyName,
        orders: row._count._all,
        quantity: row._sum.quantity ?? 0,
        totalPrice: row._sum.totalPrice,
      })),
      totals: {
        orders: totals.orders,
        quantity: totals.quantity,
        totalPrice: totals.totalPrice,
      },
    };
  }

  async dashboardRestaurant(actingUserId: string, menuDate?: Date | string) {
    const userRepo = new UserPrismaRepository(prisma);
    const restaurantRepo = new RestaurantPrismaRepository(prisma);
    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    let restaurantId = user.restaurantId ?? undefined;
    if (user.role === $Enums.UserRole.RESTAURANT) {
      restaurantId = requireBoundRestaurantId(user);
    } else if (!restaurantId) {
      const first = await restaurantRepo.findFirstActive();
      restaurantId = first?.id;
    }
    if (!restaurantId) {
      throw new HttpError('Restaurante não encontrado', 404);
    }

    const date = menuDate ? toDateOnly(menuDate) : toDateOnly(new Date());
    const orderRepo = new OrderPrismaRepository(prisma);
    const byStatus = await orderRepo.countByStatus({
      restaurantId,
      menuDate: date,
    });

    const pending = byStatus
      .filter((row) =>
        (
          [
            $Enums.OrderStatus.SUBMITTED,
            $Enums.OrderStatus.ACCEPTED,
          ] as $Enums.OrderStatus[]
        ).includes(row.status),
      )
      .reduce(
        (acc, row) => {
          acc.orders += row._count._all;
          acc.quantity += row._sum.quantity ?? 0;
          return acc;
        },
        { orders: 0, quantity: 0 },
      );

    return {
      menuDate: date.toISOString().slice(0, 10),
      restaurantId,
      byStatus: byStatus.map((row) => ({
        status: row.status,
        orders: row._count._all,
        quantity: row._sum.quantity ?? 0,
      })),
      pending,
    };
  }
}

