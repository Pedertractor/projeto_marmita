import bcrypt from 'bcrypt';
import { HttpError } from '../https/errors/index.js';
import { prisma } from '../lib/prisma.js';
import {
  UserPrismaRepository,
  type UserWithoutPassword,
  type UserWithRelations,
} from '../repositories/prisma/user-repository.js';
import { CompanyPrismaRepository } from '../repositories/prisma/company-repository.js';
import { RestaurantPrismaRepository } from '../repositories/prisma/restaurant-repository.js';
import { $Enums } from '../generated/prisma/client.js';
import {
  randomEmailChallengeDueAt,
  toEmailChallengePublic,
  needsEmailChallenge,
} from '../lib/email-challenge.js';
import { syntheticEmailForCard } from '../lib/internal-user-email.js';
import { ApiPedertractorEmployee } from '../integrations/api-pedertractor-employee.js';
import {
  avatarPublicUrl,
  deleteAvatar,
  saveAvatarFromDataUrl,
} from '../lib/avatar-storage.js';
import { AuditLogService } from './audit-log-service.js';

export const EXTERNAL_TEMPORARY_PASSWORD = 'marmita123';

export type RegisterUserInput = {
  email: string;
  name: string;
  password?: string | undefined;
  role: $Enums.UserRole;
  companyId?: string | null | undefined;
  restaurantId?: string | null | undefined;
  active?: boolean | undefined;
  requiresWorkLocation?: boolean | undefined;
};

function temporaryPasswordForUser(cardNumber?: string | null): string {
  const card = cardNumber?.trim();
  return card ? card : EXTERNAL_TEMPORARY_PASSWORD;
}

function serializeUser(
  user: UserWithoutPassword | UserWithRelations,
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    cardNumber: user.cardNumber,
    unit: user.unit,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    requiresWorkLocation: user.requiresWorkLocation,
    avatarUrl: avatarPublicUrl(user.avatarPath),
    companyId: user.companyId,
    restaurantId: user.restaurantId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    ...('company' in user ? { company: user.company } : {}),
    ...('restaurant' in user ? { restaurant: user.restaurant } : {}),
  };
}

export class UserService {
  private async assertCompanyAllowsAccess(companyId: string | null) {
    if (!companyId) return;

    const companyRepo = new CompanyPrismaRepository(prisma);
    const company = await companyRepo.findById(companyId);
    if (!company || !company.active) {
      throw new HttpError(
        'Empresa inativa. Entre em contato com o administrador.',
        401,
      );
    }
  }

  private async resolveRestaurantId(
    restaurantId?: string | null,
  ): Promise<string> {
    const restaurantRepo = new RestaurantPrismaRepository(prisma);
    if (restaurantId) {
      const restaurant = await restaurantRepo.findById(restaurantId);
      if (!restaurant || !restaurant.active) {
        throw new HttpError('Restaurante inválido ou inativo', 400);
      }
      return restaurant.id;
    }

    const restaurant = await restaurantRepo.findFirstActive();
    if (!restaurant) {
      throw new HttpError('Nenhum restaurante cadastrado', 400);
    }
    return restaurant.id;
  }

  private async resolveCompanyIdForRestaurant(
    _companyId?: string | null,
  ): Promise<string> {
    const companyRepo = new CompanyPrismaRepository(prisma);

    const byCode = await companyRepo.findByCode('SODEXO');
    if (byCode) {
      if (!byCode.active) {
        await companyRepo.update(byCode.id, { active: true });
      }
      return byCode.id;
    }

    const byName = await companyRepo.findByName('Sodexo');
    if (byName) {
      if (!byName.active || byName.code !== 'SODEXO') {
        await companyRepo.update(byName.id, {
          active: true,
          code: 'SODEXO',
        });
      }
      return byName.id;
    }

    const created = await companyRepo.create({
      name: 'Sodexo',
      code: 'SODEXO',
    });
    return created.id;
  }

  private async assertRoleLinks(
    role: $Enums.UserRole,
    companyId?: string | null,
    restaurantId?: string | null,
  ) {
    const companyRepo = new CompanyPrismaRepository(prisma);
    const restaurantRepo = new RestaurantPrismaRepository(prisma);

    if (role === $Enums.UserRole.REQUESTER) {
      if (!companyId) {
        throw new HttpError(
          'Solicitante deve estar vinculado a uma empresa',
          400,
        );
      }
      const company = await companyRepo.findById(companyId);
      if (!company || !company.active) {
        throw new HttpError('Empresa inválida ou inativa', 400);
      }
    }

    if (role === $Enums.UserRole.RESTAURANT) {
      if (!restaurantId) {
        throw new HttpError(
          'Usuário de restaurante deve estar vinculado a um restaurante',
          400,
        );
      }
      const restaurant = await restaurantRepo.findById(restaurantId);
      if (!restaurant || !restaurant.active) {
        throw new HttpError('Restaurante inválido ou inativo', 400);
      }
    }
  }

