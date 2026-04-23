// Must be the first import in the app entry point.
// Loads env vars and initializes Sentry before any other module is instrumented.
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local' })

import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  // RAILWAY_ENVIRONMENT_NAME is injected by Railway automatically ('development' | 'staging' | 'production')
  environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
})
