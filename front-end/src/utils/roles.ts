import type { UserRole } from '@/types/auth';

export const formattedRoles: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  RH: 'RH',
  RESTAURANT: 'Restaurante',
  REQUESTER: 'Solicitante',
};
