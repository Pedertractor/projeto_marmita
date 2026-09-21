import type { $Enums } from '../generated/prisma/client.js';

/** E-mail técnico para usuários que acessam por cartão (único no banco). */
export function syntheticEmailForCard(
  unit: $Enums.Unit,
  cardNumber: string,
): string {
  const digits = cardNumber.replace(/\D/g, '') || cardNumber.trim();
  return `${unit.toLowerCase()}.${digits}@mesa.internal`;
}

export function isSyntheticInternalEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@mesa.internal');
}
