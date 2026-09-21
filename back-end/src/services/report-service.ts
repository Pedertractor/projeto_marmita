import { prisma } from '../lib/prisma.js';
import { OrderPrismaRepository } from '../repositories/prisma/order-repository.js';

function toDateOnly(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export class ReportService {
  async byCompany(filters: {
    fromDate?: Date | string | undefined;
    toDate?: Date | string | undefined;
  } = {}) {
    const orderRepo = new OrderPrismaRepository(prisma);
    const period: { fromDate?: Date; toDate?: Date } = {};
    if (filters.fromDate) period.fromDate = toDateOnly(filters.fromDate);
    if (filters.toDate) period.toDate = toDateOnly(filters.toDate);
    const rows = await orderRepo.aggregateByCompany(period);

    return {
      period: {
        fromDate: filters.fromDate
          ? toDateOnly(filters.fromDate).toISOString().slice(0, 10)
          : null,
        toDate: filters.toDate
          ? toDateOnly(filters.toDate).toISOString().slice(0, 10)
          : null,
      },
      companies: rows.map((row) => ({
        companyId: row.companyId,
        companyName: row.companyName,
        orders: row._count._all,
        quantity: row._sum.quantity ?? 0,
        totalPrice: row._sum.totalPrice,
      })),
    };
  }
}
