import Stripe from 'stripe'
import { env } from '../config/env'
import { CreatePaymentInput, PaymentIntentResponse, Payment, PaymentStatus } from '../models/payment.model'
import { HttpError } from '../utils/http'
import { PaymentsRepository } from '../repositories/firebase/payments.repository'
import { logger } from '../config/logger'
import { StripePaymentMetadata } from '../types/stripe.types'

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

      // Create metadata object with proper typing
      const metadata: StripePaymentMetadata = {
        paymentId: payment.id,
        rideId,
        userId
      }

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount,
        currency: 'crc',
        description: description ?? 'Carpil ride payment',
        automatic_payment_methods: { enabled: true },
        metadata
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
  async getPaymentByIntentId(paymentIntentId: string, metadata?: Partial<StripePaymentMetadata>): Promise<Payment | null> {
    return this.paymentsRepo.getPaymentByIntentId(paymentIntentId, metadata)
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

  /**
   * Recover a payment by syncing with Stripe's actual status
   * This is useful when webhook processing fails but payment succeeded in Stripe
   */
  async recoverPayment(paymentIntentId: string): Promise<{
    success: boolean
    message: string
    stripeStatus: string
    dbStatus?: string
    payment?: Payment
  }> {
    try {
      logger.info({ paymentIntentId }, 'Starting payment recovery')

      // Get the actual status from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)
      logger.info({ 
        paymentIntentId, 
        stripeStatus: paymentIntent.status,
        amount: paymentIntent.amount 
      }, 'Retrieved PaymentIntent from Stripe')

      // Get the payment from database
      const payment = await this.paymentsRepo.getPaymentByIntentId(paymentIntentId)
      
      if (!payment) {
        logger.warn({ paymentIntentId }, 'Payment not found in database during recovery')
        return {
          success: false,
          message: 'Payment not found in database',
          stripeStatus: paymentIntent.status
        }
      }

      logger.info({ 
        paymentId: payment.id,
        rideId: payment.rideId,
        dbStatus: payment.status,
        stripeStatus: paymentIntent.status
      }, 'Payment found in database, comparing statuses')

      // If statuses match, nothing to recover
      if (payment.status === paymentIntent.status) {
        logger.info({ paymentId: payment.id }, 'Payment status already in sync')
        return {
          success: true,
          message: 'Payment status already in sync',
          stripeStatus: paymentIntent.status,
          dbStatus: payment.status,
          payment
        }
      }

      // Sync the status based on Stripe's truth
      let newStatus: PaymentStatus

      switch (paymentIntent.status) {
        case 'succeeded':
          newStatus = PaymentStatus.Succeeded
          break
        case 'processing':
          newStatus = PaymentStatus.Processing
          break
        case 'requires_payment_method':
        case 'requires_confirmation':
        case 'requires_action':
          newStatus = PaymentStatus.Pending
          break
        case 'canceled':
          newStatus = PaymentStatus.Cancelled
          break
        default:
          newStatus = PaymentStatus.Failed
      }

      await this.paymentsRepo.updatePaymentStatus(payment.rideId, payment.id, newStatus)
      logger.info({ 
        paymentId: payment.id,
        oldStatus: payment.status,
        newStatus
      }, 'Payment status updated during recovery')

      // Update the payment attempts
      const attempts = payment.paymentAttempts || []
      const attemptIndex = attempts.findIndex(a => a.stripePaymentIntentId === paymentIntentId)
      
      if (attemptIndex >= 0) {
        attempts[attemptIndex].status = paymentIntent.status
        if (paymentIntent.last_payment_error) {
          attempts[attemptIndex].errorMessage = paymentIntent.last_payment_error.message
        }
        await this.paymentsRepo.update(payment.rideId, payment.id, {
          paymentAttempts: attempts
        })
        logger.info({ paymentId: payment.id, attemptIndex }, 'Payment attempt updated during recovery')
      }

      // Get updated payment
      const updatedPayment = await this.paymentsRepo.getPaymentByIntentId(paymentIntentId)

      return {
        success: true,
        message: `Payment status synced from ${payment.status} to ${newStatus}`,
        stripeStatus: paymentIntent.status,
        dbStatus: newStatus,
        payment: updatedPayment || undefined
      }
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        paymentIntentId
      }, 'Error during payment recovery')
      throw new HttpError(500, `Payment recovery failed: ${error.message}`)
    }
  }
}
