import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

export const auditRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rr:rl:audit',
});

export const generalRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(30, '1 m'),
  prefix: 'rr:rl:general',
});
