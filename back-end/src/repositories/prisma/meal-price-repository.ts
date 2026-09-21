import { Prisma, PrismaClient } from '../../generated/prisma/client.js';

const priceInclude = {
  createdBy: {
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
      code: true,
    },
  },
} as const;

export class MealPricePrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findCurrent(companyId: string, asOf: Date = new Date()) {
    return this.prisma.mealPrice.findFirst({
      where: {
        companyId,
        effectiveFrom: { lte: asOf },
      },
      orderBy: { effectiveFrom: 'desc' },
      include: priceInclude,
    });
  }

  async findHistory(companyId: string) {
    return this.prisma.mealPrice.findMany({
      where: { companyId },
      orderBy: { effectiveFrom: 'desc' },
      include: priceInclude,
    });
  }

  async create(data: {
    companyId: string;
    amount: Prisma.Decimal | number | string;
    effectiveFrom: Date;
    createdById: string;
  }) {
    return this.prisma.mealPrice.create({
      data: {
        companyId: data.companyId,
        amount: data.amount,
        effectiveFrom: data.effectiveFrom,
        createdById: data.createdById,
      },
      include: priceInclude,
    });
  }
}
