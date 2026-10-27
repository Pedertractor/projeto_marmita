import bcrypt from 'bcrypt';
import { $Enums, Prisma } from '../generated/prisma/client.js';
import { HttpError } from '../https/errors/index.js';
import { ApiPedertractorEmployee } from '../integrations/api-pedertractor-employee.js';
import { prisma } from '../lib/prisma.js';
import { BCRYPT_COST } from '../lib/security-constants.js';
import { CompanyPrismaRepository } from '../repositories/prisma/company-repository.js';
import { MealPricePrismaRepository } from '../repositories/prisma/meal-price-repository.js';
import { RegistrationRequestPrismaRepository } from '../repositories/prisma/registration-request-repository.js';
import { UserPrismaRepository } from '../repositories/prisma/user-repository.js';
import { syntheticEmailForCard } from '../lib/internal-user-email.js';
import { randomEmailChallengeDueAt } from '../lib/email-challenge.js';
import {
  avatarPublicUrl,
  deleteAvatar,
  saveAvatarFromDataUrl,
} from '../lib/avatar-storage.js';
import { AuditLogService } from './audit-log-service.js';
import type { RegistrationRequestSafe } from '../repositories/prisma/registration-request-repository.js';

function serializeRegistration(registration: RegistrationRequestSafe) {
  const { avatarPath, ...rest } = registration;
  return {
    ...rest,
    avatarUrl: avatarPublicUrl(avatarPath),
  };
}

const KIND_TO_UNIT: Record<
  'PEDERTRACTOR' | 'TRACTOR',
  $Enums.Unit
> = {
  PEDERTRACTOR: $Enums.Unit.PEDERTRACTOR,
  TRACTOR: $Enums.Unit.TRACTOR,
};

const KIND_TO_COMPANY_NAME: Record<'PEDERTRACTOR' | 'TRACTOR', string> = {
  PEDERTRACTOR: 'Pedertractor',
  TRACTOR: 'Tractor',
};

type DbClient = typeof prisma | Prisma.TransactionClient;

export class RegistrationRequestService {
  private async assertEmailAvailableForRegistration(
    db: DbClient,
    email: string,
  ) {
    const normalized = email.trim().toLowerCase();
    const userRepo = new UserPrismaRepository(db);
    const regRepo = new RegistrationRequestPrismaRepository(db);

    const existingUser = await userRepo.findByEmail(normalized);
    if (existingUser) {
      throw new HttpError(
        'Este e-mail já está cadastrado. Use a tela de login para entrar.',
        409,
      );
    }

    const pending = await regRepo.findPendingByEmail(normalized);
    if (pending) {
      throw new HttpError(
        'Já existe uma solicitação pendente para este e-mail. Aguarde a análise do time da Marmita.',
        409,
      );
    }
  }

  private async assertCardAvailableForRegistration(
    db: DbClient,
    cardNumber: string,
    unit: $Enums.Unit,
    email: string,
  ) {
    const userRepo = new UserPrismaRepository(db);
    const regRepo = new RegistrationRequestPrismaRepository(db);

    const cardUser = await userRepo.findByUnitAndCardNumberForAuth(
      cardNumber,
      unit,
    );
    if (cardUser) {
      throw new HttpError(
        'Este cartão já possui cadastro na Marmita. Use a tela de login para entrar.',
        409,
      );
    }

    const existingUser = await userRepo.findByEmail(email.trim().toLowerCase());
    if (existingUser) {
      throw new HttpError(
        'Este cartão já possui cadastro na Marmita. Use a tela de login para entrar.',
        409,
      );
    }

    const pendingCard = await regRepo.findPendingByCard(cardNumber, unit);
    if (pendingCard) {
      throw new HttpError(
        'Já existe uma solicitação pendente para este cartão. Aguarde a análise do time da Marmita.',
        409,
      );
    }
  }

  async checkAvailability(input: {
    email?: string | undefined;
  }): Promise<{ available: boolean; message?: string }> {
    const email = input.email?.trim().toLowerCase() ?? '';
    if (!email) {
      return { available: false, message: 'Informe o e-mail' };
    }

    try {
      await this.assertEmailAvailableForRegistration(prisma, email);
      return { available: true };
    } catch (error) {
      if (error instanceof HttpError) {
        return { available: false, message: error.message };
      }
      throw error;
    }
  }

