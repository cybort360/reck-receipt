import { z } from 'zod';

const schema = z.object({
  HELIUS_API_KEY: z.string().min(1, 'HELIUS_API_KEY is required'),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  TREASURY_WALLET: z.string().min(1, 'TREASURY_WALLET is required'),
  USDC_MINT: z.string().min(1, 'USDC_MINT is required'),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  ADMIN_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.issues.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
  throw new Error(`Environment validation failed:\n${missing}`);
}

export const env = result.data;
