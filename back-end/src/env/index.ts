import z from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string(),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.string().default('3404'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  /**
   * Proxies confiáveis para X-Forwarded-For (rate limit / IP real).
   * - "false" / "0": não confia em proxy (padrão seguro)
   * - "true" / "1": confia no primeiro proxy (só atrás de reverse proxy conhecido)
   * - número: quantidade de hops de proxy
   */
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((raw): boolean | string => {
      if (raw === undefined || raw === '') return false;
      const trimmed = raw.trim().toLowerCase();
      if (trimmed === 'true' || trimmed === '1') return true;
      if (trimmed === 'false' || trimmed === '0') return false;
      const hops = Number(trimmed);
      // Fastify aceita hops como string numérica (ex.: "1")
      if (Number.isInteger(hops) && hops >= 0) return String(hops);
      return false;
    }),
  CORS_ORIGINS: z.string().optional(),
  APPNAME: z.string().default(''),
  APPKEY: z.string().default(''),
  API_PEDERTRACTOR_URL: z.string().default(''),
  CORREIO: z.string().min(1, 'CORREIO é obrigatório'),
  PORT_CORREIO: z.string().default('587'),
  EMAIL_AUTOMACAO: z.string().min(1, 'EMAIL_AUTOMACAO é obrigatório'),
  PASSWORD_AUTOMACAO: z.string().min(1, 'PASSWORD_AUTOMACAO é obrigatório'),
  FRONT_END_URL: z.string().default('http://localhost:5173'),
  UPLOADS_DIR: z.string().default('./uploads'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const err = z.treeifyError(_env.error).properties;
  console.error('Variáveis de ambiente inválidas:', err);
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;

export function allowedCorsOrigins(): string[] {
  const origins = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim().replace(/\/$/, '');
    if (trimmed) origins.add(trimmed);
  };

  add(env.FRONT_END_URL);
  if (env.CORS_ORIGINS) {
    for (const part of env.CORS_ORIGINS.split(',')) add(part);
  }

  return [...origins];
}
