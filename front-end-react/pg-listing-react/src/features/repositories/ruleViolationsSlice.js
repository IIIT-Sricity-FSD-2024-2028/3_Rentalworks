import { createRepositorySlice } from './createRepositorySlice';

// Repository: rule_violations (warnings / escalations against tenants)
export const ruleViolationsRepo = createRepositorySlice({
  name: 'ruleViolations',
  base: '/rule-violations',
  updateMethod: 'put',
});
