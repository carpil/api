import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePicture: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  profileCompleted: z.boolean().optional()
})

export const pushTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token is required')
})

export const emailSignupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().length(8, 'Phone number must be exactly 8 digits').regex(/^\d{8}$/, 'Phone number must contain only digits'),
  email: z.string().email('Valid email is required')
})

export const validateUser = (data: unknown) => {
  return userSchema.safeParse(data)
}

export const validatePushToken = (data: unknown) => {
  return pushTokenSchema.safeParse(data)
}
