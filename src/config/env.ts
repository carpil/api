import dotenv from 'dotenv'
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  CHAT_SECRET: z.string().optional(),
  FIREBASE_CONFIG: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional()
})
export type Env = z.infer<typeof EnvSchema>

export let env: Env

export const loadEnv = () => {
  dotenv.config()
  dotenv.config({ path: '.env.local' })
  env = EnvSchema.parse(process.env)
}


