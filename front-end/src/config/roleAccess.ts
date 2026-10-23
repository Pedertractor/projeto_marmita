import { ROUTES, homeForRole } from '@/routes/constants';
import { SIDEBAR_NAV_ITEMS, type SidebarNavItem } from '@/config/sidebar';
import type { UserRole } from '@/types/auth';
import {
  canAccessAudit,
  canAccessCompanies,
  canAccessMealPrices,
  canAccessRegistrationRequests,
  canAccessReports,
  canAccessRestaurantDashboard,
  canAccessRhDashboard,
  canAccessUsersArea,
  canCreateSpecialOrder,
  canManageMenus,
  isRequester,
} from '@/config/permissions';

const RH_PATHS: readonly string[] = [
  ROUTES.DASHBOARD_RH,
  ROUTES.ORDERS,
  ROUTES.SPECIAL_ORDER_NEW,
  ROUTES.COMPANIES,
  ROUTES.MEAL_PRICES,
  ROUTES.REGISTRATIONS,
  ROUTES.USUARIOS,
  ROUTES.PROFILE,
] as const;

const RESTAURANT_PATHS: readonly string[] = [
  ROUTES.DASHBOARD_RESTAURANT,
  ROUTES.ORDERS,
  ROUTES.MENUS,
  ROUTES.PROFILE,
] as const;

const SUPER_ADMIN_PATHS: readonly string[] = [
  ROUTES.DASHBOARD_RH,
  ROUTES.DASHBOARD_RESTAURANT,
  ROUTES.ORDERS,
  ROUTES.MENUS,
  ROUTES.COMPANIES,
  ROUTES.MEAL_PRICES,
  ROUTES.REGISTRATIONS,
  ROUTES.USUARIOS,
  ROUTES.AUDIT,
  ROUTES.PROFILE,
] as const;

const REQUESTER_PATHS: readonly string[] = [
  ROUTES.REQUESTER_HOME,
  ROUTES.REQUESTER_ORDERS,
  ROUTES.PROFILE,
] as const;

export const NAV_PATHS_BY_ROLE: Record<UserRole, readonly string[]> = {
  SUPER_ADMIN: SUPER_ADMIN_PATHS,
  RH: RH_PATHS,
  RESTAURANT: RESTAURANT_PATHS,
  REQUESTER: REQUESTER_PATHS,
};

const PROTECTED_PATH_PATTERNS: RegExp[] = [
  /^\/$/,
  /^\/perfil(\/.*)?$/,
  /^\/app(\/.*)?$/,
  /^\/dashboard(\/.*)?$/,
  /^\/restaurante(\/.*)?$/,
  /^\/pedidos(\/.*)?$/,
  /^\/cardapios(\/.*)?$/,
  /^\/empresas(\/.*)?$/,
  /^\/relatorios(\/.*)?$/,
  /^\/precos(\/.*)?$/,
  /^\/solicitacoes(\/.*)?$/,
  /^\/usuarios(\/.*)?$/,
  /^\/auditoria(\/.*)?$/,
];

export function isAppShellPath(pathname: string): boolean {
  const n = pathname || '/';
  return PROTECTED_PATH_PATTERNS.some((re) => re.test(n));
}

export function pathMatchesNavSegment(pathname: string, navPath: string): boolean {
  const normalized = pathname || '/';
  if (navPath === ROUTES.HOME) {
    return normalized === '/' || normalized === '';
  }
  // /app é prefixo de /app/pedidos — só destaca Início na home do solicitante
  if (navPath === ROUTES.REQUESTER_HOME) {
    return normalized === ROUTES.REQUESTER_HOME;
  }
  if (navPath === ROUTES.ORDERS) {
    if (
      normalized === ROUTES.SPECIAL_ORDER_NEW ||
      normalized.startsWith(`${ROUTES.SPECIAL_ORDER_NEW}/`)
    ) {
      return false;
    }
  }
  if (normalized === navPath) return true;
  if (normalized.startsWith(`${navPath}/`)) return true;
  return false;
}

