import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { OrderService } from '../../services/order-service.js';
import { ReportService } from '../../services/report-service.js';
import { AuditLogService } from '../../services/audit-log-service.js';

export async function dashboardRh(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new OrderService();
  const stats = await service.dashboardRh(query);
  return reply.status(200).send({ stats });
}

export async function dashboardRestaurant(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    menuDate: z.string().optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new OrderService();
  const stats = await service.dashboardRestaurant(
    request.user.sub,
    query.menuDate,
  );
  return reply.status(200).send({ stats });
}

export async function reportByCompany(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new ReportService();
  const report = await service.byCompany(query);
  return reply.status(200).send({ report });
}

export async function listAuditLogs(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    userId: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new AuditLogService();
  const auditLogs = await service.list(query);
  return reply.status(200).send({ auditLogs });
}
