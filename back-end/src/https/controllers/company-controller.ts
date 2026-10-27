import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { $Enums } from '../../generated/prisma/client.js';
import { COMPANY_NAME_MAX_LENGTH } from '../../lib/validation-limits.js';
import { CompanyService } from '../../services/company-service.js';

export async function listCompanies(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const service = new CompanyService();
  const companies = await service.list();
  return reply.status(200).send({ companies });
}

export async function createCompany(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    name: z
      .string()
      .min(1, 'Nome é obrigatório')
      .max(COMPANY_NAME_MAX_LENGTH),
    active: z.boolean().optional(),
  });
  const body = bodySchema.parse(request.body);
  const service = new CompanyService();
  const company = await service.create(body, request.user.sub);
  return reply.status(201).send({ company });
}

export async function updateCompany(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    companyId: z.string().uuid(),
  });
  const { companyId } = paramsSchema.parse(request.params);

  const isRh = request.user.role === $Enums.UserRole.RH;

  if (isRh) {
    const rhBodySchema = z.object({
      active: z.boolean(),
    });
    const body = rhBodySchema.parse(request.body);
    const service = new CompanyService();
    const company = await service.update(
      companyId,
      { active: body.active },
      request.user.sub,
    );
    return reply.status(200).send({ company });
  }

  const bodySchema = z
    .object({
      name: z.string().min(1).max(COMPANY_NAME_MAX_LENGTH).optional(),
      active: z.boolean().optional(),
    })
    .refine((b) => b.name !== undefined || b.active !== undefined, {
      message: 'Informe name e/ou active',
    });

  const body = bodySchema.parse(request.body);
  const service = new CompanyService();
  const company = await service.update(companyId, body, request.user.sub);
  return reply.status(200).send({ company });
}
