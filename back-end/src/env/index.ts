import z from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.string().default('5027'),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('12h'),
  APPNAME: z.string().default(''),
  APPKEY: z.string().default(''),
  API_PEDERTRACTOR_URL: z.string().default(''),
  CORREIO: z.string().min(1, 'CORREIO é obrigatório'),
  PORT_CORREIO: z.string().default('587'),
  EMAIL_AUTOMACAO: z.string().min(1, 'EMAIL_AUTOMACAO é obrigatório'),
  PASSWORD_AUTOMACAO: z.string().min(1, 'PASSWORD_AUTOMACAO é obrigatório'),
  FRONT_END_URL: z.string().default('http://localhost:5173'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  const err = z.treeifyError(_env.error).properties;
  console.error('Variáveis de ambiente inválidas:', err);
  throw new Error('Variáveis de ambiente inválidas');
}

export const env = _env.data;
