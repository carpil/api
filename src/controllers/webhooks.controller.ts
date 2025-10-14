import { Request, Response } from 'express'
import Stripe from 'stripe'
import { env } from '../config/env'
import { PaymentsService } from '../services/payments.service'
import { RidesService } from '../services/rides.service'
import { UsersRepository } from '../repositories/firebase/users.repository'
import { RideStatus } from '../models/ride.model'
import { PaymentStatus } from '../models/payment.model'

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
    console.log('Webhook received:', {
      bodyType: typeof req.body,
      bodyLength: req.body?.length,
      headers: req.headers['stripe-signature'] ? 'present' : 'missing'
    })
    
    const sig = req.headers['stripe-signature'] as string
    const endpointSecret = env.STRIPE_WEBHOOK_SECRET

    if (!endpointSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured')
      res.status(500).json({ error: 'Webhook secret not configured' })
      return
    }

    let event: Stripe.Event

    try {
      event = this.stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` })
      return
    }

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
          break
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent)
          break
        default:
          console.log(`Unhandled event type: ${event.type} - ignoring`)
      }

      res.json({ received: true })
    } catch (error: any) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Webhook processing failed' })
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    console.log('Payment succeeded:', paymentIntent.id)

    try {
      const payment = await this.paymentsService.getPaymentByIntentId(paymentIntent.id)
      if (!payment) {
        console.log('Payment record not found for intent (likely test event):', paymentIntent.id)
        return
      }

      await this.paymentsService.updatePaymentStatus(
        payment.rideId,
        payment.id,
        PaymentStatus.Succeeded
      )

      const attempts = payment.paymentAttempts || []
      const attemptIndex = attempts.findIndex(a => a.stripePaymentIntentId === paymentIntent.id)
      
      if (attemptIndex >= 0) {
        attempts[attemptIndex].status = 'succeeded'
        await this.paymentsService['paymentsRepo'].update(payment.rideId, payment.id, {
          paymentAttempts: attempts
        })
      }

      const user = await this.usersRepo.getById(payment.userId)
      if (!user) {
        console.error('User not found for payment:', payment.userId)
        return
      }

      const updatedPendingPayment = (user.pendingPaymentRideIds || []).filter(
        id => id !== payment.rideId
      )
      await this.usersRepo.update(payment.userId, {
        pendingPaymentRideIds: updatedPendingPayment
      })

      const currentPendingReview = user.pendingReviewRideIds || []
      const updatedPendingReview = [payment.rideId, ...currentPendingReview.filter(id => id !== payment.rideId)]
      await this.usersRepo.update(payment.userId, {
        pendingReviewRideIds: updatedPendingReview
      })

      await this.ridesService['ridesRepo'].setParticipant(
        payment.rideId,
        payment.userId,
        { active: false, pendingToReview: true }
      )

      const allPaid = await this.paymentsService.checkAllPaymentsPaid(payment.rideId)
      if (allPaid) {
        await this.ridesService['ridesRepo'].update(payment.rideId, {
          status: RideStatus.Completed,
          updatedAt: new Date()
        })
        console.log('All payments completed for ride:', payment.rideId)
      }

      console.log('Payment processing completed for user:', payment.userId)
    } catch (error: any) {
      console.error('Error handling payment success:', error)
      console.log('Continuing webhook processing despite error')
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    console.log('Payment failed:', paymentIntent.id)

    try {
      const payment = await this.paymentsService.getPaymentByIntentId(paymentIntent.id)
      if (!payment) {
        console.error('Payment record not found for intent:', paymentIntent.id)
        return
      }

      await this.paymentsService.updatePaymentStatus(
        payment.rideId,
        payment.id,
        PaymentStatus.Failed
      )

      const attempts = payment.paymentAttempts || []
      const attemptIndex = attempts.findIndex(a => a.stripePaymentIntentId === paymentIntent.id)
      
      if (attemptIndex >= 0) {
        attempts[attemptIndex].status = 'failed'
        attempts[attemptIndex].errorMessage = paymentIntent.last_payment_error?.message
        await this.paymentsService['paymentsRepo'].update(payment.rideId, payment.id, {
          paymentAttempts: attempts
        })
      }

      console.log('Payment failure processed for user:', payment.userId)
    } catch (error: any) {
      console.error('Error handling payment failure:', error)
      throw error
    }
  }
}
