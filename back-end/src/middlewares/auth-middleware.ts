import type { FastifyReply, FastifyRequest } from 'fastify';
import { HttpError } from '../https/errors/index.js';
import { UserService } from '../services/user-service.js';

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  try {
    await request.jwtVerify();
  } catch {
    throw new HttpError('Não autorizado', 401);
  }

  const userService = new UserService();
  const principal = await userService.resolveSessionPrincipal(request.user.sub);

  if (!principal.active) {
    throw new HttpError('Usuário inativo', 401);
  }

  const tokenVersion = request.user.tv ?? 0;
  if (tokenVersion !== principal.tokenVersion) {
    throw new HttpError('Sessão expirada. Faça login novamente.', 401);
  }

  const routeUrl = request.routeOptions.url ?? request.url;
  const isPasswordChangeRoute = routeUrl.endsWith('/users/me/change-password');
  const isCurrentUserRoute = /\/users\/me$/.test(routeUrl);

  if (
    principal.mustChangePassword &&
    !isPasswordChangeRoute &&
    !isCurrentUserRoute
  ) {
    throw new HttpError('Altere sua senha para continuar', 403);
  }

  if (
    principal.needsEmailChallenge &&
    !isEmailChallengeAllowedRoute(routeUrl)
  ) {
    throw new HttpError('Verifique seu e-mail para continuar', 403);
  }

  request.user = {
    sub: principal.id,
    role: principal.role,
    tv: principal.tokenVersion,
  };
}

function isEmailChallengeAllowedRoute(routeUrl: string): boolean {
  if (/\/users\/me$/.test(routeUrl)) return true;
  return (
    routeUrl.endsWith('/users/me/change-password') ||
    routeUrl.endsWith('/users/me/email') ||
    routeUrl.endsWith('/users/me/email-challenge/send') ||
    routeUrl.endsWith('/users/me/email-challenge/verify') ||
    routeUrl.endsWith('/users/me/email-challenge/force')
  );
}
