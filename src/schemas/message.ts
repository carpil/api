import { z } from 'zod'

const messageSchema = z.object({
  content: z.string().min(1).max(200)
})

export const validateMessage = (message: any): z.SafeParseReturnType<any, any> => {
  return messageSchema.safeParse(message)
} 