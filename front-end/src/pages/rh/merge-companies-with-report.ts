import type { Company } from '@/types/domain';
import type { CompanyReportRow } from '@/services/reports';

export type CompanyWithSpend = Company & {
  orders: number;
  quantity: number;
  totalPrice: number;
};

export function mergeCompaniesWithReport(
  companies: Company[],
  reportRows: CompanyReportRow[],
): CompanyWithSpend[] {
  const byId = new Map(
    reportRows.map((row) => [
      row.companyId,
      {
        orders: row.orders,
        quantity: row.quantity,
        totalPrice: Number(row.totalPrice) || 0,
      },
    ]),
  );

  return companies.map((company) => {
    const spend = byId.get(company.id);
    return {
      ...company,
      orders: spend?.orders ?? 0,
      quantity: spend?.quantity ?? 0,
      totalPrice: spend?.totalPrice ?? 0,
    };
  });
}
