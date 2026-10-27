import { HttpError } from '../https/errors/index.js';

/** Máximo de tentativas de login por conta (e-mail ou unidade+cartão). */
export const LOGIN_ACCOUNT_MAX_ATTEMPTS = 5;
/** Janela em ms para o limite por conta. */
export const LOGIN_ACCOUNT_WINDOW_MS = 15 * 60 * 1000;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function loginAccountKey(input: {
  email?: string | undefined;
  cardNumber?: string | undefined;
  unit?: string | undefined;
}): string {
  if (input.email?.trim()) {
    return `email:${input.email.trim().toLowerCase()}`;
  }
  if (input.cardNumber?.trim() && input.unit) {
    return `card:${input.unit}:${input.cardNumber.trim()}`;
  }
  return 'unknown';
}

/**
 * Bloqueia se a conta já excedeu tentativas na janela.
 * Deve ser chamado *antes* da autenticação.
 */
export function assertLoginAccountAllowed(key: string): void {
  const now = Date.now();
  pruneExpired(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) return;
  if (bucket.count >= LOGIN_ACCOUNT_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000),
    );
    const error = new HttpError(
      'Muitas tentativas de login nesta conta. Tente novamente em instantes.',
      429,
    ) as HttpError & { retryAfterSeconds?: number };
    error.retryAfterSeconds = retryAfterSeconds;
    throw error;
  }
}

/** Registra uma falha de login para a conta. */
export function recordLoginAccountFailure(key: string): void {
  const now = Date.now();
  pruneExpired(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + LOGIN_ACCOUNT_WINDOW_MS,
    });
    return;
  }
  existing.count += 1;
}

/** Limpa o contador após login bem-sucedido. */
export function clearLoginAccountFailures(key: string): void {
  buckets.delete(key);
}
