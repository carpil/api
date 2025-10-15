import { Request, Response } from 'express'
import Stripe from 'stripe'
import { env } from '../config/env'
import { PaymentsService } from '../services/payments.service'
import { RidesService } from '../services/rides.service'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { RideStatus } from '../models/ride.model'
import { PaymentStatus } from '../models/payment.model'
import { logger } from '../config/logger'
import { extractPaymentMetadata } from '../types/stripe.types'

export class WebhooksController {
  private stripe: Stripe

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ridesService: RidesService,
    private readonly usersRepo: UsersRepository
  ) {
    this.stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover'
    })
  }

  handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string
    const endpointSecret = env.STRIPE_WEBHOOK_SECRET

    if (!endpointSecret) {
      logger.error('Webhook secret not configured')
      res.status(500).json({ error: 'Webhook secret not configured' })
      return
    }

    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
      logger.info({ eventType: event.type, eventId: event.id }, 'Stripe webhook received')
    } catch (err: any) {
      logger.error({ error: err.message }, 'Webhook signature verification failed')
      res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` })
      return
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          logger.info({ paymentIntentId: (event.data.object as Stripe.PaymentIntent).id }, 'Processing payment_intent.succeeded')
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
          break
        case 'payment_intent.payment_failed':
          logger.info({ paymentIntentId: (event.data.object as Stripe.PaymentIntent).id }, 'Processing payment_intent.payment_failed')
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent)
          break
        default:
          logger.debug({ eventType: event.type }, 'Unhandled webhook event type')
          break
      }

      res.json({ received: true })
    } catch (error: any) {
      logger.error({ error: error.message, stack: error.stack, eventType: event.type }, 'Webhook processing failed')
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    logger.info({ 
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata
    }, 'Starting payment success handler')

    try {
      // Extract metadata for direct document read (avoids need for Firestore index)
      const metadata = extractPaymentMetadata(paymentIntent.metadata)
      
      const payment = await this.paymentsService.getPaymentByIntentId(paymentIntent.id, metadata)
      
      if (!payment) {
        logger.warn({ paymentIntentId: paymentIntent.id }, 'Payment not found in database for PaymentIntent')
        return
      }

      logger.info({ 
        paymentId: payment.id,
        rideId: payment.rideId,
        userId: payment.userId,
        currentStatus: payment.status
      }, 'Payment found in database')

      // Update payment status to succeeded
      await this.paymentsService.updatePaymentStatus(
        payment.rideId,
        payment.id,
        PaymentStatus.Succeeded
      )
      logger.info({ paymentId: payment.id, rideId: payment.rideId }, 'Payment status updated to succeeded')

      // Update payment attempt status
      const attempts = payment.paymentAttempts || []
      const attemptIndex = attempts.findIndex(a => a.stripePaymentIntentId === paymentIntent.id)
      
      if (attemptIndex >= 0) {
        attempts[attemptIndex].status = 'succeeded'
        await this.paymentsService['paymentsRepo'].update(payment.rideId, payment.id, {
          paymentAttempts: attempts
        })
        logger.info({ paymentId: payment.id, attemptIndex }, 'Payment attempt updated to succeeded')
      } else {
        logger.warn({ paymentId: payment.id, paymentIntentId: paymentIntent.id }, 'Payment attempt not found in attempts array')
      }

      // Get user and update pending payments
      const user = await this.usersRepo.getById(payment.userId)
      if (!user) {
        logger.error({ userId: payment.userId, paymentId: payment.id }, 'User not found for payment')
        return
      }

      logger.info({ userId: payment.userId, pendingPaymentRideIds: user.pendingPaymentRideIds }, 'User found, updating pending payments')

      // Remove from pending payments
      const updatedPendingPayment = (user.pendingPaymentRideIds || []).filter(
        id => id !== payment.rideId
      )
      await this.usersRepo.update(payment.userId, {
        pendingPaymentRideIds: updatedPendingPayment
      })
      logger.info({ userId: payment.userId, updatedPendingPayment }, 'Removed ride from user pending payments')

      // Add to pending reviews
      const currentPendingReview = user.pendingReviewRideIds || []
      const updatedPendingReview = [payment.rideId, ...currentPendingReview.filter(id => id !== payment.rideId)]
      await this.usersRepo.update(payment.userId, {
        pendingReviewRideIds: updatedPendingReview
      })
      logger.info({ userId: payment.userId, updatedPendingReview }, 'Added ride to user pending reviews')

      // Update ride participant status
      await this.ridesService['ridesRepo'].setParticipant(
        payment.rideId,
        payment.userId,
        { active: false, pendingToReview: true }
      )
      logger.info({ rideId: payment.rideId, userId: payment.userId }, 'Updated ride participant status')

      // Check if all payments are completed
      const allPaid = await this.paymentsService.checkAllPaymentsPaid(payment.rideId)
      logger.info({ rideId: payment.rideId, allPaid }, 'Checked if all payments are completed')
      
      if (allPaid) {
        await this.ridesService['ridesRepo'].update(payment.rideId, {
          status: RideStatus.Completed,
          updatedAt: new Date()
        })
        logger.info({ rideId: payment.rideId }, 'All payments completed - ride marked as completed')
      }

      logger.info({ paymentId: payment.id, rideId: payment.rideId }, 'Payment success handler completed successfully')
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        paymentIntentId: paymentIntent.id
      }, 'Error in payment success handler')
      // Don't re-throw - we still want to acknowledge the webhook to Stripe
      // to prevent infinite retries for errors that won't be fixed by retrying
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    logger.info({ 
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      errorMessage: paymentIntent.last_payment_error?.message,
      metadata: paymentIntent.metadata 
    }, 'Starting payment failure handler')

    try {
      // Extract metadata for direct document read (avoids need for Firestore index)
      const metadata = extractPaymentMetadata(paymentIntent.metadata)
      
      const payment = await this.paymentsService.getPaymentByIntentId(paymentIntent.id, metadata)
      
      if (!payment) {
        logger.warn({ paymentIntentId: paymentIntent.id }, 'Payment not found in database for failed PaymentIntent')
        return
      }

      logger.info({ 
        paymentId: payment.id,
        rideId: payment.rideId,
        userId: payment.userId,
        currentStatus: payment.status
      }, 'Payment found in database for failure')

      await this.paymentsService.updatePaymentStatus(
        payment.rideId,
        payment.id,
        PaymentStatus.Failed
      )
      logger.info({ paymentId: payment.id, rideId: payment.rideId }, 'Payment status updated to failed')

      const attempts = payment.paymentAttempts || []
      const attemptIndex = attempts.findIndex(a => a.stripePaymentIntentId === paymentIntent.id)
      
      if (attemptIndex >= 0) {
        attempts[attemptIndex].status = 'failed'
        attempts[attemptIndex].errorMessage = paymentIntent.last_payment_error?.message
        await this.paymentsService['paymentsRepo'].update(payment.rideId, payment.id, {
          paymentAttempts: attempts
        })
        logger.info({ 
          paymentId: payment.id, 
          attemptIndex,
          errorMessage: paymentIntent.last_payment_error?.message 
        }, 'Payment attempt updated to failed')
      } else {
        logger.warn({ paymentId: payment.id, paymentIntentId: paymentIntent.id }, 'Payment attempt not found in attempts array for failed payment')
      }

      logger.info({ paymentId: payment.id, rideId: payment.rideId }, 'Payment failure handler completed')
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        stack: error.stack,
        paymentIntentId: paymentIntent.id
      }, 'Error in payment failure handler')
      throw error
    }
  }
}
