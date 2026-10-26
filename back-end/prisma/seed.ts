import 'dotenv/config';
import bcrypt from 'bcrypt';
import { $Enums } from '../src/generated/prisma/client.js';
import { prisma } from '../src/lib/prisma.js';
import { ApiPedertractorEmployee } from '../src/integrations/api-pedertractor-employee.js';
import { syntheticEmailForCard } from '../src/lib/internal-user-email.js';

const SUPER_ADMIN_CARD = '5487';
const SUPER_ADMIN_UNIT = $Enums.Unit.PEDERTRACTOR;
const SUPER_ADMIN_PASSWORD = 'admin123';

async function upsertCompany(name: string, code?: string | null) {
  if (code) {
    const byCode = await prisma.company.findUnique({ where: { code } });
    if (byCode) {
      return prisma.company.update({
        where: { id: byCode.id },
        data: { name, active: true },
      });
    }
  }

  const existing = await prisma.company.findFirst({ where: { name } });
  if (existing) {
    return prisma.company.update({
      where: { id: existing.id },
      data: { code: code ?? existing.code, active: true },
    });
  }

  return prisma.company.create({
    data: { name, code: code ?? null, active: true },
  });
}

async function ensureRestaurant() {
  let restaurant = await prisma.restaurant.findFirst({
    where: { name: 'Restaurante Central' },
  });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: 'Restaurante Central', active: true },
    });
  }
  return restaurant;
}

async function ensureSuperAdmin() {
  const byCard = await prisma.user.findUnique({
    where: {
      cardNumber_unit: {
        cardNumber: SUPER_ADMIN_CARD,
        unit: SUPER_ADMIN_UNIT,
      },
    },
  });

  if (byCard) {
    console.log(
      `Seed: SUPER_ADMIN cartão ${SUPER_ADMIN_CARD}/${SUPER_ADMIN_UNIT} já existe — mantido sem alteração.`,
    );
    return byCard;
  }

  let name = 'Super Admin';
  let cardNumber = SUPER_ADMIN_CARD;

  try {
    const api = new ApiPedertractorEmployee();
    const employee = await api.getEmployee({
      cardNumber: SUPER_ADMIN_CARD,
      unit: SUPER_ADMIN_UNIT,
    });
    if (employee.name?.trim()) {
      name = employee.name.trim();
    }
    if (employee.cardNumber?.trim()) {
      cardNumber = employee.cardNumber.trim();
    }
  } catch (error) {
    console.warn(
      'Seed: não foi possível buscar o colaborador na API base; usando nome padrão.',
      error instanceof Error ? error.message : error,
    );
  }

  if (cardNumber !== SUPER_ADMIN_CARD) {
    const byResolvedCard = await prisma.user.findUnique({
      where: {
        cardNumber_unit: {
          cardNumber,
          unit: SUPER_ADMIN_UNIT,
        },
      },
    });
    if (byResolvedCard) {
      console.log(
        `Seed: SUPER_ADMIN cartão ${cardNumber}/${SUPER_ADMIN_UNIT} já existe — mantido sem alteração.`,
      );
      return byResolvedCard;
    }
  }

  const email = syntheticEmailForCard(SUPER_ADMIN_UNIT, cardNumber);
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    console.log(
      `Seed: SUPER_ADMIN ${email} já existe — mantido sem alteração.`,
    );
    return byEmail;
  }

  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  const created = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: $Enums.UserRole.SUPER_ADMIN,
      active: true,
      mustChangePassword: true,
      cardNumber,
      unit: SUPER_ADMIN_UNIT,
      companyId: null,
      restaurantId: null,
    },
  });

  console.log(
    `Seed: SUPER_ADMIN criado — ${name} (cartão ${cardNumber} / ${SUPER_ADMIN_UNIT}).`,
  );
  console.log(
    `Super admin: cartão ${cardNumber} / ${SUPER_ADMIN_UNIT} / ${SUPER_ADMIN_PASSWORD} (troca obrigatória no 1º login)`,
  );

  return created;
}

async function main() {
  console.log('Seed: iniciando dados mínimos do sistema de marmitas...');

  await upsertCompany('Pedertractor', 'PEDERTRACTOR');
  await upsertCompany('Tractor', 'TRACTOR');
  await ensureRestaurant();
  await ensureSuperAdmin();

  console.log('Seed concluído.');
}

main()
  .catch((error) => {
    console.error('Seed falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
