import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export class CompanyPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string) {
    return this.prisma.company.findUnique({ where: { id } });
  }

  async findByCode(code: string) {
    return this.prisma.company.findUnique({ where: { code } });
  }

  async findByName(name: string) {
    return this.prisma.company.findFirst({ where: { name } });
  }

  async findAll() {
    return this.prisma.company.findMany({ orderBy: { name: 'asc' } });
  }

  async create(data: { name: string; code?: string | null; active?: boolean }) {
    return this.prisma.company.create({
      data: {
        name: data.name,
        code: data.code ?? null,
        active: data.active ?? true,
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; code?: string | null; active?: boolean },
  ) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }
}
