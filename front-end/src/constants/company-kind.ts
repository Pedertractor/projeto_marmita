import type { CompanyKind, Unit } from '@/services/registration-requests';

export const COMPANY_KIND_OPTIONS: Array<{
  value: CompanyKind;
  label: string;
}> = [
  { value: 'OTHER', label: 'Outros' },
  { value: 'PEDERTRACTOR', label: 'Pedertractor' },
  { value: 'TRACTOR', label: 'Tractor' },
];

export function isInternalCompanyKind(kind: CompanyKind): boolean {
  return kind === 'PEDERTRACTOR' || kind === 'TRACTOR';
}

export function internalUnitFromKind(kind: CompanyKind): Unit | null {
  if (kind === 'PEDERTRACTOR' || kind === 'TRACTOR') return kind;
  return null;
}

export function isSyntheticInternalEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith('@marmita.internal') ||
    normalized.endsWith('@mesa.internal')
  );
}
