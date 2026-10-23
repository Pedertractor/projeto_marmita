import {
  $Enums,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client.js';
import { generateOrderCode } from '../../utils/order-code.js';

const orderFullInclude = {
  meals: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      items: {
        include: {
          menuItem: {
            select: {
              id: true,
              iconKey: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  },
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
  },
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  company: {
    select: {
      id: true,
      name: true,
      active: true,
    },
  },
  restaurant: {
    select: {
      id: true,
      name: true,
    },
  },
  menu: {
    select: {
      id: true,
      date: true,
    },
  },
} as const;

export type OrderFull = Prisma.OrderGetPayload<{
  include: typeof orderFullInclude;
}>;

export type OrderListFilters = {
  requesterId?: string;
  companyId?: string;
  restaurantId?: string;
  status?: $Enums.OrderStatus;
  excludeDraft?: boolean;
  menuDate?: Date;
  fromDate?: Date;
  toDate?: Date;
};

export type OrderMealWrite = {
  recipientName: string;
  workLocation?: string | null;
  notes?: string | null;
  sortOrder: number;
  items: Array<{
    menuItemId?: string | null;
    itemName: string;
  }>;
};

const MAX_CODE_ATTEMPTS = 12;

export class OrderPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string): Promise<OrderFull | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: orderFullInclude,
    });
  }

  async findDraftForRequester(
    requesterId: string,
    menuDate: Date,
    options?: { companyId?: string },
  ): Promise<OrderFull | null> {
    return this.prisma.order.findFirst({
      where: {
        requesterId,
        menuDate,
        status: $Enums.OrderStatus.DRAFT,
        ...(options?.companyId ? { companyId: options.companyId } : {}),
      },
      include: orderFullInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMany(filters: OrderListFilters = {}): Promise<OrderFull[]> {
    const where: Prisma.OrderWhereInput = {};

    if (filters.requesterId) where.requesterId = filters.requesterId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.restaurantId) where.restaurantId = filters.restaurantId;
    if (filters.status) {
      where.status = filters.status;
    } else if (filters.excludeDraft) {
      where.status = { not: $Enums.OrderStatus.DRAFT };
    }
    if (filters.menuDate) where.menuDate = filters.menuDate;

    if (filters.fromDate || filters.toDate) {
      where.menuDate = {
        ...(filters.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters.toDate ? { lte: filters.toDate } : {}),
      };
    }

    return this.prisma.order.findMany({
      where,
      include: orderFullInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * RH: pedidos enviados de todos + rascunhos especiais do próprio usuário.
   */
  async findManyForRh(
    rhUserId: string,
    filters: Omit<OrderListFilters, 'requesterId' | 'excludeDraft'> = {},
  ): Promise<OrderFull[]> {
    const dateFilter: Prisma.OrderWhereInput = {};
    if (filters.menuDate) dateFilter.menuDate = filters.menuDate;
    if (filters.fromDate || filters.toDate) {
      dateFilter.menuDate = {
        ...(filters.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters.toDate ? { lte: filters.toDate } : {}),
      };
    }
    if (filters.companyId) dateFilter.companyId = filters.companyId;
    if (filters.restaurantId) dateFilter.restaurantId = filters.restaurantId;

    if (filters.status === $Enums.OrderStatus.DRAFT) {
      return this.prisma.order.findMany({
        where: {
          ...dateFilter,
          status: $Enums.OrderStatus.DRAFT,
          requesterId: rhUserId,
          isSpecial: true,
        },
        include: orderFullInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    if (filters.status) {
      return this.prisma.order.findMany({
        where: {
          ...dateFilter,
          status: filters.status,
        },
        include: orderFullInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.order.findMany({
      where: {
        ...dateFilter,
        OR: [
          { status: { not: $Enums.OrderStatus.DRAFT } },
          {
            status: $Enums.OrderStatus.DRAFT,
            requesterId: rhUserId,
            isSpecial: true,
          },
        ],
      },
      include: orderFullInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async createWithUniqueCode(
    data: Omit<Prisma.OrderCreateInput, 'orderCode'>,
    preferredOrderCode?: string,
  ): Promise<OrderFull> {
    if (preferredOrderCode) {
      return await this.prisma.order.create({
        data: {
          ...data,
          orderCode: preferredOrderCode,
        },
        include: orderFullInclude,
      });
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.order.create({
          data: {
            ...data,
            orderCode: generateOrderCode(),
          },
          include: orderFullInclude,
        });
      } catch (error) {
        lastError = error;
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async createDraft(data: {
    requesterId: string;
    companyId: string;
    requesterName: string;
    companyName: string;
    restaurantId: string;
    menuId: string;
    menuDate: Date;
    unitPrice: Prisma.Decimal | number | string;
    isSpecial?: boolean;
  }): Promise<OrderFull> {
    return this.createWithUniqueCode({
      requester: { connect: { id: data.requesterId } },
      company: { connect: { id: data.companyId } },
      restaurant: { connect: { id: data.restaurantId } },
      menu: { connect: { id: data.menuId } },
      requesterName: data.requesterName,
      companyName: data.companyName,
      menuDate: data.menuDate,
      quantity: 1,
      unitPrice: data.unitPrice,
      totalPrice: data.unitPrice,
      status: $Enums.OrderStatus.DRAFT,
      fulfillmentType: null,
      isSpecial: data.isSpecial ?? false,
    });
  }

  /** Direct create as SUBMITTED; uses client orderCode when provided. */
  async create(data: {
    requesterId: string;
    companyId: string;
    requesterName: string;
    companyName: string;
    restaurantId: string;
    menuId: string;
    menuDate: Date;
    quantity: number;
    unitPrice: Prisma.Decimal | number | string;
    totalPrice: Prisma.Decimal | number | string;
    fulfillmentType?: $Enums.OrderFulfillmentType | null;
    meals: OrderMealWrite[];
    changedById: string;
    orderCode?: string;
    isSpecial?: boolean;
  }): Promise<OrderFull> {
    return this.createWithUniqueCode(
      {
        requester: { connect: { id: data.requesterId } },
        company: { connect: { id: data.companyId } },
        restaurant: { connect: { id: data.restaurantId } },
        menu: { connect: { id: data.menuId } },
        requesterName: data.requesterName,
        companyName: data.companyName,
        menuDate: data.menuDate,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        fulfillmentType: data.fulfillmentType ?? null,
        status: $Enums.OrderStatus.SUBMITTED,
        isSpecial: data.isSpecial ?? false,
        meals: {
          create: data.meals.map((meal) => ({
            recipientName: meal.recipientName,
            workLocation: meal.workLocation ?? null,
            notes: meal.notes ?? null,
            sortOrder: meal.sortOrder,
            items: {
              create: meal.items.map((item) => ({
                menuItemId: item.menuItemId ?? null,
                itemName: item.itemName,
              })),
            },
          })),
        },
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: $Enums.OrderStatus.SUBMITTED,
            changedById: data.changedById,
          },
        },
      },
      data.orderCode,
    );
  }

  async replaceMeals(
    orderId: string,
    data: {
      quantity: number;
      unitPrice: Prisma.Decimal | number | string;
      totalPrice: Prisma.Decimal | number | string;
      menuId: string;
      menuDate: Date;
      restaurantId: string;
      fulfillmentType?: $Enums.OrderFulfillmentType | null;
      meals: OrderMealWrite[];
    },
  ): Promise<OrderFull> {
    await this.prisma.orderMeal.deleteMany({ where: { orderId } });

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice: data.totalPrice,
        menuId: data.menuId,
        menuDate: data.menuDate,
        restaurantId: data.restaurantId,
        ...(data.fulfillmentType !== undefined
          ? { fulfillmentType: data.fulfillmentType }
          : {}),
        meals: {
          create: data.meals.map((meal) => ({
            recipientName: meal.recipientName,
            workLocation: meal.workLocation ?? null,
            notes: meal.notes ?? null,
            sortOrder: meal.sortOrder,
            items: {
              create: meal.items.map((item) => ({
                menuItemId: item.menuItemId ?? null,
                itemName: item.itemName,
              })),
            },
          })),
        },
      },
      include: orderFullInclude,
    });
  }

  async updateStatus(
    orderId: string,
    data: {
      fromStatus: $Enums.OrderStatus;
      toStatus: $Enums.OrderStatus;
      changedById: string;
    },
  ): Promise<OrderFull> {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: data.toStatus,
        statusHistory: {
          create: {
            fromStatus: data.fromStatus,
            toStatus: data.toStatus,
            changedById: data.changedById,
          },
        },
      },
      include: orderFullInclude,
    });
  }

  async countByStatus(filters: {
    restaurantId?: string;
    menuDate?: Date;
    fromDate?: Date;
    toDate?: Date;
  }) {
    const where: Prisma.OrderWhereInput = {
      status: { not: $Enums.OrderStatus.DRAFT },
    };
    if (filters.restaurantId) where.restaurantId = filters.restaurantId;
    if (filters.menuDate) where.menuDate = filters.menuDate;
    if (filters.fromDate || filters.toDate) {
      where.menuDate = {
        ...(filters.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters.toDate ? { lte: filters.toDate } : {}),
      };
    }

    return this.prisma.order.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
      _sum: { quantity: true, totalPrice: true },
    });
  }

  async aggregateByCompany(filters: { fromDate?: Date; toDate?: Date }) {
    const where: Prisma.OrderWhereInput = {
      status: { not: $Enums.OrderStatus.DRAFT },
    };
    if (filters.fromDate || filters.toDate) {
      where.menuDate = {
        ...(filters.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters.toDate ? { lte: filters.toDate } : {}),
      };
    }

    return this.prisma.order.groupBy({
      by: ['companyId', 'companyName'],
      where,
      _count: { _all: true },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { companyName: 'asc' },
    });
  }
}

