import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import { CompanyPrismaRepository } from '../repositories/prisma/company-repository.js';
import { AuditLogService } from './audit-log-service.js';

export class CompanyService {
  async list() {
    const repo = new CompanyPrismaRepository(prisma);
    return repo.findAll();
  }

  async getById(id: string) {
    const repo = new CompanyPrismaRepository(prisma);
    const company = await repo.findById(id);
    if (!company) {
      throw new HttpError('Empresa não encontrada', 404);
    }
    return company;
  }

  async create(
    input: { name: string; active?: boolean | undefined },
    userId: string,
  ) {
    const repo = new CompanyPrismaRepository(prisma);
    const company = await repo.create({
      name: input.name.trim(),
      active: input.active ?? true,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId,
      action: 'COMPANY_CREATE',
      entityType: 'Company',
      entityId: company.id,
      after: company,
    });

    return company;
  }

  async update(
    id: string,
    input: { name?: string | undefined; active?: boolean | undefined },
    userId: string,
  ) {
    const repo = new CompanyPrismaRepository(prisma);
    const before = await repo.findById(id);
    if (!before) {
      throw new HttpError('Empresa não encontrada', 404);
    }

    const company = await repo.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });

    const audit = new AuditLogService();
    await audit.write({
      userId,
      action: 'COMPANY_UPDATE',
      entityType: 'Company',
      entityId: company.id,
      before,
      after: company,
    });

    return company;
  }

  async activate(id: string, active: boolean, userId: string) {
    return this.update(id, { active }, userId);
  }
}
