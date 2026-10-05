import { Prisma, PrismaClient } from '../../generated/prisma/client.js';

const menuWithItemsInclude = {
  items: {
    orderBy: { sortOrder: 'asc' as const },
  },
  restaurant: {
    select: {
      id: true,
      name: true,
      active: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  updatedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type MenuWithItems = Prisma.MenuGetPayload<{
  include: typeof menuWithItemsInclude;
}>;

export class MenuPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string): Promise<MenuWithItems | null> {
    return this.prisma.menu.findUnique({
      where: { id },
      include: menuWithItemsInclude,
    });
  }

  async findByRestaurantAndDate(
    restaurantId: string,
    date: Date,
  ): Promise<MenuWithItems | null> {
    return this.prisma.menu.findUnique({
      where: {
        restaurantId_date: {
          restaurantId,
          date,
        },
      },
      include: menuWithItemsInclude,
    });
  }

  async listFromDate(fromDate: Date, restaurantId?: string) {
    return this.prisma.menu.findMany({
      where: {
        date: { gte: fromDate },
        ...(restaurantId ? { restaurantId } : {}),
      },
      include: menuWithItemsInclude,
      orderBy: { date: 'asc' },
    });
  }

  async upsertWithItems(data: {
    restaurantId: string;
    date: Date;
    actingUserId: string;
    items: Array<{
      name: string;
      description?: string | null;
      iconKey?: string | null;
      available?: boolean;
      sortOrder?: number;
    }>;
  }): Promise<MenuWithItems> {
    const existing = await this.prisma.menu.findUnique({
      where: {
        restaurantId_date: {
          restaurantId: data.restaurantId,
          date: data.date,
        },
      },
    });

    if (existing) {
      await this.prisma.menuItem.deleteMany({
        where: { menuId: existing.id },
      });

      return this.prisma.menu.update({
        where: { id: existing.id },
        data: {
          createdById: existing.createdById ?? data.actingUserId,
          updatedById: data.actingUserId,
          items: {
            create: data.items.map((item, index) => ({
              name: item.name,
              description: item.description?.trim() || null,
              iconKey: item.iconKey ?? null,
              available: item.available ?? true,
              sortOrder: item.sortOrder ?? index,
            })),
          },
        },
        include: menuWithItemsInclude,
      });
    }

    return this.prisma.menu.create({
      data: {
        restaurantId: data.restaurantId,
        date: data.date,
        createdById: data.actingUserId,
        updatedById: data.actingUserId,
        items: {
          create: data.items.map((item, index) => ({
            name: item.name,
            description: item.description?.trim() || null,
            iconKey: item.iconKey ?? null,
            available: item.available ?? true,
            sortOrder: item.sortOrder ?? index,
          })),
        },
      },
      include: menuWithItemsInclude,
    });
  }
}
