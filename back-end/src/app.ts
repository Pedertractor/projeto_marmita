import path from 'node:path';
import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { allowedCorsOrigins, env } from './env/index.js';
import { ensureUploadsDirs } from './lib/avatar-storage.js';
import { apiErrorHandler } from './https/errors/error-handler.js';
import { mainRoutes } from './https/routes/main-route.js';
import { healthRoutes } from './https/routes/health-route.js';

const allowedOrigins = new Set(allowedCorsOrigins());

export const app = Fastify({
  trustProxy: env.TRUST_PROXY,
  bodyLimit: 1_048_576,
});

await ensureUploadsDirs();

app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

app.register(cors, {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.has(origin.replace(/\/$/, '')));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.register(fastifyStatic, {
  root: path.resolve(env.UPLOADS_DIR),
  prefix: '/uploads/',
  decorateReply: false,
});

app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: (request, context) => {
    request.log.warn(
      {
        ip: request.ip,
        url: request.url,
        method: request.method,
        max: context.max,
        after: context.after,
      },
      'Rate limit exceeded',
    );
    const error = new Error(
      'Muitas requisições. Tente novamente em instantes.',
    ) as Error & { statusCode: number };
    error.statusCode = context.statusCode;
    return error;
  },
});

app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  },
  verify: {
    algorithms: ['HS256'],
  },
});

if (env.NODE_ENV !== 'production') {
  app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Marmita API',
        description:
          'API da Marmita — autenticação, cardápio, pedidos e relatórios',
        version: '1.0.0',
      },
      servers: [
        { url: `http://${env.HOST}:${env.PORT}/api`, description: 'API' },
      ],
      tags: [
        { name: 'health', description: 'Health check' },
        { name: 'users', description: 'Autenticação e gestão de usuários' },
        { name: 'companies', description: 'Empresas' },
        { name: 'meal-prices', description: 'Preço da marmita' },
        { name: 'menus', description: 'Cardápio' },
        { name: 'orders', description: 'Pedidos' },
        { name: 'dashboard', description: 'Dashboards RH e restaurante' },
        { name: 'reports', description: 'Relatórios' },
        { name: 'audit-logs', description: 'Auditoria' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT obtido no login',
          },
        },
      },
    },
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

app.register(healthRoutes);
app.register(mainRoutes, { prefix: '/api' });

app.setErrorHandler((error, request, reply) => {
  return apiErrorHandler(
    error as Parameters<typeof apiErrorHandler>[0],
    request as Parameters<typeof apiErrorHandler>[1],
    reply as Parameters<typeof apiErrorHandler>[2],
  );
});