  async register(input: RegisterUserInput): Promise<{
    user: UserWithoutPassword;
    temporaryPassword: string;
  }> {
    const email = input.email.trim().toLowerCase();
    const userRepository = new UserPrismaRepository(prisma);

    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new HttpError('E-mail já cadastrado', 400);
    }

    let companyId: string | null = null;
    if (input.role === $Enums.UserRole.REQUESTER) {
      companyId = input.companyId ?? null;
    } else if (input.role === $Enums.UserRole.RESTAURANT) {
      companyId = await this.resolveCompanyIdForRestaurant(input.companyId);
    }
    const restaurantId =
      input.role === $Enums.UserRole.RESTAURANT
        ? await this.resolveRestaurantId(input.restaurantId)
        : null;

    await this.assertRoleLinks(input.role, companyId, restaurantId);

    const temporaryPassword = EXTERNAL_TEMPORARY_PASSWORD;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const created = await userRepository.create({
      email,
      name: input.name.trim(),
      passwordHash,
      role: input.role,
      active: input.active ?? true,
      mustChangePassword: true,
      requiresWorkLocation:
        input.role === $Enums.UserRole.REQUESTER
          ? (input.requiresWorkLocation ?? false)
          : false,
      companyId,
      restaurantId,
      emailChallengeDueAt:
        input.role === $Enums.UserRole.REQUESTER
          ? randomEmailChallengeDueAt()
          : null,
    });