  async validateEmployee(cardNumber: string, unit: $Enums.Unit) {
    const api = new ApiPedertractorEmployee();
    const employee = await api.getEmployee({
      cardNumber: cardNumber.trim(),
      unit,
    });

    if (!employee.status) {
      throw new HttpError('Colaborador não está ativo na base corporativa', 400);
    }

    const normalizedCard = employee.cardNumber;
    const syntheticEmail = syntheticEmailForCard(unit, normalizedCard);
    await this.assertCardAvailableForRegistration(
      prisma,
      normalizedCard,
      unit,
      syntheticEmail,
    );

    return {
      name: employee.name,
      cardNumber: normalizedCard,
      unit: employee.unit,
      status: employee.status,
      employeeExternalId: String(employee.id),
    };
  }

  async create(input: {
    name?: string | undefined;
    email: string;
    phone: string;
    password: string;
    companyKind: $Enums.CompanyKind;
    companyName?: string | undefined;
    cardNumber?: string | undefined;
    avatar: string;
  }) {
    const phone = input.phone.trim();
    if (!phone) {
      throw new HttpError('Informe o celular', 400);
    }
    if (!input.avatar?.trim()) {
      throw new HttpError('Envie sua foto', 400);
    }

    const companyRepo = new CompanyPrismaRepository(prisma);
    const regRepo = new RegistrationRequestPrismaRepository(prisma);

    let name = input.name?.trim() ?? '';
    let companyName = '';
    let companyId: string | null = null;
    let cardNumber: string | null = null;
    let unit: $Enums.Unit | null = null;
    let employeeExternalId: string | null = null;
    let email = '';

    if (
      input.companyKind === $Enums.CompanyKind.PEDERTRACTOR ||
      input.companyKind === $Enums.CompanyKind.TRACTOR
    ) {
      if (!input.cardNumber?.trim()) {
        throw new HttpError('Informe o número do cartão', 400);
      }

      unit = KIND_TO_UNIT[input.companyKind];
      const validated = await this.validateEmployee(input.cardNumber, unit);
      name = validated.name;
      cardNumber = validated.cardNumber;
      employeeExternalId = validated.employeeExternalId;
      companyName = KIND_TO_COMPANY_NAME[input.companyKind];
      email = input.email?.trim().toLowerCase() ?? '';
      if (!email) {
        throw new HttpError('Informe o e-mail', 400);
      }

      await this.assertEmailAvailableForRegistration(prisma, email);

      const company = await companyRepo.findByCode(input.companyKind);
      if (company) {
        companyId = company.id;
        companyName = company.name;
      }

      await this.assertCardAvailableForRegistration(
        prisma,
        cardNumber,
        unit,
        email,
      );
    } else {
      email = input.email?.trim().toLowerCase() ?? '';
      if (!email) {
        throw new HttpError('Informe o e-mail', 400);
      }

      await this.assertEmailAvailableForRegistration(prisma, email);

      companyName = input.companyName?.trim() ?? '';
      if (!companyName) {
        throw new HttpError('Informe o nome da empresa', 400);
      }
      if (companyName.toLowerCase() === 'sodexo') {
        throw new HttpError(
          'Sodexo é exclusiva do papel Restaurante',
          400,
        );
      }
      if (!name) {
        throw new HttpError('Informe o nome', 400);
      }

      const existingCompany = await companyRepo.findByName(companyName);
      if (existingCompany) {
        companyId = existingCompany.id;
      }
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const avatarPath = await saveAvatarFromDataUrl(input.avatar);
    try {
      const created = await regRepo.create({
        name,
        email,
        phone,
        passwordHash,
        companyKind: input.companyKind,
        companyName,
        companyId,
        cardNumber,
        unit,
        employeeExternalId,
        avatarPath,
      });
      return serializeRegistration(created);
    } catch (error) {
      await deleteAvatar(avatarPath);
      throw error;
    }
  }

  async list(status?: $Enums.RegistrationStatus) {
    const repo = new RegistrationRequestPrismaRepository(prisma);
    const rows = await repo.list(status);
    return rows.map(serializeRegistration);
  }

  async approve(
    requestId: string,
    reviewerId: string,
    input: {
      mealPriceAmount: number;
      companyName?: string | undefined;
      requiresWorkLocation?: boolean | undefined;
    },
  ) {
    if (input.mealPriceAmount <= 0) {
      throw new HttpError('Informe um valor de marmita válido', 400);
    }

    return prisma.$transaction(async (tx) => {
      const regRepo = new RegistrationRequestPrismaRepository(tx);
      const raw = await regRepo.findRawById(requestId);
      if (!raw) {
        throw new HttpError('Solicitação não encontrada', 404);
      }
      if (raw.status !== $Enums.RegistrationStatus.PENDING) {
        throw new HttpError('Solicitação já foi analisada', 400);
      }

      const userRepo = new UserPrismaRepository(tx);
      const existingUser = await userRepo.findByEmail(raw.email);
      if (existingUser) {
        throw new HttpError(
          'Este e-mail já está cadastrado. Não é possível aprovar esta solicitação.',
          409,
        );
      }

      if (raw.cardNumber && raw.unit) {
        const cardUser = await userRepo.findByUnitAndCardNumberForAuth(
          raw.cardNumber,
          raw.unit,
        );
        if (cardUser) {
          throw new HttpError(
            'Este cartão já possui cadastro. Não é possível aprovar esta solicitação.',
            409,
          );
        }
      }

      let companyId = raw.companyId;
      let companyName = input.companyName?.trim() || raw.companyName;

      if (
        raw.companyKind === $Enums.CompanyKind.PEDERTRACTOR ||
        raw.companyKind === $Enums.CompanyKind.TRACTOR
      ) {
        const code = raw.companyKind;
        let company = await tx.company.findUnique({ where: { code } });
        if (!company) {
          company = await tx.company.create({
            data: {
              name: KIND_TO_COMPANY_NAME[code],
              code,
              active: true,
            },
          });
        }
        companyId = company.id;
        companyName = company.name;
      } else {
        if (companyId) {
          await tx.company.update({
            where: { id: companyId },
            data: { name: companyName, active: true },
          });
        } else {
          const byName = await tx.company.findFirst({
            where: { name: companyName },
          });
          if (byName) {
            companyId = byName.id;
            await tx.company.update({
              where: { id: byName.id },
              data: { active: true },
            });
          } else {
            const createdCompany = await tx.company.create({
              data: { name: companyName, active: true },
            });
            companyId = createdCompany.id;
          }
        }
      }

      if (!companyId) {
        throw new HttpError('Não foi possível resolver a empresa', 500);
      }

      const priceRepo = new MealPricePrismaRepository(tx);
      const currentPrice = await priceRepo.findCurrent(companyId);
      if (!currentPrice) {
        await priceRepo.create({
          companyId,
          amount: new Prisma.Decimal(input.mealPriceAmount.toFixed(2)),
          effectiveFrom: new Date(),
          createdById: reviewerId,
        });
      } else if (
        Number(currentPrice.amount) !== Number(input.mealPriceAmount.toFixed(2))
      ) {
        await priceRepo.create({
          companyId,
          amount: new Prisma.Decimal(input.mealPriceAmount.toFixed(2)),
          effectiveFrom: new Date(),
          createdById: reviewerId,
        });
      }

      const user = await userRepo.create({
        email: raw.email,
        name: raw.name,
        passwordHash: raw.passwordHash,
        role: $Enums.UserRole.REQUESTER,
        active: true,
        mustChangePassword: false,
        requiresWorkLocation: input.requiresWorkLocation ?? false,
        companyId,
        restaurantId: null,
        phone: raw.phone,
        cardNumber: raw.cardNumber,
        unit: raw.unit,
        emailChallengeDueAt: randomEmailChallengeDueAt(),
        avatarPath: raw.avatarPath,
      });

      const reviewed = await regRepo.markReviewed(requestId, {
        status: $Enums.RegistrationStatus.APPROVED,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        companyId,
      });

      const audit = new AuditLogService(tx);
      await audit.write({
        userId: reviewerId,
        action: 'REGISTRATION_APPROVE',
        entityType: 'RegistrationRequest',
        entityId: requestId,
        after: { registration: reviewed, userId: user.id, companyId },
      });

      return {
        registration: serializeRegistration(reviewed),
        user: {
          ...user,
          avatarUrl: avatarPublicUrl(user.avatarPath),
        },
      };
    });
  }

  async reject(
    requestId: string,
    reviewerId: string,
    note?: string | undefined,
  ) {
    const repo = new RegistrationRequestPrismaRepository(prisma);
    const raw = await repo.findRawById(requestId);
    if (!raw) {
      throw new HttpError('Solicitação não encontrada', 404);
    }
    if (raw.status !== $Enums.RegistrationStatus.PENDING) {
      throw new HttpError('Solicitação já foi analisada', 400);
    }

    const reviewed = await repo.markReviewed(requestId, {
      status: $Enums.RegistrationStatus.REJECTED,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note?.trim() || null,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: reviewerId,
      action: 'REGISTRATION_REJECT',
      entityType: 'RegistrationRequest',
      entityId: requestId,
      after: reviewed,
    });

    return serializeRegistration(reviewed);
  }
}
