import api from '@/utils/axiosConfig';

export interface CompanyReportRow {
  companyId: string;
  companyName: string;
  orders: number;
  quantity: number;
  totalPrice: string | number;
}

export interface CompanyReport {
  period: {
    fromDate: string | null;
    toDate: string | null;
  };
  companies: CompanyReportRow[];
}

export const reportsApi = {
  async byCompany(params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<CompanyReport> {
    const { data } = await api.get<{ report: CompanyReport }>(
      '/reports/by-company',
      { params },
    );
    return data.report;
  },
};