export function pathMatchesNavExact(pathname: string, navPath: string): boolean {
  const normalized = pathname || '/';
  if (navPath === ROUTES.HOME) {
    return normalized === '/' || normalized === '';
  }
  if (navPath === ROUTES.REQUESTER_HOME) {
    return normalized === ROUTES.REQUESTER_HOME;
  }
  // /pedidos não deve destacar quando estamos em /pedidos/especial
  if (navPath === ROUTES.ORDERS) {
    if (
      normalized === ROUTES.SPECIAL_ORDER_NEW ||
      normalized.startsWith(`${ROUTES.SPECIAL_ORDER_NEW}/`)
    ) {
      return false;
    }
  }
  if (normalized === navPath) return true;
  if (normalized.startsWith(`${navPath}/`)) return true;
  return false;
}

export function canRoleAccessPath(role: UserRole, pathname: string): boolean {
  const normalized = pathname || '/';
  if (!isAppShellPath(normalized)) return true;

  if (normalized === '/' || normalized === '') return true;

  if (isRequester(role)) {
    return (
      normalized === ROUTES.PROFILE ||
      normalized === ROUTES.REQUESTER_HOME ||
      normalized.startsWith('/app/')
    );
  }

  if (normalized.startsWith('/app')) return false;

  if (
    normalized === ROUTES.DASHBOARD_RH ||
    normalized.startsWith(`${ROUTES.DASHBOARD_RH}/`)
  ) {
    return canAccessRhDashboard(role);
  }

  if (
    normalized === ROUTES.DASHBOARD_RESTAURANT ||
    normalized.startsWith(`${ROUTES.DASHBOARD_RESTAURANT}/`)
  ) {
    return canAccessRestaurantDashboard(role);
  }

  if (normalized === ROUTES.MENUS || normalized.startsWith(`${ROUTES.MENUS}/`)) {
    return canManageMenus(role);
  }

  if (
    normalized === ROUTES.COMPANIES ||
    normalized.startsWith(`${ROUTES.COMPANIES}/`)
  ) {
    return canAccessCompanies(role);
  }

  if (
    normalized === ROUTES.REPORTS ||
    normalized.startsWith(`${ROUTES.REPORTS}/`)
  ) {
    return canAccessReports(role);
  }

  if (
    normalized === ROUTES.MEAL_PRICES ||
    normalized.startsWith(`${ROUTES.MEAL_PRICES}/`)
  ) {
    return canAccessMealPrices(role);
  }

  if (
    normalized === ROUTES.REGISTRATIONS ||
    normalized.startsWith(`${ROUTES.REGISTRATIONS}/`)
  ) {
    return canAccessRegistrationRequests(role);
  }

  if (
    normalized === ROUTES.USUARIOS ||
    normalized.startsWith(`${ROUTES.USUARIOS}/`)
  ) {
    return canAccessUsersArea(role);
  }

  if (normalized === ROUTES.AUDIT || normalized.startsWith(`${ROUTES.AUDIT}/`)) {
    return canAccessAudit(role);
  }

  if (
    normalized === ROUTES.SPECIAL_ORDER_NEW ||
    normalized.startsWith(`${ROUTES.SPECIAL_ORDER_NEW}/`)
  ) {
    return canCreateSpecialOrder(role);
  }

  if (
    normalized === ROUTES.ORDERS ||
    normalized.startsWith(`${ROUTES.ORDERS}/`)
  ) {
    return (
      role === 'SUPER_ADMIN' || role === 'RH' || role === 'RESTAURANT'
    );
  }

  if (normalized === ROUTES.PROFILE) return true;

  return true;
}

export function getSidebarNavItemsForRole(role: UserRole): SidebarNavItem[] {
  const allowed = new Set(NAV_PATHS_BY_ROLE[role]);
  return SIDEBAR_NAV_ITEMS.filter((item) => allowed.has(item.path));
}

export function defaultHomeForRole(role: UserRole): string {
  return homeForRole(role);
}
