export const ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'ACCEPTED',
  'READY',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_FULFILLMENT_TYPES = ['PICKUP', 'DELIVERY'] as const;

export type OrderFulfillmentType = (typeof ORDER_FULFILLMENT_TYPES)[number];

export interface MenuItem {
  id: string;
  menuId: string;
  name: string;
  description?: string | null;
  iconKey?: string | null;
  available: boolean;
  sortOrder: number;
}

export interface Menu {
  id: string;
  restaurantId: string;
  date: string;
  items: MenuItem[];
  createdById?: string | null;
  updatedById?: string | null;
  createdBy?: { id: string; name: string } | null;
  updatedBy?: { id: string; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MealPrice {
  id: string;
  companyId: string;
  amount: string | number;
  effectiveFrom: string;
  createdById?: string;
  createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderMealItem {
  id: string;
  orderMealId: string;
  menuItemId?: string | null;
  itemName: string;
  menuItem?: {
    id: string;
    name: string;
    description?: string | null;
    iconKey?: string | null;
  } | null;
}

export interface OrderMeal {
  id: string;
  orderId: string;
  recipientName: string;
  notes?: string | null;
  sortOrder: number;
  items: OrderMealItem[];
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedById: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderCode: string;
  requesterId: string;
  companyId: string;
  requesterName: string;
  companyName: string;
  restaurantId: string;
  menuId: string;
  menuDate: string;
  status: OrderStatus;
  fulfillmentType?: OrderFulfillmentType | null;
  quantity: number;
  /** Ausente para RESTAURANT — valores só para RH/SUPER_ADMIN. */
  unitPrice?: string | number;
  totalPrice?: string | number;
  meals: OrderMeal[];
  statusHistory?: OrderStatusHistory[];
  requester?: { id: string; name: string; email: string };
  company?: { id: string; name: string; active: boolean };
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderPayload {
  menuId: string;
  quantity: number;
  fulfillmentType?: OrderFulfillmentType | null;
  orderCode?: string;
  meals: Array<{
    recipientName: string;
    notes?: string | null;
    itemIds: string[];
  }>;
}

export interface AuditLog {
  id: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  createdAt: string;
  user?: { id: string; name: string; email: string } | null;
}
