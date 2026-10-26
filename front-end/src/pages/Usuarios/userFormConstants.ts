import type { UserRole } from '@/types/auth';

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'REQUESTER', label: 'Solicitante' },
  { value: 'RESTAURANT', label: 'Restaurante' },
  { value: 'RH', label: 'RH' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

export function roleNeedsCompany(role: UserRole) {
  return role === 'REQUESTER' || role === 'RESTAURANT';
}

export function findSodexoCompany<
  T extends { id: string; name: string; code?: string | null; active?: boolean },
>(companies: T[]): T | undefined {
  return companies.find((company) => {
    if (company.active === false) return false;
    const code = (company.code ?? '').toUpperCase();
    return code === 'SODEXO' || company.name.trim().toLowerCase() === 'sodexo';
  });
}
