import Stripe from 'stripe'
import { env } from '../config/env'
import { CreatePaymentInput, PaymentIntentResponse, Payment, PaymentStatus } from '../models/payment.model'
import { HttpError } from '../utils/http'
import { PaymentsRepository } from '../repositories/firebase/payments.repository'
import { RidesRepository } from '../repositories/firebase/rides.repository'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { logger } from '../config/logger'
import { StripePaymentMetadata } from '../types/stripe.types'
import { RideStatus } from '../models/ride.model'

export class PaymentsService {
  private stripe: Stripe
  private paymentsRepo: PaymentsRepository
  private ridesRepo: RidesRepository
  private usersRepo: UsersRepository

  constructor(
    paymentsRepo: PaymentsRepository,
    ridesRepo: RidesRepository,
    usersRepo: UsersRepository
  ) {
    if (!env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }
    
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover'
    })
    this.paymentsRepo = paymentsRepo
    this.ridesRepo = ridesRepo
    this.usersRepo = usersRepo
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

  /**
   * Complete a SINPE payment
   * This bypasses Stripe and directly marks the payment as completed
   */
  async completeSinpePayment(
    userId: string,
    rideId: string,
    amount: number,
    attachmentUrl: string,
    description?: string
  ): Promise<{ paymentId: string }> {
    try {
      logger.info({ userId, rideId, amount }, 'Starting SINPE payment completion')

      // 1. Check if ride exists
      const ride = await this.ridesRepo.getById(rideId)
      if (!ride) {
        throw new HttpError(404, 'Ride not found')
      }

      // 2. Verify user is a passenger on the ride
      const isPassenger = ride.passengers?.some(p => p.id === userId)
      if (!isPassenger) {
        throw new HttpError(403, 'User is not a passenger on this ride')
      }

      // 3. Validate attachmentUrl is a Firebase Storage URL
      if (!attachmentUrl.includes('firebasestorage.googleapis.com')) {
        throw new HttpError(400, 'Attachment URL must be a valid Firebase Storage URL')
      }

      // 4. Check if payment already exists for this user/ride
      let payment = await this.paymentsRepo.getPaymentByRideAndUser(rideId, userId)
      
      if (payment) {
        // If payment already exists and is completed, return error
        if (payment.status === PaymentStatus.Succeeded) {
          throw new HttpError(400, 'Payment for this ride has already been completed')
        }
        
        // If payment exists but not completed, we could update it
        // For now, we'll throw an error to keep it simple
        throw new HttpError(400, 'A payment for this ride already exists')
      }

      // 5. Create payment with SINPE method
      payment = await this.paymentsRepo.createSinpePayment(
        rideId,
        userId,
        amount,
        attachmentUrl,
        description
      )
      logger.info({ paymentId: payment.id, rideId, userId }, 'SINPE payment created')

      // 6. Get user and update pending payments
      const user = await this.usersRepo.getById(userId)
      if (!user) {
        logger.error({ userId, paymentId: payment.id }, 'User not found for SINPE payment')
        throw new HttpError(404, 'User not found')
      }

      // 7. Remove from pending payments
      const updatedPendingPayment = (user.pendingPaymentRideIds || []).filter(
        id => id !== rideId
      )
      await this.usersRepo.update(userId, {
        pendingPaymentRideIds: updatedPendingPayment
      })
      logger.info({ userId, updatedPendingPayment }, 'Removed ride from user pending payments')

      // 8. Add to pending reviews
      const currentPendingReview = user.pendingReviewRideIds || []
      const updatedPendingReview = [rideId, ...currentPendingReview.filter(id => id !== rideId)]
      await this.usersRepo.update(userId, {
        pendingReviewRideIds: updatedPendingReview
      })
      logger.info({ userId, updatedPendingReview }, 'Added ride to user pending reviews')

      // 9. Update ride participant status
      await this.ridesRepo.setParticipant(
        rideId,
        userId,
        { active: false, pendingToReview: true }
      )
      logger.info({ rideId, userId }, 'Updated ride participant status')

      // 10. Check if all payments are completed
      const allPaid = await this.paymentsRepo.checkAllPaymentsPaid(rideId)
      logger.info({ rideId, allPaid }, 'Checked if all payments are completed')
      
      if (allPaid) {
        await this.ridesRepo.update(rideId, {
          status: RideStatus.Completed,
          updatedAt: new Date()
        })
        logger.info({ rideId }, 'All payments completed - ride marked as completed')
      }

      logger.info({ paymentId: payment.id, rideId }, 'SINPE payment completed successfully')

      return { paymentId: payment.id }
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        userId,
        rideId
      }, 'Error during SINPE payment completion')
      
      // Re-throw HttpErrors as-is
      if (error instanceof HttpError) {
        throw error
      }
      
      throw new HttpError(500, `SINPE payment completion failed: ${error.message}`)
    }
  }
}
