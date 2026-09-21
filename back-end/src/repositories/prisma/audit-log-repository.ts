import { Prisma, PrismaClient } from '../../generated/prisma/client.js';

export class AuditLogPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async create(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId: string;
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        before: data.before ?? Prisma.JsonNull,
        after: data.after ?? Prisma.JsonNull,
        metadata: data.metadata ?? Prisma.JsonNull,
      },
    });
  }

  async findMany(filters: {
    entityType?: string | undefined;
    entityId?: string | undefined;
    userId?: string | undefined;
    limit?: number | undefined;
  } = {}) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.entityId ? { entityId: filters.entityId } : {}),
        ...(filters.userId ? { userId: filters.userId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 200,
    });
  }
}
