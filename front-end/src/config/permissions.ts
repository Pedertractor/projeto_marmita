import type { UserRole } from '@/types/auth';

export function canAccessUsersArea(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'RH';
}

export function canCreateUser(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canAssignSuperAdminRole(actorRole: UserRole): boolean {
  return actorRole === 'SUPER_ADMIN';
}

export function canEditUserAsAdmin(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'RH';
}

export function canAccessRegistrationRequests(role: UserRole): boolean {
  return role === 'RH' || role === 'SUPER_ADMIN';
}

export function canResetUserPassword(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'RH';
}

/** Desativar/reativar ou apagar usuário — RH e SUPER_ADMIN. */
export function canManageUserLifecycle(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'RH';
}

export function canAccessCompanies(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'RH';
}

/** Criação manual via API — apenas SUPER_ADMIN (empresas nascem no cadastro). */
export function canCreateCompany(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

/** Desativar/reativar empresa — RH e SUPER_ADMIN. */
export function canToggleCompanyActive(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'RH';
}

/** @deprecated Prefer canToggleCompanyActive / canCreateCompany */
export function canManageCompanies(role: UserRole): boolean {
  return canToggleCompanyActive(role);
}

export function canAccessRhDashboard(role: UserRole): boolean {
  return role === 'RH' || role === 'SUPER_ADMIN';
}

export function canAccessRestaurantDashboard(role: UserRole): boolean {
  return role === 'RESTAURANT' || role === 'SUPER_ADMIN';
}

export function canManageMenus(role: UserRole): boolean {
  return role === 'RESTAURANT' || role === 'SUPER_ADMIN';
}

export function canAccessMealPrices(role: UserRole): boolean {
  return role === 'RH' || role === 'SUPER_ADMIN';
}

/** Valores monetários de pedidos (unitário/total) — RH e SUPER_ADMIN. */
export function canViewOrderPricing(role: UserRole): boolean {
  return role === 'RH' || role === 'SUPER_ADMIN';
}

export function canAccessReports(role: UserRole): boolean {
  return role === 'RH' || role === 'SUPER_ADMIN';
}

export function canAccessAudit(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canUpdateOrderStatus(role: UserRole): boolean {
  return (
    role === 'RESTAURANT' || role === 'RH' || role === 'SUPER_ADMIN'
  );
}

export function isRequester(role: UserRole): boolean {
  return role === 'REQUESTER';
}

export function isAdminShellRole(role: UserRole): boolean {
  return (
    role === 'SUPER_ADMIN' || role === 'RH' || role === 'RESTAURANT'
  );
}