    return { user: created, temporaryPassword };
  }

  async lookupEmployee(cardNumber: string, unit: $Enums.Unit) {
    const normalizedCard = cardNumber.trim();
    if (!normalizedCard) {
      throw new HttpError('Informe o número do cartão', 400);
    }

    const userRepository = new UserPrismaRepository(prisma);
    const existing = await userRepository.findByUnitAndCardNumberForAuth(
      normalizedCard,
      unit,
    );
    if (existing) {
      throw new HttpError(
        'Este cartão já possui cadastro na Marmita',
        409,
      );
    }

    const api = new ApiPedertractorEmployee();
    const employee = await api.getEmployee({
      cardNumber: normalizedCard,
      unit,
    });

    if (!employee.status) {
      throw new HttpError(
        'Colaborador não está ativo na base corporativa',
        400,
      );
    }

    const resolvedCard = employee.cardNumber?.trim() || normalizedCard;
    const already =
      resolvedCard !== normalizedCard
        ? await userRepository.findByUnitAndCardNumberForAuth(
            resolvedCard,
            unit,
          )
        : null;
    if (already) {
      throw new HttpError(
        'Este cartão já possui cadastro na Marmita',
        409,
      );
    }

    return {
      name: employee.name,
      cardNumber: resolvedCard,
      unit: employee.unit || unit,
      status: employee.status,
      employeeExternalId: String(employee.id),
    };
  }

  async registerByCard(
    input: {
      cardNumber: string;
      unit: $Enums.Unit;
      role: $Enums.UserRole;
      email?: string | null | undefined;
      phone?: string | null | undefined;
      companyId?: string | null | undefined;
      restaurantId?: string | null | undefined;
      requiresWorkLocation?: boolean | undefined;
    },
    actingAdminId: string,
  ) {
    const lookedUp = await this.lookupEmployee(input.cardNumber, input.unit);
    const cardNumber = lookedUp.cardNumber;
    const unit = input.unit;
    const name = lookedUp.name.trim();

    const email = input.email?.trim().toLowerCase()
      ? input.email.trim().toLowerCase()
      : syntheticEmailForCard(unit, cardNumber);

    const userRepository = new UserPrismaRepository(prisma);
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw new HttpError('E-mail já cadastrado', 400);
    }

    let companyId =
      input.role === $Enums.UserRole.REQUESTER ||
      input.role === $Enums.UserRole.RESTAURANT
        ? (input.companyId ?? null)
        : null;
    let restaurantId =
      input.role === $Enums.UserRole.RESTAURANT
        ? (input.restaurantId ?? null)
        : null;

    if (input.role === $Enums.UserRole.REQUESTER && !companyId) {
      const companyRepo = new CompanyPrismaRepository(prisma);
      const company = await companyRepo.findByCode(unit);
      if (!company || !company.active) {
        throw new HttpError(
          `Empresa ${unit} não encontrada ou inativa`,
          400,
        );
      }
      companyId = company.id;
    }

    if (input.role === $Enums.UserRole.RESTAURANT) {
      companyId = await this.resolveCompanyIdForRestaurant(companyId);
      restaurantId = await this.resolveRestaurantId(restaurantId);
    }

    await this.assertRoleLinks(input.role, companyId, restaurantId);

    const temporaryPassword = temporaryPasswordForUser(cardNumber);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const created = await userRepository.create({
      email,
      name,
      passwordHash,
      role: input.role,
      active: true,
      mustChangePassword: true,
      requiresWorkLocation:
        input.role === $Enums.UserRole.REQUESTER
          ? (input.requiresWorkLocation ?? false)
          : false,
      companyId,
      restaurantId,
      phone: input.phone?.trim() || null,
      cardNumber,
      unit,
      emailChallengeDueAt:
        input.role === $Enums.UserRole.REQUESTER
          ? randomEmailChallengeDueAt()
          : null,
    });

    const audit = new AuditLogService();
    await audit.write({
      userId: actingAdminId,
      action: 'USER_REGISTER_BY_CARD',
      entityType: 'User',
      entityId: created.id,
      after: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
        cardNumber,
        unit,
      },
    });

    return {
      user: serializeUser(created),
      temporaryPassword,
    };
  }

  async loginWithEmail(email: string, password: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const normalizedEmail = email.trim().toLowerCase();

    const user = await userRepository.findByEmailForAuth(normalizedEmail);
    if (!user || !user.active) {
      throw new HttpError('Credenciais inválidas', 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new HttpError('Credenciais inválidas', 401);
    }

    await this.assertCompanyAllowsAccess(user.companyId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      companyId: user.companyId,
      restaurantId: user.restaurantId,
    };
  }

  async loginWithCard(
    cardNumber: string,
    unit: $Enums.Unit,
    password: string,
  ) {
    const userRepository = new UserPrismaRepository(prisma);
    const normalizedCard = cardNumber.trim();

    const user = await userRepository.findByUnitAndCardNumberForAuth(
      normalizedCard,
      unit,
    );
    if (!user || !user.active) {
      throw new HttpError('Credenciais inválidas', 401);
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      throw new HttpError('Credenciais inválidas', 401);
    }

    await this.assertCompanyAllowsAccess(user.companyId);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      companyId: user.companyId,
      restaurantId: user.restaurantId,
    };
  }

  async list() {
    const userRepository = new UserPrismaRepository(prisma);
    const users = await userRepository.findAll();
    return users.map(serializeUser);
  }

  async getById(userId: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 404);
    }
    return serializeUser(user);
  }

  async getMe(userId: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 404);
    }

    return {
      ...serializeUser(user),
      company: user.company,
      restaurant: user.restaurant,
      ...toEmailChallengePublic(user),
    };
  }

  async resolveSessionPrincipal(userId: string): Promise<{
    id: string;
    role: $Enums.UserRole;
    active: boolean;
    mustChangePassword: boolean;
    needsEmailChallenge: boolean;
  }> {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 401);
    }
    await this.assertCompanyAllowsAccess(user.companyId);
    return {
      id: user.id,
      role: user.role,
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      needsEmailChallenge: needsEmailChallenge(user),
    };
  }

  async updateByAdmin(
    targetUserId: string,
    data: {
      name?: string | undefined;
      phone?: string | null | undefined;
      role?: $Enums.UserRole | undefined;
      active?: boolean | undefined;
      requiresWorkLocation?: boolean | undefined;
      companyId?: string | null | undefined;
      restaurantId?: string | null | undefined;
    },
    options?: { allowRoleChange?: boolean },
  ) {
    const userRepository = new UserPrismaRepository(prisma);
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new HttpError('Usuário não encontrado', 404);
    }

    if (data.role !== undefined && options?.allowRoleChange === false) {
      throw new HttpError('RH não pode alterar papéis de usuário', 403);
    }

    const nextRole = data.role ?? target.role;
    const nextCompanyId =
      data.companyId !== undefined ? data.companyId : target.companyId;
    let nextRestaurantId =
      data.restaurantId !== undefined
        ? data.restaurantId
        : target.restaurantId;

    let nextCompanyIdResolved = nextCompanyId;
    if (nextRole === $Enums.UserRole.RESTAURANT) {
      nextRestaurantId = await this.resolveRestaurantId(nextRestaurantId);
      nextCompanyIdResolved =
        await this.resolveCompanyIdForRestaurant(nextCompanyId);
    }

    await this.assertRoleLinks(
      nextRole,
      nextCompanyIdResolved,
      nextRestaurantId,
    );

    const updated = await userRepository.update(targetUserId, {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.requiresWorkLocation !== undefined
        ? {
            requiresWorkLocation:
              nextRole === $Enums.UserRole.REQUESTER
                ? data.requiresWorkLocation
                : false,
          }
        : nextRole !== $Enums.UserRole.REQUESTER
          ? { requiresWorkLocation: false }
          : {}),
      companyId:
        nextRole === $Enums.UserRole.REQUESTER ||
        nextRole === $Enums.UserRole.RESTAURANT
          ? nextCompanyIdResolved
          : null,
      restaurantId:
        nextRole === $Enums.UserRole.RESTAURANT ? nextRestaurantId : null,
    });

    return serializeUser(updated);
  }

  async changePassword(userId: string, newPassword: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 404);
    }
    if (!user.mustChangePassword) {
      throw new HttpError(
        'Redefinição de senha permitida apenas no primeiro login',
        400,
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await userRepository.updatePassword(userId, passwordHash);
    return serializeUser(updated);
  }

  async resetPassword(
    actingAdminId: string,
    actingAdminRole: $Enums.UserRole,
    targetUserId: string,
  ) {
    if (actingAdminId === targetUserId) {
      throw new HttpError(
        'Não é permitido redefinir a própria senha por esta ação',
        400,
      );
    }

    const userRepository = new UserPrismaRepository(prisma);
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new HttpError('Usuário não encontrado', 404);
    }

    if (
      actingAdminRole === $Enums.UserRole.RH &&
      target.role === $Enums.UserRole.SUPER_ADMIN
    ) {
      throw new HttpError(
        'RH não pode redefinir a senha de um SUPER_ADMIN',
        403,
      );
    }

    const temporaryPassword = temporaryPasswordForUser(target.cardNumber);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    const updated = await userRepository.resetPassword(
      targetUserId,
      passwordHash,
    );

    return {
      user: serializeUser(updated),
      temporaryPassword,
    };
  }

  async deleteByAdmin(
    actingAdminId: string,
    actingAdminRole: $Enums.UserRole,
    targetUserId: string,
  ) {
    if (actingAdminId === targetUserId) {
      throw new HttpError(
        'Não é permitido apagar a própria conta por esta ação',
        400,
      );
    }

    const userRepository = new UserPrismaRepository(prisma);
    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new HttpError('Usuário não encontrado', 404);
    }

    if (
      actingAdminRole === $Enums.UserRole.RH &&
      target.role === $Enums.UserRole.SUPER_ADMIN
    ) {
      throw new HttpError('RH não pode apagar um SUPER_ADMIN', 403);
    }

    const related = await userRepository.countBlockingRelations(targetUserId);
    if (related.orders > 0) {
      throw new HttpError(
        'Não é possível apagar: o usuário possui apontamentos. Desative a conta em vez disso.',
        409,
      );
    }
    if (related.statusChanges > 0 || related.mealPrices > 0) {
      throw new HttpError(
        'Não é possível apagar: o usuário possui registros vinculados. Desative a conta em vez disso.',
        409,
      );
    }

    const previousAvatar = target.avatarPath;
    await userRepository.deleteById(targetUserId);
    await deleteAvatar(previousAvatar);
    return { ok: true as const };
  }

  async updateMyAvatar(userId: string, avatarDataUrl: string) {
    const userRepository = new UserPrismaRepository(prisma);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new HttpError('Usuário não encontrado', 404);
    }

    const avatarPath = await saveAvatarFromDataUrl(avatarDataUrl);
    try {
      const updated = await userRepository.update(userId, { avatarPath });
      await deleteAvatar(user.avatarPath);

      const audit = new AuditLogService();
      await audit.write({
        userId,
        action: 'USER_AVATAR_UPDATE',
        entityType: 'User',
        entityId: userId,
        after: { avatarPath },
      });

      return this.getMe(updated.id);
    } catch (error) {
      await deleteAvatar(avatarPath);
      throw error;
    }
  }
}
