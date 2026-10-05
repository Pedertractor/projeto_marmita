/**
 * Constantes de rotas. Arquivo separado para evitar dependência circular.
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/cadastro',
  FORGOT_PASSWORD: '/esqueci-senha',
  RESET_PASSWORD: '/redefinir-senha',
  PROFILE: '/perfil',

  REQUESTER_HOME: '/app',
  REQUESTER_ORDERS: '/app/pedidos',
  REQUESTER_ORDER_NEW: '/app/pedidos/novo',
  REQUESTER_ORDER_DETAIL: '/app/pedidos/:orderId',
  REQUESTER_ORDER_WIZARD: '/app/pedidos/:orderId/solicitar',
  REQUESTER_ORDER_EDIT: '/app/pedidos/:orderId/editar',

  DASHBOARD_RH: '/dashboard',
  DASHBOARD_RESTAURANT: '/restaurante',
  ORDERS: '/pedidos',
  ORDER_DETAIL: '/pedidos/:orderId',
  MENUS: '/cardapios',
  MENU_EDIT: '/cardapios/editar',
  COMPANIES: '/empresas',
  REPORTS: '/relatorios',
  MEAL_PRICES: '/precos',
  REGISTRATIONS: '/solicitacoes',
  USUARIOS: '/usuarios',
  USUARIOS_NOVO: '/usuarios/novo',
  AUDIT: '/auditoria',

  NOT_FOUND: '*',
} as const;

export function requesterOrderPath(orderId: string) {
  return `/app/pedidos/${orderId}`;
}

export function requesterOrderWizardPath(orderId: string) {
  return `/app/pedidos/${orderId}/solicitar`;
}

export function requesterOrderEditPath(orderId: string) {
  return `/app/pedidos/${orderId}/editar`;
}

export function adminOrderPath(orderId: string) {
  return `/pedidos/${orderId}`;
}

export function homeForRole(
  role: 'SUPER_ADMIN' | 'RH' | 'RESTAURANT' | 'REQUESTER',
): string {
  if (role === 'REQUESTER') return ROUTES.REQUESTER_HOME;
  if (role === 'RESTAURANT') return ROUTES.DASHBOARD_RESTAURANT;
  return ROUTES.DASHBOARD_RH;
}
