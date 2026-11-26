import { createRepositorySlice } from './createRepositorySlice';

// Repository: audit_logs (who did what to which tenant)
export const auditLogsRepo = createRepositorySlice({
  name: 'auditLogs',
  base: '/audit-logs',
  updateMethod: 'patch',
});
