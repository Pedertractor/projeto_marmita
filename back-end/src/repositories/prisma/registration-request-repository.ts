import {
  $Enums,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client.js';

const registrationSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  companyKind: true,
  companyName: true,
  companyId: true,
  cardNumber: true,
  unit: true,
  employeeExternalId: true,
  avatarPath: true,
  status: true,
  reviewedById: true,
  reviewedAt: true,
  reviewNote: true,
  createdAt: true,
  updatedAt: true,
  company: {
    select: { id: true, name: true, code: true, active: true },
  },
  reviewedBy: {
    select: { id: true, name: true, email: true },
  },
} as const;

export type RegistrationRequestSafe = Prisma.RegistrationRequestGetPayload<{
  select: typeof registrationSelect;
}>;

export class RegistrationRequestPrismaRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string): Promise<RegistrationRequestSafe | null> {
    return this.prisma.registrationRequest.findUnique({
      where: { id },
      select: registrationSelect,
    });
  }

  async findPendingByEmail(email: string) {
    return this.prisma.registrationRequest.findFirst({
      where: {
        email,
        status: $Enums.RegistrationStatus.PENDING,
      },
      select: registrationSelect,
    });
  }

  async findPendingByCard(cardNumber: string, unit: $Enums.Unit) {
    return this.prisma.registrationRequest.findFirst({
      where: {
        cardNumber,
        unit,
        status: $Enums.RegistrationStatus.PENDING,
      },
      select: registrationSelect,
    });
  }

  async list(status?: $Enums.RegistrationStatus) {
    return this.prisma.registrationRequest.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: { createdAt: 'desc' },
      select: registrationSelect,
    });
  }

  async create(data: {
    name: string;
    email: string;
    phone: string;
    passwordHash: string;
    companyKind: $Enums.CompanyKind;
    companyName: string;
    companyId?: string | null;
    cardNumber?: string | null;
    unit?: $Enums.Unit | null;
    employeeExternalId?: string | null;
    avatarPath?: string | null;
  }) {
    return this.prisma.registrationRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: data.passwordHash,
        companyKind: data.companyKind,
        companyName: data.companyName,
        companyId: data.companyId ?? null,
        cardNumber: data.cardNumber ?? null,
        unit: data.unit ?? null,
        employeeExternalId: data.employeeExternalId ?? null,
        avatarPath: data.avatarPath ?? null,
      },
      select: registrationSelect,
    });
  }

  async markReviewed(
    id: string,
    data: {
      status: $Enums.RegistrationStatus;
      reviewedById: string;
      reviewedAt: Date;
      reviewNote?: string | null;
      companyId?: string | null;
    },
  ) {
    return this.prisma.registrationRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewedById: data.reviewedById,
        reviewedAt: data.reviewedAt,
        reviewNote: data.reviewNote ?? null,
        ...(data.companyId !== undefined
          ? { companyId: data.companyId }
          : {}),
      },
      select: registrationSelect,
    });
  }

  async findRawById(id: string) {
    return this.prisma.registrationRequest.findUnique({ where: { id } });
  }
}
