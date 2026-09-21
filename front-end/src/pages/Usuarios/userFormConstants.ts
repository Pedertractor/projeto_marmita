import type { UserRole } from '@/types/auth';

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'REQUESTER', label: 'Solicitante' },
  { value: 'RESTAURANT', label: 'Restaurante' },
  { value: 'RH', label: 'RH' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];
