import { $Enums, Prisma } from '../generated/prisma/client.js';
import { canTransitionStatus } from '../constants/order-status.js';
import { HttpError } from '../https/errors/index.js';
import {
  canRestaurantStartPrep,
  formatSaoPauloDateIso,
  getRestaurantPrepBatch,
  isRequesterOrderWindowOpen,
  RESTAURANT_START_PREP_WINDOW_MESSAGE,
  REQUESTER_ORDER_WINDOW_MESSAGE,
  todaySaoPauloDateOnly,
} from '../lib/order-request-window.js';
import { buildPrepOrdersPdf } from '../lib/prep-orders-pdf.js';
import { prisma } from '../lib/prisma.js';
import { CompanyPrismaRepository } from '../repositories/prisma/company-repository.js';
import { MealPricePrismaRepository } from '../repositories/prisma/meal-price-repository.js';
import { MenuPrismaRepository } from '../repositories/prisma/menu-repository.js';
import { OrderPrismaRepository } from '../repositories/prisma/order-repository.js';
import { RestaurantPrismaRepository } from '../repositories/prisma/restaurant-repository.js';
import { UserPrismaRepository } from '../repositories/prisma/user-repository.js';
import { AuditLogService } from './audit-log-service.js';

export type OrderMealInput = {
  recipientName: string;
  workLocation?: string | null | undefined;
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

function assertRequesterOrderWindowOpen() {
  if (!isRequesterOrderWindowOpen()) {
    throw new HttpError(REQUESTER_ORDER_WINDOW_MESSAGE, 400);
  }
}

function canCreateOrders(role: $Enums.UserRole): boolean {
  return role === $Enums.UserRole.REQUESTER || role === $Enums.UserRole.RH;
}

async function resolveOrderCompany(
  user: {
    role: $Enums.UserRole;
    companyId: string | null;
    company: { id: string; name: string; active: boolean } | null;
  },
  companyIdInput?: string | null,
): Promise<{ companyId: string; companyName: string; isSpecial: boolean }> {
  if (user.role === $Enums.UserRole.RH) {
    if (!companyIdInput) {
      throw new HttpError(
        'Informe a empresa para a solicitação especial',
        400,
      );
    }
    const companyRepo = new CompanyPrismaRepository(prisma);
    const company = await companyRepo.findById(companyIdInput);
    if (!company) {
      throw new HttpError('Empresa não encontrada', 404);
    }
    if (!company.active) {
      throw new HttpError('Empresa selecionada está inativa', 400);
    }
    return {
      companyId: company.id,
      companyName: company.name,
      isSpecial: true,
    };
  }

  if (!user.companyId || !user.company) {
    throw new HttpError('Solicitante sem empresa vinculada', 400);
  }
  if (!user.company.active) {
    throw new HttpError('Empresa do solicitante está inativa', 400);
  }
  return {
    companyId: user.companyId,
    companyName: user.company.name,
    isSpecial: false,
  };
}

export class OrderService {
  private async buildValidatedMeals(
    menuId: string,
    quantity: number,
    meals: OrderMealInput[],
    options: { strict: boolean; requireWorkLocation?: boolean },
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

    const requireWorkLocation = Boolean(options.requireWorkLocation);
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

      if (
        options.strict &&
        requireWorkLocation &&
        !meal.workLocation?.trim()
      ) {
        throw new HttpError(
          'Informe onde cada pessoa da marmita está trabalhando',
          400,
        );
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
        workLocation: meal.workLocation?.trim() || null,
        notes: meal.notes?.trim() || null,
        sortOrder: index,
        items,
      };
    });

    return { menu, meals: built };
  }

  async start(
    actingUserId: string,
    input: { menuId: string; companyId?: string | undefined },
  ) {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findByIdWithRelations(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (!canCreateOrders(user.role)) {
      throw new HttpError(
        'Apenas solicitantes ou RH podem criar pedidos',
        403,
      );
    }

    const { companyId, companyName, isSpecial } = await resolveOrderCompany(
      user,
      input.companyId,
    );

    const menuRepo = new MenuPrismaRepository(prisma);
    const menu = await menuRepo.findById(input.menuId);
    if (!menu) {
      throw new HttpError('Cardápio não encontrado', 404);
    }

    const orderRepo = new OrderPrismaRepository(prisma);
    const existingDraft = await orderRepo.findDraftForRequester(
      user.id,
      menu.date,
      isSpecial ? { companyId } : undefined,
    );
    if (existingDraft) {
      return existingDraft;
    }

    if (user.role !== $Enums.UserRole.RH) {
      assertRequesterOrderWindowOpen();
    }

    const priceRepo = new MealPricePrismaRepository(prisma);
    const currentPrice = await priceRepo.findCurrent(companyId);
    if (!currentPrice) {
      throw new HttpError(
        isSpecial
          ? 'Empresa sem preço de marmita configurado.'
          : 'Empresa sem preço de marmita configurado. Contate o RH.',
        400,
      );
    }

    const order = await orderRepo.createDraft({
      requesterId: user.id,
      companyId,
      requesterName: user.name,
      companyName,
      restaurantId: menu.restaurantId,
      menuId: menu.id,
      menuDate: menu.date,
      unitPrice: currentPrice.amount,
      isSpecial,
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
      fulfillmentType?: $Enums.OrderFulfillmentType | null | undefined;
      meals: OrderMealInput[];
      orderCode?: string | undefined;
      companyId?: string | undefined;
    },
  ) {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findByIdWithRelations(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (!canCreateOrders(user.role)) {
      throw new HttpError(
        'Apenas solicitantes ou RH podem criar pedidos',
        403,
      );
    }

    if (user.role !== $Enums.UserRole.RH) {
      assertRequesterOrderWindowOpen();
    }

    const { companyId, companyName, isSpecial } = await resolveOrderCompany(
      user,
      input.companyId,
    );

    const priceRepo = new MealPricePrismaRepository(prisma);
    const currentPrice = await priceRepo.findCurrent(companyId);
    if (!currentPrice) {
      throw new HttpError(
        isSpecial
          ? 'Empresa sem preço de marmita configurado.'
          : 'Empresa sem preço de marmita configurado. Contate o RH.',
        400,
      );
    }

    const { menu, meals } = await this.buildValidatedMeals(
      input.menuId,
      input.quantity,
      input.meals,
      {
        strict: true,
        requireWorkLocation: user.requiresWorkLocation,
      },
    );

    const unitPrice = currentPrice.amount;
    const totalPrice = new Prisma.Decimal(unitPrice).mul(input.quantity);

    const orderRepo = new OrderPrismaRepository(prisma);
    let order;
    try {
      order = await orderRepo.create({
        requesterId: user.id,
        companyId,
        requesterName: user.name,
        companyName,
        restaurantId: menu.restaurantId,
        menuId: menu.id,
        menuDate: menu.date,
        quantity: input.quantity,
        unitPrice,
        totalPrice,
        fulfillmentType: input.fulfillmentType ?? null,
        meals,
        changedById: user.id,
        isSpecial,
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

    if (user.role === $Enums.UserRole.RH && !existing.isSpecial) {
      throw new HttpError(
        'RH só pode editar solicitações especiais próprias',
        403,
      );
    }

    if (
      user.role !== $Enums.UserRole.REQUESTER &&
      user.role !== $Enums.UserRole.RH
    ) {
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

    if (user.role !== $Enums.UserRole.RH) {
      assertRequesterOrderWindowOpen();
    }

    const isDraft = existing.status === $Enums.OrderStatus.DRAFT;
    const { menu, meals } = await this.buildValidatedMeals(
      input.menuId,
      input.quantity,
      input.meals,
      {
        strict: !isDraft,
        requireWorkLocation: user.requiresWorkLocation,
      },
    );

    const unitPrice = existing.unitPrice;
    const totalPrice = new Prisma.Decimal(unitPrice).mul(input.quantity);

    const fulfillmentType =
      input.fulfillmentType !== undefined
        ? input.fulfillmentType
        : existing.fulfillmentType;

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

    if (user.role !== $Enums.UserRole.RH) {
      assertRequesterOrderWindowOpen();
    }

    const existing = await orderRepo.findById(orderId);
    if (!existing) {
      throw new HttpError('Pedido não encontrado', 404);
    }

    if (existing.requesterId !== actingUserId) {
      throw new HttpError('Sem permissão para enviar este pedido', 403);
    }

    if (user.role === $Enums.UserRole.RH && !existing.isSpecial) {
      throw new HttpError(
        'RH só pode enviar solicitações especiais próprias',
        403,
      );
    }

    if (
      user.role !== $Enums.UserRole.REQUESTER &&
      user.role !== $Enums.UserRole.RH
    ) {
      throw new HttpError('Sem permissão para enviar este pedido', 403);
    }

    if (existing.status !== $Enums.OrderStatus.DRAFT) {
      throw new HttpError('Somente rascunhos podem ser enviados', 400);
    }

    const mealInputs: OrderMealInput[] = existing.meals.map((meal) => ({
      recipientName: meal.recipientName,
      workLocation: meal.workLocation,
      notes: meal.notes,
      itemIds: meal.items
        .map((i) => i.menuItemId)
        .filter((id): id is string => Boolean(id)),
    }));

    await this.buildValidatedMeals(
      existing.menuId,
      existing.quantity,
      mealInputs,
      {
        strict: true,
        requireWorkLocation: user.requiresWorkLocation,
      },
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

  async startPrepAndPrint(actingUserId: string): Promise<{
    pdf: Uint8Array;
    filename: string;
    updated: number;
  }> {
    if (!canRestaurantStartPrep()) {
      throw new HttpError(RESTAURANT_START_PREP_WINDOW_MESSAGE, 400);
    }

    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (user.role !== $Enums.UserRole.RESTAURANT) {
      throw new HttpError(
        'Apenas o restaurante pode iniciar o preparo em lote',
        403,
      );
    }
    const restaurantId = requireBoundRestaurantId(user);
    const menuDate = todaySaoPauloDateOnly();
    const menuDateIso = formatSaoPauloDateIso();

    const orderRepo = new OrderPrismaRepository(prisma);
    const orders = await orderRepo.findMany({
      restaurantId,
      menuDate,
      status: $Enums.OrderStatus.SUBMITTED,
    });

    if (orders.length === 0) {
      throw new HttpError('Não há pedidos na fila para iniciar o preparo', 400);
    }

    const sorted = [...orders].sort((a, b) =>
      a.orderCode.localeCompare(b.orderCode),
    );

    const audit = new AuditLogService();
    for (const order of sorted) {
      await orderRepo.updateStatus(order.id, {
        fromStatus: $Enums.OrderStatus.SUBMITTED,
        toStatus: $Enums.OrderStatus.ACCEPTED,
        changedById: actingUserId,
      });
      await audit.write({
        userId: actingUserId,
        action: 'ORDER_STATUS_CHANGE',
        entityType: 'Order',
        entityId: order.id,
        before: { status: $Enums.OrderStatus.SUBMITTED },
        after: { status: $Enums.OrderStatus.ACCEPTED },
      });
    }

    const pdf = await buildPrepOrdersPdf({
      menuDateIso,
      batch: getRestaurantPrepBatch(),
      orders: sorted.map((order) => ({
        orderCode: order.orderCode,
        companyName: order.companyName,
        requesterName: order.requesterName,
        fulfillmentType: order.fulfillmentType,
        quantity: order.quantity,
        isSpecial: order.isSpecial,
        meals: order.meals.map((meal) => ({
          recipientName: meal.recipientName,
          workLocation: meal.workLocation,
          notes: meal.notes,
          items: meal.items.map((item) => ({
            itemName: item.itemName || item.menuItem?.name || 'Item',
          })),
        })),
      })),
    });

    return {
      pdf,
      filename: `pedidos-${menuDateIso}.pdf`,
      updated: sorted.length,
    };
  }

  /** Gera o PDF do dia sem alterar status nem checar horário (simulação). */
  async simulatePrepPdf(actingUserId: string): Promise<{
    pdf: Uint8Array;
    filename: string;
  }> {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (user.role !== $Enums.UserRole.RESTAURANT) {
      throw new HttpError(
        'Apenas o restaurante pode simular a impressão do PDF',
        403,
      );
    }
    const restaurantId = requireBoundRestaurantId(user);
    const menuDate = todaySaoPauloDateOnly();
    const menuDateIso = formatSaoPauloDateIso();

    const orderRepo = new OrderPrismaRepository(prisma);
    const orders = await orderRepo.findMany({
      restaurantId,
      menuDate,
      excludeDraft: true,
    });

    if (orders.length === 0) {
      throw new HttpError('Não há pedidos para gerar o PDF de simulação', 400);
    }

    const sorted = [...orders].sort((a, b) =>
      a.orderCode.localeCompare(b.orderCode),
    );

    const pdf = await buildPrepOrdersPdf({
      menuDateIso,
      batch: getRestaurantPrepBatch(),
      orders: sorted.map((order) => ({
        orderCode: order.orderCode,
        companyName: order.companyName,
        requesterName: order.requesterName,
        fulfillmentType: order.fulfillmentType,
        quantity: order.quantity,
        isSpecial: order.isSpecial,
        meals: order.meals.map((meal) => ({
          recipientName: meal.recipientName,
          workLocation: meal.workLocation,
          notes: meal.notes,
          items: meal.items.map((item) => ({
            itemName: item.itemName || item.menuItem?.name || 'Item',
          })),
        })),
      })),
    });

    return {
      pdf,
      filename: `pedidos-simulacao-${menuDateIso}.pdf`,
    };
  }

  async markBatchReady(actingUserId: string): Promise<{ updated: number }> {
    const userRepo = new UserPrismaRepository(prisma);
    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    if (user.role !== $Enums.UserRole.RESTAURANT) {
      throw new HttpError(
        'Apenas o restaurante pode marcar o lote como pronto',
        403,
      );
    }
    const restaurantId = requireBoundRestaurantId(user);
    const menuDate = todaySaoPauloDateOnly();

    const orderRepo = new OrderPrismaRepository(prisma);
    const orders = await orderRepo.findMany({
      restaurantId,
      menuDate,
      status: $Enums.OrderStatus.ACCEPTED,
    });

    if (orders.length === 0) {
      throw new HttpError('Não há pedidos em preparo para marcar como prontos', 400);
    }

    const audit = new AuditLogService();
    for (const order of orders) {
      await orderRepo.updateStatus(order.id, {
        fromStatus: $Enums.OrderStatus.ACCEPTED,
        toStatus: $Enums.OrderStatus.READY,
        changedById: actingUserId,
      });
      await audit.write({
        userId: actingUserId,
        action: 'ORDER_STATUS_CHANGE',
        entityType: 'Order',
        entityId: order.id,
        before: { status: $Enums.OrderStatus.ACCEPTED },
        after: { status: $Enums.OrderStatus.READY },
      });
    }

    return { updated: orders.length };
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

    if (user.role === $Enums.UserRole.RH) {
      return orderRepo.findManyForRh(user.id, base);
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

    if (
      user.role === $Enums.UserRole.RH &&
      order.status === $Enums.OrderStatus.DRAFT &&
      (order.requesterId !== actingUserId || !order.isSpecial)
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

