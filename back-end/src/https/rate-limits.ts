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
