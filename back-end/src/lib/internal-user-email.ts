import type { $Enums } from '../generated/prisma/client.js';

/** E-mail técnico para usuários que acessam por cartão (único no banco). */
export function syntheticEmailForCard(
  unit: $Enums.Unit,
  cardNumber: string,
): string {
  const digits = cardNumber.replace(/\D/g, '') || cardNumber.trim();
  return `${unit.toLowerCase()}.${digits}@marmita.internal`;
}

export function isSyntheticInternalEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  return (
    normalized.endsWith('@marmita.internal') ||
    normalized.endsWith('@mesa.internal')
  );
}
