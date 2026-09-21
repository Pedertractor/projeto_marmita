import type { AuditLog } from '@/types/domain';
import api from '@/utils/axiosConfig';

export interface ListAuditParams {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}

export const auditApi = {
  async list(params?: ListAuditParams): Promise<AuditLog[]> {
    const { data } = await api.get<{ auditLogs: AuditLog[] }>('/audit-logs', {
      params,
    });
    return data.auditLogs;
  },
};
