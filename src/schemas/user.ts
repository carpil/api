import { z } from 'zod'


const userSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  profilePicture: z.string().optional(),
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional()
})

export const validateUser = (user: any): z.SafeParseReturnType<any, any> => {
  return userSchema.safeParse(user)
}
