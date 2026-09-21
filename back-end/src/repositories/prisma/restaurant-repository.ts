import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export class RestaurantPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string) {
    return this.prisma.restaurant.findUnique({ where: { id } });
  }

  async findAll() {
    return this.prisma.restaurant.findMany({ orderBy: { name: 'asc' } });
  }

  async findFirstActive() {
    return this.prisma.restaurant.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: { name: string; active?: boolean }) {
    return this.prisma.restaurant.create({
      data: {
        name: data.name,
        active: data.active ?? true,
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; active?: boolean },
  ) {
    return this.prisma.restaurant.update({
      where: { id },
      data,
    });
  }
}
