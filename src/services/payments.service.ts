import Stripe from 'stripe'
import { env } from '../config/env'
import { CreatePaymentInput, PaymentIntentResponse, Payment } from '../models/payment.model'
import { HttpError } from '../utils/http'
import { PaymentsRepository } from '../repositories/firebase/payments.repository'

export class PaymentsService {
  private stripe: Stripe
  private paymentsRepo: PaymentsRepository

  constructor(paymentsRepo: PaymentsRepository) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }
    
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover'
    })
    this.paymentsRepo = paymentsRepo
  }

  /**
   * Convierte el monto de USD a centavos (unidades menores)
   */
  // private toMinorUnits(amountInUsd: number): number {
  //   return Math.round(amountInUsd * 100)
  // }

  /**
   * Crea un PaymentIntent de Stripe para un pago único
   */
  async createPaymentIntent(paymentData: CreatePaymentInput): Promise<PaymentIntentResponse & { paymentId: string }> {
    try {
      const { amount, description, rideId, userId } = paymentData

      if (!amount || amount <= 0) {
        throw new HttpError(400, 'Amount must be greater than 0')
      }

      let payment = await this.paymentsRepo.getPaymentByRideAndUser(rideId, userId)
      
      if (!payment) {
        payment = await this.paymentsRepo.createPayment(rideId, paymentData)
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount,
        currency: 'crc',
        description: description ?? 'Carpil ride payment',
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentId: payment.id,
          rideId,
          userId
        }
      })

      await this.paymentsRepo.updatePaymentWithStripeDetails(
        rideId,
        payment.id,
        paymentIntent.id,
        paymentIntent.client_secret!
      )

      await this.paymentsRepo.addPaymentAttempt(rideId, payment.id, {
        stripePaymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        timestamp: new Date()
      })

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentId: payment.id
      }
    } catch (error: any) {
      throw new HttpError(500, `Payment intent creation failed: ${error.message}`)
    }
  }

  /**
   * Confirma un PaymentIntent de Stripe
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      
      if (paymentIntent.status === 'succeeded') {
        return true
      }
      
      return false
    } catch (error: any) {
      throw new HttpError(500, `Payment confirmation failed: ${error.message}`)
    }
  }

  /**
   * Cancela un PaymentIntent de Stripe
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId)
      
      return paymentIntent.status === 'canceled'
    } catch (error: any) {
      throw new HttpError(500, `Payment cancellation failed: ${error.message}`)
    }
  }

  /**
   * Obtiene el estado de un PaymentIntent
   */
  async getPaymentIntentStatus(paymentIntentId: string): Promise<string> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      return paymentIntent.status
    } catch (error: any) {
      throw new HttpError(500, `Failed to retrieve payment status: ${error.message}`)
    }
  }

  /**
   * Get all payments for a ride
   */
  async getPaymentsByRide(rideId: string): Promise<Payment[]> {
    return this.paymentsRepo.getPaymentsByRide(rideId)
  }

  /**
   * Get payment by Stripe PaymentIntent ID
   */
  async getPaymentByIntentId(paymentIntentId: string): Promise<Payment | null> {
    return this.paymentsRepo.getPaymentByIntentId(paymentIntentId)
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(rideId: string, paymentId: string, status: string): Promise<void> {
    const paymentStatus = status as any // Cast to PaymentStatus enum
    await this.paymentsRepo.updatePaymentStatus(rideId, paymentId, paymentStatus)
  }

  /**
   * Check if all passengers have paid for a ride
   */
  async checkAllPaymentsPaid(rideId: string): Promise<boolean> {
    return this.paymentsRepo.checkAllPaymentsPaid(rideId)
  }
}
