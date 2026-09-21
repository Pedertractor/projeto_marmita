import { Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { CompanyPrismaRepository } from '../repositories/prisma/company-repository.js';
import { MealPricePrismaRepository } from '../repositories/prisma/meal-price-repository.js';
import { AuditLogService } from './audit-log-service.js';

export class MealPriceService {
  async getCurrent(companyId: string) {
    const companyRepo = new CompanyPrismaRepository(prisma);
    const company = await companyRepo.findById(companyId);
    if (!company) {
      throw new HttpError('Empresa não encontrada', 404);
    }

    const repo = new MealPricePrismaRepository(prisma);
    const current = await repo.findCurrent(companyId);
    if (!current) {
      throw new HttpError(
        'Empresa sem preço de marmita configurado. Contate o RH.',
        404,
      );
    }
    return current;
  }

  async history(companyId: string) {
    const companyRepo = new CompanyPrismaRepository(prisma);
    const company = await companyRepo.findById(companyId);
    if (!company) {
      throw new HttpError('Empresa não encontrada', 404);
    }

    const repo = new MealPricePrismaRepository(prisma);
    return repo.findHistory(companyId);
  }

  async setNew(
    input: {
      companyId: string;
      amount: number;
      effectiveFrom?: Date | undefined;
    },
    userId: string,
  ) {
    if (input.amount <= 0) {
      throw new HttpError('Valor do preço deve ser maior que zero', 400);
    }

    const companyRepo = new CompanyPrismaRepository(prisma);
    const company = await companyRepo.findById(input.companyId);
    if (!company) {
      throw new HttpError('Empresa não encontrada', 404);
    }

    const repo = new MealPricePrismaRepository(prisma);
    const previous = await repo.findCurrent(input.companyId);

    const created = await repo.create({
      companyId: input.companyId,
      amount: new Prisma.Decimal(input.amount.toFixed(2)),
      effectiveFrom: input.effectiveFrom ?? new Date(),
      createdById: userId,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId,
      action: 'MEAL_PRICE_SET',
      entityType: 'MealPrice',
      entityId: created.id,
      before: previous,
      after: created,
      metadata: { companyId: input.companyId },
    });

    return created;
  }
}
