import api from '@/utils/axiosConfig';

export type CompanyKind = 'PEDERTRACTOR' | 'TRACTOR' | 'OTHER';
export type Unit = 'PEDERTRACTOR' | 'TRACTOR';
export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ValidatedEmployee {
  name: string;
  cardNumber: string;
  unit: Unit;
  status: string;
  employeeExternalId: string;
}

export interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyKind: CompanyKind;
  companyName: string;
  companyId?: string | null;
  cardNumber?: string | null;
  unit?: Unit | null;
  employeeExternalId?: string | null;
  status: RegistrationStatus;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
    code?: string | null;
    active: boolean;
  } | null;
  reviewedBy?: { id: string; name: string; email: string } | null;
}

export interface CreateRegistrationPayload {
  name?: string;
  email?: string;
  phone: string;
  password: string;
  companyKind: CompanyKind;
  companyName?: string;
  cardNumber?: string;
}

const BASE = '/registration-requests';

export const registrationRequestsApi = {
  async checkAvailability(payload: {
    email: string;
  }): Promise<{ available: boolean; message?: string }> {
    const { data } = await api.post<{ available: boolean; message?: string }>(
      `${BASE}/check-availability`,
      payload,
      { skipErrorToast: true },
    );
    return data;
  },

  async validateEmployee(payload: {
    cardNumber: string;
    unit: Unit;
  }): Promise<ValidatedEmployee> {
    const { data } = await api.post<{ employee: ValidatedEmployee }>(
      `${BASE}/validate-employee`,
      payload,
      { skipErrorToast: true },
    );
    return data.employee;
  },

  async create(
    payload: CreateRegistrationPayload,
  ): Promise<{ registration: RegistrationRequest; message: string }> {
    const { data } = await api.post<{
      registration: RegistrationRequest;
      message: string;
    }>(BASE, payload);
    return data;
  },

  async list(status?: RegistrationStatus): Promise<RegistrationRequest[]> {
    const { data } = await api.get<{ registrations: RegistrationRequest[] }>(
      BASE,
      { params: status ? { status } : undefined },
    );
    return data.registrations;
  },

  async approve(
    id: string,
    payload: { mealPriceAmount: number; companyName?: string },
  ): Promise<unknown> {
    const { data } = await api.post(`${BASE}/${id}/approve`, payload);
    return data;
  },

  async reject(
    id: string,
    payload?: { note?: string },
  ): Promise<RegistrationRequest> {
    const { data } = await api.post<{ registration: RegistrationRequest }>(
      `${BASE}/${id}/reject`,
      payload ?? {},
    );
    return data.registration;
  },
};
