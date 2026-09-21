import type { FastifyInstance } from 'fastify';
import { userRoutes } from './user-route.js';
import { companyRoutes } from './company-route.js';
import { mealPriceRoutes } from './meal-price-route.js';
import { menuRoutes } from './menu-route.js';
import { orderRoutes } from './order-route.js';
import { registrationRequestRoutes } from './registration-request-route.js';
import {
  dashboardRoutes,
  reportRoutes,
  auditLogRoutes,
} from './dashboard-route.js';

export async function mainRoutes(app: FastifyInstance) {
  app.register(userRoutes, { prefix: '/users' });
  app.register(companyRoutes, { prefix: '/companies' });
  app.register(mealPriceRoutes, { prefix: '/meal-prices' });
  app.register(menuRoutes, { prefix: '/menus' });
  app.register(orderRoutes, { prefix: '/orders' });
  app.register(registrationRequestRoutes, {
    prefix: '/registration-requests',
  });
  app.register(dashboardRoutes, { prefix: '/dashboard' });
  app.register(reportRoutes, { prefix: '/reports' });
  app.register(auditLogRoutes, { prefix: '/audit-logs' });
}
