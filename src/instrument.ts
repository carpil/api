// Must be the first import in the app entry point.
// Loads env vars and initializes Sentry before any other module is instrumented.
import dotenv from 'dotenv'
dotenv.config()
dotenv.config({ path: '.env.local' })

import * as Sentry from '@sentry/node'
import { sentryConfig } from './config/sentry'

Sentry.init(sentryConfig)
