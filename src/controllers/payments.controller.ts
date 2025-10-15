import { Response } from 'express'
import { PaymentsService } from '@services/payments.service'
import { asyncHandler } from '@utils/http'
import { validateCreatePayment } from '../schemas/payment'
import { AuthRequest } from '@middlewares/auth.middleware'
import { CreatePaymentInput } from '@models/payment.model'

export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  createPaymentIntent = asyncHandler(async (req: AuthRequest, res: Response) => {
    const validation = validateCreatePayment(req.body)
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid payment data', 
        details: validation.error.errors 
      })
    }

    const { rideId, amount, description } = validation.data
    const userId = req.user?.uid

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const paymentData: CreatePaymentInput = {
      rideId,
      userId,
      amount,
      description
    }

    const result = await this.paymentsService.createPaymentIntent(paymentData)
    return res.json({
      success: true,
      clientSecret: result.clientSecret,
      message: 'Payment intent created successfully'
    })
  })

  confirmPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentIntentId } = req.params

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' })
    }

    const isConfirmed = await this.paymentsService.confirmPaymentIntent(paymentIntentId)
    
    if (!isConfirmed) {
      return res.status(400).json({
        success: false,
        message: 'Payment could not be confirmed'
      })
    }

    return res.json({
      success: true,
      message: 'Payment confirmed successfully'
    })
  })

  cancelPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentIntentId } = req.params

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' })
    }

    const isCancelled = await this.paymentsService.cancelPaymentIntent(paymentIntentId)
    
    if (!isCancelled) {
      return res.status(400).json({
        success: false,
        message: 'Payment could not be cancelled'
      })
    }

    return res.json({
      success: true,
      message: 'Payment cancelled successfully'
    })
  })

  getPaymentStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentIntentId } = req.params

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' })
    }

    const status = await this.paymentsService.getPaymentIntentStatus(paymentIntentId)
    return res.json({
      success: true,
      status,
      message: 'Payment status retrieved successfully'
    })
  })

  getPaymentsByRide = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id: rideId } = req.params
    const userId = req.user?.uid

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    if (!rideId) {
      return res.status(400).json({ error: 'Ride ID is required' })
    }

    // Get payments for the ride
    const payments = await this.paymentsService.getPaymentsByRide(rideId)
    
    return res.json({
      success: true,
      payments,
      message: 'Ride payments retrieved successfully'
    })
  })

  recoverPayment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { paymentIntentId } = req.params

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent ID is required' })
    }

    const result = await this.paymentsService.recoverPayment(paymentIntentId)
    
    return res.json(result)
  })
}
