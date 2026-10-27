import z from 'zod';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { $Enums } from '../../generated/prisma/client.js';
import {
  AVATAR_DATA_URL_MAX_LENGTH,
  CARD_NUMBER_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PHONE_MAX_LENGTH,
  REVIEW_NOTE_MAX_LENGTH,
} from '../../lib/validation-limits.js';
import { RegistrationRequestService } from '../../services/registration-request-service.js';

export async function checkRegistrationAvailability(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    email: z.email('E-mail inválido'),
  });
  const body = bodySchema.parse(request.body);
  const service = new RegistrationRequestService();
  const result = await service.checkAvailability({ email: body.email });
  return reply.status(200).send(result);
}

export async function validateEmployeeRegistration(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z.object({
    cardNumber: z
      .string()
      .min(1, 'Cartão é obrigatório')
      .max(CARD_NUMBER_MAX_LENGTH),
    unit: z.enum($Enums.Unit),
  });
  const body = bodySchema.parse(request.body);
  const service = new RegistrationRequestService();
  const employee = await service.validateEmployee(body.cardNumber, body.unit);
  return reply.status(200).send({ employee });
}

export async function createRegistrationRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const bodySchema = z
    .object({
      name: z.string().max(NAME_MAX_LENGTH).optional(),
      email: z.email('E-mail inválido'),
      phone: z
        .string()
        .min(8, 'Informe o celular')
        .max(PHONE_MAX_LENGTH),
      password: z
        .string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .max(PASSWORD_MAX_LENGTH),
      companyKind: z.enum($Enums.CompanyKind),
      companyName: z.string().max(COMPANY_NAME_MAX_LENGTH).optional(),
      cardNumber: z.string().max(CARD_NUMBER_MAX_LENGTH).optional(),
      avatar: z
        .string()
        .min(1, 'Envie sua foto')
        .max(AVATAR_DATA_URL_MAX_LENGTH),
    })
    .superRefine((data, ctx) => {
      const internal =
        data.companyKind === $Enums.CompanyKind.PEDERTRACTOR ||
        data.companyKind === $Enums.CompanyKind.TRACTOR;
      if (internal && !data.cardNumber?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Informe o cartão',
          path: ['cardNumber'],
        });
      }
      if (!data.email?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'Informe o e-mail',
          path: ['email'],
        });
      }
    });
  const body = bodySchema.parse(request.body);
  const service = new RegistrationRequestService();
  const registration = await service.create(body);
  return reply.status(201).send({
    registration,
    message:
      'Solicitação enviada ao time da Marmita. Aguarde a avaliação para acessar o sistema.',
  });
}

export async function listRegistrationRequests(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const querySchema = z.object({
    status: z.enum($Enums.RegistrationStatus).optional(),
  });
  const query = querySchema.parse(request.query);
  const service = new RegistrationRequestService();
  const registrations = await service.list(query.status);
  return reply.status(200).send({ registrations });
}

export async function approveRegistrationRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    id: z.string().uuid(),
  });
  const bodySchema = z.object({
    mealPriceAmount: z.number().positive('Informe o valor da marmita'),
    companyName: z.string().max(COMPANY_NAME_MAX_LENGTH).optional(),
    requiresWorkLocation: z.boolean().optional(),
  });
  const { id } = paramsSchema.parse(request.params);
  const body = bodySchema.parse(request.body);
  const service = new RegistrationRequestService();
  const result = await service.approve(id, request.user.sub, body);
  return reply.status(200).send(result);
}

export async function rejectRegistrationRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const paramsSchema = z.object({
    id: z.string().uuid(),
  });
  const bodySchema = z.object({
    note: z.string().max(REVIEW_NOTE_MAX_LENGTH).optional(),
  });
  const { id } = paramsSchema.parse(request.params);
  const body = bodySchema.parse(request.body);
  const service = new RegistrationRequestService();
  const registration = await service.reject(
    id,
    request.user.sub,
    body.note,
  );
  return reply.status(200).send({ registration });
}
