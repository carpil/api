import { z } from 'zod'

export const PushTokenSchema = z.object({
  pushToken: z.string().min(1)
})
export type PushTokenInput = z.infer<typeof PushTokenSchema>


