import '@fastify/jwt';
import type { $Enums } from '../generated/prisma/client.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      /** Versão da sessão; deve coincidir com User.tokenVersion. */
      tv?: number;
      /** @deprecated Legacy tokens may include role; auth middleware always loads role from DB. */
      role?: $Enums.UserRole;
    };
    user: {
      sub: string;
      role: $Enums.UserRole;
      tv?: number;
    };
  }
}
