import { $Enums } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { MenuPrismaRepository } from '../repositories/prisma/menu-repository.js';
import { RestaurantPrismaRepository } from '../repositories/prisma/restaurant-repository.js';
import { UserPrismaRepository } from '../repositories/prisma/user-repository.js';
import { AuditLogService } from './audit-log-service.js';

function toDateOnly(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export class MenuService {
  private async resolveRestaurantId(
    actingUserId: string,
    restaurantId?: string,
  ): Promise<string> {
    const userRepo = new UserPrismaRepository(prisma);
    const restaurantRepo = new RestaurantPrismaRepository(prisma);
    const user = await userRepo.findById(actingUserId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }

    if (user.role === $Enums.UserRole.RESTAURANT) {
      if (!user.restaurantId) {
        throw new HttpError('Usuário sem restaurante vinculado', 400);
      }
      return user.restaurantId;
    }

    if (restaurantId) {
      const restaurant = await restaurantRepo.findById(restaurantId);
      if (!restaurant || !restaurant.active) {
        throw new HttpError('Restaurante inválido ou inativo', 400);
      }
      return restaurant.id;
    }

    const first = await restaurantRepo.findFirstActive();
    if (!first) {
      throw new HttpError('Nenhum restaurante cadastrado', 400);
    }
    return first.id;
  }

  async upsert(
    input: {
      date: Date | string;
      restaurantId?: string | undefined;
      items: Array<{
        name: string;
        description?: string | null | undefined;
        iconKey?: string | null | undefined;
        available?: boolean | undefined;
        sortOrder?: number | undefined;
      }>;
    },
    actingUserId: string,
  ) {
    if (!input.items.length) {
      throw new HttpError('Cardápio deve ter ao menos um item', 400);
    }

    const restaurantId = await this.resolveRestaurantId(
      actingUserId,
      input.restaurantId,
    );
    const date = toDateOnly(input.date);
    const repo = new MenuPrismaRepository(prisma);
    const before = await repo.findByRestaurantAndDate(restaurantId, date);

    const menu = await repo.upsertWithItems({
      restaurantId,
      date,
      actingUserId,
      items: input.items.map((item, index) => ({
        name: item.name.trim(),
        description: item.description?.trim() || null,
        iconKey: item.iconKey ?? null,
        available: item.available ?? true,
        sortOrder: item.sortOrder ?? index,
      })),
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: actingUserId,
      action: before ? 'MENU_UPDATE' : 'MENU_CREATE',
      entityType: 'Menu',
      entityId: menu.id,
      before,
      after: menu,
    });

    return menu;
  }

  async getByDate(date: Date | string, restaurantId?: string) {
    const restaurantRepo = new RestaurantPrismaRepository(prisma);
    let resolvedRestaurantId = restaurantId;

    if (!resolvedRestaurantId) {
      const first = await restaurantRepo.findFirstActive();
      if (!first) {
        throw new HttpError('Nenhum restaurante cadastrado', 404);
      }
      resolvedRestaurantId = first.id;
    }

    const repo = new MenuPrismaRepository(prisma);
    const menu = await repo.findByRestaurantAndDate(
      resolvedRestaurantId,
      toDateOnly(date),
    );
    if (!menu) {
      throw new HttpError('Cardápio não encontrado para a data', 404);
    }
    return menu;
  }

  async listUpcoming(fromDate?: Date | string, restaurantId?: string) {
    const repo = new MenuPrismaRepository(prisma);
    const from = fromDate ? toDateOnly(fromDate) : toDateOnly(new Date());
    return repo.listFromDate(from, restaurantId);
  }
}
