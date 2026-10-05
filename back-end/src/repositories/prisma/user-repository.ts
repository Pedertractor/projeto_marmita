import {
  $Enums,
  Prisma,
  PrismaClient,
  type User,
} from '../../generated/prisma/client.js';

const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  cardNumber: true,
  unit: true,
  role: true,
  active: true,
  mustChangePassword: true,
  emailChallengeDueAt: true,
  companyId: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type UserWithoutPassword = Prisma.UserGetPayload<{
  select: typeof userSafeSelect;
}>;

const userWithCompanySelect = {
  ...userSafeSelect,
  company: {
    select: {
      id: true,
      name: true,
      code: true,
      active: true,
    },
  },
  restaurant: {
    select: {
      id: true,
      name: true,
      active: true,
    },
  },
} as const;

export type UserWithRelations = Prisma.UserGetPayload<{
  select: typeof userWithCompanySelect;
}>;

export class UserPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userSafeSelect,
    });
  }

  async findByIdWithRelations(id: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userWithCompanySelect,
    });
  }

  async findByEmail(email: string): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: userSafeSelect,
    });
  }

  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByUnitAndCardNumberForAuth(
    cardNumber: string,
    unit: $Enums.Unit,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        cardNumber_unit: {
          cardNumber,
          unit,
        },
      },
    });
  }

  async findAll(): Promise<UserWithRelations[]> {
    return this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: userWithCompanySelect,
    });
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: $Enums.UserRole;
    active?: boolean;
    mustChangePassword?: boolean;
    companyId?: string | null;
    restaurantId?: string | null;
    phone?: string | null;
    cardNumber?: string | null;
    unit?: $Enums.Unit | null;
    emailChallengeDueAt?: Date | null;
  }): Promise<UserWithoutPassword> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role,
        active: data.active ?? true,
        mustChangePassword: data.mustChangePassword ?? true,
        companyId: data.companyId ?? null,
        restaurantId: data.restaurantId ?? null,
        phone: data.phone ?? null,
        cardNumber: data.cardNumber ?? null,
        unit: data.unit ?? null,
        emailChallengeDueAt: data.emailChallengeDueAt ?? null,
      },
      select: userSafeSelect,
    });
  }

  async update(
    userId: string,
    data: {
      name?: string;
      phone?: string | null;
      role?: $Enums.UserRole;
      active?: boolean;
      companyId?: string | null;
      restaurantId?: string | null;
    },
  ): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: userSafeSelect,
    });
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
  ): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
      select: userSafeSelect,
    });
  }

  async resetPassword(
    userId: string,
    passwordHash: string,
  ): Promise<UserWithoutPassword> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
      select: userSafeSelect,
    });
  }

  async countBlockingRelations(userId: string): Promise<{
    orders: number;
    statusChanges: number;
    mealPrices: number;
  }> {
    const [orders, statusChanges, mealPrices] = await Promise.all([
      this.prisma.order.count({ where: { requesterId: userId } }),
      this.prisma.orderStatusHistory.count({
        where: { changedById: userId },
      }),
      this.prisma.mealPrice.count({ where: { createdById: userId } }),
    ]);
    return { orders, statusChanges, mealPrices };
  }

  async findEmailChallenge(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailChallengeDueAt: true,
        emailChallengeCodeHash: true,
        emailChallengeExpiresAt: true,
        emailChallengeSentAt: true,
      },
    });
  }

  async saveEmailChallengeCode(
    userId: string,
    data: {
      emailChallengeCodeHash: string;
      emailChallengeExpiresAt: Date;
      emailChallengeSentAt: Date;
    },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async clearEmailChallengeCode(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailChallengeCodeHash: null,
        emailChallengeExpiresAt: null,
        emailChallengeSentAt: null,
      },
    });
  }

  async completeEmailChallenge(userId: string, emailChallengeDueAt: Date) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        emailChallengeDueAt,
        emailChallengeCodeHash: null,
        emailChallengeExpiresAt: null,
        emailChallengeSentAt: null,
      },
    });
  }

  async markEmailChallengeDue(userId: string, dueAt: Date) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailChallengeDueAt: dueAt },
    });
  }

  async updateEmail(userId: string, email: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email,
        emailVerifiedAt: null,
        emailChallengeDueAt: new Date(),
        emailChallengeCodeHash: null,
        emailChallengeExpiresAt: null,
        emailChallengeSentAt: null,
      },
      select: userSafeSelect,
    });
  }

  async findPasswordReset(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        passwordResetCodeHash: true,
        passwordResetExpiresAt: true,
        passwordResetSentAt: true,
      },
    });
  }

  async findPasswordResetByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        passwordResetCodeHash: true,
        passwordResetExpiresAt: true,
        passwordResetSentAt: true,
      },
    });
  }

  async findPasswordResetByTokenHash(tokenHash: string) {
    return this.prisma.user.findFirst({
      where: { passwordResetCodeHash: tokenHash },
      select: {
        id: true,
        name: true,
        email: true,
        active: true,
        passwordResetCodeHash: true,
        passwordResetExpiresAt: true,
        passwordResetSentAt: true,
      },
    });
  }

  async savePasswordResetCode(
    userId: string,
    data: {
      passwordResetCodeHash: string;
      passwordResetExpiresAt: Date;
      passwordResetSentAt: Date;
    },
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async clearPasswordReset(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetSentAt: null,
      },
    });
  }

  async completePasswordReset(userId: string, passwordHash: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordResetCodeHash: null,
        passwordResetExpiresAt: null,
        passwordResetSentAt: null,
      },
    });
  }

  async deleteById(userId: string): Promise<void> {
    await this.prisma.auditLog.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await this.prisma.registrationRequest.updateMany({
      where: { reviewedById: userId },
      data: { reviewedById: null },
    });
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
