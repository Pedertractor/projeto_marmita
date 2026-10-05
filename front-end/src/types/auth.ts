export const USER_ROLES = [
  'SUPER_ADMIN',
  'RH',
  'RESTAURANT',
  'REQUESTER',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type Unit = 'PEDERTRACTOR' | 'TRACTOR';

export interface AuthCompany {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
}

export interface AuthRestaurant {
  id: string;
  name: string;
  active?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cardNumber?: string | null;
  unit?: Unit | null;
  role: UserRole;
  active: boolean;
  mustChangePassword: boolean;
  needsEmailChallenge: boolean;
  hasRealEmail: boolean;
  maskedEmail: string | null;
  companyId?: string | null;
  restaurantId?: string | null;
  company?: AuthCompany | null;
  restaurant?: AuthRestaurant | null;
  createdAt?: string;
}

export interface ListUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  cardNumber?: string | null;
  unit?: Unit | null;
  role: UserRole;
  active: boolean;
  companyId?: string | null;
  restaurantId?: string | null;
  company?: AuthCompany | null;
  createdAt?: string;
}

export type LoginCredentials =
  | { email: string; password: string }
  | {
      cardNumber: string;
      unit: Unit;
      password: string;
    };

export interface LoginResponse {
  user: AuthUser;
  token: string;
}
