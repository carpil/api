import { z } from 'zod'

export enum PaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'cancelled'
}

export enum PaymentMethod {
  DebitCard = 'debit-card',
  Sinpe = 'sinpe'
}

export const PaymentAttemptSchema = z.object({
  stripePaymentIntentId: z.string(),
  status: z.string(),
  timestamp: z.date(),
  errorMessage: z.string().optional()
})

export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>

export const PaymentSchema = z.object({
  id: z.string(),
  rideId: z.string(),
  userId: z.string(),
  amount: z.number().min(0),
  currency: z.string().default('crc'),
  status: z.nativeEnum(PaymentStatus),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.DebitCard),
  stripePaymentIntentId: z.string().optional(),
  stripeClientSecret: z.string().optional(),
  attachmentUrl: z.string().optional(),
  description: z.string().optional(),
  paymentAttempts: z.array(PaymentAttemptSchema).optional().default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
})

export type Payment = z.infer<typeof PaymentSchema>

export const CreatePaymentSchema = z.object({
  rideId: z.string(),
  userId: z.string(),
  amount: z.number().min(0),
  description: z.string().optional()
})

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>

export const PaymentIntentResponseSchema = z.object({
  clientSecret: z.string()
})

export type PaymentIntentResponse = z.infer<typeof PaymentIntentResponseSchema>
