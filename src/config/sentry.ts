import type { NodeOptions } from '@sentry/node'

export const sentryConfig: NodeOptions = {
  dsn: process.env.SENTRY_DSN,
  // RAILWAY_ENVIRONMENT_NAME is injected automatically ('development' | 'staging' | 'production')
  environment:
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    process.env.NODE_ENV ??
    'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
}
