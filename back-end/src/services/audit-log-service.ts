import { Prisma } from '../generated/prisma/client.js';
import { prisma as defaultPrisma } from '../lib/prisma.js';
import { AuditLogPrismaRepository } from '../repositories/prisma/audit-log-repository.js';

type DbClient = typeof defaultPrisma | Prisma.TransactionClient;

export class AuditLogService {
  constructor(private db: DbClient = defaultPrisma) {}

  async write(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  }) {
    const repo = new AuditLogPrismaRepository(this.db);
    return repo.create({
      userId: data.userId ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      before:
        data.before === undefined
          ? null
          : (data.before as Prisma.InputJsonValue),
      after:
        data.after === undefined
          ? null
          : (data.after as Prisma.InputJsonValue),
      metadata:
        data.metadata === undefined
          ? null
          : (data.metadata as Prisma.InputJsonValue),
    });
  }

  async list(filters: {
    entityType?: string | undefined;
    entityId?: string | undefined;
    userId?: string | undefined;
    limit?: number | undefined;
  } = {}) {
    const repo = new AuditLogPrismaRepository(this.db);
    return repo.findMany(filters);
  }
}
