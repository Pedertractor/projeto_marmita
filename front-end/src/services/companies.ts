import type { Company } from '@/types/domain';
import api from '@/utils/axiosConfig';

const BASE = '/companies';

export const companiesApi = {
  async list(): Promise<Company[]> {
    const { data } = await api.get<{ companies: Company[] }>(BASE);
    return data.companies;
  },

  async create(payload: { name: string; active?: boolean }): Promise<Company> {
    const { data } = await api.post<{ company: Company }>(BASE, payload);
    return data.company;
  },

  async update(
    companyId: string,
    payload: { name?: string; active?: boolean },
  ): Promise<Company> {
    const { data } = await api.patch<{ company: Company }>(
      `${BASE}/${companyId}`,
      payload,
    );
    return data.company;
  },
};
