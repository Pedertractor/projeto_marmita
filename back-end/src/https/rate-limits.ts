export const loginRateLimit = {
  max: 10,
  timeWindow: '1 minute',
} as const;

export const sensitivePublicRateLimit = {
  max: 5,
  timeWindow: '1 minute',
} as const;

export const registrationRateLimit = {
  max: 10,
  timeWindow: '1 minute',
} as const;

/** Upload de avatar (payload maior / I/O em disco). */
export const avatarUploadRateLimit = {
  max: 10,
  timeWindow: '1 minute',
} as const;

/** Geração de PDF / relatórios. */
export const expensiveReportRateLimit = {
  max: 10,
  timeWindow: '1 minute',
} as const;

/** Consultas à API corporativa (lookup / register-by-card). */
export const externalLookupRateLimit = {
  max: 20,
  timeWindow: '1 minute',
} as const;
