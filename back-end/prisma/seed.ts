import 'dotenv/config';
import bcrypt from 'bcrypt';
import { $Enums, Prisma } from '../src/generated/prisma/client.js';
import { prisma } from '../src/lib/prisma.js';
import { randomEmailChallengeDueAt } from '../src/lib/email-challenge.js';

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

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

async function upsertUser(data: {
  email: string;
  name: string;
  password: string;
  role: $Enums.UserRole;
  companyId?: string | null;
  restaurantId?: string | null;
  phone?: string | null;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.upsert({
    where: { email: data.email },
    create: {
      email: data.email,
      name: data.name,
      passwordHash,
      role: data.role,
      active: true,
      mustChangePassword: false,
      companyId: data.companyId ?? null,
      restaurantId: data.restaurantId ?? null,
      phone: data.phone ?? null,
      emailChallengeDueAt:
        data.role === $Enums.UserRole.REQUESTER
          ? randomEmailChallengeDueAt()
          : null,
    },
    update: {
      name: data.name,
      passwordHash,
      role: data.role,
      active: true,
      mustChangePassword: false,
      companyId: data.companyId ?? null,
      restaurantId: data.restaurantId ?? null,
      phone: data.phone ?? null,
    },
  });
}

async function ensureCompanyPrice(
  companyId: string,
  amount: string,
  createdById: string,
) {
  const existing = await prisma.mealPrice.findFirst({
    where: { companyId },
    orderBy: { effectiveFrom: 'desc' },
  });
  if (existing) return existing;
  return prisma.mealPrice.create({
    data: {
      companyId,
      amount: new Prisma.Decimal(amount),
      effectiveFrom: new Date(),
      createdById,
    },
  });
}

async function main() {
  console.log('Seed: iniciando dados do sistema de marmitas...');

  let restaurant = await prisma.restaurant.findFirst({
    where: { name: 'Restaurante Central' },
  });
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: 'Restaurante Central', active: true },
    });
  }

  const companies = {
    pedertractor: await upsertCompany('Pedertractor', 'PEDERTRACTOR'),
    tractor: await upsertCompany('Tractor', 'TRACTOR'),
    jardinagem: await upsertCompany('Jardinagem'),
    tresE: await upsertCompany('3E'),
    policia: await upsertCompany('Polícia Civil'),
    bombeiros: await upsertCompany('Corpo de Bombeiros'),
  };

  const admin = await upsertUser({
    email: 'admin@marmita.local',
    name: 'Administrador',
    password: 'admin123',
    role: $Enums.UserRole.SUPER_ADMIN,
  });

  await upsertUser({
    email: 'rh@marmita.local',
    name: 'Usuário RH',
    password: 'rh123',
    role: $Enums.UserRole.RH,
  });

  const restaurantUser = await upsertUser({
    email: 'restaurante@marmita.local',
    name: 'Operador Restaurante',
    password: 'rest123',
    role: $Enums.UserRole.RESTAURANT,
    restaurantId: restaurant.id,
  });

  const pedro = await upsertUser({
    email: 'pedro@jardinagem.local',
    name: 'Pedro Silva',
    password: 'requester123',
    role: $Enums.UserRole.REQUESTER,
    companyId: companies.jardinagem.id,
    phone: '11999990001',
  });

  const carlos = await upsertUser({
    email: 'carlos@3e.local',
    name: 'Carlos Souza',
    password: 'requester123',
    role: $Enums.UserRole.REQUESTER,
    companyId: companies.tresE.id,
    phone: '11999990002',
  });

  const ana = await upsertUser({
    email: 'ana@bombeiros.local',
    name: 'Ana Oliveira',
    password: 'requester123',
    role: $Enums.UserRole.REQUESTER,
    companyId: companies.bombeiros.id,
    phone: '11999990003',
  });

  for (const company of Object.values(companies)) {
    await ensureCompanyPrice(company.id, '20.00', admin.id);
  }

  const menuDate = todayDateOnly();
  let menu = await prisma.menu.findUnique({
    where: {
      restaurantId_date: {
        restaurantId: restaurant.id,
        date: menuDate,
      },
    },
    include: { items: true },
  });

  const itemNames: Array<{ name: string; description: string; iconKey: string }> = [
    { name: 'Arroz', description: 'Arroz branco soltinho', iconKey: 'pasta' },
    { name: 'Feijão', description: 'Feijão carioca cozido', iconKey: 'vegetarian' },
    { name: 'Frango assado', description: 'Peito de frango assado', iconKey: 'chicken' },
    { name: 'Carne bovina', description: 'Bife acebolado', iconKey: 'beef' },
    { name: 'Batata', description: 'Batata cozida', iconKey: 'generic' },
    { name: 'Salada', description: 'Mix de folhas e tomate', iconKey: 'salad' },
    { name: 'Farofa', description: 'Farofa crocante', iconKey: 'generic' },
  ];

  if (!menu) {
    menu = await prisma.menu.create({
      data: {
        restaurantId: restaurant.id,
        date: menuDate,
        createdById: restaurantUser.id,
        updatedById: restaurantUser.id,
        items: {
          create: itemNames.map((item, index) => ({
            name: item.name,
            description: item.description,
            iconKey: item.iconKey,
            available: true,
            sortOrder: index,
          })),
        },
      },
      include: { items: true },
    });
  } else if (menu.items.length === 0) {
    await prisma.menuItem.createMany({
      data: itemNames.map((item, index) => ({
        menuId: menu!.id,
        name: item.name,
        description: item.description,
        iconKey: item.iconKey,
        available: true,
        sortOrder: index,
      })),
    });
    menu = await prisma.menu.findUniqueOrThrow({
      where: { id: menu.id },
      include: { items: true },
    });
  }

  const sampleOrdersCount = await prisma.order.count();
  if (sampleOrdersCount === 0) {
    const pick = (...names: string[]) =>
      names
        .map((name) => menu!.items.find((i) => i.name === name))
        .filter((i): i is (typeof menu.items)[number] => Boolean(i));

    const unitPrice = new Prisma.Decimal('20.00');

    const createSample = async (input: {
      requester: typeof pedro;
      company: { id: string; name: string };
      status: $Enums.OrderStatus;
      recipients: string[];
      itemNames: string[];
      orderCode: string;
      fulfillmentType: $Enums.OrderFulfillmentType;
    }) => {
      const items = pick(...input.itemNames);
      const quantity = input.recipients.length;
      const order = await prisma.order.create({
        data: {
          orderCode: input.orderCode,
          requesterId: input.requester.id,
          companyId: input.company.id,
          requesterName: input.requester.name,
          companyName: input.company.name,
          restaurantId: restaurant.id,
          menuId: menu!.id,
          menuDate,
          status: input.status,
          fulfillmentType: input.fulfillmentType,
          quantity,
          unitPrice,
          totalPrice: unitPrice.mul(quantity),
          meals: {
            create: input.recipients.map((recipientName, index) => ({
              recipientName,
              sortOrder: index,
              items: {
                create: items.map((item) => ({
                  menuItemId: item.id,
                  itemName: item.name,
                })),
              },
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: $Enums.OrderStatus.SUBMITTED,
              changedById: input.requester.id,
            },
          },
        },
      });

      if (input.status !== $Enums.OrderStatus.SUBMITTED) {
        const path: $Enums.OrderStatus[] = [
          $Enums.OrderStatus.SUBMITTED,
          $Enums.OrderStatus.ACCEPTED,
          $Enums.OrderStatus.READY,
        ];
        const targetIndex = path.indexOf(input.status);
        for (let i = 1; i <= targetIndex; i++) {
          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: path[i - 1]!,
              toStatus: path[i]!,
              changedById: admin.id,
            },
          });
        }
      }

      return order;
    };

    await createSample({
      requester: pedro,
      company: companies.jardinagem,
      status: $Enums.OrderStatus.SUBMITTED,
      recipients: ['João Pedreiro', 'Maria Auxiliar'],
      itemNames: ['Arroz', 'Feijão', 'Frango assado', 'Salada'],
      orderCode: 'SEED01',
      fulfillmentType: $Enums.OrderFulfillmentType.PICKUP,
    });

    await createSample({
      requester: carlos,
      company: companies.tresE,
      status: $Enums.OrderStatus.ACCEPTED,
      recipients: ['Equipe Obra A'],
      itemNames: ['Arroz', 'Feijão', 'Carne bovina', 'Farofa'],
      orderCode: 'SEED02',
      fulfillmentType: $Enums.OrderFulfillmentType.DELIVERY,
    });

    await createSample({
      requester: ana,
      company: companies.bombeiros,
      status: $Enums.OrderStatus.READY,
      recipients: ['Plantão Manhã 1', 'Plantão Manhã 2'],
      itemNames: ['Arroz', 'Feijão', 'Frango assado', 'Batata', 'Salada'],
      orderCode: 'SEED03',
      fulfillmentType: $Enums.OrderFulfillmentType.PICKUP,
    });

    await createSample({
      requester: pedro,
      company: companies.jardinagem,
      status: $Enums.OrderStatus.READY,
      recipients: ['Supervisor Parque'],
      itemNames: ['Arroz', 'Feijão', 'Carne bovina', 'Salada'],
      orderCode: 'SEED04',
      fulfillmentType: $Enums.OrderFulfillmentType.DELIVERY,
    });
  }

  console.log('Seed concluído.');
  console.log('Credenciais:');
  console.log('  admin@marmita.local / admin123');
  console.log('  rh@marmita.local / rh123');
  console.log('  restaurante@marmita.local / rest123');
  console.log('  pedro@jardinagem.local / requester123');
  console.log('  carlos@3e.local / requester123');
  console.log('  ana@bombeiros.local / requester123');
}

main()
  .catch((error) => {
    console.error('Seed falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
